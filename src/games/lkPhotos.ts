/**
 * LUNOJOD 2 · MISIÓN 3 · Foto por foto.
 *
 * El equipo no veía video en vivo: recibía imágenes de televisión que llegaban cada pocos
 * segundos y decidía con ellas por dónde avanzar. Mecánica: llega una foto (se dibuja línea
 * por línea, como la TV lenta), el niño la observa y elige izquierda / recto / derecha.
 * Si elige un camino con obstáculo, se le explica qué había y vuelve a intentarlo.
 */
import type { GameContext } from './index';
import { brief, dots, injectKit, say, sfx, stopSpeak } from './lkKit';
import { fbm, makeNoise, rng } from '../ui/moonTexture';

type Lane = '.' | 'r' | 'c';
interface Photo {
  lanes: [Lane, Lane, Lane];
  noise: number;
  tip?: string;
}

const PHOTOS: Photo[] = [
  { lanes: ['r', '.', 'r'], noise: 0, tip: 'Mira la foto: hay rocas a los lados. ¿Por dónde pasas?' },
  { lanes: ['.', 'c', 'r'], noise: 0 },
  { lanes: ['c', 'r', '.'], noise: 0.05 },
  { lanes: ['.', '.', 'c'], noise: 0.08, tip: 'A veces hay más de un camino libre. ¡Elige uno!' },
  { lanes: ['r', 'c', '.'], noise: 0.16, tip: 'Hay polvo en la imagen. Mira con calma.' },
  { lanes: ['.', 'r', 'c'], noise: 0.2 },
  { lanes: ['c', '.', 'c'], noise: 0.22, tip: 'El Sol está bajo: las sombras se ven largas.' },
];
const LANE_NAME = ['izquierda', 'recto', 'derecha'];
const W = 800;
const HGT = 450;
const LANE_X = [175, 400, 625];
const OBJ_Y = 318;

