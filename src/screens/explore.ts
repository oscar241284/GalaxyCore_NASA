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
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { ScreenFactory } from '../router';
import { EXPLORERS, getRecovered, markRecovered, MOMENTS, STATUS_INFO, type Explorer, type World } from '../data/explorers';
import { esc } from '../ui/modal';
import { fbm, makeNoise, rng } from '../ui/moonTexture';
import { exIcon, UI } from '../data/explorerIcons';
import { canSpeak, injectKit, sfx, speak, stopSpeak } from '../games/lkKit';
import { tr } from '../i18n';

const CSS = `
.gx { position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden; color: var(--fg);
  background: radial-gradient(ellipse 70% 60% at 35% 50%, #1a1238 0%, #05040d 70%); }
.gx__globe { position: absolute; inset: 0; right: 360px; }
.gx__globe canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
.gx__globe canvas:active { cursor: grabbing; }
.gx__labels { position: absolute; inset: 0; right: 360px; pointer-events: none; }
.gx__label { position: absolute; display: inline-flex; align-items: center; gap: 6px; transform: translate(-50%, calc(-100% - 10px)); padding: 3px 10px 3px 4px; border-radius: 999px; white-space: nowrap; font-size: 12px; font-weight: 800;
  color: #fff; background: rgba(10,8,24,.78); border: 1.5px solid var(--c); pointer-events: auto; cursor: pointer; transition: transform .15s, opacity .2s; }
.gx__label:hover, .gx__label.sel { transform: translate(-50%, calc(-100% - 10px)) scale(1.08); background: rgba(40,26,80,.95); }
.gx__top { position: absolute; left: 18px; top: calc(var(--header-h) + 6px); right: 380px; display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; z-index: 3; }
.gx__brand small { display: block; font-family: var(--font-ui); font-size: 11px; letter-spacing: .24em; color: #c4b5fd; }
.gx__brand b { display: block; font-family: var(--font-ui); font-size: clamp(22px, 2.6vw, 34px); letter-spacing: .06em;
  background: linear-gradient(180deg, #fff, #c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent; }
.gx__brand span { font-size: 13px; color: var(--muted); }
.gx__tabs { display: inline-flex; padding: 4px; border-radius: 999px; background: rgba(10,8,24,.8); border: 1px solid rgba(255,255,255,.12); }
.gx__tabs button { padding: 9px 16px; color: #cbd5e1 !important; border: 0; border-radius: 999px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 800; color: var(--muted); background: none; }
.gx__tabs button[aria-pressed="true"] { color: #1a0b33 !important; background: #fde68a; }
.gx__back { padding: 9px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2); cursor: pointer; font: inherit; font-weight: 700; color: var(--fg); background: rgba(10,8,24,.6); }
.gx__side { position: absolute; right: 0; top: 0; bottom: 0; width: 360px; padding: calc(var(--header-h) + 8px) 14px 14px; overflow-y: auto; z-index: 2;
  background: linear-gradient(90deg, rgba(5,4,13,0), rgba(5,4,13,.85) 12%); }
.gx__side h2 { margin: 6px 0 4px; font-family: var(--font-ui); font-size: 13px; letter-spacing: .14em; color: var(--muted); }
.gx__prog { margin: 0 0 12px; font-size: 14px; color: #fde68a; }
.gx__list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.gx__card { display: grid; grid-template-columns: 52px 1fr; gap: 12px; align-items: center; width: 100%; padding: 12px; border-radius: 18px; cursor: pointer; text-align: left; font: inherit; color: var(--fg);
  background: rgba(20,14,44,.82); border: 2px solid rgba(255,255,255,.08); transition: border-color .2s, transform .2s; }
.gx__card:hover, .gx__card:focus-visible, .gx__card.sel { outline: none; border-color: var(--c); transform: translateX(-4px); }
.gx__ico { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; font-size: 26px; background: rgba(255,255,255,.07); border: 2px solid var(--c); }
.gx__card b { display: block; font-size: 16px; }
.gx__card small { display: block; margin-top: 2px; font-size: 12px; color: var(--muted); }
.gx__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.gx__chip { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; background: rgba(255,255,255,.08); }
.gx__hint { position: absolute; left: 50%; bottom: 18px; transform: translateX(calc(-50% - 180px)); padding: 8px 14px; border-radius: 999px; font-size: 13px; color: var(--muted); background: rgba(10,8,24,.6); pointer-events: none; }

.gx__file { position: absolute; right: 0; top: 0; bottom: 0; width: min(500px, 100%); z-index: 6; display: flex; flex-direction: column;
  padding: calc(var(--header-h) + 8px) 18px 18px; background: #0c091c; border-left: 2px solid var(--c); box-shadow: -20px 0 60px rgba(0,0,0,.6);
  transform: translateX(105%); transition: transform .45s cubic-bezier(.2,.9,.3,1); }
.gx__file.open { transform: none; }
.gx__fhead { display: grid; grid-template-columns: 64px 1fr auto; gap: 12px; align-items: center; }
.gx__fhead .gx__ico { width: 64px; height: 64px; font-size: 32px; }
.gx__fhead h3 { margin: 0; font-family: var(--font-ui); font-size: 24px; }
.gx__fhead p { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
.gx__x { width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2); cursor: pointer; font-size: 18px; color: var(--fg); background: rgba(255,255,255,.06); }
.gx__status { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0 0; padding: 10px 12px; border-radius: 14px; font-size: 14px; line-height: 1.4; background: rgba(255,255,255,.05); border-left: 4px solid var(--st); }
.gx__status b { color: var(--st); }
.gx__ftabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 14px 0 10px; }
.gx__ftabs button { padding: 8px 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; line-height: 1.2; color: var(--muted); background: rgba(255,255,255,.04); }
.gx__ftabs button span { display: block; font-size: 18px; }
.gx__ftabs button[aria-selected="true"] { color: #fff; border-color: var(--c); background: rgba(255,255,255,.1); }
.gx__body { flex: 1; overflow-y: auto; padding-right: 4px; }
.gx__steps { display: flex; gap: 6px; margin-bottom: 12px; }
.gx__steps button { flex: 1; padding: 6px 2px; border-radius: 10px; border: 0; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; color: var(--muted); background: rgba(255,255,255,.06); }
.gx__steps button span { display: block; font-size: 18px; }
.gx__steps button.on { color: #1a0b33; background: var(--c); }
.gx__steps button.seen:not(.on) { color: #fff; }
.gx__moment h4 { margin: 0 0 4px; font-family: var(--font-ui); font-size: 18px; }
.gx__moment em { display: block; margin-bottom: 10px; font-size: 13px; font-style: normal; color: var(--muted); }
.gx__quote { margin: 0; padding: 16px 18px; border-radius: 18px; font-size: 18px; line-height: 1.55; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
.gx__quote::before { content: '«'; color: var(--c); font-size: 26px; font-weight: 900; margin-right: 2px; }
.gx__quote::after { content: '»'; color: var(--c); font-size: 26px; font-weight: 900; margin-left: 2px; }
.gx__nav { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
.gx__nav .lk-btn { flex: 1; }
.gx__note { margin: 12px 0 0; font-size: 12px; color: var(--muted); }
.gx__table { width: 100%; border-collapse: collapse; font-size: 15px; }
.gx__table th { width: 42%; padding: 10px 8px; text-align: left; font-size: 12px; letter-spacing: .06em; color: var(--muted); border-bottom: 1px solid rgba(255,255,255,.08); }
.gx__table td { padding: 10px 8px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,.08); }
.gx__disc { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.gx__disc li { padding: 12px 14px; border-radius: 14px; font-size: 15px; line-height: 1.45; background: rgba(52,211,153,.08); border-left: 4px solid #34d399; }
.gx__legacy { margin: 14px 0 0; padding: 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; background: rgba(253,224,71,.08); border: 1px solid rgba(253,224,71,.3); }
.gx__q p { margin: 0 0 10px; font-size: 17px; font-weight: 800; line-height: 1.4; }
.gx__q .lk-guess__opts { display: grid; gap: 8px; }
.gx__q .lk-guess__opts button { width: 100%; text-align: left; }
.gx__badge { display: grid; place-items: center; gap: 6px; padding: 18px; border-radius: 18px; text-align: center; background: rgba(52,211,153,.1); border: 2px solid #34d399; }
.gx__badge b { font-family: var(--font-ui); font-size: 22px; color: #34d399; letter-spacing: .1em; }
.gx-svg { width: 34px; height: 34px; color: var(--c, #e5e7eb); }
.gx__label .gx-svg { width: 24px; height: 24px; padding: 2px; border-radius: 50%; background: rgba(255,255,255,.08); }
.gx__fhead .gx-svg { width: 44px; height: 44px; }
.gx-ui { width: 1.1em; height: 1.1em; flex: none; vertical-align: -0.18em; }
.gx__prog { display: flex; align-items: center; gap: 6px; }
.gx__dot { display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--st, currentColor); flex: none; }
.gx__dot--pulse { margin-top: 5px; box-shadow: 0 0 0 0 var(--st); animation: gxPulse 2s infinite; }
@keyframes gxPulse { 70% { box-shadow: 0 0 0 7px transparent; } }
.gx__tabs button { display: inline-flex; align-items: center; }
.gx__chip { display: inline-flex; align-items: center; gap: 4px; }
.gx__chip--st { color: #e5e7eb; background: rgba(255,255,255,.06); border: 1px solid var(--st); }
.gx__ftabs button .gx-ui, .gx__steps button .gx-ui { display: block; margin: 0 auto 3px; width: 20px; height: 20px; }
.gx__moment h4 { display: flex; align-items: center; gap: 8px; color: var(--c); }
.gx__moment h4 .gx-ui { width: 22px; height: 22px; }
.gx__medal .gx-ui { width: 54px; height: 54px; color: #34d399; }
.lk-btn .gx-ui { width: 20px; height: 20px; }
.gx__legacy b { color: #fde68a; }
@media (max-width: 900px) {
  .gx__globe, .gx__labels { right: 0; bottom: 42%; }
  .gx__top { right: 14px; }
  .gx__side { top: auto; height: 42%; width: 100%; padding-top: 12px; background: rgba(5,4,13,.92); border-top: 1px solid rgba(255,255,255,.1); }
  .gx__hint { display: none; }
  .gx__file { top: auto; height: 88%; width: 100%; border-left: 0; border-top: 2px solid var(--c); border-radius: 22px 22px 0 0; padding-top: 16px; transform: translateY(105%); }
  .gx__quote { font-size: 16px; }
}
`;

