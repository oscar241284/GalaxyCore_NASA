/**
 * HOME: portada cinematográfica.
 * - Luna 3D realista (Three.js) con relieve, cráteres y luz solar rasante, la Tierra al fondo
 *   y estrellas; todo reacciona al movimiento del puntero (parallax).
 * - Título, consola GALAXYCORE OS con efecto máquina de escribir, botón INICIAR MISIÓN
 *   interactivo (brillo, efecto magnético y onda al pulsar) y tarjetas de los 4 robots
 *   con su progreso.
 */
import gsap from 'gsap';
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three';
import type { ScreenFactory } from '../router';
import { reducedMotion } from '../router';
import { ALL_ROBOTS, getState } from '../store';
import { ROBOTS } from '../data/robots';
import { esc } from '../ui/modal';
import { createMoonMaps, fbm, makeNoise, rng } from '../ui/moonTexture';

const CHAR_MS = 22;
const LINE_PAUSE_MS = 320;

// ---------------------------------------------------------------- estilos
const CSS = `
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  background: radial-gradient(ellipse 80% 70% at 75% 45%, #120c2b 0%, #05040d 65%);
}
.hero__space { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.hero__space canvas { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 1.4s ease; }
.hero__space canvas.on { opacity: 1; }
.hero__shade {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, rgba(5,4,13,.92) 0%, rgba(5,4,13,.65) 38%, rgba(5,4,13,0) 62%);
}
.hero__meteor {
  position: absolute; z-index: 1; width: 140px; height: 2px; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.9));
  transform: rotate(-28deg); opacity: 0;
  animation: hero-meteor 1.1s ease-out forwards;
}
@keyframes hero-meteor {
  0% { opacity: 0; translate: 0 0; }
  15% { opacity: 1; }
  100% { opacity: 0; translate: -420px 220px; }
}
.hero__content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; justify-content: center; gap: clamp(12px, 2.2vh, 22px);
  width: min(680px, 100%);
  min-height: 100vh; min-height: 100dvh;
  padding: calc(var(--header-h) + 4px) var(--gutter) 24px clamp(20px, 6vw, 96px);
}
.hero__kicker {
  margin: 0; display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-ui); font-size: 12px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--holo);
}
.hero__kicker::before { content: ''; width: 34px; height: 1px; background: currentColor; box-shadow: 0 0 8px currentColor; }
.hero__title { margin: 0; font-family: var(--font-ui); line-height: .95; }
.hero__title-main {
  display: block; white-space: nowrap; font-size: clamp(30px, min(4vw, 9vh), 72px); font-weight: 900; letter-spacing: .01em;
  background: linear-gradient(180deg, #ffffff 0%, #e9d5ff 45%, #a855f7 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  background-attachment: scroll;
  filter: drop-shadow(0 0 28px rgba(168,85,247,.45));
}
.hero__title-main span { display: inline-block; background: inherit; -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero__title-sub {
  display: block; margin-top: 10px; font-size: clamp(16px, 2.3vw, 26px); font-weight: 600;
  letter-spacing: .42em; text-transform: uppercase; color: var(--accent-3);
}
.hero__lead { margin: 0; max-width: 520px; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.6; color: var(--muted); }
.hero__lead b { color: var(--fg); font-weight: 600; }

.hero__console {
  position: relative; max-width: 540px; padding: 14px 18px 12px;
  border: 1px solid rgba(57,255,138,.28); border-radius: 12px;
  background: linear-gradient(180deg, rgba(2,14,8,.82), rgba(2,10,6,.7));
  box-shadow: inset 0 0 30px rgba(57,255,138,.06), 0 10px 40px rgba(0,0,0,.4);
  backdrop-filter: blur(6px);
  overflow: hidden;
}
.hero__console::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px);
}
.hero__console-bar {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
  font-family: var(--font-mono); font-size: 16px; color: var(--retro-amber); letter-spacing: .06em;
}
.hero__console-bar i { width: 8px; height: 8px; border-radius: 50%; background: var(--retro-green); box-shadow: var(--glow-green); animation: hero-blink 1.6s steps(2) infinite; }
@keyframes hero-blink { 50% { opacity: .25; } }
.hero__console-log { min-height: 75px; font-family: var(--font-mono); font-size: 20px; line-height: 1.25; color: var(--retro-green); text-shadow: 0 0 6px rgba(57,255,138,.45); }
.hero__console-log p { margin: 0; }
.hero__cursor { animation: hero-blink 1s steps(2) infinite; }

.hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.hero__start {
  position: relative; display: inline-flex; align-items: center; gap: 14px;
  padding: 18px 34px 18px 26px; border: 0; border-radius: 999px; overflow: hidden; cursor: pointer;
  font-family: var(--font-ui); font-size: clamp(15px, 1.4vw, 18px); font-weight: 800; letter-spacing: .14em;
  color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
  box-shadow: 0 0 0 1px rgba(233,213,255,.35) inset, 0 10px 30px rgba(124,58,237,.45), var(--glow);
  transition: box-shadow .3s, filter .3s;
  will-change: transform;
}
.hero__start:hover, .hero__start:focus-visible {
  outline: none; filter: brightness(1.12);
  box-shadow: 0 0 0 2px rgba(255,255,255,.6) inset, 0 14px 44px rgba(124,58,237,.65), 0 0 60px rgba(168,85,247,.7);
}
.hero__start:active { filter: brightness(.95); }
.hero__start svg { width: 26px; height: 26px; flex: none; transition: transform .35s var(--ease-spring); }
.hero__start:hover svg { transform: translate(4px,-4px) rotate(-8deg); }
.hero__start::before {
  content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent);
  transform: skewX(-20deg); animation: hero-shine 3.2s ease-in-out infinite;
}
@keyframes hero-shine { 0%, 60% { left: -60%; } 100% { left: 130%; } }
.hero__ripple {
  position: absolute; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
  background: rgba(255,255,255,.6); pointer-events: none; animation: hero-ripple .6s ease-out forwards;
}
@keyframes hero-ripple { to { transform: scale(18); opacity: 0; } }
.hero__ghost {
  padding: 14px 20px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 14px; color: var(--muted); background: rgba(20,14,44,.55); backdrop-filter: blur(6px);
  transition: color .2s, border-color .2s;
}
.hero__ghost:hover, .hero__ghost:focus-visible { outline: none; color: var(--fg); border-color: var(--accent-2); }
.hero__hint { margin: -6px 0 0; font-size: 13px; color: var(--dim); }
.hero__hint kbd { padding: 1px 6px; border: 1px solid var(--line); border-radius: 5px; font-family: inherit; color: var(--muted); }

.hero__robots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 6px 0 0; padding: 0; list-style: none; max-width: 600px; }
.hero__robot {
  position: relative; width: 100%; padding: 12px 12px 14px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
  text-align: left; cursor: pointer; font: inherit; color: var(--fg);
  background: rgba(14,10,32,.6); backdrop-filter: blur(6px);
  transition: transform .3s var(--ease-out), border-color .3s, background .3s;
}
.hero__robot:hover, .hero__robot:focus-visible { outline: none; transform: translateY(-4px); border-color: var(--c); background: rgba(24,16,52,.8); }
.hero__robot-place { display: flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.hero__robot-place i { width: 8px; height: 8px; border-radius: 50%; background: var(--b); box-shadow: 0 0 8px var(--b); }
.hero__robot-name { display: block; margin: 6px 0 10px; font-family: var(--font-ui); font-size: 12px; font-weight: 700; letter-spacing: .04em; line-height: 1.3; }
.hero__robot-bar { display: block; height: 4px; border-radius: 2px; background: rgba(255,255,255,.1); overflow: hidden; }
.hero__robot-bar s { display: block; height: 100%; width: var(--p); background: var(--c); box-shadow: 0 0 8px var(--c); }
.hero__robot-count { position: absolute; top: 10px; right: 10px; font-family: var(--font-mono); font-size: 16px; color: var(--muted); }

.hero__scroll { position: absolute; right: var(--gutter); bottom: 18px; z-index: 2; font-family: var(--font-mono); font-size: 16px; color: var(--dim); letter-spacing: .1em; }

@media (max-width: 900px) {
  .hero__shade { background: linear-gradient(180deg, rgba(5,4,13,.35) 0%, rgba(5,4,13,.85) 55%, rgba(5,4,13,.95) 100%); }
  .hero__content { width: 100%; justify-content: flex-end; padding-left: var(--gutter); }
  .hero__robots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero__scroll { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__start::before, .hero__meteor, .hero__console-bar i, .hero__cursor { animation: none; }
}
`;

