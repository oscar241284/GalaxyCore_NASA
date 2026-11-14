/**
 * MISIÓN 1 · Alunizaje del módulo lunar (Apolo).
 *
 * Simulación 2D con gravedad lunar real (1,62 m/s²) y estética realista:
 * - Terreno con regolito, cráteres, rocas y sombras largas por el Sol rasante.
 * - Montañas lejanas con parallax, cielo negro con estrellas y la Tierra.
 * - Módulo lunar Apolo detallado (etapa de descenso dorada, patas, escalera,
 *   ventanas, antenas, propulsores RCS), su sombra en el suelo, chorro del motor
 *   y polvo levantado cerca de la superficie.
 * - Cámara que se acerca al descender, HUD estilo computadora Apolo, avisos de
 *   Houston, alarma 1202, sonido (Web Audio) y controles en pantalla que se iluminan.
 * - 3 niveles de dificultad y resultado con estrellas.
 *
 * VISTA DE CABINA: la pantalla principal es la ventana del módulo (primera persona, ver
 * cockpitView.ts). La vista exterior 2D se muestra en el monitor "Cámara de alunizaje · CH. 4".
 */
import type { GameContext } from './index';
import { fbm, makeNoise, rng } from '../ui/moonTexture';
import { createCockpit } from './cockpitView';

// ---------------------------------------------------------------- constantes
const H = 560; // alto del mundo (unidades). El ancho se adapta a la pantalla.
const PX_PER_M = 10; // unidades por metro
const GRAVITY = 16.2; // 1,62 m/s² × 10
const THRUST = 40;
const SIDE = 16;
const FUEL_MAIN = 7; // consumo (%/s) a máxima potencia
const FUEL_SIDE = 2.5;
const LEG_Y = 31; // del centro del módulo a la base de las patas
const PAD_X = 32; // del centro a cada pata lateral
const SUN = { x: -0.86, y: -0.5 }; // dirección hacia el Sol (izquierda, bajo)

type Difficulty = 'cadete' | 'piloto' | 'comandante';
const LEVELS: Record<Difficulty, { label: string; desc: string; zone: number; fuel: number; vy: number; vx: number; drift: number }> = {
  cadete: { label: 'Cadete', desc: 'Zona amplia y mucho combustible', zone: 170, fuel: 140, vy: 35, vx: 25, drift: 10 },
  piloto: { label: 'Piloto', desc: 'Como un astronauta de verdad', zone: 125, fuel: 100, vy: 30, vx: 20, drift: 25 },
  comandante: { label: 'Comandante', desc: 'Zona estrecha, poco combustible', zone: 95, fuel: 75, vy: 22, vx: 15, drift: 45 },
};

type Status = 'brief' | 'countdown' | 'flying' | 'landed' | 'crashed';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: 'dust' | 'puff' | 'debris' | 'spark';
  color: string;
  rot: number;
  vr: number;
}