const TW = 2048;
const TH = 1024;
const toXY = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * TW, y: ((90 - lat) / 180) * TH });

function blob(g: CanvasRenderingContext2D, lat: number, lon: number, rLat: number, rLon: number, color: string, alpha: number, rot = 0) {
  const { x, y } = toXY(lat, lon);
  const rx = (rLon / 360) * TW;
  const ry = (rLat / 180) * TH;
  for (const ox of [-TW, 0, TW]) {
    g.save();
    g.translate(x + ox, y);
    g.rotate(rot);
    g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, color.replace('A', String(alpha)));
    gr.addColorStop(0.65, color.replace('A', String(alpha * 0.85)));
    gr.addColorStop(1, color.replace('A', '0'));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function baseNoise(g: CanvasRenderingContext2D, seed: number, r0: number, g0: number, b0: number, amp: number) {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cg = c.getContext('2d')!;
  const img = cg.createImageData(w, h);
  const n = makeNoise(seed);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (fbm(n, x / 40, y / 40, 5, w / 40) - 0.5) * amp;
      const i = (y * w + x) * 4;
      img.data[i] = r0 + v;
      img.data[i + 1] = g0 + v * 0.8;
      img.data[i + 2] = b0 + v * 0.6;
      img.data[i + 3] = 255;
    }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(c, 0, 0, TW, TH);
}

