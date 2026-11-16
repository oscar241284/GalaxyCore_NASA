/**
 * LRV · MISIÓN 2 · Cazadores de la Roca Génesis.
 *
 * Segunda salida del Apolo 15 (1 de agosto de 1971): David Scott y James Irwin suben con
 * el LRV por la ladera del monte Hadley Delta hasta el cráter Spur y encuentran la muestra
 * 15415, una anortosita blanca de unos 4.000 millones de años: la "Roca Génesis".
 *
 * Fase 1 · Conducir: llevar el rover hasta Spur esquivando rocas y cráteres, con dirección
 *          solo trasera y antes de que el oxígeno baje del límite de regreso a pie.
 * Fase 2 · Recoger: Houston describe EN INGLÉS la roca que busca; hay que entenderlo y
 *          elegirla entre cinco candidatas.
 *
 * `physics.ts` calcula la conducción; este archivo dibuja la escena 3D y lleva la interfaz.
 */
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  Raycaster,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import gsap from 'gsap';
import type { GameContext } from '../../index';
import { rng } from '../../../ui/moonTexture';
import { ParticleSystem } from '../../../three/effects';
import { buildRobot } from '../../../three/robots';
import { Sfx } from '../../shared/audio';
import { Bin, hash } from '../../shared/three';
import { bindHoldButton, bindMuteButton, createCapcom, difficultyHtml, injectOpStyles, reducedMotion, starsHtml, statsHtml } from '../../shared/ui';
import { MOON, addMassifs, blobShadow, buildAstronaut, createMoonStage, fieldHeight, fieldMesh, regolith } from '../moonKit';
import type { MoonStage } from '../moonKit';
import { injectLrvStyles, radioHtml } from '../ui';
import { AIRBORNE, FIELD, HIT_COST, LEVELS, MAX_SPEED, SAMPLES, WALKBACK_LIMIT, WHEELBASE, WRONG_SAMPLE_COST, atGoal, createWorld, newRover, roverCenter, stepRover } from './physics';
import type { Difficulty, Rover, SampleId, World } from './physics';

type Status = 'brief' | 'driving' | 'sampling' | 'result';

/** La pista que da Houston en la fase 2. Entenderla es el reto de inglés del nivel. */
const CLUE_EN = 'Look for a white rock with shiny crystals, sitting on a gray pedestal.';
const CLUE_ES = 'Busca una roca blanca con cristales brillantes, apoyada sobre un pedestal gris.';
/** Escala del modelo del LRV (cabe en ~2 m; el real medía 3,1 m de largo). */
const ROVER_SCALE = 1.5;
const STEP = 1 / 120;
/** Las muestras se dibujan ampliadas para que se distingan bien en pantallas pequeñas. */
const SAMPLE_SCALE = 1.5;

const BRIEF_ART = `
<svg viewBox="0 0 200 200" role="img" aria-label="Vehículo lunar subiendo hacia una roca blanca">
  <rect width="200" height="200" fill="#000"/><circle cx="160" cy="34" r="13" fill="#3b74d9"/><path d="M152 30q8-6 16 2" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>
  <path d="M0 150 200 96v104H0z" fill="#8d8b86"/><path d="M0 150 200 96v10L0 162z" fill="#a3a19b"/>
  <g transform="rotate(-15 80 140)"><rect x="52" y="124" width="58" height="8" rx="2" fill="#c9ccd1"/><circle cx="62" cy="138" r="9" fill="#3a3c41" stroke="#9aa0a8" stroke-width="2"/><circle cx="100" cy="138" r="9" fill="#3a3c41" stroke="#9aa0a8" stroke-width="2"/>
  <rect x="70" y="106" width="9" height="18" rx="3" fill="#eceae4"/><circle cx="74.500" cy="101" r="6" fill="#eceae4"/><path d="M96 124v-22" stroke="#d4a43a" stroke-width="2"/><circle cx="96" cy="98" r="7" fill="none" stroke="#d4a43a" stroke-width="2"/></g>
  <path d="M150 102h22l-4-8h-14z" fill="#6e6c68"/><path d="m153 94 6-9 8 3 3 6z" fill="#f4f2ec"/><path d="m176 78 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd166"/>
</svg>`;

