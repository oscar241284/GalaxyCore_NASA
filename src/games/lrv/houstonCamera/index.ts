/**
 * LRV · MISIÓN 3 · Cámara de Houston.
 *
 * El LRV del Apolo 15 estrenó una cámara de TV en color (GCTA) que no manejaban los
 * astronautas: la movía desde Houston el controlador Ed Fendell, a 384.000 km. Cada orden
 * tardaba más de un segundo en llegar a la Luna y la imagen otro tanto en volver.
 *
 * Cómo se juega: eres el operador. El director pide tomas EN INGLÉS (los dos astronautas,
 * un primer plano, la gran roca, la pared del canal Hadley Rille…) y hay que encuadrarlas
 * con giro, inclinación y zoom. Lo difícil es el retraso: la imagen responde tarde, así
 * que hay que adelantarse, sobre todo cuando el astronauta camina.
 *
 * Modelo del retraso (D = ida + vuelta):
 *   imagen que ves ahora = escena de hace D/2 vista con las órdenes que diste hace D.
 */
import { DodecahedronGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Color } from 'three';
import type { GameContext } from '../../index';
import { buildRobot } from '../../../three/robots';
import { Sfx } from '../../shared/audio';
import { hash } from '../../shared/three';
import { bindHoldButton, bindMuteButton, createCapcom, difficultyHtml, injectOpStyles, starsHtml, statsHtml } from '../../shared/ui';
import { MOON, addMassifs, blobShadow, buildAstronaut, createMoonStage, fieldHeight, fieldMesh, makeField, poseWalk, regolith } from '../moonKit';
import type { Astronaut, Bounds, MoonStage } from '../moonKit';
import { injectLrvStyles } from '../ui';

// ---------------------------------------------------------------- constantes
/** Tiempo real de ida y vuelta de una señal de radio Tierra–Luna (s). */
const REAL_DELAY = 2.6;
const DEG = Math.PI / 180;
const LIMITS = { pan: 115 * DEG, tiltDown: -32 * DEG, tiltUp: 24 * DEG, fovWide: 55, fovTele: 9 }; // zoom 6:1 como el real
const SLEW = 30 * DEG; // velocidad de giro con el zoom abierto (rad/s)
const CAM_HEIGHT = 1.7;
const FIELD: Bounds = { minX: -180, maxX: 180, minZ: -340, maxZ: 40 };
/** El canal Hadley Rille (reducido para que quepa: el real mide 1,5 km de ancho y 300 m de fondo). */
const RILLE = { z: -195, halfWidth: 88, depth: 46 };

type Difficulty = 'cadete' | 'piloto' | 'comandante';
interface LevelConfig {
  label: string;
  desc: string;
  delay: number;
  /** Tiempo de transmisión disponible (s). */
  time: number;
  /** ¿Se muestra dónde apunta ya la orden enviada? */
  ghost: boolean;
}
const LEVELS: Record<Difficulty, LevelConfig> = {
  cadete: { label: 'Cadete', desc: 'Retraso corto y ayuda de puntería', delay: 1.2, time: 170, ghost: true },
  piloto: { label: 'Piloto', desc: 'Retraso real: 2,6 segundos', delay: REAL_DELAY, time: 150, ghost: true },
  comandante: { label: 'Comandante', desc: 'Retraso real y sin ayuda', delay: REAL_DELAY, time: 120, ghost: false },
};

type Status = 'brief' | 'live' | 'result';

// ---------------------------------------------------------------- astronautas
interface Walker {
  pts: [number, number][];
  speed: number;
  pause: number;
  offset: number;
}
/** Dave Scott (comandante, franjas rojas) y Jim Irwin recorren la zona de trabajo en bucle. */
const DAVE: Walker = { pts: [[-7, -20], [-19, -33], [-9, -58], [9, -44]], speed: 1.5, pause: 5, offset: 0 };
const JIM: Walker = { pts: [[10, -17], [27, -42], [6, -70], [-14, -47], [22, -24]], speed: 1.7, pause: 3.5, offset: 4 };

