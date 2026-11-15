import gsap from 'gsap';
import {
  Box3,
  CircleGeometry,
  Color,
  Euler,
  Fog,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { ScreenFactory } from '../router';
import { dur, reducedMotion } from '../router';
import { ROBOTS } from '../data/robots';
import { PIECE_INFO, TWIN } from '../data/pieces';
import { getState, markAssembled } from '../store';
import { getCanvas, onFrame, size } from '../three/stage';
import { disposeSprite, dustBurst, flashSprite } from '../three/effects';
import type { ParticleSystem } from '../three/effects';
import { getWorld } from './world';
import { esc } from '../ui/modal';
import { tr } from '../i18n';

const GROUND_COLORS = { moon: 0x6f6f78, mars: 0x9a4524 };

const CSS = `
.pz-hint {
  position: absolute; left: 50%; top: calc(var(--header-h, 64px) + 64px); z-index: 4;
  max-width: calc(100% - 32px); margin: 0; padding: 10px 20px; transform: translateX(-50%);
  border: 1px solid rgba(192,132,252,.35); border-radius: 999px;
  font-size: clamp(14px, 1.6vw, 17px); font-weight: 600; text-align: center; color: var(--fg);
  background: rgba(5,4,13,.72); backdrop-filter: blur(6px); pointer-events: none;
  transition: border-color .3s, color .3s;
}
.pz-hint.good { border-color: var(--ok); color: #b9f8dc; }
.pz-hint.try { border-color: var(--retro-amber); color: #ffe2b0; }
.pz-bar {
  position: absolute; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 4;
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px;
  width: max-content; max-width: calc(100% - 24px); transform: translateX(-50%); pointer-events: auto;
}
.pz-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px;
  border: 1px solid rgba(255,255,255,.14); border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 14px; font-weight: 600; color: var(--fg);
  background: rgba(14,10,32,.82); backdrop-filter: blur(6px);
  transition: transform .2s var(--ease-spring), border-color .2s, background .2s;
}
.pz-chip:hover, .pz-chip:focus-visible { outline: none; transform: translateY(-3px); border-color: var(--accent-2); }
.pz-chip i { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; font-style: normal; font-size: 12px; background: rgba(255,255,255,.1); }
.pz-chip.done { border-color: var(--ok); background: rgba(16,60,40,.85); cursor: default; transform: none; }
.pz-chip.done i { color: #04140b; background: var(--ok); }
.pz-count { padding: 9px 14px; border-radius: 999px; font-family: var(--font-ui); font-size: 13px; letter-spacing: .08em; color: var(--accent-3); background: rgba(14,10,32,.82); }
.pz-tools { position: absolute; right: 20px; top: calc(var(--header-h, 64px) + 10px); z-index: 5; display: flex; gap: 8px; pointer-events: auto; }
.pz-help {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border: 0; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 15px; font-weight: 700; color: #1a1000;
  background: linear-gradient(135deg, #ffd166, #ffb547); box-shadow: 0 6px 20px rgba(255,181,71,.35);
  transition: transform .15s, filter .2s;
}
.pz-help:hover, .pz-help:focus-visible { outline: none; transform: translateY(-2px); filter: brightness(1.08); }
.pz-help svg { width: 20px; height: 20px; }
.pz-skip { padding: 12px 16px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; font: inherit; font-size: 14px; color: var(--fg); background: rgba(14,10,32,.8); }
.pz-guide { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.pz-guide line { stroke: rgba(255,255,255,.75); stroke-width: 3; stroke-dasharray: 2 10; stroke-linecap: round; animation: pz-dash .6s linear infinite; }
.pz-guide circle { fill: none; stroke: rgba(255,255,255,.8); stroke-width: 3; }
.pz-guide.near line, .pz-guide.near circle { stroke: var(--ok); }
@keyframes pz-dash { to { stroke-dashoffset: -12; } }
.pz-hand { position: absolute; z-index: 6; width: 54px; height: 54px; margin: -6px 0 0 -14px; pointer-events: none; opacity: 0; filter: drop-shadow(0 4px 10px rgba(0,0,0,.7)); }
.pz-fact {
  position: absolute; left: 50%; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); z-index: 5;
  width: min(460px, calc(100% - 24px)); padding: 14px 18px; transform: translateX(-50%);
  border: 1px solid var(--ok); border-radius: 16px; pointer-events: none;
  background: rgba(8,24,18,.92); box-shadow: 0 10px 40px rgba(0,0,0,.5), 0 0 30px rgba(52,211,153,.25);
}
.pz-fact[hidden] { display: none; }
.pz-fact b { display: block; margin-bottom: 4px; font-family: var(--font-ui); font-size: 15px; letter-spacing: .04em; color: var(--ok); }
.pz-fact p { margin: 0; font-size: 15px; line-height: 1.45; color: var(--fg); }
@media (max-width: 640px) {
  .pz-hint { top: calc(var(--header-h, 64px) + 52px); font-size: 13px; }
  .pz-chip { padding: 7px 10px; font-size: 12px; }
  .pz-tools { right: 10px; }
  .pz-help { padding: 10px 14px; font-size: 13px; }
  .pz-fact { bottom: calc(118px + env(safe-area-inset-bottom, 0px)); }
}
`;

function injectStyles(): void {
  if (document.getElementById('pz-styles')) return;
  const s = document.createElement('style');
  s.id = 'pz-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

let audio: AudioContext | null = null;
function tone(f1: number, f2: number, durS: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audio ??= new AC();
    const t = audio.currentTime + delay;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + durS);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + durS);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + durS + 0.02);
  } catch {
  }
}
const sfx = {
  grab: () => tone(500, 700, 0.08, 'sine', 0.05),
  snap: () => {
    tone(520, 1040, 0.14, 'triangle', 0.09);
    tone(1040, 1560, 0.18, 'sine', 0.05, 0.08);
  },
  miss: () => tone(260, 180, 0.18, 'sine', 0.06),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.08, i * 0.12)),
};

