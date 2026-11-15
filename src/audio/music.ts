export type MusicTheme =
  | 'home'
  | 'name'
  | 'podiums'
  | 'launch'
  | 'puzzle'
  | 'map'
  | 'final'
  | 'certificate'
  | 'explore'
  | 'game';

interface ThemeDef {
  bpm: number;
  chords: number[][];
  barsPerChord: number;
  arp: (number | null)[];
  arpOctave: number;
  arpWave: OscillatorType;
  arpGain: number;
  kick: boolean[];
  bass: boolean;
  cutoff: number;
  padGain: number;
  bells: number;
  level: number;
}

const _ = null;

const THEMES: Record<MusicTheme, ThemeDef> = {
  home: {
    bpm: 72,
    chords: [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 62]],
    barsPerChord: 2,
    arp: [0, _, _, 2, _, _, 3, _, 1, _, _, 2, _, _, _, _],
    arpOctave: 24,
    arpWave: 'sine',
    arpGain: 0.05,
    kick: [],
    bass: true,
    cutoff: 1400,
    padGain: 0.022,
    bells: 0.18,
    level: 1,
  },
  name: {
    bpm: 64,
    chords: [[50, 57, 61, 66], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 57, 61]],
    barsPerChord: 2,
    arp: [0, _, _, _, _, _, _, _, 2, _, _, _, _, _, _, _],
    arpOctave: 24,
    arpWave: 'sine',
    arpGain: 0.045,
    kick: [],
    bass: true,
    cutoff: 1100,
    padGain: 0.022,
    bells: 0.25,
    level: 0.9,
  },
  podiums: {
    bpm: 92,
    chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]],
    barsPerChord: 1,
    arp: [0, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _, 3, _],
    arpOctave: 12,
    arpWave: 'triangle',
    arpGain: 0.04,
    kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    bass: true,
    cutoff: 1800,
    padGain: 0.02,
    bells: 0.1,
    level: 1,
  },
  launch: {
    bpm: 112,
    chords: [[50, 57, 62, 64], [50, 57, 62, 67], [52, 59, 64, 69], [55, 62, 67, 71]],
    barsPerChord: 1,
    arp: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
    arpOctave: 12,
    arpWave: 'triangle',
    arpGain: 0.035,
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    bass: true,
    cutoff: 2600,
    padGain: 0.022,
    bells: 0,
    level: 1,
  },
  puzzle: {
    bpm: 104,
    chords: [[41, 53, 57, 64], [43, 55, 59, 62], [45, 52, 57, 60], [43, 50, 55, 59]],
    barsPerChord: 1,
    arp: [0, _, 2, _, 1, 3, _, 2, 0, _, 2, _, 3, _, 1, _],
    arpOctave: 24,
    arpWave: 'triangle',
    arpGain: 0.038,
    kick: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
    bass: true,
    cutoff: 1600,
    padGain: 0.016,
    bells: 0.08,
    level: 0.85,
  },
  map: {
    bpm: 96,
    chords: [[40, 52, 55, 59], [36, 48, 52, 55], [43, 50, 55, 59], [38, 50, 54, 57]],
    barsPerChord: 1,
    arp: [0, _, 2, 1, _, 2, 3, _, 0, _, 2, 1, _, 3, 2, _],
    arpOctave: 12,
    arpWave: 'triangle',
    arpGain: 0.035,
    kick: [true, false, false, false, false, false, false, false, true, false, false, true, false, false, false, false],
    bass: true,
    cutoff: 1500,
    padGain: 0.02,
    bells: 0.08,
    level: 0.9,
  },
  final: {
    bpm: 84,
    chords: [[48, 55, 60, 64], [43, 55, 59, 62], [45, 52, 57, 60], [41, 53, 57, 60]],
    barsPerChord: 1,
    arp: [0, _, 1, _, 2, _, 3, _, 3, _, 2, _, 1, _, 2, _],
    arpOctave: 12,
    arpWave: 'triangle',
    arpGain: 0.04,
    kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    bass: true,
    cutoff: 2000,
    padGain: 0.022,
    bells: 0.15,
    level: 1,
  },
  certificate: {
    bpm: 96,
    chords: [[41, 53, 57, 60], [48, 52, 55, 60], [50, 53, 57, 62], [46, 53, 58, 62]],
    barsPerChord: 1,
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 3, 0, 2, 1, 3],
    arpOctave: 24,
    arpWave: 'sine',
    arpGain: 0.04,
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    bass: true,
    cutoff: 2400,
    padGain: 0.02,
    bells: 0.2,
    level: 1,
  },
  explore: {
    bpm: 58,
    chords: [[45, 52, 59, 60], [41, 52, 57, 59], [40, 50, 55, 59], [38, 50, 53, 64]],
    barsPerChord: 2,
    arp: [0, _, _, _, _, _, 2, _, _, _, _, _, 3, _, _, _],
    arpOctave: 24,
    arpWave: 'sine',
    arpGain: 0.04,
    kick: [],
    bass: true,
    cutoff: 900,
    padGain: 0.024,
    bells: 0.3,
    level: 0.95,
  },
  game: {
    bpm: 100,
    chords: [[45, 52, 57, 60], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]],
    barsPerChord: 1,
    arp: [0, _, 2, _, 1, _, 2, _, 0, _, 2, _, 3, _, 2, _],
    arpOctave: 12,
    arpWave: 'triangle',
    arpGain: 0.03,
    kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    bass: true,
    cutoff: 1300,
    padGain: 0.016,
    bells: 0.05,
    level: 0.55,
  },
};

