/**
 * Sonido de los minijuegos 3D (Web Audio, sin archivos).
 * Respeta la misma preferencia de silencio que el resto del juego (`novacore:sound`).
 */
const STORAGE_KEY = 'novacore:sound';
const VOLUME = 0.8;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private loops = new Map<string, { gain: GainNode; filter: BiquadFilterNode }>();
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === 'off';
    } catch {
      /* sin almacenamiento */
    }
  }

  /** Debe llamarse desde un gesto del usuario (clic o tecla): los navegadores lo exigen. */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Nota simple. */
  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Ráfaga de ruido filtrado que se apaga sola (golpes, cohetes, polvo). */
  burst(opts: { dur: number; from: number; to: number; vol: number; type?: BiquadFilterType }): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + opts.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + opts.dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + opts.dur + 0.05);
  }

  /** Sonido continuo (viento, motores). Se crea la primera vez; `level` 0 lo apaga. */
  loop(name: string, level: number, freq: number, type: BiquadFilterType = 'lowpass'): void {
    if (!this.ctx || !this.master || !this.noise) return;
    let l = this.loops.get(name);
    if (!l) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      l = { gain, filter };
      this.loops.set(name, l);
    }
    const t = this.ctx.currentTime;
    l.filter.frequency.setTargetAtTime(freq, t, 0.1);
    l.gain.gain.setTargetAtTime(level, t, 0.08);
  }

  /** Tono de aviso antes de cada mensaje del centro de control. */
  radio(): void {
    this.tone(2525, 0.22, 'sine', 0.045);
  }

  beep(high = false): void {
    this.tone(high ? 1320 : 880, high ? 0.45 : 0.16, 'sine', 0.08);
  }

  success(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, i * 0.13));
  }

  fail(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.07, i * 0.18));
  }

  /** Cambia el silencio y devuelve el nuevo estado. */
  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? 'off' : 'on');
    } catch {
      /* sin almacenamiento */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : VOLUME, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  /** Lee una frase en inglés con la voz del navegador (si existe y no está silenciado). */
  speakEnglish(text: string): void {
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (!synth || this.muted) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    const voice = synth.getVoices().find((v) => v.lang.startsWith('en'));
    if (voice) u.voice = voice;
    synth.speak(u);
  }

  stop(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.loops.clear();
  }
}