function walkerAt(w: Walker, time: number): { x: number; z: number; heading: number; moving: boolean; phase: number } {
  const n = w.pts.length;
  const legs = w.pts.map((p, i) => {
    const q = w.pts[(i + 1) % n];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
  const cycle = legs.reduce((s, l) => s + l / w.speed + w.pause, 0);
  let t = (((time + w.offset) % cycle) + cycle) % cycle;
  let walked = 0;
  for (let i = 0; i < n; i++) {
    const p = w.pts[i];
    const q = w.pts[(i + 1) % n];
    const heading = Math.atan2(q[0] - p[0], q[1] - p[1]);
    if (t < w.pause) return { x: p[0], z: p[1], heading, moving: false, phase: walked };
    t -= w.pause;
    const dur = legs[i] / w.speed;
    if (t < dur) {
      const k = t / dur;
      return { x: p[0] + (q[0] - p[0]) * k, z: p[1] + (q[1] - p[1]) * k, heading, moving: true, phase: walked + legs[i] * k };
    }
    t -= dur;
    walked += legs[i];
  }
  return { x: w.pts[0][0], z: w.pts[0][1], heading: 0, moving: false, phase: 0 };
}

// ---------------------------------------------------------------- tomas
interface Aim {
  pan: number;
  tilt: number;
  fov: number;
}
interface Shot {
  en: string;
  es: string;
  /** Segundos que debe mantenerse el encuadre. */
  hold: number;
  /** Zoom máximo permitido (campo de visión en grados); para planos generales, mínimo. */
  maxFov?: number;
  minFov?: number;
  targets: ('dave' | 'jim' | 'boulder' | 'wall')[];
}
const SHOTS: Shot[] = [
  { en: 'Give us a wide shot. We want to see both astronauts.', es: 'Danos un plano general. Queremos ver a los dos astronautas.', hold: 2.5, minFov: 34, targets: ['dave', 'jim'] },
  { en: 'Zoom in on Dave. He has the red stripes.', es: 'Acerca la imagen a Dave. Es el de las franjas rojas.', hold: 2.5, maxFov: 22, targets: ['dave'] },
  { en: 'Now show us the big boulder on the left.', es: 'Ahora muéstranos la gran roca de la izquierda.', hold: 2.5, maxFov: 30, targets: ['boulder'] },
  { en: 'Follow Jim while he walks. Keep him in the frame.', es: 'Sigue a Jim mientras camina. Mantenlo en el cuadro.', hold: 5, maxFov: 30, targets: ['jim'] },
  { en: 'Zoom in on the far wall of the rille. Look at those layers of lava!', es: 'Acerca la pared lejana del canal. ¡Mira esas capas de lava!', hold: 3, maxFov: 16, targets: ['wall'] },
];
const BOULDER = { x: -34, z: -52, r: 3.2 };
const WALL = { x: 14, z: RILLE.z - RILLE.halfWidth * 0.72 };

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Transición suave 0→1 para t entre 0 y 1. */
const smooth = (t: number) => {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
};
/** Cuánto baja el terreno (m) entre el rover y el borde del canal. */
const APPROACH_DROP = 12;

const BRIEF_ART = `
<svg viewBox="0 0 200 200" role="img" aria-label="Consola de Houston con la imagen de la cámara del rover">
  <rect width="200" height="200" fill="#10131a"/><rect x="24" y="26" width="152" height="104" rx="10" fill="#000" stroke="#3a3f47" stroke-width="6"/>
  <path d="M30 104h140v20H30z" fill="#8d8b86"/><path d="M30 104 80 92l40 8 50-10v14z" fill="#6e6c68"/><circle cx="150" cy="46" r="8" fill="#3b74d9"/>
  <rect x="88" y="78" width="8" height="18" rx="3" fill="#eceae4"/><circle cx="92" cy="74" r="5" fill="#eceae4"/><rect x="87" y="84" width="10" height="3" fill="#d0342c"/>
  <path d="M74 60h10M74 60v10M118 60h-10M118 60v10M74 112h10M74 112v-10M118 112h-10M118 112v-10" stroke="#39ff8a" stroke-width="2.5" fill="none"/>
  <circle cx="166" cy="36" r="3" fill="#ef4444"/>
  <g fill="#2a2f3a" stroke="#555b66"><rect x="36" y="146" width="26" height="26" rx="6"/><rect x="70" y="146" width="26" height="26" rx="6"/><rect x="104" y="146" width="26" height="26" rx="6"/><rect x="138" y="146" width="26" height="26" rx="6"/></g>
  <path d="m45 159 8-6v12zM87 159l-8-6v12zM117 154v10M112 159h10M146 159h10" stroke="#cfd3dc" stroke-width="2.5" fill="#cfd3dc"/>
</svg>`;

const CSS = `
.hc-tv { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,.2) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,.6)); }
.hc-frame { position: absolute; left: 30%; top: 25%; width: 40%; height: 50%; pointer-events: none; border: 2px solid rgba(255,255,255,.0); }
.hc-frame i { position: absolute; width: 26px; height: 26px; border: 3px solid rgba(255,255,255,.75); transition: border-color .2s; }
.hc-frame i:nth-child(1) { left: 0; top: 0; border-right: 0; border-bottom: 0; }
.hc-frame i:nth-child(2) { right: 0; top: 0; border-left: 0; border-bottom: 0; }
.hc-frame i:nth-child(3) { left: 0; bottom: 0; border-right: 0; border-top: 0; }
.hc-frame i:nth-child(4) { right: 0; bottom: 0; border-left: 0; border-top: 0; }
.hc-frame.ok i { border-color: #39ff8a; box-shadow: 0 0 12px rgba(57,255,138,.6); }
.hc-frame b { position: absolute; left: 0; right: 0; bottom: -14px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.18); overflow: hidden; }
.hc-frame b s { display: block; height: 100%; width: 0; background: #39ff8a; box-shadow: 0 0 10px #39ff8a; }
.hc-ghost { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; pointer-events: none; border: 2px dashed var(--holo); border-radius: 50%; opacity: .9; }
.hc-ghost::after { content: 'ORDEN'; position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: 4px; font-family: var(--font-ui); font-size: 9px; letter-spacing: .14em; color: var(--holo); }
.hc-ghost[hidden] { display: none; }
.hc-label { position: absolute; left: 14px; bottom: 14px; display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); font-size: 10px; letter-spacing: .16em; color: #e5e7eb; text-shadow: 0 1px 4px #000; pointer-events: none; }
.hc-label i { width: 9px; height: 9px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: hc-rec 1.2s steps(2) infinite; }
@keyframes hc-rec { 50% { opacity: .25; } }
.hc-shot { position: absolute; left: 274px; right: 68px; top: 12px; z-index: 2; max-width: 560px; margin: 0 auto; padding: 10px 14px; border: 1px solid rgba(103,232,249,.4); border-radius: 12px; text-align: center; background: rgba(5,8,16,.86); backdrop-filter: blur(6px); }
.hc-shot[hidden] { display: none; }
.hc-shot p { margin: 0; }
.hc-shot__kicker { font-family: var(--font-ui); font-size: 10px; letter-spacing: .2em; color: var(--holo); }
.hc-shot__en { margin: 4px 0 !important; font-size: clamp(15px, 2vw, 19px); font-style: italic; line-height: 1.3; color: #fff; }
.hc-shot__es { font-size: 13px; color: var(--muted); }
.hc-shot button { margin-top: 6px; padding: 5px 12px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; color: var(--fg); background: transparent; }
.hc-shot button:hover, .hc-shot button:focus-visible { outline: none; border-color: var(--accent-2); }
.hc-pad .op-key { width: 64px; height: 64px; }
.op.lrv.hc .op-capcom { top: auto; bottom: 42px; left: 12px; transform: none; width: min(340px, 34%); }
@media (max-width: 720px) { .hc-pad .op-key { width: 52px; height: 52px; } .hc-shot { left: 8px; right: 8px; top: 150px; padding: 8px 10px; } .op.lrv.hc .op-capcom { display: none; } }
@media (prefers-reduced-motion: reduce) { .hc-label i { animation: none; } }
`;

function injectStyles(): void {
  injectOpStyles();
  injectLrvStyles();
  if (document.getElementById('hc-styles')) return;
  const s = document.createElement('style');
  s.id = 'hc-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default function houstonCamera({ root, win }: GameContext): () => void {
  injectStyles();
  const sfx = new Sfx();

  root.innerHTML = `
    <div class="op lrv hc">
      <canvas class="op-view" aria-label="Imagen de la cámara de televisión del vehículo lunar"></canvas>
      <div class="hc-tv" aria-hidden="true"></div>
      <div class="hc-frame" aria-hidden="true"><i></i><i></i><i></i><i></i><b><s data-hold></s></b></div>
      <div class="hc-ghost" aria-hidden="true" hidden></div>
      <div class="hc-label" aria-hidden="true"><i></i>LRV · CÁMARA GCTA · EN VIVO DESDE LA LUNA</div>
      <div class="op-hud" hidden>
        <div class="op-hud__top"><span>HOUSTON · INCO</span><span data-shotn>TOMA 1/5</span></div>
        <div class="op-hud__grid">
          <div class="op-hud__cell"><span>RETRASO</span><b data-delay>—</b></div>
          <div class="op-hud__cell"><span>ZOOM</span><b data-zoom>×1</b></div>
          <div class="op-hud__cell op-hud__wide"><span>TRANSMISIÓN <em data-timep></em></span><i class="op-bar"><s data-time></s></i></div>
          <div class="op-hud__note" data-note></div>
        </div>
      </div>
      <div class="op-tools"><button type="button" class="op-tool" data-mute></button></div>
      <div class="hc-shot" data-shot hidden></div>
      <div class="op-capcom" aria-live="polite"></div>
      <div class="op-pad lrv-pad hc-pad disabled">
        <button type="button" class="op-key" data-ctl="left" aria-label="Girar la cámara a la izquierda"><span class="op-key__icon">◀</span></button>
        <div class="lrv-pad__col">
          <button type="button" class="op-key" data-ctl="up" aria-label="Subir la cámara"><span class="op-key__icon">▲</span></button>
          <button type="button" class="op-key" data-ctl="down" aria-label="Bajar la cámara"><span class="op-key__icon">▼</span></button>
        </div>
        <button type="button" class="op-key" data-ctl="right" aria-label="Girar la cámara a la derecha"><span class="op-key__icon">▶</span></button>
        <div class="lrv-pad__col">
          <button type="button" class="op-key" data-ctl="in" aria-label="Acercar el zoom"><span class="op-key__icon">＋</span>ZOOM</button>
          <button type="button" class="op-key" data-ctl="out" aria-label="Alejar el zoom"><span class="op-key__icon">－</span>ZOOM</button>
        </div>
      </div>
      <div class="op-panel" data-panel hidden></div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const view = $<HTMLCanvasElement>('canvas.op-view');
  const panel = $('[data-panel]');

  let stage: MoonStage;
  try {
    stage = createMoonStage(view, FIELD, LIMITS.fovWide);
  } catch {
    root.innerHTML = '<p class="op-loading">Este minijuego necesita WebGL y tu navegador no pudo iniciarlo.</p>';
    return () => sfx.stop();
  }
  const { scene, camera, bin } = stage;
  camera.rotation.order = 'YXZ';

  const hud = $('.op-hud');
  const hudShotN = $('[data-shotn]');
  const hudDelay = $('[data-delay]');
  const hudZoom = $('[data-zoom]');
  const hudTime = $('[data-time]');
  const hudTimeP = $('[data-timep]');
  const hudNote = $('[data-note]');
  const shotBox = $('[data-shot]');
  const frame = $('.hc-frame');
  const holdBar = $('[data-hold]');
  const ghost = $('.hc-ghost');
  const pad = $('.op-pad');
  const capcom = createCapcom($('.op-capcom'), sfx, 'ROVER', 'HOUSTON');
  bindMuteButton($<HTMLButtonElement>('[data-mute]'), sfx);

  // ---------- escena ----------
  /** Centro del canal, que serpentea. */
  const rilleCenter = (x: number) => RILLE.z + 22 * Math.sin(x * 0.018);
  const field = makeField(FIELD, 3, (x, z) => {
    const edge = clamp(Math.min((FIELD.maxX - Math.abs(x)) / 30, (FIELD.maxZ - z) / 20, (z - FIELD.minZ) / 20), 0, 1);
    const t = Math.abs(z - rilleCenter(x)) / RILLE.halfWidth;
    const rille = t < 1 ? -RILLE.depth * (1 - t * t) ** 1.4 : 0;
    // el terreno baja hacia el canal: así, desde el rover, se ve la pared de enfrente
    const c = rilleCenter(x);
    const nearEdge = c + RILLE.halfWidth;
    const near = smooth((-20 - z) / (-20 - nearEdge)); // 0 junto al rover, 1 en el borde
    const far = smooth((z - (c - RILLE.halfWidth)) / RILLE.halfWidth);
    const tilt = -APPROACH_DROP * (z > c ? near : far);
    return (0.5 * Math.sin(x * 0.06) * Math.cos(z * 0.05) + tilt + rille) * edge;
  });
  const basalt = new Color('#48474a');
  const ash = new Color('#8a8882');
  scene.add(
    fieldMesh(field, bin, (x, z, h, out) => {
      regolith(x, z, out);
      // las paredes del canal dejan ver capas de lava apiladas, como fotografió el Apolo 15
      if (h < -2.5) out.lerp(Math.floor(h / 4.5) % 2 ? basalt : ash, h < -RILLE.depth * 0.9 ? 0.35 : 0.8);
    }),
  );

  const groundY = (x: number, z: number) => fieldHeight(field, x, z);
  const dummy = new Object3D();
  const rubble = new InstancedMesh(bin.add(new DodecahedronGeometry(1, 0)), bin.add(new MeshStandardMaterial({ color: MOON.rock, flatShading: true, roughness: 1 })), 120);
  for (let i = 0; i < rubble.count; i++) {
    const x = (hash(i, 1) * 2 - 1) * 160;
    // la mitad son derrubios dentro del canal; el resto, piedras sueltas en la llanura
    const z = i % 2 ? rilleCenter(x) + (hash(i, 2) * 2 - 1) * RILLE.halfWidth * 0.8 : -8 - hash(i, 2) * 90;
    const s = i % 2 ? 1 + hash(i, 3) * 3.5 : 0.25 + hash(i, 3) * 0.7;
    dummy.position.set(x, groundY(x, z) + s * 0.3, z);
    dummy.rotation.set(hash(i, 4) * 6, hash(i, 5) * 6, 0);
    dummy.scale.set(s, s * 0.75, s);
    dummy.updateMatrix();
    rubble.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rubble);

  const boulder = new Mesh(bin.add(new DodecahedronGeometry(BOULDER.r, 1)), bin.add(new MeshStandardMaterial({ color: '#5c5a57', flatShading: true, roughness: 1 })));
  boulder.position.set(BOULDER.x, groundY(BOULDER.x, BOULDER.z) + BOULDER.r * 0.55, BOULDER.z);
  boulder.scale.set(1.25, 0.9, 1);
  scene.add(boulder);

  addMassifs(scene, bin, [
    [-520, -1100, 520, 300],
    [260, -1300, 640, 380],
    [900, -900, 460, 240],
    [-1100, -500, 420, 200],
  ]);

  // el rover queda detrás y debajo de su propia cámara, que va montada delante
  const roverModel = buildRobot('lrv').group;
  roverModel.scale.setScalar(1.5);
  roverModel.rotation.y = Math.PI;
  roverModel.position.set(0, groundY(0, 2.2), 2.2);
  scene.add(roverModel);

  const crew: { walker: Walker; body: Astronaut; group: Group; shadow: Mesh }[] = [DAVE, JIM].map((walker, i) => {
    const body = buildAstronaut(i === 0);
    const shadow = blobShadow(bin, 0.55);
    scene.add(body.group, shadow);
    return { walker, body, group: body.group, shadow };
  });

  const placeCrew = (sceneTime: number) => {
    for (const c of crew) {
      const p = walkerAt(c.walker, sceneTime);
      const y = groundY(p.x, p.z);
      // en la Luna se avanza a saltitos: cada paso es un pequeño vuelo
      const hop = p.moving ? Math.abs(Math.sin(p.phase * 1.6)) * 0.22 : 0;
      c.group.position.set(p.x, y + hop, p.z);
      c.group.rotation.y = p.heading;
      poseWalk(c.body, p.phase * 3.2, p.moving ? 1 : 0);
      c.shadow.position.set(p.x, y + 0.05, p.z);
    }
  };

  /** Dirección (giro, inclinación) desde la cámara hasta un punto de la escena. */
  const aimAt = (x: number, y: number, z: number) => ({ pan: Math.atan2(x, -z), tilt: Math.atan2(y - camY, Math.hypot(x, z)) });
  const camY = groundY(0, 0) + CAM_HEIGHT;
  const targetAim = (name: Shot['targets'][number], sceneTime: number) => {
    if (name === 'boulder') return aimAt(BOULDER.x, boulder.position.y, BOULDER.z);
    if (name === 'wall') return aimAt(WALL.x, groundY(WALL.x, WALL.z) + 2, WALL.z);
    const p = walkerAt(name === 'dave' ? DAVE : JIM, sceneTime);
    return aimAt(p.x, groundY(p.x, p.z) + 1.1, p.z);
  };

  // ---------- estado ----------
  let difficulty: Difficulty = 'cadete';
  let cfg = LEVELS[difficulty];
  let status: Status = 'brief';
  let clock = 0; // tiempo de la escena (s)
  let timeLeft = cfg.time;
  let shotIndex = 0;
  let hold = 0;
  let translations = 0;
  let shownEs = false;
  const order: Aim = { pan: 0, tilt: -6 * DEG, fov: LIMITS.fovWide }; // lo que el operador ha ordenado
  let shown: Aim = { ...order }; // lo que se ve en pantalla (orden de hace `delay` segundos)
  const history: (Aim & { t: number })[] = [];
  const keys = { left: false, right: false, up: false, down: false, in: false, out: false };
  const touch = { ...keys };
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const held = (k: keyof typeof keys) => keys[k] || touch[k];

  const resetRun = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
    cfg = LEVELS[difficulty];
    clock = 0;
    timeLeft = cfg.time;
    shotIndex = 0;
    hold = 0;
    translations = 0;
    Object.assign(order, { pan: 0, tilt: -6 * DEG, fov: LIMITS.fovWide });
    shown = { ...order };
    history.length = 0;
    capcom.clear();
    sfx.loop('servo', 0, 900, 'bandpass');
  };

  const paintShot = () => {
    const s = SHOTS[shotIndex];
    shotBox.hidden = false;
    shotBox.innerHTML = `
      <p class="hc-shot__kicker">DIRECTOR DE VUELO · TOMA ${shotIndex + 1} DE ${SHOTS.length}</p>
      <p class="hc-shot__en" lang="en">“${s.en}”</p>
      ${shownEs ? `<p class="hc-shot__es">${s.es}</p>` : '<button type="button" data-translate>Traducir</button> '}
      <button type="button" data-repeat>🔊 Repetir</button>`;
    shotBox.querySelector('[data-repeat]')!.addEventListener('click', () => sfx.speakEnglish(s.en));
    shotBox.querySelector('[data-translate]')?.addEventListener('click', () => {
      shownEs = true;
      translations++;
      paintShot();
    });
  };

  const startShot = () => {
    hold = 0;
    shownEs = false;
    paintShot();
    sfx.radio();
    sfx.speakEnglish(SHOTS[shotIndex].en);
  };

  const start = () => {
    sfx.init();
    panel.hidden = true;
    resetRun();
    status = 'live';
    hud.hidden = false;
    pad.classList.remove('disabled');
    ghost.hidden = !cfg.ghost;
    capcom.say('Tenemos imagen. Houston, la cámara es vuestra.', 'craft');
    later(700, startShot);
  };

  // ---------- simulación ----------
  /** ¿Está la toma actual bien encuadrada en la imagen que se ve? Devuelve además hacia dónde queda. */
  const judge = (): { ok: boolean; dPan: number; dTilt: number; zoomOk: boolean } => {
    const s = SHOTS[shotIndex];
    const vfov = shown.fov * DEG;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const sceneTime = clock - cfg.delay / 2;
    const wideShot = s.targets.length > 1;
    let inFrame = true;
    let sumPan = 0;
    let sumTilt = 0;
    for (const name of s.targets) {
      const a = targetAim(name, sceneTime);
      const dPan = wrap(a.pan - shown.pan);
      const dTilt = a.tilt - shown.tilt;
      sumPan += dPan / s.targets.length;
      sumTilt += dTilt / s.targets.length;
      // plano general: basta con que quepan en pantalla; si no, deben estar dentro del recuadro central
      const k = wideShot ? 0.44 : 0.2;
      if (Math.abs(dPan) > hfov * k || Math.abs(dTilt) > vfov * (wideShot ? 0.44 : 0.25)) inFrame = false;
    }
    const zoomOk = (s.maxFov === undefined || shown.fov <= s.maxFov) && (s.minFov === undefined || shown.fov >= s.minFov);
    return { ok: inFrame && zoomOk, dPan: sumPan, dTilt: sumTilt, zoomOk };
  };

  let lastJudge = { ok: false, dPan: 0, dTilt: 0, zoomOk: true };
  const update = (dt: number) => {
    clock += dt;
    if (status === 'live') {
      // órdenes del operador: con el zoom cerrado la cámara se mueve más despacio para poder afinar
      const rate = SLEW * clamp(order.fov / LIMITS.fovWide, 0.25, 1) * dt;
      const dPan = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
      const dTilt = (held('up') ? 1 : 0) - (held('down') ? 1 : 0);
      const dZoom = (held('in') ? 1 : 0) - (held('out') ? 1 : 0);
      order.pan = clamp(order.pan + dPan * rate, -LIMITS.pan, LIMITS.pan);
      order.tilt = clamp(order.tilt + dTilt * rate, LIMITS.tiltDown, LIMITS.tiltUp);
      order.fov = clamp(order.fov * Math.exp(-dZoom * 0.9 * dt), LIMITS.fovTele, LIMITS.fovWide);
      sfx.loop('servo', dPan || dTilt || dZoom ? 0.035 : 0, dZoom ? 1500 : 900, 'bandpass');
    }
    history.push({ t: clock, ...order });
    while (history.length > 2 && history[1].t <= clock - cfg.delay) history.shift();
    shown = history[0]; // la orden de hace `delay` segundos

    if (status !== 'live') return;
    timeLeft -= dt;
    lastJudge = judge();
    hold = lastJudge.ok ? hold + dt : Math.max(0, hold - dt * 0.6);
    if (hold >= SHOTS[shotIndex].hold) {
      sfx.beep(true);
      capcom.say(['Beautiful picture!', 'Great shot, thank you.', 'That is a keeper.', 'Nice tracking!', 'Outstanding!'][shotIndex] ?? 'Good.');
      shotIndex++;
      hold = 0;
      if (shotIndex >= SHOTS.length) {
        finish(true);
        return;
      }
      shotBox.hidden = true;
      later(900, startShot);
    } else if (timeLeft <= 0) {
      finish(false);
    }
  };

  const finish = (ok: boolean) => {
    status = 'result';
    pad.classList.add('disabled');
    shotBox.hidden = true;
    ghost.hidden = true;
    sfx.loop('servo', 0, 900, 'bandpass');
    if (ok) {
      sfx.success();
      later(900, showResult);
    } else {
      sfx.fail();
      later(600, showFail);
    }
  };

  // ---------- dibujo ----------
  const draw = () => {
    placeCrew(clock - cfg.delay / 2);
    camera.position.set(0, camY, 0);
    camera.rotation.set(shown.tilt, -shown.pan, 0);
    if (camera.fov !== shown.fov) {
      camera.fov = shown.fov;
      camera.updateProjectionMatrix();
    }
    stage.render();

    if (status !== 'live') {
      frame.classList.remove('ok');
      return;
    }
    const s = SHOTS[Math.min(shotIndex, SHOTS.length - 1)];
    frame.classList.toggle('ok', lastJudge.ok);
    holdBar.style.width = `${clamp(hold / s.hold, 0, 1) * 100}%`;
    if (cfg.ghost) {
      // dónde apunta ya la orden enviada, respecto a la imagen (retrasada) que se ve
      const vfov = shown.fov * DEG;
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const gx = clamp(wrap(order.pan - shown.pan) / hfov, -0.48, 0.48);
      const gy = clamp((order.tilt - shown.tilt) / vfov, -0.46, 0.46);
      ghost.style.transform = `translate(${gx * view.clientWidth}px, ${-gy * view.clientHeight}px) scale(${clamp(shown.fov / order.fov, 0.6, 2.4)})`;
    }

    hudShotN.textContent = `TOMA ${Math.min(shotIndex + 1, SHOTS.length)}/${SHOTS.length}`;
    hudDelay.textContent = `${cfg.delay.toFixed(1).replace('.', ',')} s`;
    hudZoom.textContent = `×${(LIMITS.fovWide / shown.fov).toFixed(1)}`;
    hudTime.style.width = `${clamp(timeLeft / cfg.time, 0, 1) * 100}%`;
    hudTime.classList.toggle('warn', timeLeft < 25);
    hudTimeP.textContent = `${Math.max(0, Math.ceil(timeLeft))} s`;
    const j = lastJudge;
    if (j.ok) hudNote.textContent = '✓ ¡MANTÉN EL ENCUADRE!';
    else if (!cfg.ghost) hudNote.textContent = 'SIN AYUDA · ANTICÍPATE';
    else {
      // primero la dirección; cuando ya está dentro del recuadro, lo que falta es el zoom
      const vfov = shown.fov * DEG;
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const offX = Math.abs(j.dPan) / (hfov * 0.2);
      const offY = Math.abs(j.dTilt) / (vfov * 0.25);
      const dir = offX > offY ? (j.dPan > 0 ? '▶ DERECHA' : '◀ IZQUIERDA') : j.dTilt > 0 ? '▲ ARRIBA' : '▼ ABAJO';
      hudNote.textContent = !j.zoomOk && offX < 1 && offY < 1 ? (s.minFov ? 'ABRE EL ZOOM (－)' : 'ACERCA EL ZOOM (＋)') : `OBJETIVO ${dir}`;
    }
  };

  // ---------- paneles ----------
  const showBrief = () => {
    status = 'brief';
    hud.hidden = true;
    shotBox.hidden = true;
    ghost.hidden = true;
    pad.classList.add('disabled');
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker">Misión 3 · LRV · Apolo 15 · Hadley Rille</p>
      <h3 class="op-panel__title">Maneja la cámara del rover desde la Tierra</h3>
      <div class="op-brief">
        <div class="op-brief__art">${BRIEF_ART}</div>
        <ul class="op-rules">
          <li><i>1</i><span>Estás en <b>Houston</b>. El director te pedirá cada toma <b>en inglés</b>.</span></li>
          <li><i>2</i><span>Mueve la cámara y usa el <b>zoom</b> hasta que el objetivo quede dentro del <b>recuadro</b>.</span></li>
          <li><i>3</i><span>La señal viaja 384.000 km: la imagen responde con <b>retraso</b>. ¡Suelta el botón antes de llegar!</span></li>
          <li><i>4</i><span>Mantén el encuadre hasta llenar la <b>barra verde</b>, antes de que acabe la transmisión.</span></li>
        </ul>
      </div>
      ${difficultyHtml(LEVELS, difficulty)}
      <div class="op-keys">
        <span class="op-cap" data-cap="left">←</span><span class="op-cap" data-cap="right">→</span><span class="op-cap" data-cap="up">↑</span><span class="op-cap" data-cap="down">↓</span> mover
        <span class="op-cap" data-cap="in">Z</span> acercar <span class="op-cap" data-cap="out">X</span> alejar
      </div>
      <p class="op-text op-text--small">El círculo «ORDEN» muestra dónde apuntará la cámara cuando llegue tu señal. En celular usa los botones.</p>
      <div class="op-actions"><button type="button" class="op-go" data-go>EMPEZAR TRANSMISIÓN</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff as Difficulty;
        panel.querySelectorAll('[data-diff]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        sfx.init();
        sfx.tone(660, 0.08, 'sine', 0.05);
        resetRun();
      }),
    );
    panel.querySelector('[data-go]')!.addEventListener('click', start);
    panel.querySelector<HTMLButtonElement>('[data-go]')!.focus();
  };

  const showResult = () => {
    const used = cfg.time - timeLeft;
    const stars = 1 + (translations === 0 ? 1 : 0) + (timeLeft >= cfg.time * 0.4 ? 1 : 0);
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Transmisión completada · ${cfg.label}</p>
      <h3 class="op-panel__title ok center">¡El mundo vio la Luna gracias a ti!</h3>
      ${starsHtml(stars)}
      ${statsHtml([
        ['Tomas', `${SHOTS.length}/${SHOTS.length}`],
        ['Tiempo', `${used.toFixed(0)} s`],
        ['Retraso', `${cfg.delay.toFixed(1).replace('.', ',')} s`],
        ['Traducciones', String(translations)],
      ])}
      <p class="op-text">El Apolo 15 fue la primera misión con una cámara de TV montada en el rover y manejada desde la Tierra.
      La movía el controlador Ed Fendell desde Houston, y tenía que adelantarse siempre: sus órdenes tardaban más de un segundo en llegar a la Luna.
      Con ella se vio en directo cómo exploraban el borde del canal Hadley Rille.</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-again>Volver a jugar</button>
        <button type="button" class="op-go" data-continue>CONTINUAR</button>
      </div>`;
    panel.querySelector('[data-again]')!.addEventListener('click', showBrief);
    panel.querySelector('[data-continue]')!.addEventListener('click', () => {
      panel.hidden = true;
      win();
    });
    panel.querySelector<HTMLButtonElement>('[data-continue]')!.focus();
  };

  const showFail = () => {
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Fin de la transmisión</p>
      <h3 class="op-panel__title bad center">Se acabó el tiempo en la toma ${shotIndex + 1}</h3>
      <p class="op-text">Completaste ${shotIndex} de ${SHOTS.length} tomas. Consejo: da toques cortos y <b>espera a ver el resultado</b> antes de corregir;
      si mantienes el botón hasta ver el objetivo, la cámara se pasará de largo por el retraso.</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-brief>Cambiar dificultad</button>
        <button type="button" class="op-go" data-retry>REINTENTAR</button>
      </div>`;
    panel.querySelector('[data-brief]')!.addEventListener('click', showBrief);
    panel.querySelector('[data-retry]')!.addEventListener('click', start);
    panel.querySelector<HTMLButtonElement>('[data-retry]')!.focus();
  };

  // ---------- bucle ----------
  let raf = 0;
  let last = performance.now();
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  };

  // ---------- controles ----------
  const keyMap: Record<string, keyof typeof keys> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    KeyZ: 'in',
    Equal: 'in',
    NumpadAdd: 'in',
    KeyX: 'out',
    Minus: 'out',
    NumpadSubtract: 'out',
  };
  const padBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ctl]'));
  const onKey = (e: KeyboardEvent) => {
    const k = keyMap[e.code];
    if (!k) return;
    const down = e.type === 'keydown';
    if (status === 'live') e.preventDefault();
    keys[k] = down;
    panel.querySelector(`[data-cap="${k}"]`)?.classList.toggle('is-on', down);
    padBtns.find((b) => b.dataset.ctl === k)?.classList.toggle('is-on', down);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  padBtns.forEach((b) => {
    const k = b.dataset.ctl as keyof typeof touch;
    bindHoldButton(b, (down) => {
      sfx.init();
      touch[k] = down;
      b.classList.toggle('is-on', down);
    });
  });

  const ro = new ResizeObserver(() => stage.resize());
  ro.observe(view);
  resetRun();
  showBrief();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    stage.dispose();
    sfx.stop();
  };
}