const MUTE_KEY = 'novacore:music-muted';
const MASTER = 0.55;
const FADE = 1.6;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let duck: GainNode | null = null;
let reverbIn: GainNode | null = null;
let delayIn: GainNode | null = null;
let current: MusicTheme = 'home';
let bus: GainNode | null = null;
let busTheme: MusicTheme | null = null;
let step = 0;
let nextTime = 0;
let timer = 0;
const listeners = new Set<(m: boolean) => void>();

function makeImpulse(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

function build(): void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  duck = ctx.createGain();
  duck.connect(master);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 3.2);
  reverbIn = ctx.createGain();
  reverbIn.gain.value = 0.55;
  reverbIn.connect(reverb).connect(duck);

  const delay = ctx.createDelay(1.5);
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = 'lowpass';
  delayTone.frequency.value = 2500;
  delayIn = ctx.createGain();
  delayIn.gain.value = 0.4;
  delayIn.connect(delay);
  delay.connect(delayTone).connect(fb).connect(delay);
  delayTone.connect(duck);
  delayTone.connect(reverbIn);
  delay.delayTime.value = 0.42;
  delayNode = delay;
}

let delayNode: DelayNode | null = null;

function newBus(theme: MusicTheme): void {
  if (!ctx || !duck || !reverbIn) return;
  const now = ctx.currentTime;
  if (bus) {
    const old = bus;
    old.gain.cancelScheduledValues(now);
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + FADE);
    window.setTimeout(() => old.disconnect(), (FADE + 4) * 1000);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(THEMES[theme].level, now + FADE);
  g.connect(duck);
  g.connect(reverbIn);
  bus = g;
  busTheme = theme;
  step = 0;
  nextTime = now + 0.08;
  if (delayNode) delayNode.delayTime.setTargetAtTime((60 / THEMES[theme].bpm) * 0.75, now, 0.2);
}