function craters(g: CanvasRenderingContext2D, seed: number, n: number, dark: string, light: string) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * TW;
    const y = TH * 0.08 + r() * TH * 0.84;
    const rad = 2 + Math.pow(r(), 4) * 26;
    const lat = 90 - (y / TH) * 180;
    const sx = 1 / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    g.fillStyle = dark;
    g.beginPath();
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = light;
    g.lineWidth = Math.max(1, rad * 0.18);
    g.beginPath();
    g.arc(0, 0, rad, Math.PI * 0.9, Math.PI * 1.9);
    g.stroke();
    g.restore();
  }
}

function label(g: CanvasRenderingContext2D, lat: number, lon: number, text: string) {
  const { x, y } = toXY(lat, lon);
  g.font = '600 15px system-ui, sans-serif';
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '3px';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,.42)';
  g.fillText(text.toUpperCase(), x, y);
}

const texCache: Partial<Record<World, CanvasTexture>> = {};
function worldTexture(w: World): CanvasTexture {
  if (texCache[w]) return texCache[w]!;
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d')!;
  if (w === 'moon') {
    baseNoise(g, 3, 168, 166, 160, 70);
    const M = 'rgba(62,64,70,A)';
    for (const [lat, lon, rl, rn] of [
      [33, -16, 15, 20], [28, 17, 9, 11], [8.5, 31, 10, 12], [17, 59, 6, 7], [-8, 51, 8, 8], [-15, 35, 5, 6],
      [-21, -17, 9, 11], [18, -55, 22, 18], [0, -40, 12, 14], [-24, -39, 5, 6], [13, 4, 4, 5], [-10, -23, 6, 7], [56, 5, 4, 25], [-56, 165, 5, 6],
    ] as [number, number, number, number][])
      blob(g, lat, lon, rl, rn, M, 0.75);
    craters(g, 11, 900, 'rgba(70,70,72,.28)', 'rgba(235,235,230,.22)');
    for (const [lat, lon] of [[-43.3, -11.2], [9.6, -20.1]] as [number, number][]) {
      const { x, y } = toXY(lat, lon);
      g.strokeStyle = 'rgba(255,255,255,.05)';
      g.lineWidth = 2;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * 180, y + Math.sin(a) * 120);
        g.stroke();
      }
      g.fillStyle = 'rgba(250,250,245,.9)';
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
    label(g, 8.5, 31, tr('Sea of Tranquility', 'Mar de la Tranquilidad'));
    label(g, 31, 17, tr('Sea of Serenity', 'Mar de la Serenidad'));
    label(g, 10, -57, tr('Ocean of Storms', 'Océano de las Tormentas'));
    label(g, 38, -16, tr('Sea of Rains', 'Mar de la Lluvia'));
  } else {
    baseNoise(g, 9, 190, 102, 58, 60);
    const D = 'rgba(88,48,30,A)';
    for (const [lat, lon, rl, rn, rot] of [
      [8, 70, 14, 10, 0.3], [47, -22, 12, 26, 0], [-25, -40, 10, 30, 0], [-3, 0, 5, 16, 0], [-20, 145, 7, 32, 0],
      [-15, 100, 8, 18, 0], [20, 90, 8, 12, 0], [-30, 20, 8, 20, 0], [-55, -70, 8, 40, 0],
    ] as [number, number, number, number, number][])
      blob(g, lat, lon, rl, rn, D, 0.7, rot);
    blob(g, -42, 70, 13, 20, 'rgba(232,170,120,A)', 0.7);
    for (const [lat, lon, r] of [[18.6, -134, 4], [-8.3, -120.5, 2.6], [1.5, -113, 2.4], [11.8, -104.5, 2.4], [25, 147, 2.4]] as [number, number, number][]) {
      blob(g, lat, lon, r * 1.5, r * 1.5, 'rgba(150,80,45,A)', 0.8);
      blob(g, lat, lon, r * 0.35, r * 0.35, 'rgba(70,35,20,A)', 0.9);
    }
    g.strokeStyle = 'rgba(70,35,20,.75)';
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    const a = toXY(-6, -95);
    const b = toXY(-10, -60);
    const c2 = toXY(-13, -42);
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo(b.x, b.y - 10, c2.x, c2.y);
    g.stroke();
    craters(g, 21, 500, 'rgba(110,55,30,.22)', 'rgba(230,160,110,.2)');
    const capN = g.createLinearGradient(0, 0, 0, TH * 0.07);
    capN.addColorStop(0, 'rgba(250,248,245,1)');
    capN.addColorStop(1, 'rgba(250,248,245,0)');
    g.fillStyle = capN;
    g.fillRect(0, 0, TW, TH * 0.07);
    const capS = g.createLinearGradient(0, TH, 0, TH * 0.94);
    capS.addColorStop(0, 'rgba(250,248,245,1)');
    capS.addColorStop(1, 'rgba(250,248,245,0)');
    g.fillStyle = capS;
    g.fillRect(0, TH * 0.94, TW, TH * 0.06);
    label(g, 24, -134, tr('Olympus Mons', 'Monte Olimpo'));
    label(g, -16, -62, 'Valles Marineris');
    label(g, -42, 70, tr('Hellas Basin', 'Cuenca Hellas'));
    label(g, 12, 70, 'Syrtis Major');
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  texCache[w] = t;
  return t;
}