// ---------------------------------------------------------------- estilos
const CSS = `
.lm { position: absolute; inset: 0; overflow: hidden; background: #000; user-select: none; -webkit-user-select: none; }
.lm canvas { display: block; width: 100%; height: 100%; }
.lm-hud {
  position: absolute; top: 12px; left: 12px; width: 250px; padding: 12px 14px 10px;
  border: 1px solid rgba(57,255,138,.25); border-radius: 10px;
  background: linear-gradient(180deg, rgba(4,16,10,.88), rgba(2,8,5,.82));
  box-shadow: inset 0 0 24px rgba(57,255,138,.06), 0 8px 30px rgba(0,0,0,.5);
  font-family: var(--font-mono); color: var(--retro-green);
}
.lm-hud__top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 15px; color: var(--retro-amber); letter-spacing: .08em; }
.lm-hud__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.lm-hud__cell span { display: block; font-size: 13px; letter-spacing: .1em; color: rgba(57,255,138,.6); }
.lm-hud__cell b { display: block; font-weight: 400; font-size: 30px; line-height: 1; text-shadow: 0 0 8px rgba(57,255,138,.55); transition: color .2s; }
.lm-hud__cell b.warn { color: #ff6b6b; text-shadow: 0 0 8px rgba(255,80,80,.7); }
.lm-hud__cell b.ok { color: #7dffb4; }
.lm-hud__fuel { grid-column: 1 / -1; }
.lm-hud__fuel i { display: block; height: 8px; margin-top: 4px; border-radius: 4px; background: rgba(57,255,138,.12); overflow: hidden; }
.lm-hud__fuel s { display: block; height: 100%; background: linear-gradient(90deg, #1f9e57, #39ff8a); box-shadow: 0 0 10px rgba(57,255,138,.7); transition: width .1s linear; }
.lm-hud__fuel s.warn { background: linear-gradient(90deg, #b91c1c, #ff6b6b); box-shadow: 0 0 10px rgba(255,80,80,.7); }
.lm-hud__zone { grid-column: 1 / -1; margin-top: 4px; font-size: 17px; color: var(--holo); }
.lm-lights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.lm-light { padding: 4px 2px; border: 1px solid rgba(255,255,255,.1); border-radius: 4px; text-align: center; font-family: var(--font-body); font-size: 9px; font-weight: 700; letter-spacing: .06em; color: rgba(255,255,255,.28); background: rgba(255,255,255,.03); transition: all .15s; }
.lm-light.on-amber { color: #1a1000; background: #ffb547; border-color: #ffd08a; box-shadow: 0 0 12px rgba(255,181,71,.8); }
.lm-light.on-red { color: #fff; background: #dc2626; border-color: #f87171; box-shadow: 0 0 12px rgba(248,113,113,.9); }
.lm-light.on-green { color: #04140b; background: #39ff8a; border-color: #a7ffd0; box-shadow: 0 0 12px rgba(57,255,138,.9); }
.lm-light.blink { animation: lm-blink .45s steps(2) infinite; }
@keyframes lm-blink { 50% { opacity: .35; } }

.lm-tools { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; }
.lm-tool { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--fg); background: rgba(14,10,32,.8); cursor: pointer; transition: border-color .2s, transform .2s; }
.lm-tool:hover { border-color: var(--accent-2); transform: scale(1.06); }
.lm-tool svg { width: 20px; height: 20px; }

.lm-capcom { position: absolute; left: 12px; bottom: 14px; width: min(430px, calc(100% - 300px)); display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.lm-capcom p { margin: 0; padding: 8px 12px; border-left: 3px solid var(--holo); border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.35; color: var(--fg); background: rgba(5,4,13,.72); backdrop-filter: blur(4px); animation: lm-in .35s var(--ease-out); transition: opacity .6s; }
.lm-capcom p b { margin-right: 6px; font-family: var(--font-ui); font-size: 10px; letter-spacing: .14em; color: var(--holo); }
.lm-capcom p.lm-from-lm { border-left-color: var(--retro-amber); }
.lm-capcom p.lm-from-lm b { color: var(--retro-amber); }
.lm-capcom p.old { opacity: .45; }

.lm-pad { position: absolute; right: 16px; bottom: 16px; display: flex; align-items: flex-end; gap: 10px; }
.lm-key {
  position: relative; display: grid; place-items: center; gap: 2px; width: 74px; height: 74px; padding: 0;
  border: 1px solid rgba(255,255,255,.14); border-radius: 18px; cursor: pointer; touch-action: none;
  color: #cfd3dc; font-family: var(--font-ui); font-size: 10px; letter-spacing: .12em;
  background: linear-gradient(180deg, #2a2f3a 0%, #151821 100%);
  box-shadow: 0 6px 0 #07080c, 0 10px 20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12);
  transition: transform .08s, box-shadow .08s, color .15s, border-color .15s;
}
.lm-key__icon { font-size: 24px; line-height: 1; }
.lm-key::after { content: ''; position: absolute; top: 8px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: #3a3f4a; transition: all .12s; }
.lm-key.is-on { transform: translateY(5px); color: #fff; border-color: rgba(103,232,249,.7); box-shadow: 0 1px 0 #07080c, 0 3px 8px rgba(0,0,0,.6), inset 0 0 18px rgba(103,232,249,.35); }
.lm-key.is-on::after { background: #67e8f9; box-shadow: 0 0 10px #67e8f9; }
.lm-key--main { width: 96px; height: 96px; border-radius: 24px; font-size: 11px; }
.lm-key--main .lm-key__icon { font-size: 32px; }
.lm-key--main.is-on { border-color: rgba(255,181,71,.9); box-shadow: 0 1px 0 #07080c, 0 3px 8px rgba(0,0,0,.6), inset 0 0 22px rgba(255,181,71,.45); }
.lm-key--main.is-on::after { background: #ffb547; box-shadow: 0 0 10px #ffb547; }
.lm-key__thr { position: absolute; left: 10px; right: 10px; bottom: 8px; height: 4px; border-radius: 2px; background: rgba(255,255,255,.1); overflow: hidden; }
.lm-key__thr s { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb547, #fff7d6); }
.lm-pad.disabled { opacity: .35; pointer-events: none; }

.lm-panel {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(720px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow-y: auto;
  padding: 26px; border: 1px solid rgba(192,132,252,.35); border-radius: 18px;
  background: linear-gradient(180deg, rgba(20,14,44,.95), rgba(8,6,20,.96));
  box-shadow: 0 30px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset;
  animation: lm-pop .4s var(--ease-out);
}
.lm-panel[hidden] { display: none; }
@keyframes lm-pop { from { opacity: 0; transform: translate(-50%, -46%) scale(.97); } }
@keyframes lm-in { from { opacity: 0; transform: translateX(-10px); } }
.lm-panel__kicker { margin: 0; font-family: var(--font-ui); font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--accent-2); }
.lm-panel__title { margin: 6px 0 16px; font-family: var(--font-ui); font-size: clamp(20px, 2.6vw, 28px); line-height: 1.2; }
.lm-panel__title.ok { color: var(--ok); }
.lm-panel__title.bad { color: var(--bad); }
.lm-brief { display: grid; grid-template-columns: 210px 1fr; gap: 22px; align-items: center; }
.lm-brief__art { position: relative; aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: radial-gradient(circle at 50% 120%, #4b4b48 0%, #1b1b1a 45%, #000 70%); }
.lm-brief__art img { position: absolute; left: 50%; top: 46%; width: 78%; transform: translate(-50%, -50%); animation: lm-float 3s ease-in-out infinite; filter: drop-shadow(0 10px 18px rgba(0,0,0,.8)); }
@keyframes lm-float { 50% { transform: translate(-50%, -56%); } }
.lm-rules { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.lm-rules li { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--muted); }
.lm-rules li b { color: var(--fg); }
.lm-rules li i { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; font-style: normal; font-size: 13px; color: var(--accent-ink); background: var(--accent-2); }
.lm-diff { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 18px 0 14px; }
.lm-diff button { padding: 10px 8px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; text-align: center; font: inherit; color: var(--muted); background: rgba(255,255,255,.03); transition: all .2s; }
.lm-diff button b { display: block; font-family: var(--font-ui); font-size: 13px; letter-spacing: .06em; color: var(--fg); }
.lm-diff button small { font-size: 12px; }
.lm-diff button:hover { border-color: var(--accent-2); }
.lm-diff button[aria-pressed="true"] { border-color: var(--accent); background: rgba(168,85,247,.2); box-shadow: var(--glow-soft); }
.lm-keys { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; margin: 0 0 18px; font-size: 13px; color: var(--muted); }
.lm-cap { min-width: 40px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; text-align: center; font-family: var(--font-ui); font-size: 12px; color: var(--fg); background: linear-gradient(180deg, #2a2f3a, #151821); box-shadow: 0 3px 0 #07080c; transition: all .1s; }
.lm-cap.is-on { transform: translateY(3px); box-shadow: 0 0 0 #07080c, 0 0 14px rgba(103,232,249,.7); border-color: #67e8f9; color: #67e8f9; }
.lm-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.lm-go {
  position: relative; overflow: hidden; padding: 16px 30px; border: 0; border-radius: 999px; cursor: pointer;
  font-family: var(--font-ui); font-size: 15px; font-weight: 800; letter-spacing: .14em; color: #fff;
  background: linear-gradient(135deg, #7c3aed, #a855f7 55%, #c084fc); box-shadow: var(--glow); transition: transform .15s, filter .2s;
}
.lm-go:hover, .lm-go:focus-visible { outline: none; filter: brightness(1.15); transform: translateY(-2px); }
.lm-go:active { transform: translateY(1px); }
.lm-alt { padding: 14px 22px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; font: inherit; color: var(--fg); background: transparent; }
.lm-alt:hover { border-color: var(--accent-2); }
.lm-stars { display: flex; justify-content: center; gap: 8px; margin: -4px 0 14px; font-size: 40px; }
.lm-stars span { color: rgba(255,255,255,.15); }
.lm-stars span.on { color: #ffd166; text-shadow: 0 0 18px rgba(255,209,102,.8); animation: lm-star .5s var(--ease-spring) both; }
.lm-stars span:nth-child(2).on { animation-delay: .15s; }
.lm-stars span:nth-child(3).on { animation-delay: .3s; }
@keyframes lm-star { from { transform: scale(0) rotate(-40deg); } }
.lm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
.lm-stats div { padding: 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; text-align: center; background: rgba(255,255,255,.03); }
.lm-stats span { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.lm-stats b { display: block; margin-top: 4px; font-family: var(--font-mono); font-size: 26px; font-weight: 400; color: var(--fg); }
.lm-panel p.lm-text { margin: 0 0 16px; text-align: center; color: var(--muted); line-height: 1.55; }
.lm-count { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; font-family: var(--font-ui); font-size: clamp(80px, 16vw, 180px); font-weight: 900; color: #fff; text-shadow: 0 0 40px rgba(168,85,247,.9); }
.lm-count span { animation: lm-count 1s ease-out both; }
@keyframes lm-count { from { opacity: 0; transform: scale(1.8); } 30% { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.7); } }
.lm canvas.ck-view { position: absolute; inset: 0; }
.ck-monitor {
  position: absolute; left: 53%; bottom: 10px; transform: translateX(-50%); width: clamp(220px, 25vw, 330px);
  padding: 26px 10px 10px; border-radius: 12px; border: 1px solid #0b0d10;
  background: linear-gradient(180deg, #3a3f47, #1d2026); box-shadow: 0 10px 30px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.15);
}
.ck-monitor__label { position: absolute; top: 4px; left: 10px; right: 10px; display: flex; justify-content: space-between; font-family: var(--font-ui); font-size: 10px; letter-spacing: .14em; color: #e5e7eb; }
.ck-monitor__label i { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; align-self: center; }
.ck-monitor__screen { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 10px / 14px; border: 3px solid #0b0d10; background: #000; }
.ck-monitor__screen canvas { filter: grayscale(1) contrast(1.15) brightness(1.1); }
.ck-monitor__screen::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.6)); }
.ck-clock { position: absolute; top: 66px; right: 14px; display: grid; justify-items: center; gap: 6px; padding: 8px 10px 10px; border-radius: 12px; border: 1px solid #0b0d10;
  background: linear-gradient(180deg, #30343b, #1a1d22); box-shadow: 0 8px 22px rgba(0,0,0,.6); font-family: var(--font-ui); font-size: 10px; letter-spacing: .14em; color: #d1d5db; }
.ck-clock svg { width: 92px; height: 92px; }
.ck-live { display: flex; align-items: center; gap: 6px; }
.ck-live i { width: 14px; height: 14px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 12px #ef4444; }
.ck-live.off i { background: #4b5563; box-shadow: none; }
.lm-capcom { left: 50%; top: 9%; bottom: auto; transform: translateX(-50%); width: min(470px, 70%); }
.lm-capcom p:not(:nth-last-child(-n+2)) { display: none; }
.ck-monitor__label b { font-weight: inherit; }
@media (max-width: 720px) {
  .ck-monitor { left: 8px; bottom: 8px; transform: none; width: 36%; padding: 20px 6px 6px; }
  .ck-monitor__label { font-size: 8px; left: 6px; right: 6px; }
  .ck-clock, .ck-long { display: none; }
  .lm-pad { right: 8px; bottom: 10px; gap: 6px; }
  .lm-key { width: 56px !important; height: 56px !important; }
  .lm-key--main { width: 72px !important; height: 72px !important; }
}
@media (max-width: 720px) {
  .lm-hud { top: 8px; left: 8px; width: 172px; padding: 7px 9px; }
  .lm-hud__top { font-size: 12px; margin-bottom: 2px; }
  .lm-hud__cell span { font-size: 10px; }
  .lm-hud__cell b { font-size: 20px; }
  .lm-hud__zone { font-size: 14px; }
  .lm-lights { display: none; }
  .lm-tools { top: 8px; right: 8px; }
  .lm-capcom { left: 50%; top: 206px; bottom: auto; width: calc(100% - 36px); }
  .lm-capcom p { font-size: 12px; padding: 6px 10px; }
  .lm-capcom p:not(:last-child) { display: none; }
  .lm-brief { grid-template-columns: 1fr; }
  .lm-brief__art { display: none; }
  .lm-stats { grid-template-columns: repeat(2, 1fr); }
  .lm-key { width: 62px; height: 62px; }
  .lm-key--main { width: 80px; height: 80px; }
}
@media (prefers-reduced-motion: reduce) {
  .lm-brief__art img, .lm-light.blink { animation: none; }
}
`;