const CSS = `
.lkp__route { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; font-weight: 700; color: var(--muted); }
.lkp__track { position: relative; flex: 1; height: 8px; border-radius: 999px; background: rgba(255,255,255,.1); }
.lkp__track s { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: #fca5a5; transition: width .6s; }
.lkp__track i { position: absolute; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: #ef4444; border: 3px solid #fff; transition: left .6s; }
.lkp__screen, .lkp__choices { width: min(100%, calc((100dvh - 330px) * 1.78)); margin-left: auto; margin-right: auto; }
.lkp__screen { position: relative; border-radius: 18px; overflow: hidden; border: 6px solid #2b2f36; background: #000; box-shadow: 0 14px 36px rgba(0,0,0,.6); }
.lkp__screen canvas { display: block; width: 100%; height: auto; transition: transform .7s ease-in; transform-origin: 50% 70%; }
.lkp__screen.shake { animation: lkp-shake .45s; }
@keyframes lkp-shake { 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(4px); } }
.lkp__rx { position: absolute; top: 10px; right: 12px; padding: 4px 10px; border-radius: 999px; font-family: var(--font-mono); font-size: 13px; background: rgba(0,0,0,.65); color: #fde68a; }
.lkp__rx[hidden] { display: none; }
.lkp__choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.lkp__choices .lk-btn { min-height: 64px; font-size: 17px; }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Textura del suelo (una sola vez). */
let groundTex: HTMLCanvasElement | null = null;
function getGroundTex(): HTMLCanvasElement {
  if (groundTex) return groundTex;
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 160;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  const n = makeNoise(77);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const v = fbm(n, x / 40, y / 14, 4);
      const i = (y * c.width + x) * 4;
      const k = 90 + v * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  groundTex = c;
  return c;
}

/** Dibuja una foto de la cámara del Lunojod. `final` = la falla Fossa Recta. */
function drawPhoto(idx: number, photo: Photo | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = HGT;
  const g = c.getContext('2d')!;
  const rand = rng(idx * 31 + 5);
  const horizon = 150;
  g.fillStyle = '#050505';
  g.fillRect(0, 0, W, HGT);
  // colinas lejanas
  g.fillStyle = '#5c5c5c';
  g.beginPath();
  g.moveTo(0, horizon + 4);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, horizon - 10 - Math.abs(Math.sin(x / 90 + idx)) * 22 - rand() * 4);
  g.lineTo(W, horizon + 4);
  g.fill();
  // suelo con textura en perspectiva
  const tex = getGroundTex();
  g.drawImage(tex, 0, horizon, W, HGT - horizon);
  const shade = g.createLinearGradient(0, horizon, 0, HGT);
  shade.addColorStop(0, 'rgba(0,0,0,.55)');
  shade.addColorStop(0.4, 'rgba(0,0,0,.1)');
  shade.addColorStop(1, 'rgba(255,255,255,.08)');
  g.fillStyle = shade;
  g.fillRect(0, horizon, W, HGT - horizon);
  // detalles pequeños de fondo
  for (let i = 0; i < 30; i++) {
    const y = horizon + 8 + Math.pow(rand(), 2) * 120;
    const s = (y - horizon) / 120;
    const x = rand() * W;
    g.fillStyle = 'rgba(30,30,30,.6)';
    g.beginPath();
    g.ellipse(x, y, 4 + s * 18 * rand(), 1 + s * 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  const shadowLen = photo ? 1 + photo.noise * 6 : 1;

  if (photo) {
    photo.lanes.forEach((lane, i) => {
      const x = LANE_X[i] + (rand() - 0.5) * 30;
      const y = OBJ_Y + (rand() - 0.5) * 20;
      if (lane === 'c') {
        g.fillStyle = '#262626';
        g.beginPath();
        g.ellipse(x, y, 112, 34, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#3d3d3d';
        g.beginPath();
        g.ellipse(x + 10, y + 6, 88, 24, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#c9c9c9';
        g.lineWidth = 4;
        g.beginPath();
        g.ellipse(x, y, 114, 36, 0, Math.PI * 0.05, Math.PI * 0.95);
        g.stroke();
      } else if (lane === 'r') {
        g.fillStyle = 'rgba(10,10,10,.75)';
        g.beginPath();
        g.ellipse(x + 30 * shadowLen, y + 18, 40 * shadowLen, 12, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#4d4d4d';
        g.beginPath();
        g.moveTo(x - 52, y + 20);
        g.lineTo(x - 38, y - 30);
        g.lineTo(x + 2, y - 54);
        g.lineTo(x + 40, y - 30);
        g.lineTo(x + 54, y + 20);
        g.closePath();
        g.fill();
        g.fillStyle = '#ededed';
        g.beginPath();
        g.moveTo(x - 38, y - 30);
        g.lineTo(x + 2, y - 54);
        g.lineTo(x + 10, y - 20);
        g.lineTo(x - 30, y - 8);
        g.closePath();
        g.fill();
      }
    });
  } else {
    // la falla Fossa Recta: una zanja larga que cruza todo el paisaje
    g.fillStyle = '#141414';
    g.beginPath();
    g.moveTo(0, 248);
    g.bezierCurveTo(200, 236, 600, 262, W, 244);
    g.lineTo(W, 284);
    g.bezierCurveTo(600, 300, 200, 276, 0, 290);
    g.closePath();
    g.fill();
    g.strokeStyle = '#d4d4d4';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 290);
    g.bezierCurveTo(200, 276, 600, 300, W, 284);
    g.stroke();
  }
  // parte delantera del robot (ruedas) al pie de la imagen
  g.fillStyle = '#1a1a1a';
  for (const x of [40, W - 40]) {
    g.beginPath();
    g.ellipse(x, HGT + 18, 70, 60, 0, Math.PI, Math.PI * 2);
    g.fill();
  }
  // grano / polvo
  const noise = 0.05 + (photo?.noise ?? 0.1);
  for (let i = 0; i < 9000 * noise; i++) {
    g.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${rand() * 0.5})` : `rgba(0,0,0,${rand() * 0.5})`;
    g.fillRect(rand() * W, rand() * HGT, 2, 2);
  }
  // líneas de TV y rótulo
  g.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < HGT; y += 3) g.fillRect(0, y, W, 1);
  g.fillStyle = 'rgba(255,255,255,.8)';
  g.font = '700 16px monospace';
  g.fillText(`LUNOJOD-2 · FOTO ${idx + 1}/${PHOTOS.length + 1}`, 14, 26);
  return c;
}