export default function genesisRock({ root, win }: GameContext): () => void {
  injectOpStyles();
  injectLrvStyles();
  const sfx = new Sfx();

  root.innerHTML = `
    <div class="op lrv">
      <canvas class="op-view" aria-label="Vista 3D del vehículo lunar en la ladera del monte Hadley Delta"></canvas>
      <div class="op-hud" hidden>
        <div class="op-hud__top"><span>LRV · EVA-2</span><span data-phase>EN RUTA</span></div>
        <div class="op-hud__grid">
          <div class="op-hud__cell"><span>VELOCIDAD</span><b data-speed>0</b></div>
          <div class="op-hud__cell"><span>A SPUR</span><b data-dist>—</b></div>
          <div class="op-hud__cell op-hud__wide"><span>OXÍGENO <em data-o2p>100%</em></span><i class="op-bar lrv-o2"><s data-o2></s><u title="Límite de regreso a pie"></u></i></div>
          <div class="op-hud__note" data-note></div>
        </div>
      </div>
      <div class="op-tools"><button type="button" class="op-tool" data-mute></button></div>
      <div class="op-capcom" aria-live="polite"></div>
      <div class="lrv-task" data-task hidden></div>
      <div class="op-pad lrv-pad disabled">
        <button type="button" class="op-key" data-ctl="left" aria-label="Girar a la izquierda"><span class="op-key__icon">◀</span>GIRO</button>
        <div class="lrv-pad__col">
          <button type="button" class="op-key" data-ctl="up" aria-label="Acelerar"><span class="op-key__icon">▲</span>AVANZA</button>
          <button type="button" class="op-key" data-ctl="down" aria-label="Frenar o marcha atrás"><span class="op-key__icon">▼</span>FRENO</button>
        </div>
        <button type="button" class="op-key" data-ctl="right" aria-label="Girar a la derecha"><span class="op-key__icon">▶</span>GIRO</button>
      </div>
      <div class="op-panel" data-panel hidden></div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const view = $<HTMLCanvasElement>('canvas.op-view');
  const panel = $('[data-panel]');

  let stage: MoonStage;
  try {
    stage = createMoonStage(view, FIELD);
  } catch {
    root.innerHTML = '<p class="op-loading">Este minijuego necesita WebGL y tu navegador no pudo iniciarlo.</p>';
    return () => sfx.stop();
  }
  const { scene, camera, bin } = stage;
  const worldBin = new Bin(); // se renueva al cambiar de escenario
  const reduce = reducedMotion();

  const hud = $('.op-hud');
  const hudPhase = $('[data-phase]');
  const hudSpeed = $('[data-speed]');
  const hudDist = $('[data-dist]');
  const hudO2 = $('[data-o2]');
  const hudO2P = $('[data-o2p]');
  const hudNote = $('[data-note]');
  const taskBox = $('[data-task]');
  const pad = $('.op-pad');
  const capcom = createCapcom($('.op-capcom'), sfx, 'ROVER', 'HOUSTON');
  bindMuteButton($<HTMLButtonElement>('[data-mute]'), sfx);

  /** Mensaje de Houston en inglés (hablado) con su traducción debajo. */
  const radio = (en: string, es: string) => {
    capcom.say(radioHtml(en, es));
    sfx.speakEnglish(en);
  };

  // ---------- escena fija ----------
  // montañas de los Apeninos al fondo
  addMassifs(scene, bin, [
    [-420, -1050, 420, 230],
    [180, -1250, 560, 330],
    [760, -980, 420, 210],
    [-900, -620, 380, 170],
    [1000, -300, 360, 150],
  ]);

  const worldGroup = new Group();
  scene.add(worldGroup);

  // rover con sus dos astronautas
  const roverGroup = new Group();
  roverGroup.rotation.order = 'YXZ';
  const roverModel = buildRobot('lrv').group; // geometrías y materiales en caché compartida
  roverModel.scale.setScalar(ROVER_SCALE);
  roverGroup.add(roverModel);
  [-0.42, 0.42].forEach((x, i) => {
    const a = buildAstronaut(i === 0).group;
    a.scale.setScalar(0.62);
    a.position.set(x, 0.55, -0.1);
    roverGroup.add(a);
  });
  scene.add(roverGroup);
  const shadow = blobShadow(bin, 1.9);
  scene.add(shadow);

  const dust = new ParticleSystem({ max: 260, size: 0.55, start: MOON.light, end: MOON.dark, blending: NormalBlending, opacity: 0.6 });
  dust.drag = 0; // sin aire nada frena el polvo: cae en arco, como una piedra
  dust.gravity = 1.62;
  scene.add(dust.points);

  // ---------- estado ----------
  let difficulty: Difficulty = 'cadete';
  let cfg = LEVELS[difficulty];
  let status: Status = 'brief';
  let world: World;
  let rover: Rover;
  let o2 = 100;
  let time = 0;
  let acc = 0;
  let hits = 0;
  let wrong = 0;
  let translated = false;
  let seed = (Date.now() & 0xffff) + 1;
  let shake = 0;
  let snap = true;
  const keys = { left: false, right: false, up: false, down: false };
  const touch = { left: false, right: false, up: false, down: false };
  const said = { half: false, near: false, low: false };
  const timers: number[] = [];
  const tweens: gsap.core.Animation[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
    tweens.forEach((t) => t.kill());
    tweens.length = 0;
  };
  const held = (k: keyof typeof keys) => keys[k] || touch[k];

  // ---------- escenario ----------
  interface SampleView {
    id: SampleId;
    group: Group;
    hit: Mesh;
  }
  let samples: SampleView[] = [];
  let selected = 0;
  const sampleSpot = new Vector3();
  const selectRing = new Mesh(bin.add(new TorusGeometry(0.62, 0.05, 6, 28)), bin.add(new MeshBasicMaterial({ color: MOON.holo })));
  selectRing.rotation.x = Math.PI / 2;
  selectRing.visible = false;
  scene.add(selectRing);

  const stdMat = (color: string, extra: Partial<{ emissive: string; emissiveIntensity: number; roughness: number }> = {}) =>
    worldBin.add(new MeshStandardMaterial({ color, flatShading: true, roughness: extra.roughness ?? 0.95, metalness: 0, emissive: extra.emissive ?? '#000000', emissiveIntensity: extra.emissiveIntensity ?? 0 }));

  /** Modelo de cada candidata. La Génesis descansa sobre un pedestal, como la encontraron. */
  const buildSample = (id: SampleId): { group: Group; hit: Mesh } => {
    const g = new Group();
    let body: Mesh;
    if (id === 'genesis') {
      const pedestal = new Mesh(worldBin.add(new CylinderGeometry(0.2, 0.34, 0.34, 6)), stdMat('#6e6c68'));
      pedestal.position.y = 0.17;
      body = new Mesh(worldBin.add(new IcosahedronGeometry(0.27, 0)), stdMat('#f6f4ee', { emissive: '#fff6d8', emissiveIntensity: 0.15, roughness: 0.5 }));
      body.position.y = 0.52;
      g.add(pedestal);
    } else if (id === 'basalt') {
      body = new Mesh(worldBin.add(new DodecahedronGeometry(0.32, 0)), stdMat('#2f2f35'));
      body.position.y = 0.24;
    } else if (id === 'breccia') {
      body = new Mesh(worldBin.add(new IcosahedronGeometry(0.34, 1)), stdMat('#7b736b'));
      body.position.y = 0.26;
      body.scale.set(1.15, 0.8, 0.95);
      const chip = worldBin.add(new DodecahedronGeometry(0.09, 0));
      const pale = stdMat('#c9c4ba');
      for (const [x, y, z] of [[0.2, 0.36, 0.14], [-0.22, 0.3, 0.1], [0.02, 0.42, -0.16]]) {
        const c = new Mesh(chip, pale);
        c.position.set(x, y, z);
        g.add(c);
      }
    } else if (id === 'green') {
      body = new Mesh(worldBin.add(new IcosahedronGeometry(0.3, 1)), stdMat('#7f9b58'));
      body.position.y = 0.12;
      body.scale.set(1.3, 0.45, 1.1);
    } else {
      body = new Mesh(worldBin.add(new DodecahedronGeometry(0.28, 0)), stdMat('#9c9a95'));
      body.position.y = 0.2;
    }
    body.rotation.set(hash(seed, 3) * 3, hash(seed, 5) * 3, 0);
    g.add(body);
    g.userData.body = body;
    // zona de clic generosa (invisible) para dedos y ratón
    const hit = new Mesh(worldBin.add(new IcosahedronGeometry(0.6, 0)), worldBin.add(new MeshBasicMaterial({ visible: false })));
    hit.position.y = 0.35;
    g.add(hit);
    return { group: g, hit };
  };

  const newWorld = () => {
    cfg = LEVELS[difficulty];
    const rand = rng(seed++);
    world = createWorld(cfg, rand);
    worldGroup.clear();
    worldBin.empty();

    const dark = new Color(MOON.crater);
    worldGroup.add(
      fieldMesh(world.field, worldBin, (x, z, _h, out) => {
        regolith(x, z, out);
        for (const c of world.craters) {
          const d = Math.hypot(x - c.x, z - c.z) / c.r;
          if (d < 0.9) out.lerp(dark, 0.5 * (1 - d)); // fondo en sombra
        }
      }),
    );

    const dummy = new Object3D();
    const rocks = new InstancedMesh(worldBin.add(new DodecahedronGeometry(1, 0)), worldBin.add(new MeshStandardMaterial({ color: MOON.rock, flatShading: true, roughness: 1 })), world.rocks.length);
    world.rocks.forEach((r, i) => {
      dummy.position.set(r.x, fieldHeight(world.field, r.x, r.z) + r.r * 0.35, r.z);
      dummy.rotation.set(hash(i, 1) * 6, hash(i, 2) * 6, hash(i, 3) * 6);
      dummy.scale.set(r.r, r.r * 0.8, r.r);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    worldGroup.add(rocks);

    // meta: aro y haz de luz en la parada junto a Spur
    const g = world.goal;
    const gy = fieldHeight(world.field, g.x, g.z);
    const ring = new Mesh(worldBin.add(new TorusGeometry(g.r, 0.22, 6, 40)), worldBin.add(new MeshBasicMaterial({ color: MOON.holo, transparent: true, opacity: 0.9 })));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(g.x, gy + 0.5, g.z);
    const beam = new Mesh(worldBin.add(new CylinderGeometry(1.1, 1.1, 70, 10, 1, true)), worldBin.add(new MeshBasicMaterial({ color: MOON.holo, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })));
    beam.position.set(g.x, gy + 35, g.z);
    worldGroup.add(ring, beam);

    // las cinco candidatas, en arco y en orden aleatorio, al borde del cráter
    sampleSpot.set(g.x + 1, 0, g.z - 9);
    const order = [...SAMPLES].sort(() => rand() - 0.5);
    samples = order.map((s, i) => {
      const v = buildSample(s.id);
      const a = ((i - 2) / 2) * 0.75;
      const x = sampleSpot.x + Math.sin(a) * 4.2;
      const z = sampleSpot.z - Math.cos(a) * 4.2 + 2.6;
      v.group.position.set(x, fieldHeight(world.field, x, z), z);
      v.group.scale.setScalar(SAMPLE_SCALE);
      worldGroup.add(v.group);
      return { id: s.id, ...v };
    });
    resetRun();
  };

  const resetRun = () => {
    clearTimers();
    rover = newRover(world);
    o2 = 100;
    acc = 0;
    hits = wrong = 0;
    translated = false;
    said.half = said.near = said.low = false;
    selected = 0;
    snap = true;
    selectRing.visible = false;
    taskBox.hidden = true;
    capcom.clear();
    samples.forEach((s) => {
      s.group.visible = true;
      s.group.scale.setScalar(SAMPLE_SCALE);
      s.group.position.y = fieldHeight(world.field, s.group.position.x, s.group.position.z);
    });
    sfx.loop('motor', 0, 300);
  };

  // ---------- fases ----------
  const startDrive = () => {
    sfx.init();
    panel.hidden = true;
    resetRun();
    status = 'driving';
    hud.hidden = false;
    pad.classList.remove('disabled');
    radio('Rover, you are go for Spur crater.', 'Rover, tienen luz verde para ir al cráter Spur.');
  };

  const startSampling = () => {
    status = 'sampling';
    rover.speed = 0;
    pad.classList.add('disabled');
    sfx.loop('motor', 0, 300);
    sfx.beep(true);
    capcom.say('Estación 7, cráter Spur. Frenos puestos.', 'craft');
    later(900, () => {
      taskBox.hidden = false;
      paintTask();
      sfx.radio();
      sfx.speakEnglish(CLUE_EN);
      selectRing.visible = true;
    });
  };

  const paintTask = (verdict = '') => {
    taskBox.innerHTML = `
      <p class="lrv-task__kicker">HOUSTON · PISTA EN INGLÉS</p>
      <p class="lrv-task__en">“${CLUE_EN}”</p>
      ${translated ? `<p class="lrv-task__es">${CLUE_ES}</p>` : ''}
      ${verdict ? `<p class="lrv-task__verdict">${verdict}</p>` : ''}
      <div class="lrv-task__actions">
        <button type="button" class="op-alt" data-repeat>🔊 Repetir</button>
        ${translated ? '' : '<button type="button" class="op-alt" data-translate>Traducir (−1 ★)</button>'}
      </div>
      <p class="lrv-task__hint">Toca una roca para recogerla con la pinza · teclado: ← → y ENTER</p>`;
    taskBox.querySelector('[data-repeat]')!.addEventListener('click', () => sfx.speakEnglish(CLUE_EN));
    taskBox.querySelector('[data-translate]')?.addEventListener('click', () => {
      translated = true;
      paintTask(verdict);
    });
  };

  const pick = (i: number) => {
    if (status !== 'sampling' || taskBox.hidden || !samples[i].group.visible) return;
    selected = i;
    const s = samples[i];
    const info = SAMPLES.find((x) => x.id === s.id)!;
    if (s.id === 'genesis') {
      status = 'result';
      selectRing.visible = false;
      sfx.success();
      paintTask(`✔ ${info.verdict}`);
      capcom.say('Guess what we just found! ¡Adivinen qué acabamos de encontrar!', 'craft');
      // la pinza la levanta y la guarda en su bolsa numerada
      const body = s.group.userData.body as Mesh;
      const tl = gsap.timeline({ onComplete: showResult });
      tl.to(body.position, { y: '+=1.5', duration: reduce ? 0.01 : 1.1, ease: 'power2.out' });
      tl.to(body.rotation, { y: '+=6', duration: reduce ? 0.01 : 1.6, ease: 'none' }, 0);
      tl.to({}, { duration: 0.9 });
      tweens.push(tl);
      return;
    }
    wrong++;
    o2 -= WRONG_SAMPLE_COST;
    sfx.fail();
    paintTask(`✖ ${info.name}: ${info.verdict}`);
    tweens.push(gsap.to(s.group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: reduce ? 0.01 : 0.5, ease: 'back.in(2)', onComplete: () => void (s.group.visible = false) }));
    const next = samples.findIndex((x, k) => k !== i && x.group.visible);
    if (next >= 0) selected = next;
  };

  const failWalkback = () => {
    status = 'result';
    pad.classList.add('disabled');
    taskBox.hidden = true;
    selectRing.visible = false;
    sfx.loop('motor', 0, 300);
    sfx.fail();
    radio('Rover, turn around. You have reached the walkback limit.', 'Rover, den la vuelta. Llegaron al límite de regreso.');
    later(900, showFail);
  };

  // ---------- simulación ----------
  const update = (dt: number) => {
    time += dt;
    if (status !== 'driving' && status !== 'sampling') return;
    o2 -= cfg.drain * dt * (status === 'sampling' ? 0.6 : 1);
    if (o2 <= WALKBACK_LIMIT) {
      o2 = WALKBACK_LIMIT;
      failWalkback();
      return;
    }
    if (!said.low && o2 < WALKBACK_LIMIT + 14) {
      said.low = true;
      sfx.beep();
      radio('Watch your oxygen.', 'Vigilen el oxígeno.');
    }
    if (status !== 'driving') return;

    const input = { turn: (held('right') ? 1 : 0) - (held('left') ? 1 : 0), drive: (held('up') ? 1 : 0) - (held('down') ? 1 : 0) };
    for (acc += dt; acc >= STEP; acc -= STEP) {
      const e = stepRover(world, rover, input, STEP);
      if (e?.type === 'hit') {
        hits++;
        o2 -= HIT_COST;
        shake = 0.5;
        sfx.burst({ dur: 0.35, from: 900, to: 80, vol: 0.5 });
        navigator.vibrate?.(40);
        if (hits === 1) capcom.say('¡Roca! Cada golpe nos cuesta tiempo… y oxígeno.', 'craft');
      } else if (e?.type === 'land') {
        shake = Math.min(0.5, e.speed * 0.12);
        sfx.burst({ dur: 0.25, from: 400, to: 60, vol: 0.3 });
      }
    }
    sfx.loop('motor', 0.02 + (Math.abs(rover.speed) / MAX_SPEED) * 0.05, 180 + Math.abs(rover.speed) * 120);

    const left = Math.hypot(rover.x - world.goal.x, rover.z - world.goal.z);
    if (!said.half && rover.z < world.goal.z / 2) {
      said.half = true;
      radio('Halfway there. Nice driving.', 'Mitad del camino. Buen manejo.');
    }
    if (!said.near && left < 45) {
      said.near = true;
      radio('Spur crater is just ahead. Slow down.', 'El cráter Spur está justo delante. Frenen.');
    }
    if (atGoal(world, rover)) startSampling();

    // polvo de las ruedas traseras
    if (rover.lift === 0 && Math.abs(rover.speed) > 1) {
      const fx = Math.sin(rover.heading);
      const fz = -Math.cos(rover.heading);
      for (const side of [-1, 1]) {
        if (Math.random() > 0.5) continue;
        _p.set(rover.x - fx * WHEELBASE - fz * side * 0.9, rover.groundY + 0.2, rover.z - fz * WHEELBASE + fx * side * 0.9);
        _v.set(-fx * rover.speed * 0.5 + (Math.random() - 0.5), 1.4 + Math.random() * 1.6, -fz * rover.speed * 0.5 + (Math.random() - 0.5));
        dust.emit(_p, _v, 1.2 + Math.random() * 0.8);
      }
    }
  };
  const _p = new Vector3();
  const _v = new Vector3();
  const _wantPos = new Vector3();
  const _wantLook = new Vector3();
  const _look = new Vector3();

  // ---------- dibujo ----------
  const draw = (dt: number) => {
    const c = roverCenter(rover);
    const f = world.field;
    const fx = Math.sin(rover.heading);
    const fz = -Math.cos(rover.heading);
    const ground = fieldHeight(f, c.x, c.z);
    roverGroup.position.set(c.x, ground + rover.lift, c.z);
    if (rover.lift === 0) {
      const pitch = Math.atan2(fieldHeight(f, c.x + fx, c.z + fz) - fieldHeight(f, c.x - fx, c.z - fz), 2);
      const roll = Math.atan2(fieldHeight(f, c.x - fz * 0.9, c.z + fx * 0.9) - fieldHeight(f, c.x + fz * 0.9, c.z - fx * 0.9), 1.8);
      const k = 1 - Math.exp(-10 * dt);
      roverGroup.rotation.x += (-pitch - roverGroup.rotation.x) * k;
      roverGroup.rotation.z += (-roll - roverGroup.rotation.z) * k;
    }
    roverGroup.rotation.y = Math.PI - rover.heading;
    shadow.position.set(c.x, ground + 0.08, c.z);
    shadow.scale.setScalar(1 / (1 + rover.lift * 0.25));
    dust.update(dt);

    const wide = camera.aspect < 1 ? 1.5 : 1;
    if (status === 'sampling' || (status === 'result' && !taskBox.hidden)) {
      const y = fieldHeight(f, sampleSpot.x, sampleSpot.z);
      // se mira algo por debajo de las rocas para que queden en la mitad alta, libres del cuadro de la pista
      _wantPos.set(sampleSpot.x, y + 2.7 * wide, sampleSpot.z + 4.6 * wide);
      _wantLook.set(sampleSpot.x, y - 0.7, sampleSpot.z);
    } else {
      _wantPos.set(c.x - fx * 10 * wide, ground + 4.6 * wide, c.z - fz * 10 * wide);
      _wantLook.set(c.x + fx * 6, ground + 1.2, c.z + fz * 6);
    }
    const k = snap ? 1 : 1 - Math.exp(-3 * dt);
    snap = false;
    camera.position.lerp(_wantPos, k);
    _look.lerp(_wantLook, k);
    camera.position.y = Math.max(camera.position.y, fieldHeight(f, camera.position.x, camera.position.z) + 1.2);
    camera.lookAt(_look);
    if (shake > 0.01 && !reduce) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= Math.exp(-7 * dt);
    }

    if (selectRing.visible && samples[selected]) {
      const g = samples[selected].group;
      selectRing.position.set(g.position.x, g.position.y + 0.08, g.position.z);
      selectRing.scale.setScalar(SAMPLE_SCALE * (1 + 0.08 * Math.sin(time * 6)));
    }
    // los cristales de la anortosita destellan al sol
    const gem = samples.find((s) => s.id === 'genesis');
    if (gem) ((gem.group.userData.body as Mesh).material as MeshStandardMaterial).emissiveIntensity = 0.12 + 0.22 * Math.max(0, Math.sin(time * 3.1) * Math.sin(time * 1.3));
    stage.render();
  };

  const updateHud = () => {
    hudSpeed.textContent = `${(Math.abs(rover.speed) * 3.6).toFixed(0)} km/h`;
    const left = Math.max(0, Math.hypot(rover.x - world.goal.x, rover.z - world.goal.z) - world.goal.r);
    hudDist.textContent = `${left.toFixed(0)} m`;
    hudO2.style.width = `${o2}%`;
    hudO2.classList.toggle('warn', o2 < WALKBACK_LIMIT + 14);
    hudO2P.textContent = `${Math.ceil(o2)}%`;
    if (status === 'driving') {
      hudPhase.textContent = rover.lift > AIRBORNE ? '¡EN EL AIRE!' : 'EN RUTA';
      // hacia dónde queda la meta respecto al morro del rover
      const bearing = Math.atan2(world.goal.x - rover.x, -(world.goal.z - rover.z)) - rover.heading;
      const rel = Math.atan2(Math.sin(bearing), Math.cos(bearing));
      hudNote.textContent = left < 1 ? 'FRENA DENTRO DEL ARO' : Math.abs(rel) < 0.25 ? 'SPUR ▲ RECTO' : `SPUR ${rel > 0 ? '▶ A LA DERECHA' : '◀ A LA IZQUIERDA'}`;
    } else {
      hudPhase.textContent = 'ESTACIÓN 7';
      hudNote.textContent = 'RECOGIDA DE MUESTRAS';
    }
  };

  // ---------- paneles ----------
  const showBrief = () => {
    status = 'brief';
    hud.hidden = true;
    taskBox.hidden = true;
    pad.classList.add('disabled');
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker">Misión 2 · LRV · Apolo 15 · Cráter Spur</p>
      <h3 class="op-panel__title">Conduce hasta Spur y encuentra la Roca Génesis</h3>
      <div class="op-brief">
        <div class="op-brief__art">${BRIEF_ART}</div>
        <ul class="op-rules">
          <li><i>1</i><span>Sube la ladera hasta el <b>aro azul</b>. Solo giran las <b>ruedas traseras</b>: ¡la cola se abre en las curvas!</span></li>
          <li><i>2</i><span>Esquiva las <b>rocas</b>: cada golpe gasta oxígeno. En la Luna, el rover <b>salta</b> en los cráteres.</span></li>
          <li><i>3</i><span>El oxígeno no puede bajar de la <b>marca roja</b>: es lo que haría falta para <b>volver andando</b> si el rover se avería.</span></li>
          <li><i>4</i><span>En Spur, Houston te dirá <b>en inglés</b> qué roca buscar. ¡Escucha bien!</span></li>
        </ul>
      </div>
      ${difficultyHtml(LEVELS, difficulty)}
      <div class="op-keys">
        <span class="op-cap" data-cap="left">←</span><span class="op-cap" data-cap="right">→</span> girar
        <span class="op-cap" data-cap="up">↑</span> acelerar <span class="op-cap" data-cap="down">↓</span> frenar
      </div>
      <p class="op-text op-text--small">El LRV real no pasaba de 13 km/h. En celular usa los botones de la esquina.</p>
      <div class="op-actions"><button type="button" class="op-go" data-go>ARRANCAR EL ROVER</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff as Difficulty;
        panel.querySelectorAll('[data-diff]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        sfx.init();
        sfx.tone(660, 0.08, 'sine', 0.05);
        newWorld();
      }),
    );
    panel.querySelector('[data-go]')!.addEventListener('click', startDrive);
    panel.querySelector<HTMLButtonElement>('[data-go]')!.focus();
  };

  const showResult = () => {
    const stars = 1 + (wrong === 0 && !translated ? 1 : 0) + (o2 >= 50 ? 1 : 0);
    taskBox.hidden = true;
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Muestra 15415 · ${cfg.label}</p>
      <h3 class="op-panel__title ok center">¡Encontraste la Roca Génesis!</h3>
      ${starsHtml(stars)}
      ${statsHtml([
        ['Recorrido', `${rover.odometer.toFixed(0)} m`],
        ['Golpes', String(hits)],
        ['Rocas erradas', String(wrong)],
        ['Oxígeno', `${Math.ceil(o2)}%`],
      ])}
      <p class="op-text">El 1 de agosto de 1971, en el cráter Spur, David Scott y James Irwin recogieron una roca blanca apoyada sobre un pedestal.
      «Guess what we just found!», dijo Scott por radio. Tiene unos 4.000 millones de años y es un trozo de la primera corteza de la Luna.
      Sin el rover no habrían llegado tan lejos ni tan alto.</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-again>Volver a jugar</button>
        <button type="button" class="op-go" data-continue>CONTINUAR</button>
      </div>`;
    panel.querySelector('[data-again]')!.addEventListener('click', () => {
      newWorld();
      showBrief();
    });
    panel.querySelector('[data-continue]')!.addEventListener('click', () => {
      panel.hidden = true;
      win();
    });
    panel.querySelector<HTMLButtonElement>('[data-continue]')!.focus();
  };

  const showFail = () => {
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Límite de regreso a pie</p>
      <h3 class="op-panel__title bad center">Hay que dar la vuelta</h3>
      <p class="op-text">El oxígeno llegó a la marca roja. Los astronautas nunca se alejaban más de lo que podían <b>volver caminando</b>
      al módulo lunar si el rover se averiaba. ${hits > 2 ? 'Consejo: rodea las rocas aunque el camino sea más largo.' : wrong > 0 ? 'Consejo: escucha otra vez la pista antes de elegir roca.' : 'Consejo: mantén el acelerador y traza curvas suaves.'}</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-brief>Cambiar dificultad</button>
        <button type="button" class="op-go" data-retry>REINTENTAR</button>
      </div>`;
    panel.querySelector('[data-brief]')!.addEventListener('click', () => {
      resetRun();
      showBrief();
    });
    panel.querySelector('[data-retry]')!.addEventListener('click', startDrive);
    panel.querySelector<HTMLButtonElement>('[data-retry]')!.focus();
  };

  // ---------- bucle ----------
  let raf = 0;
  let last = performance.now();
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    draw(dt);
    if (!hud.hidden) updateHud();
    raf = requestAnimationFrame(loop);
  };

  // ---------- controles ----------
  const keyMap: Record<string, keyof typeof keys> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
  const padBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ctl]'));
  const onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    if (status === 'sampling' && down && !taskBox.hidden) {
      const step = e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 0;
      if (step) {
        e.preventDefault();
        for (let n = 0; n < samples.length; n++) {
          selected = (selected + step + samples.length) % samples.length;
          if (samples[selected].group.visible) break;
        }
        sfx.tone(700, 0.05, 'sine', 0.04);
      } else if (e.code === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) {
        e.preventDefault();
        pick(selected);
      }
      return;
    }
    const k = keyMap[e.code];
    if (!k) return;
    if (status === 'driving') e.preventDefault();
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

  // elegir roca con el ratón o el dedo
  const ray = new Raycaster();
  const ndc = new Vector2();
  const rockAt = (e: PointerEvent): number => {
    const r = view.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const visible = samples.filter((s) => s.group.visible);
    const hit = ray.intersectObjects(visible.map((s) => s.hit))[0];
    return hit ? samples.findIndex((s) => s.hit === hit.object) : -1;
  };
  const onMove = (e: PointerEvent) => {
    if (status !== 'sampling') return;
    const i = rockAt(e);
    view.style.cursor = i >= 0 ? 'pointer' : '';
    if (i >= 0) selected = i;
  };
  const onDown = (e: PointerEvent) => {
    if (status !== 'sampling') return;
    const i = rockAt(e);
    if (i >= 0) pick(i);
  };
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerdown', onDown);

  const ro = new ResizeObserver(() => stage.resize());
  ro.observe(view);
  newWorld();
  showBrief();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    clearTimers();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    dust.dispose();
    worldBin.empty();
    stage.dispose();
    sfx.stop();
  };
}