function injectStyles(): void {
  if (document.getElementById('lm-styles')) return;
  const s = document.createElement('style');
  s.id = 'lm-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- sonido
class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  engine: GainNode | null = null;
  rcs: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('novacore:sound') === 'off';
    } catch {
      /* sin almacenamiento */
    }
  }

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
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);
    const noise = this.noiseBuffer(2);

    // motor principal: ruido grave filtrado
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.8;
    this.engine = ctx.createGain();
    this.engine.gain.value = 0;
    src.connect(lp).connect(this.engine).connect(this.master);
    src.start();

    // propulsores RCS: siseo agudo
    const src2 = ctx.createBufferSource();
    src2.buffer = noise;
    src2.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    this.rcs = ctx.createGain();
    this.rcs.gain.value = 0;
    src2.connect(hp).connect(this.rcs).connect(this.master);
    src2.start();
  }

  noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  setEngine(throttle: number, rcs: boolean): void {
    if (!this.ctx || !this.engine || !this.rcs) return;
    const t = this.ctx.currentTime;
    this.engine.gain.setTargetAtTime(throttle * 0.55, t, 0.05);
    this.rcs.gain.setTargetAtTime(rcs ? 0.07 : 0, t, 0.03);
  }

  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Tono "Quindar" de la NASA antes de cada mensaje de Houston. */
  quindar(): void {
    this.tone(2525, 0.25, 'sine', 0.05);
  }

  alarm(): void {
    for (let i = 0; i < 4; i++) {
      this.tone(i % 2 ? 1000 : 750, 0.18, 'square', 0.035, i * 0.2);
    }
  }

  beep(high = false): void {
    this.tone(high ? 1320 : 880, high ? 0.5 : 0.18, 'sine', 0.08);
  }

  crash(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(80, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 2);
    this.tone(48, 0.6, 'sine', 0.5);
  }

  success(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, i * 0.13));
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('novacore:sound', this.muted ? 'off' : 'on');
    } catch {
      /* sin almacenamiento */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  stop(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}

// ---------------------------------------------------------------- módulo lunar (dibujo)
const LM_RES = 4; // resolución del sprite pre-renderizado
const LM_BOX = { x: -44, y: -48, w: 88, h: 88 }; // caja en unidades del mundo

/** Dibuja el módulo lunar Apolo (vista frontal), centro = etapa de descenso. */
function drawLM(ctx: CanvasRenderingContext2D): void {
  const lit = (x0: number, x1: number, light: string, mid: string, dark: string) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, light);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, dark);
    return g;
  };
  const line = (pts: number[], w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  };
  const poly = (pts: number[], fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  };

  // ---- patas laterales (detrás) ----
  for (const s of [-1, 1]) {
    const c = s < 0 ? '#d7d9de' : '#7c808a';
    line([s * 20, -1, s * 31, 26], 2.6, c); // puntal principal
    line([s * 21, 11, s * 30, 23], 1.3, s < 0 ? '#b9bcc4' : '#6a6e78'); // puntal secundario
    line([s * 22, 4, s * 29, 19], 1, s < 0 ? '#a9adb6' : '#5d616b');
    // amortiguador y pie
    line([s * 31, 23, s * 32, 28], 1.8, s < 0 ? '#f1f2f4' : '#9a9ea8');
    ctx.fillStyle = s < 0 ? '#e7e8eb' : '#8d919b';
    ctx.beginPath();
    ctx.ellipse(s * 32, 29.2, 6, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s < 0 ? '#ffffff' : '#a8abb3';
    ctx.beginPath();
    ctx.ellipse(s * 32 - 1, 28.5, 4, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- tobera del motor de descenso ----
  poly([-6, 12, 6, 12, 9.5, 21, -9.5, 21], lit(-9.5, 9.5, '#6e6a63', '#3a3733', '#1b1a18'));
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-9.5, 21);
  ctx.lineTo(9.5, 21);
  ctx.stroke();

  // ---- etapa de descenso (lámina dorada) ----
  const body = [-23, -2, -19, -6, 19, -6, 23, -2, 23, 10, 19, 13, -19, 13, -23, 10];
  poly(body, lit(-23, 23, '#ffe29a', '#d9a441', '#6b4a12'));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(body[0], body[1]);
  for (let i = 2; i < body.length; i += 2) ctx.lineTo(body[i], body[i + 1]);
  ctx.closePath();
  ctx.clip();
  // arrugas de la lámina Kapton
  const r = rng(1969);
  for (let i = 0; i < 70; i++) {
    const x = -23 + r() * 46;
    const y = -6 + r() * 19;
    const w = 2 + r() * 6;
    const h = 1 + r() * 4;
    ctx.fillStyle = r() < 0.5 ? `rgba(255,248,220,${0.08 + r() * 0.22})` : `rgba(70,40,0,${0.08 + r() * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + r() * h);
    ctx.lineTo(x + w * r(), y + h);
    ctx.closePath();
    ctx.fill();
  }
  // paneles negros y plateados (cuadrantes)
  ctx.fillStyle = 'rgba(20,18,16,.85)';
  ctx.fillRect(-23, 2, 7, 11);
  ctx.fillRect(16, 2, 7, 11);
  ctx.fillStyle = 'rgba(210,210,215,.55)';
  ctx.fillRect(-15, -6, 3, 19);
  ctx.fillRect(12, -6, 3, 19);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,40,0,.6)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(body[0], body[1]);
  for (let i = 2; i < body.length; i += 2) ctx.lineTo(body[i], body[i + 1]);
  ctx.closePath();
  ctx.stroke();

  // ---- pata delantera con escalera ----
  line([-4, 12, -2, 29], 2.2, '#c8cbd2');
  line([4, 12, 2, 29], 2.2, '#9a9ea8');
  for (let y = 15; y <= 27; y += 3) line([-3.4, y, 3.2, y], 0.9, '#b5b8c0');
  // porche
  poly([-6, 12, 6, 12, 7, 13.6, -7, 13.6], '#cfd2d8');
  ctx.fillStyle = '#f2f3f5';
  ctx.beginPath();
  ctx.ellipse(0, 31, 7, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-1.2, 30.2, 4.6, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- etapa de ascenso ----
  const asc = [-20, -6, -21.5, -16, -16, -27, -8, -31.5, 8, -31.5, 16, -27, 21.5, -16, 20, -6];
  poly(asc, lit(-21.5, 21.5, '#f4f5f7', '#b9bdc6', '#4f535c'));
  // facetas
  poly([-16, -27, -8, -31.5, -6, -24, -13, -20], 'rgba(255,255,255,.18)');
  poly([16, -27, 8, -31.5, 6, -24, 13, -20], 'rgba(0,0,0,.18)');
  // banda inferior oscura (aislamiento negro)
  poly([-20, -6, 20, -6, 20.6, -10, -20.6, -10], lit(-20, 20, '#3a3c42', '#1d1e22', '#0b0b0d'));
  // escotilla frontal
  ctx.fillStyle = '#2b2d33';
  ctx.fillRect(-5.5, -15.5, 11, 9);
  ctx.strokeStyle = '#8a8e97';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-5.5, -15.5, 11, 9);
  ctx.fillStyle = '#c9ccd3';
  ctx.fillRect(-1, -12, 2, 2);
  // ventanas triangulares
  for (const s of [-1, 1]) {
    const pts = [s * 13, -24, s * 5, -26.5, s * 5, -17.5];
    const g = ctx.createLinearGradient(s * 13, -26, s * 5, -17);
    g.addColorStop(0, '#0a0f1f');
    g.addColorStop(0.55, '#1c2b4f');
    g.addColorStop(1, '#05070d');
    poly(pts, g);
    ctx.strokeStyle = '#2d3038';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.lineTo(pts[2], pts[3]);
    ctx.lineTo(pts[4], pts[5]);
    ctx.closePath();
    ctx.stroke();
    line([s * 10.5, -23.8, s * 7, -25], 0.6, 'rgba(160,200,255,.55)');
  }
  // túnel de acoplamiento
  poly([-5, -31.5, 5, -31.5, 5, -36, -5, -36], lit(-5, 5, '#e9eaee', '#b0b4bd', '#6a6e78'));
  ctx.fillStyle = '#555963';
  ctx.fillRect(-5.5, -37, 11, 1.4);

  // ---- antenas ----
  // radar de encuentro (arriba izquierda)
  line([-9, -31, -12, -37], 1, '#c9ccd3');
  ctx.fillStyle = '#e7e8eb';
  ctx.beginPath();
  ctx.ellipse(-13.5, -39, 5, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fa3ac';
  ctx.beginPath();
  ctx.ellipse(-13, -38.6, 3, 2.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // antena banda S orientable (arriba derecha)
  line([12, -29, 18, -36], 1, '#a9adb6');
  ctx.fillStyle = '#c9ccd3';
  ctx.beginPath();
  ctx.ellipse(19.5, -38, 4.2, 3.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6c707a';
  ctx.beginPath();
  ctx.ellipse(19.8, -37.7, 2.4, 1.8, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // antenas VHF
  line([-17, -26, -23, -41], 0.7, '#d7d9de');
  line([17, -26, 24, -42], 0.7, '#8d919b');

  // ---- cuadrantes RCS ----
  for (const s of [-1, 1]) {
    const x = s * 25;
    line([s * 21, -19, x, -19], 1.4, s < 0 ? '#c9ccd3' : '#7c808a');
    ctx.fillStyle = s < 0 ? '#d9dbe0' : '#7f838d';
    ctx.fillRect(x - 2.5, -22, 5, 6);
    ctx.fillStyle = '#2a2c31';
    ctx.fillRect(x - 1.2, -25, 2.4, 3); // tobera arriba
    ctx.fillRect(x - 1.2, -16, 2.4, 3); // tobera abajo
    ctx.fillRect(x + s * 2.5, -20.2, s * 3, 2.4); // tobera lateral
  }
}

function renderLMSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = LM_BOX.w * LM_RES;
  c.height = LM_BOX.h * LM_RES;
  const ctx = c.getContext('2d')!;
  ctx.scale(LM_RES, LM_RES);
  ctx.translate(-LM_BOX.x, -LM_BOX.y);
  drawLM(ctx);
  return c;
}

// ---------------------------------------------------------------- Tierra (disco iluminado)
function renderEarth(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const land = makeNoise(3);
  const clouds = makeNoise(11);
  const L = { x: -0.75, y: -0.15, z: 0.64 };
  const R = size / 2 - 3;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - size / 2) / R;
      const dy = (py - size / 2) / R;
      const d2 = dx * dx + dy * dy;
      const i = (py * size + px) * 4;
      if (d2 > 1) {
        // atmósfera
        const a = Math.max(0, 1 - (Math.sqrt(d2) - 1) * 12);
        img.data[i] = 90;
        img.data[i + 1] = 150;
        img.data[i + 2] = 255;
        img.data[i + 3] = a * 120 * Math.max(0, -dx * 0.8 + 0.4);
        continue;
      }
      const nz = Math.sqrt(1 - d2);
      const lon = Math.atan2(dx, nz) + 1.2;
      const lat = Math.asin(dy);
      const u = (lon / Math.PI) * 2;
      const v = (lat / Math.PI) * 2 + 1;
      const h = fbm(land, u + 4, v + 2, 5);
      const cl = fbm(clouds, u * 2 + 1, v * 2, 4);
      let r: number;
      let g: number;
      let b: number;
      if (Math.abs(lat) > 1.25) [r, g, b] = [235, 240, 245];
      else if (h > 0.54) {
        const t = Math.min(1, (h - 0.54) * 6);
        [r, g, b] = [80 + t * 100, 110 + t * 50, 60 + t * 30];
      } else [r, g, b] = [18, 60, 140];
      const cw = Math.max(0, Math.min(1, (cl - 0.48) * 3));
      r += (250 - r) * cw;
      g += (252 - g) * cw;
      b += (255 - b) * cw;
      const shade = Math.max(0, dx * L.x + dy * L.y + nz * L.z);
      const rim = Math.pow(1 - nz, 3) * 0.6;
      const k = Math.min(1, shade * 1.3);
      img.data[i] = r * k + 60 * rim * k;
      img.data[i + 1] = g * k + 120 * rim * k;
      img.data[i + 2] = b * k + 255 * rim * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- juego
export default function lunarLanding({ root, win }: GameContext): () => void {
  injectStyles();
  const sound = new Sound();
  const lmSprite = renderLMSprite();
  const earthImg = renderEarth(120);

  root.innerHTML = `
    <div class="lm">
      <canvas class="ck-view" aria-label="Vista desde la ventana del módulo lunar: centra la zona de alunizaje en la mira"></canvas>
      <div class="ck-monitor" aria-hidden="true">
        <span class="ck-monitor__label"><span><b class="ck-long">CÁMARA DE ALUNIZAJE · </b>CH. 4</span><i></i></span>
        <div class="ck-monitor__screen"><canvas></canvas></div>
      </div>
      <div class="ck-clock" aria-hidden="true">
        <span>UTC · HOUSTON</span>
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0b0d10" stroke="#555b66" stroke-width="4"/>
          ${Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="9" x2="50" y2="${i % 3 ? 15 : 19}" stroke="#e5e7eb" stroke-width="${i % 3 ? 2 : 3.5}" transform="rotate(${i * 30} 50 50)"/>`).join('')}
          <line data-hh x1="50" y1="50" x2="50" y2="28" stroke="#f3f4f6" stroke-width="5" stroke-linecap="round"/>
          <line data-mm x1="50" y1="50" x2="50" y2="16" stroke="#f3f4f6" stroke-width="3" stroke-linecap="round"/>
          <line data-ss x1="50" y1="56" x2="50" y2="14" stroke="#ef4444" stroke-width="1.5"/>
          <circle cx="50" cy="50" r="3.5" fill="#ef4444"/></svg>
        <span class="ck-live" data-live><i></i>SEÑAL EN VIVO</span>
      </div>
      <div class="lm-hud" hidden>
        <div class="lm-hud__top"><span>LM · DSKY</span><span data-prog>PROG 64</span></div>
        <div class="lm-hud__grid">
          <div class="lm-hud__cell"><span>ALTITUD</span><b data-alt>—</b></div>
          <div class="lm-hud__cell"><span>V. VERT.</span><b data-vy>—</b></div>
          <div class="lm-hud__cell"><span>V. HORIZ.</span><b data-vx>—</b></div>
          <div class="lm-hud__cell"><span>TIEMPO</span><b data-time>0:00</b></div>
          <div class="lm-hud__cell lm-hud__fuel"><span>COMBUSTIBLE <em data-fuelp>100%</em></span><i><s data-fuel></s></i></div>
          <div class="lm-hud__zone" data-zone></div>
        </div>
        <div class="lm-lights">
          <div class="lm-light" data-l-contact>CONTACTO</div>
          <div class="lm-light" data-l-fuel>COMB. BAJO</div>
          <div class="lm-light" data-l-alarm>ALARMA</div>
        </div>
      </div>
      <div class="lm-tools">
        <button type="button" class="lm-tool" data-mute aria-label="Silenciar sonido"></button>
      </div>
      <div class="lm-capcom" aria-live="polite"></div>
      <div class="lm-pad disabled">
        <button type="button" class="lm-key" data-ctl="left" aria-label="Propulsores: mover a la izquierda"><span class="lm-key__icon">◀</span>RCS</button>
        <button type="button" class="lm-key lm-key--main" data-ctl="up" aria-label="Motor de descenso"><span class="lm-key__icon">▲</span>MOTOR<i class="lm-key__thr"><s></s></i></button>
        <button type="button" class="lm-key" data-ctl="right" aria-label="Propulsores: mover a la derecha"><span class="lm-key__icon">▶</span>RCS</button>
      </div>
      <div class="lm-panel" data-panel></div>
      <div class="lm-count" data-count></div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('.ck-monitor canvas');
  const vcanvas = $<HTMLCanvasElement>('canvas.ck-view');
  const cockpit = createCockpit(vcanvas, earthImg);
  const liveEl = $('[data-live]');
  const ctx = canvas.getContext('2d')!;
  const hud = $('.lm-hud');
  const hudAlt = $('[data-alt]');
  const hudVy = $('[data-vy]');
  const hudVx = $('[data-vx]');
  const hudTime = $('[data-time]');
  const hudFuel = $('[data-fuel]');
  const hudFuelP = $('[data-fuelp]');
  const hudZone = $('[data-zone]');
  const hudProg = $('[data-prog]');
  const lContact = $('[data-l-contact]');
  const lFuel = $('[data-l-fuel]');
  const lAlarm = $('[data-l-alarm]');
  const capcom = $('.lm-capcom');
  const pad = $('.lm-pad');
  const thrBar = $<HTMLElement>('.lm-key__thr s');
  const panel = $('[data-panel]');
  const countEl = $('[data-count]');
  const muteBtn = $<HTMLButtonElement>('[data-mute]');
  const keyBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ctl]'));

  // ---------- estado ----------
  let difficulty: Difficulty = 'piloto';
  let cfg = LEVELS[difficulty];
  let status: Status = 'brief';
  const input = { up: false, left: false, right: false };
  const touch = { up: false, left: false, right: false };
  let W = 1000;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let throttle = 0;
  let fuel = 100;
  let flightTime = 0;
  let time = 0;
  let zoneX1 = 0;
  let zoneX2 = 0;
  let profile: Float32Array = new Float32Array(0); // altura del suelo cada 4 unidades
  let particles: Particle[] = [];
  let groundCanvas: HTMLCanvasElement | null = null;
  let mountainCanvas: HTMLCanvasElement | null = null;
  let skyCanvas: HTMLCanvasElement | null = null;
  let flash = 0;
  let shake = 0;
  const timers: number[] = [];
  const flags = { alarm: false, alarmAt: 0, fuel60: false, fuel30: false, alts: new Set<number>() };
  let alarmUntil = 0;
  let contactUntil = 0;
  // cámara
  let camZ = 1;
  let camX = 0;
  let camY = H / 2;

  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  // ---------- terreno ----------
  const STEP = 4;
  const groundAt = (px: number): number => {
    const f = Math.max(0, Math.min(profile.length - 1.001, px / STEP));
    const i = Math.floor(f);
    const t = f - i;
    return profile[i] * (1 - t) + profile[i + 1] * t;
  };

  const buildWorld = () => {
    const seed = Math.floor(Math.random() * 1e6);
    const noise = makeNoise(seed);
    const rand = rng(seed + 1);
    const n = Math.ceil(W / STEP) + 1;
    profile = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = (i * STEP) / W;
      profile[i] = H * 0.74 + (fbm(noise, u * 6, 3.3, 5) - 0.5) * 150;
    }
    // zona de alunizaje (plana, lejos de los bordes)
    const zw = cfg.zone;
    const zc = W * (0.25 + rand() * 0.5);
    zoneX1 = zc - zw / 2;
    zoneX2 = zc + zw / 2;
    // cráteres en el perfil (fuera de la zona)
    const craters = 5 + Math.floor(rand() * 4);
    for (let k = 0; k < craters; k++) {
      const cw = 40 + rand() * 120;
      const cx = rand() * W;
      if (cx + cw > zoneX1 - 30 && cx - cw < zoneX2 + 30) continue;
      const depth = cw * (0.1 + rand() * 0.06);
      for (let i = 0; i < n; i++) {
        const d = (i * STEP - cx) / cw;
        if (Math.abs(d) < 1.5) {
          const bowl = Math.abs(d) < 1 ? (1 - d * d) * depth : 0;
          const rim = Math.exp(-Math.pow((Math.abs(d) - 1) * 4, 2)) * depth * 0.35;
          profile[i] += bowl - rim;
        }
      }
    }
    // aplanar la zona con transición suave
    const i1 = Math.floor(zoneX1 / STEP);
    const i2 = Math.ceil(zoneX2 / STEP);
    let avg = 0;
    for (let i = i1; i <= i2; i++) avg += profile[i];
    avg /= i2 - i1 + 1;
    for (let i = 0; i < n; i++) {
      const px = i * STEP;
      const dist = px < zoneX1 ? zoneX1 - px : px > zoneX2 ? px - zoneX2 : 0;
      const t = Math.max(0, 1 - dist / 70);
      const s = t * t * (3 - 2 * t);
      profile[i] = profile[i] * (1 - s) + avg * s;
    }
    groundCanvas = renderGround(rand, noise);
    mountainCanvas = renderMountains(seed);
    cockpit.build(W, zoneX1, zoneX2, seed);
  };

  const renderGround = (rand: () => number, noise: ReturnType<typeof makeNoise>): HTMLCanvasElement => {
    const R = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * R);
    c.height = H * R;
    const g = c.getContext('2d')!;
    g.scale(R, R);
    const path = () => {
      g.beginPath();
      g.moveTo(0, H);
      for (let i = 0; i < profile.length; i++) g.lineTo(i * STEP, profile[i]);
      g.lineTo(W, H);
      g.closePath();
    };
    // relleno base: regolito más claro arriba, más oscuro hacia abajo
    path();
    const grad = g.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, '#8d8c87');
    grad.addColorStop(0.35, '#6f6e6a');
    grad.addColorStop(1, '#3a3937');
    g.fillStyle = grad;
    g.fill();
    g.save();
    path();
    g.clip();
    // manchas grandes de albedo
    for (let k = 0; k < 40; k++) {
      const px = rand() * W;
      const py = H * 0.6 + rand() * H * 0.4;
      const rr = 30 + rand() * 90;
      const rg = g.createRadialGradient(px, py, 0, px, py, rr);
      const light = rand() < 0.5;
      rg.addColorStop(0, light ? 'rgba(200,198,190,.12)' : 'rgba(30,30,28,.14)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(px - rr, py - rr * 0.4, rr * 2, rr * 0.8);
    }
    // cráteres vistos en perspectiva (elipses aplanadas)
    for (let k = 0; k < 70; k++) {
      const px = rand() * W;
      if (px > zoneX1 - 20 && px < zoneX2 + 20 && rand() < 0.85) continue;
      const top = groundAt(px);
      const depthBelow = Math.pow(rand(), 1.6) * (H - top - 10);
      const py = top + 8 + depthBelow;
      const persp = 0.6 + (depthBelow / (H - top)) * 0.8; // más grandes cuanto más cerca
      const rx = (3 + Math.pow(rand(), 2.2) * 26) * persp;
      const ry = rx * (0.22 + (depthBelow / H) * 0.25);
      // interior: sombra a la izquierda, pared derecha iluminada (Sol desde la izquierda)
      const cg = g.createLinearGradient(px - rx, 0, px + rx, 0);
      cg.addColorStop(0, 'rgba(18,18,17,.75)');
      cg.addColorStop(0.45, 'rgba(45,45,43,.55)');
      cg.addColorStop(0.75, 'rgba(150,148,142,.35)');
      cg.addColorStop(1, 'rgba(210,208,200,.55)');
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      // borde
      g.strokeStyle = 'rgba(190,188,180,.35)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(px, py - ry * 0.12, rx * 1.08, ry * 1.15, 0, Math.PI, Math.PI * 2);
      g.stroke();
    }
    // grano fino del regolito
    g.restore();
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const nn = (Math.random() - 0.5) * 22;
      d[i] += nn;
      d[i + 1] += nn;
      d[i + 2] += nn;
    }
    g.putImageData(img, 0, 0);
    g.setTransform(R, 0, 0, R, 0, 0);
    // rocas con sombras largas hacia la derecha
    for (let k = 0; k < 90; k++) {
      const px = rand() * W;
      if (px > zoneX1 - 10 && px < zoneX2 + 10) continue;
      const top = groundAt(px);
      const py = top + Math.pow(rand(), 2) * (H - top) * 0.9 + 1;
      const s = (0.8 + Math.pow(rand(), 3) * 6) * (0.7 + ((py - top) / H) * 1.5);
      g.fillStyle = 'rgba(10,10,10,.55)';
      g.beginPath();
      g.ellipse(px + s * 2.2, py + s * 0.15, s * 2.4, s * 0.35, 0, 0, Math.PI * 2);
      g.fill();
      const rg = g.createLinearGradient(px - s, 0, px + s, 0);
      rg.addColorStop(0, '#c9c7c0');
      rg.addColorStop(1, '#4a4946');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(px, py - s * 0.35, s, s * 0.65, 0, 0, Math.PI * 2);
      g.fill();
    }
    // borde del horizonte con iluminación según la pendiente
    for (let i = 0; i < profile.length - 1; i++) {
      const dy = profile[i + 1] - profile[i];
      const facing = -dy / STEP; // > 0: sube hacia la derecha → mira al Sol
      const l = Math.max(0, Math.min(1, 0.5 + facing * 1.6));
      const v = Math.round(90 + l * 140);
      g.strokeStyle = `rgb(${v},${v - 2},${v - 8})`;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(i * STEP, profile[i]);
      g.lineTo((i + 1) * STEP, profile[i + 1]);
      g.stroke();
    }
    // textura sutil a lo largo de la superficie
    for (let i = 0; i < W; i += 2) {
      const n = fbm(noise, i * 0.05, 9.1, 3);
      g.fillStyle = `rgba(0,0,0,${Math.max(0, n - 0.5) * 0.4})`;
      g.fillRect(i, groundAt(i) + 2, 2, 6 + n * 8);
    }
    return c;
  };

  const renderMountains = (seed: number): HTMLCanvasElement => {
    const R = 1.5;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * R);
    c.height = H * R;
    const g = c.getContext('2d')!;
    g.scale(R, R);
    // macizos redondeados como los Montes Apeninos de las fotos del Apolo 15
    const layers = [
      { base: H * 0.52, amp: 230, freq: 1.6, top: 112, bottom: 46, s: seed + 7 },
      { base: H * 0.63, amp: 150, freq: 2.6, top: 128, bottom: 58, s: seed + 13 },
    ];
    for (const L of layers) {
      const nz = makeNoise(L.s);
      const n = Math.ceil(W / 2) + 2;
      const hs = new Float32Array(n);
      for (let i = 0; i < n; i++) hs[i] = L.base - Math.pow(fbm(nz, ((i * 2) / W) * L.freq, 1.7, 3), 1.8) * L.amp;
      // silueta con degradado base
      g.beginPath();
      g.moveTo(0, H);
      for (let i = 0; i < n; i++) g.lineTo(i * 2, hs[i]);
      g.lineTo(W, H);
      g.closePath();
      const base = g.createLinearGradient(0, L.base - L.amp, 0, H);
      base.addColorStop(0, `rgb(${L.top - 30},${L.top - 31},${L.top - 34})`);
      base.addColorStop(0.5, `rgb(${L.bottom},${L.bottom - 1},${L.bottom - 3})`);
      base.addColorStop(1, '#141413');
      g.fillStyle = base;
      g.fill();
      // laderas que miran al Sol (izquierda) más claras, con pendiente suavizada
      g.save();
      g.clip();
      for (let i = 4; i < n - 4; i++) {
        const slope = (hs[i + 4] - hs[i - 4]) / 16; // < 0: sube hacia la derecha
        const lit = Math.max(0, Math.min(1, -slope * 1.4 + 0.15));
        if (lit < 0.03) continue;
        const v = L.top + 40;
        const gr = g.createLinearGradient(0, hs[i], 0, hs[i] + 160);
        gr.addColorStop(0, `rgba(${v},${v - 2},${v - 6},${0.75 * lit})`);
        gr.addColorStop(1, `rgba(${v},${v - 2},${v - 6},0)`);
        g.fillStyle = gr;
        g.fillRect(i * 2, hs[i], 2.2, 160);
      }
      g.restore();
      // borde superior nítido
      g.strokeStyle = `rgba(${L.top + 50},${L.top + 48},${L.top + 42},.35)`;
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, i * 2, hs[i]);
      g.stroke();
    }
    return c;
  };

  const renderSky = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    const rand = rng(77);
    const count = Math.round((c.width * c.height) / 2600);
    for (let i = 0; i < count; i++) {
      const a = Math.pow(rand(), 2.5);
      g.fillStyle = `rgba(${220 + rand() * 35},${225 + rand() * 30},255,${0.15 + a * 0.75})`;
      const s = rand() < 0.03 ? 2 : 1;
      g.fillRect(rand() * c.width, rand() * c.height * 0.8, s, s);
    }
    skyCanvas = c;
  };

  // ---------- cámara y dibujo ----------
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    renderSky();
    cockpit.resize();
  };

  /** En pantallas verticales se deja ver más cielo para que el suelo y el módulo quepan. */
  const skyTop = () => (canvas.height > canvas.width ? -H * 0.3 : 0);

  const view = () => {
    const top = skyTop();
    const base = canvas.height / (H - top);
    const scale = base * camZ;
    const vw = canvas.width / scale;
    const vh = canvas.height / scale;
    const cx = Math.max(vw / 2, Math.min(W - vw / 2, camX));
    const cy = Math.max(top + vh / 2, Math.min(H - vh / 2, camY));
    return { scale, ox: canvas.width / 2 - cx * scale, oy: canvas.height / 2 - cy * scale, base };
  };

  const altitude = () => Math.max(0, Math.min(groundAt(x - PAD_X), groundAt(x), groundAt(x + PAD_X)) - (y + LEG_Y));

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (skyCanvas) ctx.drawImage(skyCanvas, 0, 0);
    else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const v = view();
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * dpr : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * dpr : 0;

    // Tierra (casi fija, leve parallax)
    const es = Math.min(canvas.width, canvas.height) * 0.11;
    ctx.drawImage(earthImg, canvas.width * 0.78 - (camX - W / 2) * 0.02 * v.base, canvas.height * 0.1, es, es);

    // montañas (parallax)
    if (mountainCanvas) {
      const mz = 1 + (camZ - 1) * 0.35;
      const ms = v.base * mz;
      const mvw = canvas.width / ms;
      const mcx = W / 2 + (camX - W / 2) * 0.35;
      const mcy = H / 2 + (camY - H / 2) * 0.2;
      const cx = Math.max(mvw / 2, Math.min(W - mvw / 2, mcx));
      const mvh = canvas.height / ms;
      const cy = Math.max(skyTop() + mvh / 2, Math.min(H - mvh / 2, mcy));
      ctx.setTransform(ms, 0, 0, ms, canvas.width / 2 - cx * ms + sx, canvas.height / 2 - cy * ms + sy);
      ctx.drawImage(mountainCanvas, 0, 0, W, H);
    }

    ctx.setTransform(v.scale, 0, 0, v.scale, v.ox + sx, v.oy + sy);
    if (groundCanvas) ctx.drawImage(groundCanvas, 0, 0, W, H);

    const alt = altitude();
    const gy = groundAt(x);

    // zona de alunizaje (marcador holográfico)
    if (status !== 'landed') {
      const zy = groundAt((zoneX1 + zoneX2) / 2);
      const pulse = 0.55 + 0.45 * Math.sin(time * 4);
      ctx.strokeStyle = `rgba(103,232,249,${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 2 / camZ;
      ctx.setLineDash([8 / camZ, 6 / camZ]);
      ctx.beginPath();
      ctx.moveTo(zoneX1, zy + 1);
      ctx.lineTo(zoneX2, zy + 1);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const zx of [zoneX1, zoneX2]) {
        ctx.beginPath();
        ctx.moveTo(zx, zy - 14);
        ctx.lineTo(zx, zy + 3);
        ctx.stroke();
      }
      const zg = ctx.createLinearGradient(0, zy - 60, 0, zy);
      zg.addColorStop(0, 'rgba(103,232,249,0)');
      zg.addColorStop(1, `rgba(103,232,249,${0.08 + pulse * 0.07})`);
      ctx.fillStyle = zg;
      ctx.fillRect(zoneX1, zy - 60, zoneX2 - zoneX1, 60);
      ctx.fillStyle = `rgba(103,232,249,${0.6 + pulse * 0.4})`;
      ctx.font = `700 ${11 / Math.max(1, camZ * 0.8)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ZONA DE ALUNIZAJE', (zoneX1 + zoneX2) / 2, zy - 22);
    }

    // brillo del motor sobre el suelo
    if (throttle > 0.05 && alt < 160 && status === 'flying') {
      const k = throttle * (1 - alt / 160);
      const rg = ctx.createRadialGradient(x, gy, 0, x, gy, 70);
      rg.addColorStop(0, `rgba(255,220,170,${0.35 * k})`);
      rg.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - 70, gy - 70, 140, 140);
    }

    // sombra del módulo (Sol bajo a la izquierda → sombra larga a la derecha)
    if (status !== 'crashed') {
      const off = Math.min(220, alt * 1.4);
      const sxp = x + 18 + off;
      const syp = groundAt(sxp) + 1;
      const a = Math.max(0, 0.6 - alt / 600);
      if (a > 0.02) {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.beginPath();
        ctx.ellipse(sxp, syp, 34 + alt * 0.04, 4 + alt * 0.01, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // partículas detrás del módulo (polvo)
    drawParticles(true);

    if (status !== 'crashed') {
      // chorro del motor (en el vacío es tenue: núcleo brillante + cono suave)
      if (throttle > 0.02 && fuel > 0 && (status === 'flying' || status === 'countdown')) {
        const len = 18 + throttle * (34 + Math.random() * 14);
        const top = y + 21;
        const cone = ctx.createLinearGradient(0, top, 0, top + len);
        cone.addColorStop(0, `rgba(255,250,235,${0.95 * throttle})`);
        cone.addColorStop(0.25, `rgba(255,190,120,${0.55 * throttle})`);
        cone.addColorStop(1, 'rgba(160,140,255,0)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(x - 8.5, top);
        ctx.lineTo(x + 8.5, top);
        ctx.lineTo(x + 15 + Math.random() * 3, top + len);
        ctx.lineTo(x - 15 - Math.random() * 3, top + len);
        ctx.closePath();
        ctx.fill();
        const core = ctx.createRadialGradient(x, top + 2, 0, x, top + 2, 12);
        core.addColorStop(0, `rgba(255,255,255,${throttle})`);
        core.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = core;
        ctx.fillRect(x - 12, top - 10, 24, 24);
      }
      ctx.drawImage(lmSprite, x + LM_BOX.x, y + LM_BOX.y, LM_BOX.w, LM_BOX.h);
      // sondas de contacto (se doblan al tocar)
      if (status === 'flying' || status === 'countdown') {
        ctx.strokeStyle = '#c9ccd3';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const px of [-PAD_X, PAD_X]) {
          ctx.moveTo(x + px, y + 30);
          ctx.lineTo(x + px * 1.08, y + 41);
        }
        ctx.stroke();
      }
    }

    drawParticles(false);

    // destello (choque)
    if (flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,240,220,${flash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const drawParticles = (back: boolean) => {
    for (const p of particles) {
      const isBack = p.kind === 'dust';
      if (isBack !== back) continue;
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'debris') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = p.kind === 'dust' ? a * 0.55 : p.kind === 'puff' ? a * 0.8 : a;
      ctx.fillStyle = p.color;
      if (p.kind === 'dust') {
        ctx.fillRect(p.x - p.size, p.y - p.size * 0.3, p.size * 2.4, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === 'puff' ? 1 + (1 - a) * 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ---------- física ----------
  const emitDust = (dt: number) => {
    const alt = altitude();
    if (alt > 90 || throttle < 0.1) return;
    const k = throttle * (1 - alt / 90);
    const n = Math.round(k * 160 * dt) + (Math.random() < k ? 1 : 0);
    const gy = groundAt(x);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const sp = 120 + Math.random() * 220;
      particles.push({
        x: x + dir * Math.random() * 10,
        y: gy - Math.random() * 3,
        vx: dir * sp * k,
        vy: -Math.random() * 25,
        life: 0.5 + Math.random() * 0.6,
        max: 1.1,
        size: 1 + Math.random() * 2.2,
        kind: 'dust',
        color: Math.random() < 0.5 ? '#b9b7b0' : '#8f8d87',
        rot: 0,
        vr: 0,
      });
    }
  };

  const emitPuff = (side: -1 | 1) => {
    // side = lado del cuadrante que dispara; el chorro sale hacia afuera
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: x + side * 30,
        y: y - 19 + (Math.random() - 0.5) * 2,
        vx: side * (60 + Math.random() * 40) + vx,
        vy: (Math.random() - 0.5) * 20 + vy,
        life: 0.25,
        max: 0.25,
        size: 1.5 + Math.random(),
        kind: 'puff',
        color: '#f4f7ff',
        rot: 0,
        vr: 0,
      });
    }
  };

  const explode = () => {
    const colors = ['#d9a441', '#ffe29a', '#c9ccd3', '#7c808a', '#2b2d33'];
    for (let i = 0; i < 70; i++) {
      const a = -Math.PI * Math.random();
      const s = 60 + Math.random() * 220;
      particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(a) * s + vx * 0.5,
        vy: Math.sin(a) * s,
        life: 2 + Math.random() * 2,
        max: 4,
        size: 2 + Math.random() * 6,
        kind: 'debris',
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 14,
      });
    }
    for (let i = 0; i < 50; i++) {
      const a = -Math.PI * Math.random();
      const s = 40 + Math.random() * 160;
      particles.push({
        x,
        y: y + 20,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.5,
        life: 1 + Math.random() * 1.5,
        max: 2.5,
        size: 2 + Math.random() * 4,
        kind: 'dust',
        color: '#a8a69f',
        rot: 0,
        vr: 0,
      });
      particles.push({
        x,
        y: y + 10,
        vx: Math.cos(a) * s * 1.5,
        vy: Math.sin(a) * s * 1.5,
        life: 0.4 + Math.random() * 0.5,
        max: 0.9,
        size: 1 + Math.random() * 2,
        kind: 'spark',
        color: Math.random() < 0.5 ? '#fff3c4' : '#ffb547',
        rot: 0,
        vr: 0,
      });
    }
  };

  const update = (dt: number) => {
    time += dt;
    flash = Math.max(0, flash - dt * 2.5);
    shake = Math.max(0, shake - dt * 30);

    const up = input.up || touch.up;
    const left = input.left || touch.left;
    const right = input.right || touch.right;
    const active = status === 'flying';

    const target = active && up && fuel > 0 ? 1 : 0;
    throttle += (target - throttle) * Math.min(1, dt * 10);

    if (active) {
      flightTime += dt;
      let ax = 0;
      let ay = GRAVITY - THRUST * throttle;
      if (fuel > 0) {
        fuel -= FUEL_MAIN * throttle * dt * (100 / cfg.fuel);
        if (left) {
          ax -= SIDE;
          fuel -= FUEL_SIDE * dt * (100 / cfg.fuel);
          if (Math.random() < dt * 30) emitPuff(1);
        }
        if (right) {
          ax += SIDE;
          fuel -= FUEL_SIDE * dt * (100 / cfg.fuel);
          if (Math.random() < dt * 30) emitPuff(-1);
        }
        fuel = Math.max(0, fuel);
      } else ay = GRAVITY;
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      if (x < 50) {
        x = 50;
        vx = Math.max(0, vx);
      }
      if (x > W - 50) {
        x = W - 50;
        vx = Math.min(0, vx);
      }
      if (y < 60) {
        y = 60;
        vy = Math.max(0, vy);
      }
      emitDust(dt);
      checkEvents();
      const lowest = Math.min(groundAt(x - PAD_X), groundAt(x), groundAt(x + PAD_X));
      if (y + LEG_Y >= lowest) {
        y = lowest - LEG_Y;
        touchdown();
      }
    }
    sound.setEngine(active ? throttle : 0, active && fuel > 0 && (left || right));

    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'dust') {
        p.vy += GRAVITY * dt;
        p.vx *= 1 - dt * 0.6;
        const g = groundAt(p.x);
        if (p.y > g) {
          p.y = g;
          p.vy = 0;
        }
      } else if (p.kind === 'debris' || p.kind === 'spark') {
        p.vy += GRAVITY * 1.5 * dt;
        p.rot += p.vr * dt;
        const g = groundAt(p.x);
        if (p.y > g) {
          p.y = g;
          p.vy *= -0.3;
          p.vx *= 0.6;
          p.vr *= 0.5;
        }
      }
    }
    particles = particles.filter((p) => p.life > 0);
    if (particles.length > 900) particles.splice(0, particles.length - 900);

    // cámara: se acerca al bajar
    const alt = altitude();
    const zt = status === 'brief' ? 1 : alt < 260 ? 1 + (1 - alt / 260) * 0.95 : 1;
    camZ += (zt - camZ) * Math.min(1, dt * 1.8);
    const tx = status === 'brief' ? W / 2 : x;
    const ty = status === 'brief' ? H / 2 : y + 30;
    camX += (tx - camX) * Math.min(1, dt * 3);
    camY += (ty - camY) * Math.min(1, dt * 3);

    updateHud();
  };

  // ---------- avisos de Houston ----------
  const say = (text: string, from: 'houston' | 'lm' = 'houston') => {
    if (from === 'houston') sound.quindar();
    capcom.querySelectorAll('p').forEach((p) => p.classList.add('old'));
    const p = document.createElement('p');
    if (from === 'lm') p.className = 'lm-from-lm';
    p.innerHTML = `<b>${from === 'houston' ? 'HOUSTON' : 'FALCON'}</b>${text}`;
    capcom.appendChild(p);
    while (capcom.children.length > 3) capcom.firstElementChild!.remove();
  };

  const checkEvents = () => {
    const altM = altitude() / PX_PER_M;
    // alarma 1202 (como en el Apolo 11), solo una vez y sin efecto en la física
    if (!flags.alarm && flightTime > flags.alarmAt) {
      flags.alarm = true;
      alarmUntil = time + 3;
      sound.alarm();
      say('Alarma de programa ¡1202! ¿Qué hacemos?', 'lm');
      later(1600, () => say('Seguimos adelante con esa alarma. ¡GO! Es solo la computadora sobrecargada.'));
    }
    for (const mark of [30, 20, 10, 5]) {
      if (altM < mark && !flags.alts.has(mark)) {
        flags.alts.add(mark);
        const desc = (vy / PX_PER_M).toFixed(1);
        say(`${mark} metros, bajando a ${desc} m/s.`, 'lm');
      }
    }
    if (!flags.fuel60 && fuel < 30) {
      flags.fuel60 = true;
      say('Combustible: 60 segundos.');
    }
    if (!flags.fuel30 && fuel < 15) {
      flags.fuel30 = true;
      sound.beep();
      say('¡30 segundos! Aterriza ya.');
    }
  };

  // ---------- HUD ----------
  const updateHud = () => {
    const alt = altitude();
    hudAlt.textContent = `${(alt / PX_PER_M).toFixed(1)}`;
    const vyM = vy / PX_PER_M;
    hudVy.textContent = `${vyM > 0.05 ? '↓' : vyM < -0.05 ? '↑' : ' '}${Math.abs(vyM).toFixed(1)}`;
    const vxM = vx / PX_PER_M;
    hudVx.textContent = `${vxM > 0.05 ? '→' : vxM < -0.05 ? '←' : ' '}${Math.abs(vxM).toFixed(1)}`;
    const warnVy = vy > cfg.vy;
    const warnVx = Math.abs(vx) > cfg.vx;
    hudVy.classList.toggle('warn', warnVy);
    hudVx.classList.toggle('warn', warnVx);
    hudVy.classList.toggle('ok', !warnVy && alt < 120);
    hudVx.classList.toggle('ok', !warnVx && alt < 120);
    const s = Math.floor(flightTime);
    hudTime.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    hudFuel.style.width = `${fuel}%`;
    hudFuel.classList.toggle('warn', fuel < 25);
    hudFuelP.textContent = `${Math.ceil(fuel)}%`;
    const zc = (zoneX1 + zoneX2) / 2;
    const dist = (zc - x) / PX_PER_M;
    const inside = x - PAD_X >= zoneX1 && x + PAD_X <= zoneX2;
    hudZone.textContent = inside ? '◆ SOBRE LA ZONA' : `ZONA: ${dist < 0 ? '←' : ''} ${Math.abs(dist).toFixed(0)} m ${dist > 0 ? '→' : ''}`;
    hudProg.textContent = alt / PX_PER_M > 15 ? 'PROG 64' : 'PROG 66';
    lFuel.className = `lm-light${fuel < 25 ? ' on-amber' : ''}${fuel < 12 ? ' blink' : ''}`;
    lAlarm.className = `lm-light${time < alarmUntil ? ' on-red blink' : ''}`;
    lContact.className = `lm-light${time < contactUntil || status === 'landed' ? ' on-green' : ''}`;
    thrBar.style.width = `${throttle * 100}%`;
    // botones iluminados (teclado o táctil)
    keyBtns.forEach((b) => {
      const k = b.dataset.ctl as keyof typeof input;
      b.classList.toggle('is-on', status === 'flying' && (input[k] || touch[k]));
    });
  };

  // ---------- aterrizaje / choque ----------
  const touchdown = () => {
    const inZone = x - PAD_X >= zoneX1 && x + PAD_X <= zoneX2;
    const vyOk = vy <= cfg.vy;
    const vxOk = Math.abs(vx) <= cfg.vx;
    const vyM = vy / PX_PER_M;
    const vxM = Math.abs(vx) / PX_PER_M;
    sound.setEngine(0, false);
    if (inZone && vyOk && vxOk) {
      status = 'landed';
      contactUntil = time + 99;
      const landVy = vy;
      vx = vy = 0;
      throttle = 0;
      pad.classList.add('disabled');
      sound.beep(true);
      say('¡Luz de contacto!', 'lm');
      later(900, () => say('Motor apagado. El Falcon ha aterrizado.', 'lm'));
      later(2000, () => {
        say('Copiado, Falcon. ¡Están en la Luna! Felicitaciones.');
        sound.success();
      });
      const stars = 1 + (landVy < cfg.vy * 0.55 ? 1 : 0) + (fuel > 25 ? 1 : 0);
      const off = Math.abs((zoneX1 + zoneX2) / 2 - x) / PX_PER_M;
      later(2600, () => showResult(stars, vyM, off));
      return;
    }
    status = 'crashed';
    pad.classList.add('disabled');
    explode();
    flash = 0.9;
    shake = 14;
    sound.crash();
    const reasons: string[] = [];
    if (!inZone) reasons.push('tocaste suelo fuera de la zona de alunizaje');
    if (!vyOk) reasons.push(`bajabas a ${vyM.toFixed(1)} m/s (máximo ${(cfg.vy / PX_PER_M).toFixed(1)})`);
    if (!vxOk) reasons.push(`te desplazabas de lado a ${vxM.toFixed(1)} m/s (máximo ${(cfg.vx / PX_PER_M).toFixed(1)})`);
    later(700, () => say('Falcon, ¿nos copian? … Perdimos la señal.'));
    later(1500, () => showCrash(reasons));
  };

  // ---------- paneles ----------
  const keyHtml = `
    <div class="lm-keys">
      <span class="lm-cap" data-cap="up">↑ / ESPACIO</span> motor
      <span class="lm-cap" data-cap="left">←</span><span class="lm-cap" data-cap="right">→</span> propulsores laterales
    </div>`;

  const showBrief = () => {
    status = 'brief';
    hud.hidden = true;
    pad.classList.add('disabled');
    const rules = () => `
      <li><i>1</i><span>Mira por la ventana: mueve la nave hasta que la <b>zona azul</b> quede en la <b>mira</b> del centro.</span></li>
      <li><i>2</i><span>Velocidad vertical menor a <b>${(cfg.vy / PX_PER_M).toFixed(1)} m/s</b>.</span></li>
      <li><i>3</i><span>Velocidad horizontal menor a <b>${(cfg.vx / PX_PER_M).toFixed(1)} m/s</b>.</span></li>
      <li><i>4</i><span>Antes de quedarte sin <b>combustible</b>. ¡La gravedad lunar es 1/6 de la terrestre!</span></li>`;
    panel.hidden = false;
    panel.innerHTML = `
      <p class="lm-panel__kicker">Misión 1 · Apolo 15 · Hadley-Apennine</p>
      <h3 class="lm-panel__title">Pilota el módulo lunar Falcon hasta la superficie</h3>
      <div class="lm-brief">
        <div class="lm-brief__art"><img alt="Módulo lunar Apolo" src="${lmSprite.toDataURL()}"></div>
        <ul class="lm-rules" data-rules>${rules()}</ul>
      </div>
      <div class="lm-diff" role="group" aria-label="Dificultad">
        ${(Object.keys(LEVELS) as Difficulty[])
          .map((d) => `<button type="button" data-diff="${d}" aria-pressed="${d === difficulty}"><b>${LEVELS[d].label}</b><small>${LEVELS[d].desc}</small></button>`)
          .join('')}
      </div>
      ${keyHtml}
      <p class="lm-text" style="margin-top:-8px;font-size:13px">Prueba las teclas: se iluminan. En celular usa los botones de la esquina.</p>
      <div class="lm-actions"><button type="button" class="lm-go" data-go>INICIAR DESCENSO</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff as Difficulty;
        cfg = LEVELS[difficulty];
        panel.querySelectorAll('[data-diff]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        panel.querySelector('[data-rules]')!.innerHTML = rules();
        sound.init();
        sound.tone(660, 0.08, 'sine', 0.05);
        newGame(false);
      }),
    );
    panel.querySelector('[data-go]')!.addEventListener('click', startCountdown);
    panel.querySelector<HTMLButtonElement>('[data-go]')!.focus();
  };

  const startCountdown = () => {
    sound.init();
    panel.hidden = true;
    newGame(true);
    status = 'countdown';
    hud.hidden = false;
    const steps = ['3', '2', '1', 'GO'];
    steps.forEach((s, i) =>
      later(i * 800, () => {
        countEl.innerHTML = `<span>${s}</span>`;
        sound.tone(s === 'GO' ? 1046 : 660, s === 'GO' ? 0.4 : 0.15, 'sine', 0.08);
      }),
    );
    later(steps.length * 800 - 300, () => {
      countEl.innerHTML = '';
      status = 'flying';
      pad.classList.remove('disabled');
      say('Falcon, tienen luz verde para el descenso. ¡GO!');
    });
  };

  const showResult = (stars: number, vyM: number, off: number) => {
    panel.hidden = false;
    const s = Math.floor(flightTime);
    panel.innerHTML = `
      <p class="lm-panel__kicker" style="text-align:center">Luz de contacto · ${cfg.label}</p>
      <h3 class="lm-panel__title ok" style="text-align:center">¡Alunizaje exitoso!</h3>
      <div class="lm-stars" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map((n) => `<span class="${n <= stars ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="lm-stats">
        <div><span>Contacto</span><b>${vyM.toFixed(1)} m/s</b></div>
        <div><span>Desvío</span><b>${off.toFixed(1)} m</b></div>
        <div><span>Combustible</span><b>${Math.ceil(fuel)}%</b></div>
        <div><span>Tiempo</span><b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b></div>
      </div>
      <p class="lm-text">El 30 de julio de 1971, David Scott y James Irwin posaron el Falcon en Hadley-Apennine.
      Dentro llevaban, plegado, el primer vehículo lunar (LRV).</p>
      <div class="lm-actions">
        <button type="button" class="lm-alt" data-again>Volver a jugar</button>
        <button type="button" class="lm-go" data-continue>CONTINUAR</button>
      </div>`;
    panel.querySelector('[data-again]')!.addEventListener('click', showBrief);
    panel.querySelector('[data-continue]')!.addEventListener('click', () => {
      panel.hidden = true;
      win();
    });
    panel.querySelector<HTMLButtonElement>('[data-continue]')!.focus();
  };

  const showCrash = (reasons: string[]) => {
    panel.hidden = false;
    const tip = reasons.some((r) => r.includes('bajabas'))
      ? 'Consejo: mantén pulsado el motor en ráfagas cortas cuando estés a menos de 20 m.'
      : reasons.some((r) => r.includes('lado'))
        ? 'Consejo: usa el propulsor contrario para frenar antes de tocar el suelo.'
        : 'Consejo: mira el indicador "ZONA" del panel; te dice hacia dónde ir.';
    panel.innerHTML = `
      <p class="lm-panel__kicker" style="text-align:center">Señal perdida</p>
      <h3 class="lm-panel__title bad" style="text-align:center">El módulo se estrelló</h3>
      <p class="lm-text">Motivo: ${reasons.join(' y ')}.<br>${tip}</p>
      <div class="lm-actions">
        <button type="button" class="lm-alt" data-brief>Cambiar dificultad</button>
        <button type="button" class="lm-go" data-retry>REINTENTAR</button>
      </div>`;
    panel.querySelector('[data-brief]')!.addEventListener('click', showBrief);
    panel.querySelector('[data-retry]')!.addEventListener('click', startCountdown);
    panel.querySelector<HTMLButtonElement>('[data-retry]')!.focus();
  };

  // ---------- partida ----------
  const newGame = (keepWorld: boolean) => {
    const newW = 1100; // mundo fijo: el monitor es solo una cámara
    if (!keepWorld || !groundCanvas || newW !== W) {
      W = newW;
      buildWorld();
    }
    const zc = (zoneX1 + zoneX2) / 2;
    // empezar lejos de la zona para que haya que maniobrar
    const side = zc > W / 2 ? -1 : 1;
    x = Math.max(80, Math.min(W - 80, zc + side * (W * (0.22 + Math.random() * 0.12))));
    y = 80;
    vx = -side * (Math.random() * cfg.drift * 0.6) + side * cfg.drift * 0.3;
    vy = 8;
    fuel = 100;
    throttle = 0;
    flightTime = 0;
    particles = [];
    flags.alarm = false;
    flags.alarmAt = 3 + Math.random() * 4;
    flags.fuel60 = flags.fuel30 = false;
    flags.alts.clear();
    alarmUntil = contactUntil = 0;
    capcom.innerHTML = '';
    camX = W / 2;
    camY = H / 2;
    camZ = 1;
  };

  // ---------- bucle ----------
  let raf = 0;
  let last = performance.now();
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    draw();
    cockpit.draw({
      x,
      alt: altitude(),
      vx,
      vy,
      throttle,
      left: input.left || touch.left,
      right: input.right || touch.right,
      status,
      zoneX1,
      zoneX2,
      safeVy: cfg.vy,
      shake,
      flash,
      dt,
      time,
    });
    const lost = status === 'crashed';
    if (liveEl.classList.contains('off') !== lost) {
      liveEl.classList.toggle('off', lost);
      liveEl.lastChild!.textContent = lost ? 'SIN SEÑAL' : 'SEÑAL EN VIVO';
    }
    raf = requestAnimationFrame(loop);
  };

  // ---------- controles ----------
  const keyMap: Record<string, keyof typeof input> = {
    ArrowUp: 'up',
    KeyW: 'up',
    Space: 'up',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };
  const onKey = (e: KeyboardEvent) => {
    const k = keyMap[e.code];
    if (!k) return;
    const down = e.type === 'keydown';
    if (status === 'flying' || status === 'countdown') e.preventDefault();
    if (e.code === 'Space' && status !== 'flying' && status !== 'countdown') return; // no robar el "click" de botones
    input[k] = down;
    panel.querySelector(`[data-cap="${k}"]`)?.classList.toggle('is-on', down);
    if (down && status === 'brief') {
      sound.init();
      sound.tone(k === 'up' ? 520 : 760, 0.06, 'sine', 0.04);
    }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  keyBtns.forEach((b) => {
    const k = b.dataset.ctl as keyof typeof touch;
    const on = (e: PointerEvent) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      touch[k] = true;
      sound.init();
      navigator.vibrate?.(12);
    };
    const off = () => {
      touch[k] = false;
    };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  const muteIcon = () => {
    muteBtn.innerHTML = sound.muted
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
    muteBtn.setAttribute('aria-label', sound.muted ? 'Activar sonido' : 'Silenciar sonido');
  };
  muteBtn.addEventListener('click', () => {
    sound.init();
    sound.toggle();
    muteIcon();
  });
  muteIcon();

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  ro.observe(vcanvas);
  // reloj de Houston (hora real)
  const hands = { h: $('[data-hh]'), m: $('[data-mm]'), s: $('[data-ss]') };
  const tick = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const hh = get('hour') % 12;
    const mm = get('minute');
    const ss = get('second');
    hands.h.setAttribute('transform', `rotate(${hh * 30 + mm * 0.5} 50 50)`);
    hands.m.setAttribute('transform', `rotate(${mm * 6} 50 50)`);
    hands.s.setAttribute('transform', `rotate(${ss * 6} 50 50)`);
  };
  tick();
  const clockTimer = window.setInterval(tick, 1000);
  resize();
  newGame(false);
  showBrief();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.clearInterval(clockTimer);
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    sound.stop();
  };
}