export default function lkPhotos({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  let raf = 0;
  const timers: number[] = [];
  const wait = (ms: number) => new Promise<void>((res) => timers.push(window.setTimeout(() => alive && res(), ms)));

  const start = () => {
    root.innerHTML = `
      <div class="lk"><div class="lk__wrap">
        <div class="lk-top">
          <p class="lk-task"><i>3</i>Mira cada foto y elige un camino libre.</p>
          ${dots(PHOTOS.length, 0, 'FOTOS')}
        </div>
        <div class="lkp__route"><span>Luna 21</span><div class="lkp__track"><s data-tw></s><i data-ti></i></div><span>Fossa Recta</span></div>
        <div class="lkp__screen" data-screen>
          <canvas width="${W}" height="${HGT}" aria-label="Foto de la cámara del Lunojod"></canvas>
          <span class="lkp__rx" data-rx hidden>📡 Recibiendo foto…</span>
        </div>
        <div class="lkp__choices">
          <button type="button" class="lk-btn" data-lane="0">⬅ Izquierda</button>
          <button type="button" class="lk-btn" data-lane="1">⬆ Recto</button>
          <button type="button" class="lk-btn" data-lane="2">Derecha ➡</button>
        </div>
        <p class="lk-say" data-say></p>
      </div></div>`;

    const canvas = root.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const screen = root.querySelector<HTMLElement>('[data-screen]')!;
    const rx = root.querySelector<HTMLElement>('[data-rx]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-lane]'));
    let idx = 0;
    let busy = true;
    let current: HTMLCanvasElement | null = null;

    const setBusy = (b: boolean) => {
      busy = b;
      btns.forEach((x) => (x.disabled = b));
    };
    const progress = () => {
      const p = (idx / PHOTOS.length) * 100;
      root.querySelector<HTMLElement>('[data-tw]')!.style.width = `${p}%`;
      root.querySelector<HTMLElement>('[data-ti]')!.style.left = `${p}%`;
      root.querySelector('.lk-dots')!.outerHTML = dots(PHOTOS.length, idx, 'FOTOS');
    };

    /** La foto llega línea por línea (televisión lenta). */
    const receive = async (photo: Photo | null) => {
      setBusy(true);
      current = drawPhoto(idx, photo);
      rx.hidden = false;
      sfx.radio();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, HGT);
      canvas.style.transition = 'none';
      canvas.style.transform = 'none';
      const total = 1500;
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const tick = (now: number) => {
          if (!alive) return;
          const k = Math.min(1, (now - t0) / total);
          const rows = Math.floor(k * HGT);
          ctx.drawImage(current!, 0, 0, W, rows, 0, 0, W, rows);
          ctx.fillStyle = 'rgba(255,255,255,.7)';
          if (k < 1) ctx.fillRect(0, rows, W, 2);
          if (k < 1) raf = requestAnimationFrame(tick);
          else res();
        };
        raf = requestAnimationFrame(tick);
      });
      ctx.drawImage(current, 0, 0);
      rx.hidden = true;
    };

    const show = async () => {
      progress();
      const photo = PHOTOS[idx];
      say(sayEl, 'Esperando la próxima foto desde la Luna…');
      await receive(photo);
      say(sayEl, photo.tip ?? '¿Por dónde puede pasar el robot sin peligro?');
      setBusy(false);
      btns[1].focus();
    };

    const choose = async (lane: number) => {
      if (busy) return;
      const photo = PHOTOS[idx];
      const obj = photo.lanes[lane];
      setBusy(true);
      if (obj !== '.') {
        sfx.soft();
        screen.classList.remove('shake');
        void screen.offsetWidth;
        screen.classList.add('shake');
        // marcar el obstáculo en la foto
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.ellipse(LANE_X[lane], OBJ_Y - (obj === 'r' ? 14 : 0), 130, 70, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        say(
          sayEl,
          obj === 'c'
            ? `Por la ${LANE_NAME[lane]} hay un cráter: las ruedas podrían quedar atrapadas. ¡Busca otro camino!`
            : `Por ${lane === 1 ? 'el centro' : `la ${LANE_NAME[lane]}`} hay una roca grande: el robot podría volcar. ¡Prueba otro!`,
          'warn',
        );
        await wait(700);
        setBusy(false);
        return;
      }
      sfx.ok();
      // avanzar hacia el carril elegido
      canvas.style.transition = 'transform .7s ease-in';
      canvas.style.transformOrigin = `${(LANE_X[lane] / W) * 100}% 70%`;
      canvas.style.transform = 'scale(1.6)';
      say(sayEl, `¡Bien visto! Avanzando por ${lane === 1 ? 'el centro' : `la ${LANE_NAME[lane]}`}…`, 'ok');
      await wait(750);
      idx++;
      if (idx < PHOTOS.length) await show();
      else await arrive();
    };

    const arrive = async () => {
      progress();
      say(sayEl, 'Llega la última foto…');
      await receive(null);
      sfx.win();
      say(sayEl, '¡Llegaste a la falla Fossa Recta! Es una grieta larguísima en el suelo lunar.', 'ok');
      const wrap = root.querySelector('.lk__wrap')!;
      root.querySelector('.lkp__choices')!.remove();
      const box = document.createElement('div');
      box.className = 'lk-learn';
      box.innerHTML = `
        <h4>¿QUÉ APRENDISTE?</h4>
        <p style="margin:0 0 12px">El equipo del Lunojod 2 manejaba <b>mirando fotos</b> que llegaban cada pocos segundos, no un video en vivo.
        Por eso observaban con mucho cuidado: una roca o un cráter podía detener la misión.</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>`;
      wrap.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.querySelector('[data-end]')!.addEventListener('click', win);
    };

    btns.forEach((b) => b.addEventListener('click', () => void choose(Number(b.dataset.lane))));
    onKey = (e: KeyboardEvent) => {
      const m: Record<string, number> = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2 };
      if (e.key in m) {
        e.preventDefault();
        void choose(m[e.key]);
      }
    };
    document.addEventListener('keydown', onKey);
    void show();
  };

  let onKey: ((e: KeyboardEvent) => void) | null = null;

  brief(root, {
    kicker: 'LUNOJOD 2 · MISIÓN 3',
    title: 'Foto por foto',
    text: 'Para manejar el Lunojod 2, el equipo en la Tierra miraba las imágenes de sus cámaras.',
    goal: `Observa ${PHOTOS.length} fotos y elige caminos sin rocas ni cráteres hasta la falla Fossa Recta.`,
    guess: {
      q: '¿Cómo veía el equipo el camino del robot?',
      options: ['Con video en vivo, como un videojuego', 'Con fotos que llegaban cada pocos segundos'],
      correct: 1,
      why: 'Las imágenes llegaban de a una, cada pocos segundos. Había que observar bien cada foto antes de decidir.',
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    if (onKey) document.removeEventListener('keydown', onKey);
    stopSpeak();
  };
}