const HAND_SVG = `<svg viewBox="0 0 24 24"><path fill="#fff" stroke="#1a0b33" stroke-width="1.2" stroke-linejoin="round"
  d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-.5V3.5a1.5 1.5 0 0 1 3 0V10m0-.5V5a1.5 1.5 0 0 1 3 0v8.5c0 4-2.6 7.5-7 7.5-3 0-4.6-1.4-6-3.6L3 13.3a1.6 1.6 0 0 1 2.6-1.8L9 15"/></svg>`;

const puzzle: ScreenFactory = ({ root, go, params }) => {
  injectStyles();
  const id = params.robot ?? 'lrv';
  const data = ROBOTS[id];
  const world = getWorld();
  const { scene, camera } = world;
  const slot = world.slot(id);
  const robot = slot.robot;
  const g = robot.group;
  const hero = world.heroPose();

  if (g.parent !== scene) {
    world.resetAll();
    world.scene.attach(g);
    g.position.copy(hero.pos);
    g.scale.setScalar(hero.scale);
    g.rotation.set(0, 0, 0);
  }
  world.mode = 'puzzle';
  world.activate();
  for (const s of world.slots) {
    if (s !== slot) {
      world.fadePodium(s, 0);
      world.fadeRobot(s, 0);
    }
    s.spot.intensity = 0;
    s.beamMat.opacity = 0;
  }
  const podFade = { v: 1 };
  gsap.to(podFade, {
    v: 0,
    duration: dur(0.6),
    onUpdate: () => world.fadePodium(slot, podFade.v),
  });

  const flames = world.ensureFlames(slot);
  gsap.to(flames, { intensity: 0, duration: dur(1.2), delay: dur(0.4) });

  const pieces = robot.pieces;
  const homes = slot.pieceHomes;
  const infos = pieces.map((p) => PIECE_INFO[id]?.[p.name] ?? { name: tr('Piece', 'Pieza'), fact: '' });

  const already = getState().assembled[id];
  root.innerHTML = `
    <div class="puzzle-hud" style="padding-top:calc(var(--header-h, 64px) + 8px);pointer-events:none">
      <h2 class="map__title">${esc(data.name)}</h2>
    </div>
    <p class="pz-hint" data-hint>${tr('Get ready: the robot is about to come apart…', 'Prepárate: el robot se va a desarmar…')}</p>
    <svg class="pz-guide" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0" /><circle r="0" /></svg>
    <div class="pz-hand" aria-hidden="true">${HAND_SVG}</div>
    <div class="pz-fact" hidden role="status" aria-live="polite"></div>
    <div class="pz-tools">
      <button type="button" class="pz-help" data-help hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>
        ${tr('Help', 'Ayuda')}
      </button>
      ${already ? `<button class="pz-skip" type="button" data-skip>${tr('Skip', 'Saltar')}</button>` : ''}
    </div>
    <div class="pz-bar" hidden>
      ${pieces.map((_, i) => `<button type="button" class="pz-chip" data-chip="${i}"><i>${i + 1}</i>${esc(infos[i].name)}</button>`).join('')}
      <span class="pz-count" data-count>0/${pieces.length}</span>
    </div>`;
  root.style.touchAction = 'none';
  root.style.userSelect = 'none';
  world.heroLight.intensity = 2.2;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const bar = root.querySelector<HTMLElement>('.pz-bar')!;
  const counter = root.querySelector<HTMLElement>('[data-count]')!;
  const helpBtn = root.querySelector<HTMLButtonElement>('[data-help]')!;
  const skipBtn = root.querySelector<HTMLButtonElement>('[data-skip]');
  const guide = root.querySelector<SVGSVGElement>('.pz-guide')!;
  const guideLine = guide.querySelector('line')!;
  const guideCircle = guide.querySelector('circle')!;
  const hand = root.querySelector<HTMLElement>('.pz-hand')!;
  const factEl = root.querySelector<HTMLElement>('.pz-fact')!;

  const placed = new Set<number>();
  const filled = new Set<number>();
  const fails = new Array(pieces.length).fill(0) as number[];
  const taps = new Array(pieces.length).fill(0) as number[];
  const spots: Vector3[] = pieces.map((p) => p.position.clone());
  const waitScale = pieces.map(() => 1);
  let interactive = false;
  let finished = false;
  const anim = { bob: 1, shake: 0 };
  const basePos = g.position.clone();
  const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];
  const disposables: (() => void)[] = [];
  const dust: ParticleSystem[] = [];
  const timers: number[] = [];
  const highlight = new Set<number>();

  const setHint = (text: string, mood: '' | 'good' | 'try' = '') => {
    hint.textContent = text;
    hint.className = `pz-hint${mood ? ` ${mood}` : ''}`;
  };

  const ghostRoot = new Group();
  ghostRoot.name = 'ghost';
  const ghostMats: MeshBasicMaterial[] = [];
  const accent = new Color(data.accent);
  pieces.forEach((p, i) => {
    const gm = new MeshBasicMaterial({
      color: accent.clone().lerp(new Color(0x9b7bff), 0.4),
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    ghostMats.push(gm);
    const clone = p.clone(true);
    const fx: Object3D[] = [];
    clone.traverse((o) => {
      if (o.userData.fx) fx.push(o);
      const m = o as Mesh;
      if (m.isMesh) m.material = gm;
    });
    fx.forEach((o) => o.removeFromParent());
    clone.position.copy(homes[i].pos);
    clone.quaternion.copy(homes[i].quat);
    clone.scale.copy(homes[i].scale);
    clone.userData.ghostOf = i;
    ghostRoot.add(clone);
  });
  ghostRoot.visible = false;
  g.add(ghostRoot);
  disposables.push(() => {
    ghostRoot.removeFromParent();
    ghostMats.forEach((m) => m.dispose());
  });
  const ghostBase = 0.14;
  const highlightColor = new Color(0x67e8f9);
  const ghostColor = accent.clone().lerp(new Color(0x9b7bff), 0.4);

  let time = 0;
  const offFrame = onFrame((dt) => {
    time += dt;
    if (!finished) {
      g.position.copy(basePos);
      g.position.y += Math.sin(time * 2.2) * 0.06 * anim.bob * hero.scale;
      if (anim.shake > 0) {
        g.position.x += (Math.random() - 0.5) * anim.shake;
        g.position.y += (Math.random() - 0.5) * anim.shake;
        g.rotation.z = (Math.random() - 0.5) * anim.shake * 0.6;
      }
    }
    ghostMats.forEach((m, i) => {
      let target = 0;
      if (ghostRoot.visible && !filled.has(i)) target = highlight.has(i) ? 0.55 + 0.35 * Math.sin(time * 7) : ghostBase;
      m.opacity += (target - m.opacity) * Math.min(1, dt * 10);
      m.color.copy(highlight.has(i) ? highlightColor : ghostColor);
    });
    dust.forEach((d) => d.update(dt));
    if (dragIndex >= 0) updateGuide();
  });

  const explode = () => {
    g.rotation.z = 0;
    anim.shake = 0;
    g.position.copy(basePos);
    g.updateMatrixWorld(true);
    const { hh, hw } = (() => {
      const d = camera.position.z - hero.pos.z;
      const hh2 = Math.tan(MathUtils.degToRad(20)) * d;
      return { hh: hh2, hw: hh2 * camera.aspect };
    })();
    const n = pieces.length;
    const robotBox = new Box3().setFromObject(g);
    const halfRobot = (robotBox.max.x - robotBox.min.x) / 2;
    const freeW = hw - halfRobot - 0.25;
    const columns = freeW > 0.9;
    const order = pieces.map((_, i) => i).sort(() => Math.random() - 0.5);
    const center = new Vector3(0, -0.02 * hh, hero.pos.z);
    const offset0 = Math.random() * Math.PI * 2;
    order.forEach((i, slotIdx) => {
      const p = pieces[i];
      let target: Vector3;
      if (columns) {
        const side = slotIdx % 2 === 0 ? -1 : 1;
        const row = Math.floor(slotIdx / 2);
        const rows = side < 0 ? Math.ceil(n / 2) : Math.floor(n / 2);
        const t = rows <= 1 ? 0.5 : row / (rows - 1);
        const colX = halfRobot + 0.25 + freeW / 2;
        target = new Vector3(side * colX, hh * (0.32 - t * 0.72), 0).add(center);
      } else {
        const top = slotIdx < Math.ceil(n / 2);
        const count = top ? Math.ceil(n / 2) : Math.floor(n / 2);
        const idxInRow = top ? slotIdx : slotIdx - Math.ceil(n / 2);
        const rTop = robotBox.max.y - center.y;
        const rBot = robotBox.min.y - center.y;
        const yTop = (rTop + hh * 0.48) / 2;
        const yBot = (rBot - hh * 0.62) / 2;
        const xs = count <= 1 ? 0 : -hw * 0.62 + (idxInRow / (count - 1)) * hw * 1.24;
        target = new Vector3(xs, top ? yTop : yBot, 0).add(center);
        void offset0;
      }
      const local = g.worldToLocal(target.clone());
      spots[i].copy(local);
      const pb = new Box3().setFromObject(p);
      const pw = Math.max(0.01, pb.max.x - pb.min.x, (pb.max.z - pb.min.z) * 0.6);
      const ph = Math.max(0.01, pb.max.y - pb.min.y, (pb.max.z - pb.min.z) * 0.4);
      const rowsHere = Math.ceil(n / 2);
      const rowH = (hh * 0.72) / Math.max(1, rowsHere - 1);
      const cellW = (hw * 1.6) / Math.ceil(n / 2);
      const rowSpaceV = Math.max(0.2, (hh * 0.48 - (robotBox.max.y - center.y)) * 0.9);
      waitScale[i] = columns
        ? MathUtils.clamp(Math.min((freeW * 0.8) / pw, (rowH * 0.85) / ph), 0.32, 0.85)
        : MathUtils.clamp(Math.min((cellW * 0.85) / pw, rowSpaceV / ph), 0.3, 0.8);
      const hs = homes[i].scale;
      const rot = new Euler((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.7);
      const qTarget = homes[i].quat.clone().multiply(new Quaternion().setFromEuler(rot));
      const qStart = p.quaternion.clone();
      const proxy = { k: 0 };
      tweens.push(
        gsap.to(p.position, { x: local.x, y: local.y, z: local.z, duration: dur(1), ease: 'power3.out' }),
        gsap.to(p.scale, { x: hs.x * waitScale[i], y: hs.y * waitScale[i], z: hs.z * waitScale[i], duration: dur(1), ease: 'power3.out' }),
        gsap.to(proxy, {
          k: 1,
          duration: dur(1.1),
          ease: 'power2.out',
          onUpdate: () => {
            p.quaternion.slerpQuaternions(qStart, qTarget, proxy.k);
          },
        }),
      );
    });
    const flash = flashSprite(0xc4b5fd);
    flash.position.copy(g.position).add(new Vector3(0, 0.7 * hero.scale, 0.2));
    scene.add(flash);
    tweens.push(
      gsap.fromTo(flash.scale, { x: 0.5, y: 0.5 }, { x: 5, y: 5, duration: dur(0.6), ease: 'expo.out' }),
      gsap.fromTo(
        flash.material,
        { opacity: 0.9 },
        { opacity: 0, duration: dur(0.6), onComplete: () => disposeSprite(flash) },
      ),
    );
    ghostRoot.visible = true;
    timers.push(
      window.setTimeout(() => {
        if (finished) return;
        interactive = true;
        bar.hidden = false;
        helpBtn.hidden = false;
        setHint(tr('Drag each piece to the glowing outline', 'Arrastra cada pieza hasta la silueta que brilla'));
        updateCounter();
        timers.push(window.setTimeout(() => showHand(0), 400));
      }, dur(1.1) * 1000),
    );
  };

  const updateCounter = () => {
    counter.textContent = `${placed.size}/${pieces.length}`;
    root.querySelectorAll<HTMLButtonElement>('[data-chip]').forEach((c) => {
      const i = Number(c.dataset.chip);
      c.classList.toggle('done', placed.has(i));
      c.querySelector('i')!.textContent = placed.has(i) ? '✓' : String(i + 1);
    });
  };

  const intro = gsap.timeline({ onComplete: explode });
  intro
    .to({}, { duration: dur(1.8) })
    .add(() => setHint(tr('Watch out! The robot is shaking…', '¡Atención! El robot está vibrando…')))
    .to(anim, { shake: 0.02 * hero.scale, duration: dur(0.3) })
    .to({}, { duration: dur(0.6) })
    .to(anim, { shake: 0.07 * hero.scale, bob: 0, duration: dur(0.3) })
    .to({}, { duration: dur(0.6) });
  tweens.push(intro);

  const tmpW = new Vector3();
  const minDim = () => {
    const { w, h } = size();
    return Math.min(w, h);
  };
  const snapRadius = () => Math.max(80, minDim() * 0.16);
  const magnetRadius = () => snapRadius() * 2.2;
  const pickRadius = () => Math.max(60, minDim() * 0.1);

  const box = new Box3();
  const pieceCenterWorld = (i: number, out: Vector3) => box.setFromObject(pieces[i]).getCenter(out);
  const homeWorld = (k: number, out: Vector3) => g.localToWorld(out.copy(homes[k].pos));
  const screenOf = (v: Vector3) => world.toScreen(v);

  const candidates = (i: number): number[] => {
    const out: number[] = [];
    if (!filled.has(i)) out.push(i);
    const twinName = TWIN[pieces[i].name];
    if (twinName) {
      const j = pieces.findIndex((p) => p.name === twinName);
      if (j >= 0 && !filled.has(j)) out.push(j);
    }
    return out;
  };

  const nearestHome = (i: number): { k: number; d: number } => {
    const cur = screenOf(pieces[i].getWorldPosition(tmpW));
    let best = { k: -1, d: Infinity };
    for (const k of candidates(i)) {
      const hs = screenOf(homeWorld(k, new Vector3()));
      const d = Math.hypot(cur.x - hs.x, cur.y - hs.y);
      if (d < best.d) best = { k, d };
    }
    return best;
  };

  const updateGuide = () => {
    if (dragIndex < 0) return;
    const { k, d } = nearestHome(dragIndex);
    if (k < 0) return;
    const a = screenOf(pieces[dragIndex].getWorldPosition(tmpW));
    const b = screenOf(homeWorld(k, new Vector3()));
    guideLine.setAttribute('x1', String(a.x));
    guideLine.setAttribute('y1', String(a.y));
    guideLine.setAttribute('x2', String(b.x));
    guideLine.setAttribute('y2', String(b.y));
    guideCircle.setAttribute('cx', String(b.x));
    guideCircle.setAttribute('cy', String(b.y));
    guideCircle.setAttribute('r', String(Math.max(18, snapRadius() * 0.35)));
    guide.classList.toggle('near', d < snapRadius());
    highlight.clear();
    candidates(dragIndex).forEach((c) => highlight.add(c));
  };
  const hideGuide = () => {
    guideLine.setAttribute('x2', guideLine.getAttribute('x1') ?? '0');
    guideLine.setAttribute('y2', guideLine.getAttribute('y1') ?? '0');
    guideCircle.setAttribute('r', '0');
    guide.classList.remove('near');
  };

  let handTl: gsap.core.Timeline | null = null;
  const showHand = (i: number) => {
    if (finished || placed.has(i)) return;
    const ks = candidates(i);
    if (!ks.length) return;
    handTl?.kill();
    const a = screenOf(pieceCenterWorld(i, new Vector3()));
    const b = screenOf(homeWorld(ks[0], new Vector3()));
    highlight.clear();
    ks.forEach((k) => highlight.add(k));
    const p = pieces[i];
    const h = homes[i];
    const ws = waitScale[i];
    tweens.push(gsap.fromTo(p.scale, { x: h.scale.x * ws * 1.3, y: h.scale.y * ws * 1.3, z: h.scale.z * ws * 1.3 }, { x: h.scale.x * ws, y: h.scale.y * ws, z: h.scale.z * ws, duration: 0.5, ease: 'elastic.out(1, 0.4)' }));
    handTl = gsap.timeline({
      repeat: 1,
      onComplete: () => {
        if (dragIndex < 0) highlight.clear();
      },
    });
    handTl
      .set(hand, { left: a.x, top: a.y, opacity: 0, scale: 1 })
      .to(hand, { opacity: 1, duration: 0.25 })
      .to(hand, { scale: 0.85, duration: 0.15 })
      .to(hand, { left: b.x, top: b.y, duration: reducedMotion ? 0.3 : 1.1, ease: 'power2.inOut' })
      .to(hand, { scale: 1, duration: 0.15 })
      .to(hand, { opacity: 0, duration: 0.3, delay: 0.2 });
    tweens.push(handTl);
  };

  let factTimer = 0;
  const showFact = (i: number) => {
    const info = infos[i];
    if (!info.fact) return;
    factEl.innerHTML = `<b>${tr('', '¡')}${esc(info.name)}!</b><p>${esc(info.fact)}</p>`;
    factEl.hidden = false;
    tweens.push(gsap.fromTo(factEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }));
    window.clearTimeout(factTimer);
    factTimer = window.setTimeout(() => {
      tweens.push(gsap.to(factEl, { opacity: 0, duration: 0.3, onComplete: () => (factEl.hidden = true) }));
    }, 5200);
  };

  const ray = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane();
  const hit = new Vector3();
  const grabOffset = new Vector3();
  let dragIndex = -1;
  let pointerId = -1;
  let downAt = { x: 0, y: 0 };
  let moved = false;
  const canvas = getCanvas();

  const setRay = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };

  const pieceOf = (o: Object3D | null): number => {
    while (o && o.parent !== g) o = o.parent;
    if (!o) return -1;
    return pieces.indexOf(o);
  };

  const pick = (e: PointerEvent): number => {
    setRay(e);
    const free = pieces.filter((_, i) => !placed.has(i));
    const hits = ray.intersectObjects(free, true);
    if (hits.length) {
      const idx = pieceOf(hits[0].object);
      if (idx >= 0) return idx;
    }
    let best = -1;
    let bestD = pickRadius();
    pieces.forEach((_, i) => {
      if (placed.has(i)) return;
      const s = screenOf(pieceCenterWorld(i, new Vector3()));
      const d = Math.hypot(s.x - e.clientX, s.y - e.clientY);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onDown = (e: PointerEvent) => {
    if (!interactive || finished || pointerId !== -1) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const idx = pick(e);
    if (idx < 0) return;
    pointerId = e.pointerId;
    root.setPointerCapture(e.pointerId);
    dragIndex = idx;
    downAt = { x: e.clientX, y: e.clientY };
    moved = false;
    handTl?.kill();
    gsap.set(hand, { opacity: 0 });
    const p = pieces[idx];
    gsap.killTweensOf(p.position);
    p.getWorldPosition(tmpW);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()).negate(), tmpW);
    setRay(e);
    ray.ray.intersectPlane(plane, hit);
    grabOffset.copy(tmpW).sub(hit);
    const h = homes[idx];
    const qStart = p.quaternion.clone();
    const proxy = { k: 0 };
    tweens.push(
      gsap.to(p.scale, { x: h.scale.x * 1.12, y: h.scale.y * 1.12, z: h.scale.z * 1.12, duration: 0.18 }),
      gsap.to(proxy, { k: 1, duration: 0.35, ease: 'power2.out', onUpdate: () => p.quaternion.slerpQuaternions(qStart, h.quat, proxy.k) }),
    );
    highlight.clear();
    candidates(idx).forEach((k) => highlight.add(k));
    setHint(tr(`Take the ${infos[idx].name.toLowerCase()} to the glowing outline`, `Lleva ${infos[idx].name.toLowerCase()} a la silueta que brilla`));
    root.style.cursor = 'grabbing';
    sfx.grab();
    navigator.vibrate?.(10);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) {
      if (interactive && pointerId === -1) root.style.cursor = pick(e) >= 0 ? 'grab' : 'default';
      return;
    }
    if (dragIndex < 0) return;
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) moved = true;
    if (!moved) return;
    setRay(e);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const wpos = hit.add(grabOffset);
    const p = pieces[dragIndex];
    p.position.copy(g.worldToLocal(wpos.clone()));
    const { k, d } = nearestHome(dragIndex);
    if (k >= 0 && d < magnetRadius()) {
      const pull = (1 - d / magnetRadius()) * 0.6;
      const target = g.worldToLocal(homeWorld(k, new Vector3()));
      p.position.lerp(target, pull);
    }
    updateGuide();
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {
    }
    root.style.cursor = 'default';
    if (dragIndex < 0) return;
    const i = dragIndex;
    dragIndex = -1;
    hideGuide();
    const h = homes[i];

    if (!moved) {
      tweens.push(gsap.to(pieces[i].scale, { x: h.scale.x * waitScale[i], y: h.scale.y * waitScale[i], z: h.scale.z * waitScale[i], duration: 0.2 }));
      taps[i]++;
      if (taps[i] >= 3) {
        setHint(tr('I\'ll help you with this one!', '¡Te ayudo con esta!'), 'good');
        autoPlace(i);
      } else {
        setHint(tr('Press and hold, then drag to the outline!', '¡Mantén presionado y arrastra hasta la silueta!'), 'try');
        showHand(i);
      }
      return;
    }

    const { k, d } = nearestHome(i);
    if (k >= 0 && d < snapRadius()) {
      snap(i, k);
      return;
    }
    fails[i]++;
    sfx.miss();
    if (fails[i] >= 2) {
      setHint(tr('Almost! I\'ll help you with this piece', '¡Casi! Te ayudo con esta pieza'), 'good');
      autoPlace(i);
      return;
    }
    setHint(tr('Almost! Bring it closer to the glowing outline', '¡Casi! Acércala más a la silueta que brilla'), 'try');
    highlight.clear();
    tweens.push(
      gsap.to(pieces[i].position, { x: spots[i].x, y: spots[i].y, z: spots[i].z, duration: 0.6, ease: 'power2.out' }),
      gsap.to(pieces[i].scale, { x: h.scale.x * waitScale[i], y: h.scale.y * waitScale[i], z: h.scale.z * waitScale[i], duration: 0.25 }),
    );
  };

  const autoPlace = (i: number) => {
    const ks = candidates(i);
    if (!ks.length) return;
    snap(i, ks[0], false, true);
  };

  const snap = (i: number, k: number, fast = false, flying = false) => {
    if (placed.has(i) || filled.has(k)) return;
    placed.add(i);
    filled.add(k);
    highlight.clear();
    const p = pieces[i];
    const h = homes[k];
    const mirror = k !== i ? -1 : 1;
    const qStart = p.quaternion.clone();
    const proxy = { k: 0 };
    const d = fast ? 0.35 : flying ? 0.9 : 0.45;
    tweens.push(
      gsap.to(p.position, { x: h.pos.x, y: h.pos.y, z: h.pos.z, duration: dur(d), ease: flying ? 'power2.inOut' : 'back.out(1.6)' }),
      gsap.to(p.scale, { x: h.scale.x * mirror, y: h.scale.y, z: h.scale.z, duration: dur(d), ease: 'power2.out' }),
      gsap.to(proxy, {
        k: 1,
        duration: dur(d),
        ease: 'power2.out',
        onUpdate: () => {
          p.quaternion.slerpQuaternions(qStart, h.quat, proxy.k);
        },
      }),
    );
    if (!fast) {
      const f = flashSprite(accent);
      f.position.copy(g.localToWorld(h.pos.clone()));
      scene.add(f);
      tweens.push(
        gsap.fromTo(f.scale, { x: 0.3, y: 0.3 }, { x: 1.8, y: 1.8, duration: dur(0.5), delay: dur(d * 0.7), ease: 'expo.out' }),
        gsap.fromTo(f.material, { opacity: 0.8 }, { opacity: 0, duration: dur(0.5), delay: dur(d * 0.7), onComplete: () => disposeSprite(f) }),
      );
      timers.push(window.setTimeout(() => sfx.snap(), dur(d * 0.7) * 1000));
      showFact(i);
      const left = pieces.length - placed.size;
      if (left > 0) setHint(left === 1 ? tr('Great! Only 1 piece left', '¡Muy bien! Falta solo 1 pieza') : tr(`Great! ${left} pieces left`, `¡Muy bien! Faltan ${left} piezas`), 'good');
    }
    updateCounter();
    if (placed.size === pieces.length) timers.push(window.setTimeout(() => complete(), dur(d) * 1000 + (fast ? 50 : 900)));
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  disposables.push(() => {
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onUp);
  });

  helpBtn.addEventListener('click', () => {
    if (!interactive || finished || dragIndex >= 0) return;
    const i = pieces.findIndex((_, n) => !placed.has(n));
    if (i < 0) return;
    setHint(tr(`Look! ${infos[i].name} goes here`, `¡Mira! ${infos[i].name} va aquí`), 'good');
    autoPlace(i);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-chip]').forEach((c) =>
    c.addEventListener('click', () => {
      const i = Number(c.dataset.chip);
      if (!interactive || finished || placed.has(i)) return;
      setHint(tr(`This piece: ${infos[i].name.toLowerCase()}. Drag it to its outline!`, `Esta es ${infos[i].name.toLowerCase()}. ¡Arrástrala a su silueta!`));
      showHand(i);
    }),
  );

  skipBtn?.addEventListener('click', () => {
    if (finished) return;
    intro.kill();
    tweens.forEach((t) => t.kill());
    anim.shake = 0;
    anim.bob = 0;
    g.rotation.z = 0;
    interactive = false;
    skipBtn.remove();
    pieces.forEach((_, i) => {
      if (!placed.has(i)) {
        const k = candidates(i)[0];
        if (k !== undefined) snap(i, k, true);
      }
    });
  });

  const glowMats = slot.robotMats
    .map((s) => s.m)
    .filter((m): m is MeshStandardMaterial => (m as MeshStandardMaterial).isMeshStandardMaterial === true);

  const complete = () => {
    if (finished) return;
    finished = true;
    interactive = false;
    skipBtn?.remove();
    helpBtn.hidden = true;
    handTl?.kill();
    gsap.set(hand, { opacity: 0 });
    markAssembled(id);
    sfx.done();
    setHint(tr('Robot assembled! Starting descent…', '¡Robot armado! Iniciando descenso…'), 'good');
    ghostRoot.visible = false;
    g.position.copy(basePos);
    g.rotation.z = 0;

    const origEmissive = glowMats.map((m) => ({ c: m.emissive.clone(), i: m.emissiveIntensity }));
    const white = new Color(0xffffff);
    const glow = { k: 1 };
    const flash = flashSprite(0xffffff);
    flash.position.copy(g.position).add(new Vector3(0, 0.7 * hero.scale, 0.3));
    scene.add(flash);

    const groundY = hero.pos.y - 0.85 * hero.scale;
    const groundMat = new MeshStandardMaterial({
      color: GROUND_COLORS[data.body],
      roughness: 1,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 0,
    });
    const ground = new Mesh(new CircleGeometry(40, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, groundY, hero.pos.z - 12);
    const fogColor = data.body === 'mars' ? 0x2a0f08 : 0x0b0b12;
    disposables.push(() => {
      ground.removeFromParent();
      ground.geometry.dispose();
      groundMat.dispose();
      scene.fog = null;
      glowMats.forEach((m, i) => {
        m.emissive.copy(origEmissive[i].c);
        m.emissiveIntensity = origEmissive[i].i;
      });
    });

    const camTarget = { y: 0, ly: 0 };
    const tl = gsap.timeline({
      onComplete: () => go('map', { robot: id }),
    });
    tl.to(g.rotation, { x: 0, y: 0, duration: dur(0.6), ease: 'power2.inOut' }, 0)
      .fromTo(flash.scale, { x: 0.5, y: 0.5 }, { x: 7, y: 7, duration: dur(0.7), ease: 'expo.out' }, 0.2)
      .fromTo(flash.material, { opacity: 1 }, { opacity: 0, duration: dur(0.9), onComplete: () => disposeSprite(flash) }, 0.2)
      .to(
        glow,
        {
          k: 0,
          duration: dur(1.2),
          ease: 'power2.out',
          onUpdate: () => {
            glowMats.forEach((m, i) => {
              m.emissive.copy(origEmissive[i].c).lerp(white, glow.k * 0.8);
              m.emissiveIntensity = Math.max(origEmissive[i].i, glow.k * 1.2);
            });
          },
        },
        0.2,
      )
      .fromTo(g.scale, { x: hero.scale * 1.12, y: hero.scale * 1.12, z: hero.scale * 1.12 }, { x: hero.scale, y: hero.scale, z: hero.scale, duration: dur(0.8), ease: 'elastic.out(1, 0.5)' }, 0.25)
      .add(() => {
        scene.add(ground);
        scene.fog = new Fog(fogColor, 8, 38);
      }, 1.6)
      .to(flames, { intensity: 0.85, duration: dur(0.4) }, 1.6)
      .to(groundMat, { opacity: 1, duration: dur(1) }, 1.6)
      .to(g.position, { y: basePos.y + 0.55 * hero.scale, duration: dur(0.8), ease: 'power2.out' }, 1.7)
      .to(camTarget, {
        y: 0.9,
        ly: -0.9,
        duration: dur(2.6),
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.position.y = camTarget.y;
          camera.lookAt(0, camTarget.ly, hero.pos.z - 4);
        },
      }, 1.7)
      .to(g.position, { y: groundY, duration: dur(1.9), ease: 'power2.inOut' }, 2.5)
      .to(flames, { intensity: 0.35, duration: dur(1.5) }, 2.6)
      .add(() => {
        flames.intensity = 0;
        const at = g.position.clone();
        dust.push(dustBurst(scene, at, data.body === 'mars' ? 0xc0714a : 0xa7a7b0, reducedMotion ? 40 : 160, hero.scale));
        setHint(tr('Landing confirmed! Loading the mission map…', '¡Aterrizaje confirmado! Cargando el mapa de la misión…'), 'good');
      }, 2.5 + dur(1.9))
      .to(g.scale, { y: hero.scale * 0.9, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.out' }, 2.5 + dur(1.9))
      .to({}, { duration: dur(1.2) });
    tweens.push(tl);
  };

  return {
    unmount() {
      finished = true;
      tweens.forEach((t) => t.kill());
      intro.kill();
      handTl?.kill();
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(factTimer);
      window.setTimeout(() => {
        offFrame();
        disposables.forEach((d) => d());
        dust.forEach((d) => d.dispose());
        if (world.flames === flames) world.disposeFlames();
      }, 600);
    },
  };
};

export default puzzle;