function env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number): void {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

function pad(chord: number[], t: number, dur: number, def: ThemeDef, out: GainNode): void {
  const c = ctx!;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(def.cutoff * 0.6, t);
  filter.frequency.linearRampToValueAtTime(def.cutoff, t + dur * 0.5);
  filter.frequency.linearRampToValueAtTime(def.cutoff * 0.7, t + dur + 1.5);
  filter.Q.value = 0.7;
  const g = c.createGain();
  env(g, t, def.padGain, Math.min(1.2, dur * 0.4), dur * 0.6, 1.8);
  filter.connect(g).connect(out);
  const end = t + dur + 2;
  for (const n of chord) {
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(filter);
      o.start(t);
      o.stop(end);
    }
  }
  if (def.bass) {
    const b = c.createOscillator();
    b.type = 'sine';
    b.frequency.value = midi(chord[0] - 12);
    const bg = c.createGain();
    env(bg, t, 0.09, 0.08, dur * 0.7, 0.9);
    b.connect(bg).connect(out);
    b.start(t);
    b.stop(end);
  }
}

function pluck(note: number, t: number, def: ThemeDef, out: GainNode, gain = def.arpGain, wave = def.arpWave, len = 0.35): void {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = wave;
  o.frequency.value = midi(note);
  const g = c.createGain();
  env(g, t, gain, 0.008, 0.02, len);
  o.connect(g);
  g.connect(out);
  if (delayIn) g.connect(delayIn);
  o.start(t);
  o.stop(t + len + 0.1);
}

function bell(note: number, t: number, out: GainNode): void {
  const c = ctx!;
  for (const [ratio, amp] of [[1, 0.03], [2.76, 0.012], [5.4, 0.006]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(note) * ratio;
    const g = c.createGain();
    env(g, t, amp, 0.005, 0, 2.6 / ratio);
    o.connect(g).connect(out);
    if (delayIn) g.connect(delayIn);
    o.start(t);
    o.stop(t + 3);
  }
}

function kick(t: number, out: GainNode): void {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  const g = c.createGain();
  env(g, t, 0.16, 0.004, 0.02, 0.3);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
}

function tick(): void {
  if (!ctx || !bus || !busTheme) return;
  if (duck) {
    const speaking = typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
    duck.gain.setTargetAtTime(speaking ? 0.3 : 1, ctx.currentTime, 0.25);
  }
  const def = THEMES[busTheme];
  const sixteenth = 60 / def.bpm / 4;
  const stepsPerChord = 16 * def.barsPerChord;
  while (nextTime < ctx.currentTime + 0.25) {
    const s = step % (stepsPerChord * def.chords.length);
    const chord = def.chords[Math.floor(s / stepsPerChord)];
    const inBar = s % 16;
    if (s % stepsPerChord === 0) pad(chord, nextTime, sixteenth * stepsPerChord, def, bus);
    const a = def.arp[inBar];
    if (a !== null && a !== undefined) pluck(chord[a % chord.length] + def.arpOctave, nextTime, def, bus);
    if (def.kick[inBar]) kick(nextTime, bus);
    if (inBar % 4 === 0 && def.bells > 0 && Math.random() < def.bells) {
      const n = chord[Math.floor(Math.random() * chord.length)] + 36;
      bell(n, nextTime + Math.random() * sixteenth, bus);
    }
    nextTime += sixteenth;
    step++;
  }
}

function start(): void {
  if (!ctx) build();
  if (!ctx) return;
  if (busTheme !== current) newBus(current);
  if (!timer) timer = window.setInterval(tick, 50);
  if (!muted && ctx.state === 'suspended') void ctx.resume();
}

function unlock(): void {
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  if (!muted) start();
}

export function initMusic(): void {
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (!muted) void ctx.resume();
  });
}

export function setMusicTheme(theme: MusicTheme): void {
  if (theme === current && busTheme === theme) return;
  current = theme;
  if (ctx && !muted) newBus(theme);
}

export function isMusicMuted(): boolean {
  return muted;
}

export function setMusicMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
  }
  if (!m) start();
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(m ? 0 : MASTER, now + 0.4);
    if (m) window.setTimeout(() => muted && ctx?.suspend(), 500);
  }
  listeners.forEach((l) => l(m));
}

export function onMusicMuteChange(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