function latLon(lat: number, lon: number, r: number): Vector3 {
  const phi = ((lon + 180) * Math.PI) / 180;
  const th = ((90 - lat) * Math.PI) / 180;
  return new Vector3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
}

function markerTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.beginPath();
  g.arc(32, 32, 20, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#0b0918';
  g.stroke();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(32, 32, 7, 0, Math.PI * 2);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const explore: ScreenFactory = ({ root, go, params }) => {
  if (!document.getElementById('gx-styles')) {
    const s = document.createElement('style');
    s.id = 'gx-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  injectKit();
  let world: World = params.world ?? 'moon';
  let selected: Explorer | null = null;

  root.innerHTML = `
    <section class="gx">
      <div class="gx__globe" data-globe></div>
      <div class="gx__labels" data-labels></div>
      <div class="gx__top">
        <button type="button" class="gx__back" data-back>← ${tr('Home', 'Inicio')}</button>
        <div class="gx__brand"><small>GHOSTS OF SPACE</small><b>${tr('Explorers', 'Exploradores')}</b><span>${tr('The machines we left on other worlds', 'Las máquinas que dejamos en otros mundos')}</span></div>
        <div class="gx__tabs" role="tablist">
          <button type="button" data-world="moon"><i class="gx__dot" style="background:#d6d3cc"></i>${tr('Moon', 'Luna')}</button>
          <button type="button" data-world="mars"><i class="gx__dot" style="background:#d9774a"></i>${tr('Mars', 'Marte')}</button>
        </div>
      </div>
      <aside class="gx__side">
        <h2 data-sidetitle></h2>
        <p class="gx__prog" data-prog></p>
        <ul class="gx__list" data-list></ul>
      </aside>
      <p class="gx__hint">${tr('Drag to rotate · tap an explorer', 'Arrastra para girar · toca un explorador')}</p>
      <div class="gx__file" data-file role="dialog" aria-modal="false"></div>
    </section>`;

  const host = root.querySelector<HTMLElement>('[data-globe]')!;
  const labelsHost = root.querySelector<HTMLElement>('[data-labels]')!;
  const listEl = root.querySelector<HTMLElement>('[data-list]')!;
  const fileEl = root.querySelector<HTMLElement>('[data-file]')!;
  root.querySelector('[data-back]')!.addEventListener('click', () => go('home'));

  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    renderer = null;
  }
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);
  const globe = new Group();
  scene.add(globe);
  const sphereMat = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const sphere = new Mesh(new SphereGeometry(1, 96, 64), sphereMat);
  globe.add(sphere);
  scene.add(new AmbientLight('#ffffff', 0.75));
  const sun = new DirectionalLight('#fff4e6', 2.2);
  sun.position.set(-3, 2, 4);
  scene.add(sun);
  const haloTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    return new CanvasTexture(c);
  })();
  const halo = new Sprite(new SpriteMaterial({ map: haloTex, blending: AdditiveBlending, transparent: true, depthWrite: false }));
  halo.scale.setScalar(3.1);
  halo.position.z = -0.6;
  scene.add(halo);
  {
    const r = rng(5);
    const N = 1500;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(30 + r() * 20);
      p.set([v.x, v.y, v.z], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(p, 3));
    scene.add(new Points(g, new PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, opacity: 0.8 })));
  }

  type Mk = { ex: Explorer; sprite: Sprite; ring: Sprite; pos: Vector3; label: HTMLElement };
  let markers: Mk[] = [];
  const ringTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.strokeStyle = '#fff';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.stroke();
    return new CanvasTexture(c);
  })();

  const buildMarkers = () => {
    markers.forEach((m) => {
      globe.remove(m.sprite, m.ring);
      m.sprite.material.map?.dispose();
      m.sprite.material.dispose();
      m.ring.material.dispose();
      m.label.remove();
    });
    markers = EXPLORERS.filter((e) => e.world === world).map((ex) => {
      const st = STATUS_INFO[ex.status];
      const pos = latLon(ex.lat, ex.lon, 1.02);
      const sprite = new Sprite(new SpriteMaterial({ map: markerTexture(st.color), transparent: true, depthWrite: false }));
      sprite.position.copy(pos);
      sprite.scale.setScalar(0.055);
      sprite.userData.id = ex.id;
      const ring = new Sprite(new SpriteMaterial({ map: ringTex, color: st.color, transparent: true, depthWrite: false, blending: AdditiveBlending }));
      ring.position.copy(pos);
      globe.add(sprite, ring);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'gx__label';
      label.style.setProperty('--c', ex.color);
      label.innerHTML = `${exIcon(ex.id)}<span>${esc(ex.name)}</span>`;
      label.addEventListener('click', () => select(ex));
      labelsHost.appendChild(label);
      return { ex, sprite, ring, pos, label };
    });
  };

  let rotX = 0.3;
  let rotY = 0;
  let velY = 0.0;
  let target: { x: number; y: number } | null = null;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let idle = 0;
  let zoom = 4.4;
  const canvas = renderer?.domElement;
  const focusOn = (ex: Explorer) => {
    const p = latLon(ex.lat, ex.lon, 1);
    let ty = -Math.atan2(p.x, p.z);
    while (ty - rotY > Math.PI) ty -= Math.PI * 2;
    while (ty - rotY < -Math.PI) ty += Math.PI * 2;
    target = { x: (ex.lat * Math.PI) / 180, y: ty };
  };

  const renderList = () => {
    const rec = getRecovered();
    const list = EXPLORERS.filter((e) => e.world === world);
    root.querySelectorAll<HTMLButtonElement>('[data-world]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.world === world)));
    root.querySelector('[data-sidetitle]')!.textContent = world === 'moon' ? tr('EXPLORERS ON THE MOON', 'EXPLORADORES EN LA LUNA') : tr('EXPLORERS ON MARS', 'EXPLORADORES EN MARTE');
    root.querySelector('[data-prog]')!.innerHTML = `${UI.medal} ${tr('Recovered', 'Recuperados')}: ${EXPLORERS.filter((e) => rec.has(e.id)).length} / ${EXPLORERS.length}`;
    listEl.innerHTML = list
      .map((e) => {
        const st = STATUS_INFO[e.status];
        return `<li><button type="button" class="gx__card${selected?.id === e.id ? ' sel' : ''}" data-ex="${e.id}" style="--c:${e.color}">
          <span class="gx__ico">${exIcon(e.id)}</span>
          <span><b>${esc(e.name)}</b><small>${esc(e.tagline)}</small>
            <span class="gx__chips"><span class="gx__chip">${e.year}</span><span class="gx__chip">${e.guest ? UI.globe : ''}${esc(e.agency)}</span>
            <span class="gx__chip gx__chip--st" style="--st:${st.color}"><i class="gx__dot"></i>${st.label}</span>${rec.has(e.id) ? `<span class="gx__chip" style="background:#34d399;color:#04140b">✓ ${tr('Recovered', 'Recuperado')}</span>` : ''}</span></span>
        </button></li>`;
      })
      .join('');
    listEl.querySelectorAll<HTMLButtonElement>('[data-ex]').forEach((b) => b.addEventListener('click', () => select(EXPLORERS.find((e) => e.id === b.dataset.ex)!)));
  };

  const setWorld = (w: World) => {
    world = w;
    closeFile();
    sphereMat.map = worldTexture(w);
    sphereMat.bumpMap = sphereMat.map;
    sphereMat.bumpScale = 1.4;
    sphereMat.needsUpdate = true;
    (halo.material as SpriteMaterial).color.set(w === 'mars' ? '#ff8a50' : '#c7c3ff');
    (halo.material as SpriteMaterial).opacity = w === 'mars' ? 0.55 : 0.25;
    buildMarkers();
    renderList();
    const first = EXPLORERS.find((e) => e.world === w)!;
    focusOn(first);
    target!.x = 0.25;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-world]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.click();
      setWorld(b.dataset.world as World);
    }),
  );

  let tab: 'story' | 'file' | 'disc' | 'rec' = 'story';
  let moment = 0;
  const seen = new Set<number>();
  const closeFile = () => {
    selected = null;
    stopSpeak();
    fileEl.classList.remove('open');
    markers.forEach((m) => m.label.classList.remove('sel'));
    renderList();
  };
  const select = (ex: Explorer) => {
    sfx.ok();
    selected = ex;
    tab = 'story';
    moment = 0;
    seen.clear();
    focusOn(ex);
    markers.forEach((m) => m.label.classList.toggle('sel', m.ex.id === ex.id));
    renderList();
    renderFile();
    fileEl.classList.add('open');
  };

  const renderFile = () => {
    const ex = selected;
    if (!ex) return;
    const st = STATUS_INFO[ex.status];
    fileEl.style.setProperty('--c', ex.color);
    const tabs: [typeof tab, string, string][] = [
      ['story', UI.story, tr('Story', 'Historia')],
      ['file', UI.file, tr('File', 'Expediente')],
      ['disc', UI.disc, tr('What did we discover?', '¿Qué descubrimos?')],
      ['rec', UI.rec, tr('Recovery', 'Recuperación')],
    ];
    let body = '';
    if (tab === 'story') {
      seen.add(moment);
      const m = MOMENTS[moment];
      body = `
        <div class="gx__steps">${MOMENTS.map((mm, i) => `<button type="button" data-m="${i}" class="${i === moment ? 'on' : ''}${seen.has(i) ? ' seen' : ''}">${UI[mm.key]}${mm.title}</button>`).join('')}</div>
        <div class="gx__moment">
          <h4>${UI[m.key]} ${m.title}</h4><em>${m.q}</em>
          <p class="gx__quote">${esc(ex.moments[m.key])}</p>
        </div>
        <div class="gx__nav">
          <button type="button" class="lk-btn" data-prev ${moment === 0 ? 'disabled' : ''}>◀</button>
          ${canSpeak ? `<button type="button" class="lk-btn" data-say>${UI.sound} ${tr('Listen', 'Escuchar')}</button>` : ''}
          <button type="button" class="lk-btn lk-btn--go" data-next>${moment < MOMENTS.length - 1 ? tr('Next ▶', 'Siguiente ▶') : tr('Recovery ▶', 'Recuperación ▶')}</button>
        </div>
        <p class="gx__note">${tr('«Mission echoes»: the voice is imagined, but the facts are real.', '«Ecos de la misión»: la voz es imaginada, pero los hechos son reales.')}</p>`;
    } else if (tab === 'file') {
      body = `<table class="gx__table"><tbody>
        ${[...ex.file, { label: tr('Agency', 'Agencia'), value: ex.guest ? `${ex.agency} (${tr('international guest', 'invitado internacional')})` : ex.agency }, { label: tr('Coordinates', 'Coordenadas'), value: `${Math.abs(ex.lat).toFixed(2)}° ${ex.lat >= 0 ? 'N' : 'S'} · ${Math.abs(ex.lon).toFixed(2)}° ${ex.lon >= 0 ? 'E' : tr('W', 'O')}` }, { label: tr('Current status', 'Estado actual'), value: st.label }]
          .map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`)
          .join('')}
      </tbody></table>`;
    } else if (tab === 'disc') {
      body = `<ul class="gx__disc">${ex.discoveries.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <p class="gx__legacy"><b>${tr('Its legacy', 'Su legado')}:</b> ${esc(ex.moments.legacy)}</p>`;
    } else {
      body = recoveryHtml(ex);
    }
    fileEl.innerHTML = `
      <div class="gx__fhead">
        <span class="gx__ico" style="--c:${ex.color}">${exIcon(ex.id)}</span>
        <div><h3>${esc(ex.name)}</h3><p>${esc(ex.tagline)} · ${esc(ex.site)}</p></div>
        <button type="button" class="gx__x" data-close aria-label="${tr('Close', 'Cerrar')}">✕</button>
      </div>
      <p class="gx__status" style="--st:${st.color}"><i class="gx__dot gx__dot--pulse"></i><span><b>${st.label}.</b> ${esc(ex.statusNote)}</span></p>
      <div class="gx__ftabs" role="tablist">${tabs.map(([id, ic, t]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}"><span>${ic}</span>${t}</button>`).join('')}</div>
      <div class="gx__body">${body}</div>`;
    fileEl.querySelector('[data-close]')!.addEventListener('click', closeFile);
    fileEl.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        stopSpeak();
        tab = b.dataset.tab as typeof tab;
        sfx.click();
        renderFile();
      }),
    );
    fileEl.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) =>
      b.addEventListener('click', () => {
        stopSpeak();
        moment = Number(b.dataset.m);
        renderFile();
      }),
    );
    fileEl.querySelector('[data-prev]')?.addEventListener('click', () => {
      stopSpeak();
      moment = Math.max(0, moment - 1);
      renderFile();
    });
    fileEl.querySelector('[data-next]')?.addEventListener('click', () => {
      stopSpeak();
      sfx.click();
      if (moment < MOMENTS.length - 1) moment++;
      else tab = 'rec';
      renderFile();
    });
    fileEl.querySelector('[data-say]')?.addEventListener('click', () => speak(`${MOMENTS[moment].title}. ${ex.moments[MOMENTS[moment].key]}`));
    if (tab === 'rec') bindRecovery(ex);
  };

  let qi = 0;
  const recoveryHtml = (ex: Explorer) => {
    if (getRecovered().has(ex.id) && qi === 0)
      return `<div class="gx__badge"><span class="gx__medal">${UI.medal}</span><b>${tr('RECOVERED', 'RECUPERADO')}</b><span>${tr(`You now know the story of ${esc(ex.name)}.`, `Ya conoces la historia de ${esc(ex.name)}.`)}</span></div>${playBtn(ex)}
        <button type="button" class="lk-btn" data-redo style="margin-top:10px;width:100%">${UI.redo} ${tr('Repeat the recovery mission', 'Repetir la misión de recuperación')}</button>`;
    const q = ex.recovery[qi];
    if (!q) return '';
    return `<p class="gx__note" style="margin:0 0 10px">${tr(`RECOVERY MISSION · QUESTION ${qi + 1} OF ${ex.recovery.length}`, `MISIÓN DE RECUPERACIÓN · PREGUNTA ${qi + 1} DE ${ex.recovery.length}`)}</p>
      <div class="gx__q"><p>${esc(q.q)}</p><div class="lk-guess__opts">${q.options.map((o, i) => `<button type="button" data-o="${i}">${esc(o)}</button>`).join('')}</div>
      <p class="lk-guess__why" data-why hidden style="color:var(--fg)"></p></div>`;
  };
  const playBtn = (ex: Explorer) =>
    ex.robot ? `<button type="button" class="lk-btn lk-btn--go" data-play style="margin-top:12px;width:100%">${UI.play} ${tr('Play its missions in GalaxyCore', 'Jugar sus misiones en GalaxyCore')}</button>` : '';
  const bindRecovery = (ex: Explorer) => {
    fileEl.querySelector('[data-redo]')?.addEventListener('click', () => {
      qi = 0;
      const s = getRecovered();
      s.delete(ex.id);
      try {
        localStorage.setItem('novacore:ghosts', JSON.stringify([...s]));
      } catch {
      }
      renderFile();
    });
    fileEl.querySelector('[data-play]')?.addEventListener('click', () => go('podiums'));
    const q = ex.recovery[qi];
    const why = fileEl.querySelector<HTMLElement>('[data-why]');
    fileEl.querySelectorAll<HTMLButtonElement>('[data-o]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.o);
        if (i !== q.correct) {
          sfx.soft();
          b.disabled = true;
          b.classList.add('no');
          why!.hidden = false;
          why!.innerHTML = tr('<b>Almost!</b> Read its story again or try another option.', '<b>¡Casi!</b> Vuelve a leer su historia o prueba otra opción.');
          return;
        }
        sfx.ok();
        fileEl.querySelectorAll<HTMLButtonElement>('[data-o]').forEach((x) => (x.disabled = true));
        b.classList.add('ok');
        why!.hidden = false;
        why!.innerHTML = `<b>${tr('Correct!', '¡Correcto!')}</b> ${esc(q.why)}`;
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'lk-btn lk-btn--go';
        next.style.cssText = 'margin-top:12px;width:100%';
        const last = qi + 1 >= ex.recovery.length;
        next.textContent = last ? tr('Recover explorer!', '¡Recuperar explorador!') : tr('Next ➜', 'Siguiente ➜');
        next.addEventListener('click', () => {
          if (last) {
            markRecovered(ex.id);
            sfx.win();
            qi = 0;
          } else qi++;
          renderFile();
          renderList();
        });
        fileEl.querySelector('.gx__q')!.appendChild(next);
        next.focus();
      }),
    );
  };

  const ray = new Raycaster();
  const ndc = new Vector2();
  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    target = null;
    canvas?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    rotY += dx * 0.006;
    rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.006));
    velY = dx * 0.006;
    lastX = e.clientX;
    lastY = e.clientY;
    idle = 0;
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    if (moved < 6 && canvas) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(markers.map((m) => m.sprite), false)[0];
      if (hit) select(EXPLORERS.find((x) => x.id === hit.object.userData.id)!);
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom = Math.max(2.6, Math.min(6, zoom + e.deltaY * 0.003));
  };
  canvas?.addEventListener('pointerdown', onDown);
  canvas?.addEventListener('pointermove', onMove);
  canvas?.addEventListener('pointerup', onUp);
  canvas?.addEventListener('wheel', onWheel, { passive: false });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) closeFile();
  };
  document.addEventListener('keydown', onKey);

  let raf = 0;
  let alive = true;
  let last = performance.now();
  const resize = () => {
    if (!renderer) return;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let ro: ResizeObserver | null = null;
  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    host.appendChild(renderer.domElement);
    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
  } else {
    host.innerHTML = `<p style="padding:120px 24px;text-align:center;color:var(--muted)">${tr('Your browser cannot show the 3D globe, but you can pick an explorer from the list.', 'Tu navegador no puede mostrar el globo 3D, pero puedes elegir un explorador en la lista.')}</p>`;
  }
  const v = new Vector3();
  const loop = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    idle += dt;
    if (target) {
      rotY += (target.y - rotY) * Math.min(1, dt * 3);
      rotX += (target.x - rotX) * Math.min(1, dt * 3);
      if (Math.abs(target.y - rotY) < 0.002 && Math.abs(target.x - rotX) < 0.002) target = null;
    } else if (!dragging) {
      rotY += velY;
      velY *= 0.92;
      if (!selected && idle > 4) rotY += dt * 0.06;
    }
    globe.rotation.set(rotX, rotY, 0, 'XYZ');
    camera.position.z += (zoom - camera.position.z) * Math.min(1, dt * 5);
    const t = now / 1000;
    for (const m of markers) {
      const k = (t * 0.8 + m.pos.x) % 1;
      m.ring.scale.setScalar(0.05 + k * 0.12);
      m.ring.material.opacity = 1 - k;
      const sel = selected?.id === m.ex.id;
      m.sprite.scale.setScalar(sel ? 0.075 : 0.055);
    }
    if (renderer) {
      renderer.render(scene, camera);
      const rect = renderer.domElement.getBoundingClientRect();
      for (const m of markers) {
        m.sprite.getWorldPosition(v);
        const facing = v.clone().normalize().z;
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        m.label.style.left = `${x}px`;
        m.label.style.top = `${y}px`;
        m.label.style.opacity = facing > 0.25 ? '1' : '0';
        m.label.style.pointerEvents = facing > 0.25 ? 'auto' : 'none';
      }
    }
    raf = requestAnimationFrame(loop);
  };
  setWorld(world);
  raf = requestAnimationFrame(loop);

  return {
    unmount() {
      alive = false;
      cancelAnimationFrame(raf);
      stopSpeak();
      ro?.disconnect();
      document.removeEventListener('keydown', onKey);
      markers.forEach((m) => {
        m.sprite.material.map?.dispose();
        m.sprite.material.dispose();
        m.ring.material.dispose();
      });
      ringTex.dispose();
      haloTex.dispose();
      sphere.geometry.dispose();
      sphereMat.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    },
  };
};

export default explore;