function injectStyles(): void {
  if (document.getElementById('home-styles')) return;
  const s = document.createElement('style');
  s.id = 'home-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- textura de la Tierra
function createEarthTexture(): HTMLCanvasElement {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const noise = makeNoise(3);
  const clouds = makeNoise(9);
  for (let y = 0; y < h; y++) {
    const lat = Math.abs(y / h - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 4;
      const v = (y / h) * 2;
      const land = fbm(noise, u, v, 5, 4);
      const cl = fbm(clouds, u * 2 + 5, v * 2, 4, 8);
      let r: number;
      let g: number;
      let b: number;
      if (lat > 0.86) [r, g, b] = [235, 240, 245];
      else if (land > 0.53) {
        const t = Math.min(1, (land - 0.53) * 5);
        [r, g, b] = [70 + t * 90, 110 + t * 40, 50 + t * 30];
      } else {
        const d = land / 0.53;
        [r, g, b] = [14 + d * 20, 50 + d * 60, 120 + d * 70];
      }
      const cw = Math.max(0, Math.min(1, (cl - 0.5) * 3.2));
      const i = (y * w + x) * 4;
      img.data[i] = r + (250 - r) * cw;
      img.data[i + 1] = g + (252 - g) * cw;
      img.data[i + 2] = b + (255 - b) * cw;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function glowTexture(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

// ---------------------------------------------------------------- escena 3D
interface Space {
  destroy(): void;
}

function createSpace(host: HTMLElement): Space | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null; // sin WebGL: queda el fondo degradado
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0, 7);

  // luz del Sol rasante desde la izquierda + luz de la Tierra muy tenue
  const sun = new DirectionalLight(0xfff4e6, 3.2);
  sun.position.set(-6, 1.8, 1.6);
  scene.add(sun);
  scene.add(new AmbientLight(0x6b7cff, 0.06));

  // estrellas
  const rand = rng(42);
  const N = 2200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = rand() * Math.PI * 2;
    const p = Math.acos(2 * rand() - 1);
    const r = 60 + rand() * 40;
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = -Math.abs(r * Math.cos(p));
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(pos, 3));
  const starMat = new PointsMaterial({ color: 0xffffff, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.85 });
  const stars = new Points(starGeo, starMat);
  scene.add(stars);

  // Luna
  const maps = createMoonMaps(1024);
  const colorTex = new CanvasTexture(maps.color);
  colorTex.colorSpace = SRGBColorSpace;
  colorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bumpTex = new CanvasTexture(maps.bump);
  const moonGeo = new SphereGeometry(1, 128, 96);
  const moonMat = new MeshStandardMaterial({ map: colorTex, bumpMap: bumpTex, bumpScale: 2.4, roughness: 1, metalness: 0 });
  const moon = new Mesh(moonGeo, moonMat);
  moon.rotation.set(0.12, -0.6, 0.08);
  const moonGroup = new Group();
  moonGroup.add(moon);
  // halo muy sutil (la Luna no tiene atmósfera, es solo resplandor de cámara)
  const haloTex = new CanvasTexture(glowTexture('rgba(190,170,255,0.35)'));
  const halo = new Sprite(new SpriteMaterial({ map: haloTex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(3.1, 3.1, 1);
  halo.position.z = -0.6;
  moonGroup.add(halo);
  scene.add(moonGroup);

  // Tierra lejana
  const earthTex = new CanvasTexture(createEarthTexture());
  earthTex.colorSpace = SRGBColorSpace;
  const earthGeo = new SphereGeometry(1, 64, 48);
  const earthMat = new MeshStandardMaterial({ map: earthTex, roughness: 0.75, metalness: 0 });
  const earth = new Mesh(earthGeo, earthMat);
  const earthGroup = new Group();
  earthGroup.add(earth);
  const atmoTex = new CanvasTexture(glowTexture('rgba(96,165,250,0.75)'));
  const atmo = new Sprite(new SpriteMaterial({ map: atmoTex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  atmo.scale.set(2.9, 2.9, 1);
  earthGroup.add(atmo);
  earthGroup.scale.setScalar(0.24);
  scene.add(earthGroup);

  // distribución según pantalla
  let baseMoonY = 0;
  const layout = () => {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w / h > 1.05;
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
    if (wide) {
      moonGroup.scale.setScalar(1.75);
      moonGroup.position.set(halfW * 0.48, -0.1, 0);
      earthGroup.position.set(halfW * 0.05, 1.55, -4);
    } else {
      moonGroup.scale.setScalar(1.55);
      moonGroup.position.set(0.2, 1.05, 0);
      earthGroup.position.set(-halfW * 0.55, 2.4, -4);
    }
    baseMoonY = moonGroup.position.y;
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  // parallax con el puntero
  let mx = 0;
  let my = 0;
  const onMove = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener('pointermove', onMove);

  let raf = 0;
  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    if (!reducedMotion) {
      moon.rotation.y += dt * 0.035;
      earth.rotation.y += dt * 0.08;
      stars.rotation.z += dt * 0.004;
      moonGroup.position.y = baseMoonY + Math.sin(t * 0.5) * 0.04;
      camera.position.x += (mx * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => renderer.domElement.classList.add('on'));

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      [starGeo, moonGeo, earthGeo].forEach((g) => g.dispose());
      [starMat, moonMat, earthMat, halo.material, atmo.material].forEach((m) => m.dispose());
      [colorTex, bumpTex, earthTex, haloTex, atmoTex].forEach((tx) => tx.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

// ---------------------------------------------------------------- pantalla
const home: ScreenFactory = ({ root, go }) => {
  injectStyles();
  const state = getState();
  const name = state.name;
  const lines = [
    name ? `Bienvenido de nuevo, ${name}.` : 'Bienvenido, astronauta.',
    'Enlace con la Luna y Marte: ESTABLE.',
    '4 exploradores esperan tu misión. Sistemas listos.',
  ];

  const robotCards = ALL_ROBOTS.map((id) => {
    const r = ROBOTS[id];
    const done = state.levels[id].filter(Boolean).length;
    const place = r.body === 'moon' ? 'Luna' : 'Marte';
    const bodyColor = r.body === 'moon' ? '#c9ccd3' : '#d9653b';
    return `
      <li>
        <button type="button" class="hero__robot" data-robot style="--c:${r.accent};--b:${bodyColor};--p:${(done / 4) * 100}%">
          <span class="hero__robot-place"><i></i>${place}</span>
          <span class="hero__robot-name">${esc(r.name)}</span>
          <span class="hero__robot-bar"><s></s></span>
          <span class="hero__robot-count">${done}/4</span>
        </button>
      </li>`;
  }).join('');

  root.innerHTML = `
    <section class="hero">
      <div class="hero__space" aria-hidden="true"></div>
      <div class="hero__shade" aria-hidden="true"></div>
      <div class="hero__content">
        <p class="hero__kicker">Misión educativa · Exploración robótica</p>
        <h1 class="hero__title">
          <span class="hero__title-main" aria-label="GalaxyCore">${'GalaxyCore'.split('').map((c) => `<span>${c}</span>`).join('')}</span>
          <span class="hero__title-sub">Misión Robots</span>
        </h1>
        <p class="hero__lead">Reconstruye los robots que exploraron <b>la Luna y Marte</b>, recorre sus rutas reales y supera <b>16 pruebas</b> para ganar tu certificado de astronauta.</p>
        <div class="hero__console">
          <div class="hero__console-bar"><i></i>GALAXYCORE OS v2.0 · ENLACE ORBITAL</div>
          <div class="hero__console-log" role="log" aria-live="polite"></div>
        </div>
        <div class="hero__actions">
          <button class="hero__start" type="button" data-start>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
            INICIAR MISIÓN
          </button>
          ${name ? `<button class="hero__ghost" type="button" data-rename>Cambiar nombre (${esc(name)})</button>` : ''}
        </div>
        <p class="hero__hint">o pulsa <kbd>Enter</kbd></p>
        <ul class="hero__robots" aria-label="Robots de la misión">${robotCards}</ul>
      </div>
      <p class="hero__scroll" aria-hidden="true">LAT 0.67° N · LON 23.47° E</p>
    </section>`;

  const section = root.querySelector<HTMLElement>('.hero')!;
  const spaceHost = root.querySelector<HTMLElement>('.hero__space')!;
  const log = root.querySelector<HTMLElement>('.hero__console-log')!;
  const startBtn = root.querySelector<HTMLButtonElement>('[data-start]')!;

  // ---------- escena 3D (se crea tras pintar el texto para no retrasarlo) ----------
  let space: Space | null = null;
  let alive = true;
  const spaceTimer = window.setTimeout(() => {
    if (alive) space = createSpace(spaceHost);
  }, 60);

  // ---------- consola con máquina de escribir ----------
  let timer = 0;
  let li = 0;
  let ci = 0;
  let lineEl: HTMLParagraphElement | null = null;
  const cursor = document.createElement('span');
  cursor.className = 'hero__cursor';
  cursor.textContent = '█';
  const type = () => {
    if (!alive) return;
    if (li >= lines.length) return;
    if (!lineEl) {
      lineEl = document.createElement('p');
      lineEl.textContent = '> ';
      log.appendChild(lineEl);
      lineEl.appendChild(cursor);
    }
    const line = lines[li];
    if (ci < line.length) {
      cursor.before(document.createTextNode(line[ci++]));
      timer = window.setTimeout(type, CHAR_MS);
    } else {
      li++;
      ci = 0;
      if (li < lines.length) lineEl = null;
      timer = window.setTimeout(type, LINE_PAUSE_MS);
    }
  };
  if (reducedMotion) {
    log.innerHTML = lines.map((l) => `<p>&gt; ${esc(l)}</p>`).join('');
  } else timer = window.setTimeout(type, 700);

  // ---------- animación de entrada ----------
  const tl = gsap.timeline();
  if (!reducedMotion) {
    tl.from('.hero__kicker', { opacity: 0, x: -20, duration: 0.6, ease: 'power2.out' })
      .from('.hero__title-main span', { opacity: 0, y: 40, rotateX: -80, duration: 0.7, stagger: 0.05, ease: 'back.out(1.8)' }, '-=0.3')
      .from('.hero__title-sub', { opacity: 0, letterSpacing: '0.9em', duration: 0.8, ease: 'power2.out' }, '-=0.4')
      .from(['.hero__lead', '.hero__console', '.hero__actions', '.hero__hint'], { opacity: 0, y: 18, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, '-=0.5')
      .from('.hero__robot', { opacity: 0, y: 20, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, '-=0.3');
  }

  // ---------- botón INICIAR: efecto magnético + onda ----------
  const start = () => go(getState().name ? 'podiums' : 'name');
  const onBtnMove = (e: PointerEvent) => {
    if (reducedMotion) return;
    const r = startBtn.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    gsap.to(startBtn, { x: dx * 14, y: dy * 10, duration: 0.3, ease: 'power2.out' });
  };
  const onBtnLeave = () => gsap.to(startBtn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  startBtn.addEventListener('pointermove', onBtnMove);
  startBtn.addEventListener('pointerleave', onBtnLeave);
  startBtn.addEventListener('click', (e) => {
    const r = startBtn.getBoundingClientRect();
    const rip = document.createElement('span');
    rip.className = 'hero__ripple';
    rip.style.left = `${(e.clientX || r.left + r.width / 2) - r.left}px`;
    rip.style.top = `${(e.clientY || r.top + r.height / 2) - r.top}px`;
    startBtn.appendChild(rip);
    gsap.to(startBtn, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 });
    window.setTimeout(start, reducedMotion ? 0 : 380);
  });
  root.querySelector('[data-rename]')?.addEventListener('click', () => go('name'));
  root.querySelectorAll('[data-robot]').forEach((b) => b.addEventListener('click', start));

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && document.activeElement === document.body) {
      e.preventDefault();
      startBtn.click();
    }
  };
  document.addEventListener('keydown', onKey);

  // ---------- estrellas fugaces ----------
  let meteorTimer = 0;
  const meteor = () => {
    if (!alive) return;
    const m = document.createElement('span');
    m.className = 'hero__meteor';
    m.style.left = `${30 + Math.random() * 65}%`;
    m.style.top = `${Math.random() * 40}%`;
    section.appendChild(m);
    window.setTimeout(() => m.remove(), 1300);
    meteorTimer = window.setTimeout(meteor, 3500 + Math.random() * 5000);
  };
  if (!reducedMotion) meteorTimer = window.setTimeout(meteor, 2500);

  return {
    unmount() {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(spaceTimer);
      window.clearTimeout(meteorTimer);
      document.removeEventListener('keydown', onKey);
      tl.kill();
      gsap.killTweensOf(startBtn);
      space?.destroy();
    },
  };
};

export default home;