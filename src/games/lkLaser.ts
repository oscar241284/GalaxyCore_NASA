/**
 * LUNOJOD 2 · MISIÓN 4 · El espejo láser.
 *
 * El Lunojod 2 lleva un reflector láser (hecho en Francia) que sigue en la Luna: los
 * observatorios disparan un láser, la luz rebota y vuelve, y con el tiempo de ida y vuelta
 * calculan la distancia a la Luna.
 * 3 pasos: (1) encontrar al robot en el mapa de la Luna (cráter Le Monnier, borde este del
 * Mar de la Serenidad); (2) disparar y cronometrar ≈ 2,56 s; (3) calcular con 2 preguntas.
 */
import type { GameContext } from './index';
import { brief, dots, injectKit, say, sfx, stopSpeak, type Guess } from './lkKit';
import { rng } from '../ui/moonTexture';

const SIZE = 520;
const R = 236;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RT_SEC = 2.56; // ida y vuelta de la luz Tierra–Luna (≈ 384.000 km)

/** Mares lunares visibles (lat, lon, radio en grados). */
const MARIA: [number, number, number][] = [
  [33, -16, 17], [28, 17, 10], [8.5, 31, 12], [17, 59, 7.5], [-8, 51, 9], [-15, 35, 6],
  [-21, -17, 10], [18, -52, 20], [5, -45, 14], [-24, -39, 6], [13, 4, 5], [-10, -23, 6], [56, 5, 5], [55, -20, 5],
];
const SERENITATIS: [number, number] = [28, 17];
const LE_MONNIER: [number, number] = [26.6, 30.6];
const APOLLO15: [number, number] = [26.1, 3.6];

const proj = (lat: number, lon: number) => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return { x: CX + R * Math.cos(la) * Math.sin(lo), y: CY - R * Math.sin(la), k: Math.cos(la) * Math.cos(lo) };
};

const CSS = `
.lkl__stage { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 18px; align-items: start; }
.lkl__map { position: relative; width: min(100%, 520px); margin: 0 auto; }
.lkl__map canvas { display: block; width: 100%; height: auto; border-radius: 50%; cursor: crosshair; touch-action: manipulation; }
.lkl__side { display: grid; gap: 12px; }
.lkl__shot svg { display: block; width: 100%; height: auto; border-radius: 18px; background: #03030a; border: 2px solid rgba(255,255,255,.1); }
.lkl__watch { font-family: var(--font-mono); font-size: 44px; text-align: center; color: #fde68a; }
.lkl__watch small { display: block; font-family: inherit; font-size: 12px; letter-spacing: .14em; color: var(--muted); }
.lkl__q { padding: 16px; border-radius: 18px; background: #fbf7ff; color: #1a0b33; }
.lkl__q p { margin: 0 0 10px; font-size: 17px; font-weight: 800; }
.lkl__q .lk-guess__opts button { flex-basis: 140px; }
.lkl__q .lk-guess__why { margin-top: 10px; }
@media (max-width: 820px) { .lkl__stage { grid-template-columns: 1fr; } }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

function drawMoon(g: CanvasRenderingContext2D, hint: number) {
  g.clearRect(0, 0, SIZE, SIZE);
  const base = g.createRadialGradient(CX - 60, CY - 60, 20, CX, CY, R);
  base.addColorStop(0, '#d6d4cd');
  base.addColorStop(0.85, '#a9a7a0');
  base.addColorStop(1, '#6f6d68');
  g.fillStyle = base;
  g.beginPath();
  g.arc(CX, CY, R, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(CX, CY, R, 0, Math.PI * 2);
  g.clip();
  // mares
  for (const [lat, lon, rad] of MARIA) {
    const p = proj(lat, lon);
    const r = (rad / 90) * R * 1.15;
    const fx = Math.max(0.25, Math.cos((lon * Math.PI) / 180));
    const fy = Math.max(0.25, Math.cos((lat * Math.PI) / 180));
    g.fillStyle = 'rgba(70,72,78,.62)';
    g.beginPath();
    g.ellipse(p.x, p.y, r * fx, r * fy, 0, 0, Math.PI * 2);
    g.fill();
  }
  // cráteres pequeños
  const rand = rng(12);
  for (let i = 0; i < 120; i++) {
    const lat = (rand() - 0.5) * 160;
    const lon = (rand() - 0.5) * 160;
    const p = proj(lat, lon);
    const r = 1.5 + rand() * 5;
    g.strokeStyle = 'rgba(240,238,230,.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(p.x, p.y, r * Math.max(0.3, Math.cos((lon * Math.PI) / 180)), r, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  // referencia: dónde estuvo el LRV (Apolo 15)
  const a = proj(...APOLLO15);
  g.fillStyle = '#fde68a';
  g.beginPath();
  g.arc(a.x, a.y, 5, 0, Math.PI * 2);
  g.fill();
  g.font = '700 13px system-ui, sans-serif';
  g.fillStyle = '#fff';
  g.strokeStyle = 'rgba(0,0,0,.7)';
  g.lineWidth = 3;
  g.strokeText('Apolo 15', a.x - 70, a.y + 4);
  g.fillText('Apolo 15', a.x - 70, a.y + 4);
  if (hint >= 1) {
    const s = proj(...SERENITATIS);
    g.strokeStyle = '#67e8f9';
    g.lineWidth = 3;
    g.setLineDash([8, 6]);
    g.beginPath();
    g.ellipse(s.x, s.y, 62, 56, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(0,0,0,.7)';
    g.strokeText('Mar de la Serenidad', s.x - 64, s.y - 64);
    g.fillStyle = '#a5f3fc';
    g.fillText('Mar de la Serenidad', s.x - 64, s.y - 64);
  }
  if (hint >= 2) {
    const m = proj(...LE_MONNIER);
    g.fillStyle = 'rgba(239,68,68,.35)';
    g.beginPath();
    g.arc(m.x, m.y, 22, 0, Math.PI * 2);
    g.fill();
  }
}

export default function lkLaser({ root, win }: GameContext): () => void {
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
          <p class="lk-task" data-task><i>4</i>Toca el lugar de la Luna donde está el Lunojod 2.</p>
          <span data-dots>${dots(3, 0, 'PASO')}</span>
        </div>
        <div class="lkl__stage">
          <div class="lkl__map"><canvas width="${SIZE}" height="${SIZE}" aria-label="Mapa de la cara visible de la Luna"></canvas></div>
          <div class="lkl__side" data-side>
            <p class="lk-say" data-say></p>
          </div>
        </div>
      </div></div>`;
    const canvas = root.querySelector('canvas')!;
    const g = canvas.getContext('2d')!;
    const side = root.querySelector<HTMLElement>('[data-side]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const task = root.querySelector<HTMLElement>('[data-task]')!;
    const setStep = (n: number, text: string) => {
      root.querySelector<HTMLElement>('[data-dots]')!.innerHTML = dots(3, n, 'PASO');
      task.innerHTML = `<i>4</i>${text}`;
    };
    let hint = 0;
    let found = false;
    drawMoon(g, hint);
    say(sayEl, 'Pista: está al este (a la derecha) del Mar de la Serenidad, en un cráter llamado Le Monnier. El punto amarillo es donde estuvo el LRV.');

    // ---------- paso 1: encontrar el robot ----------
    canvas.addEventListener('click', (e) => {
      if (found) return;
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * SIZE;
      const y = ((e.clientY - r.top) / r.height) * SIZE;
      const m = proj(...LE_MONNIER);
      const d = Math.hypot(x - m.x, y - m.y);
      if (d < R * 0.085) {
        found = true;
        sfx.ok();
        drawMoon(g, 0);
        g.fillStyle = '#ef4444';
        g.strokeStyle = '#fff';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(m.x, m.y, 9, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.font = '800 15px system-ui, sans-serif';
        g.strokeStyle = 'rgba(0,0,0,.8)';
        g.lineWidth = 4;
        g.strokeText('Lunojod 2', m.x + 14, m.y + 5);
        g.fillStyle = '#fff';
        g.fillText('Lunojod 2', m.x + 14, m.y + 5);
        say(sayEl, '¡Lo encontraste! El Lunojod 2 descansa en el cráter Le Monnier desde 1973. Ahora apunta el láser.', 'ok');
        void wait(1400).then(laserStep);
      } else {
        hint = Math.min(2, hint + 1);
        sfx.soft();
        drawMoon(g, hint);
        g.fillStyle = 'rgba(251,191,36,.8)';
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
        say(sayEl, hint === 1 ? 'Ahí no está. Te marqué el Mar de la Serenidad: el robot está en su borde derecho.' : 'Casi. Toca dentro del círculo rojo, en el borde derecho del Mar de la Serenidad.', 'warn');
      }
    });

    // ---------- paso 2: disparar el láser ----------
    const laserStep = () => {
      setStep(1, 'Dispara el láser y mide cuánto tarda la luz en volver.');
      side.innerHTML = `
        <div class="lkl__shot">
          <svg viewBox="0 0 400 170" aria-label="Láser desde la Tierra hasta la Luna">
            ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 41) % 170}" r="1" fill="#fff" opacity=".6"/>`).join('')}
            <circle cx="40" cy="85" r="30" fill="#2563eb"/><path d="M22 72c8-8 18-4 19 3s-6 9-2 15-8 10-13 5-9-16-4-23z" fill="#22c55e"/>
            <path d="M58 70l12-6 4 8-12 6z" fill="#e5e7eb"/>
            <circle cx="360" cy="85" r="22" fill="#cbd5e1"/><circle cx="352" cy="78" r="4" fill="#94a3b8"/><circle cx="366" cy="92" r="5" fill="#94a3b8"/>
            <line data-beam x1="72" y1="70" x2="72" y2="70" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
            <circle data-dot r="6" cx="72" cy="70" fill="#4ade80" opacity="0"/>
            <text x="40" y="140" fill="#e5e7eb" font-size="13" text-anchor="middle">Observatorio</text>
            <text x="360" y="140" fill="#e5e7eb" font-size="13" text-anchor="middle">Espejo del Lunojod</text>
          </svg>
        </div>
        <div class="lkl__watch"><small>TIEMPO DE IDA Y VUELTA</small><span data-watch>0,00 s</span></div>
        <button type="button" class="lk-btn lk-btn--go" data-fire>🔦 Disparar láser</button>
        <p class="lk-say" data-say2></p>`;
      const say2 = side.querySelector<HTMLElement>('[data-say2]')!;
      const dot = side.querySelector<SVGCircleElement>('[data-dot]')!;
      const beam = side.querySelector<SVGLineElement>('[data-beam]')!;
      const watch = side.querySelector<HTMLElement>('[data-watch]')!;
      const fire = side.querySelector<HTMLButtonElement>('[data-fire]')!;
      say(say2, 'La luz es lo más rápido que existe. ¿Cuánto tardará en ir a la Luna y volver?');
      fire.addEventListener('click', () => {
        fire.disabled = true;
        sfx.radio();
        const t0 = performance.now();
        const from = { x: 72, y: 70 };
        const to = { x: 346, y: 80 };
        let bounced = false;
        const tick = (now: number) => {
          if (!alive) return;
          const t = (now - t0) / 1000;
          const half = RT_SEC / 2;
          const k = t < half ? t / half : Math.max(0, 1 - (t - half) / half);
          if (t >= half && !bounced) {
            bounced = true;
            sfx.beep();
          }
          const x = from.x + (to.x - from.x) * k;
          const y = from.y + (to.y - from.y) * k;
          dot.setAttribute('cx', String(x));
          dot.setAttribute('cy', String(y));
          dot.setAttribute('opacity', '1');
          beam.setAttribute('x2', String(t < half ? x : to.x));
          beam.setAttribute('y2', String(t < half ? y : to.y));
          watch.textContent = `${Math.min(t, RT_SEC).toFixed(2).replace('.', ',')} s`;
          if (t < RT_SEC) raf = requestAnimationFrame(tick);
          else {
            dot.setAttribute('opacity', '0');
            sfx.ok();
            say(say2, '¡La luz rebotó en el espejo y volvió en 2,56 segundos!', 'ok');
            void wait(1500).then(mathStep);
          }
        };
        raf = requestAnimationFrame(tick);
      });
    };

    // ---------- paso 3: calcular ----------
    const QUESTIONS: Guess[] = [
      {
        q: 'La luz tardó 2,56 s en ir y volver. ¿Cuánto tardó solo en ir?',
        options: ['1,28 s', '2,56 s', '5,12 s'],
        correct: 0,
        why: 'Ida y vuelta es el doble del viaje: 2,56 ÷ 2 = 1,28 segundos.',
      },
      {
        q: 'La luz recorre unos 300.000 km cada segundo. En 1,28 s, ¿cuánto viaja?',
        options: ['Unos 38.400 km', 'Unos 384.000 km', 'Unos 3.840.000 km'],
        correct: 1,
        why: '300.000 × 1,28 ≈ 384.000 km. ¡Esa es la distancia de la Tierra a la Luna!',
      },
    ];
    const mathStep = () => {
      setStep(2, 'Usa el tiempo para calcular la distancia a la Luna.');
      let qi = 0;
      const ask = () => {
        const q = QUESTIONS[qi];
        side.innerHTML = `
          <div class="lkl__watch"><small>TIEMPO MEDIDO</small>2,56 s</div>
          <div class="lkl__q"><p>${q.q}</p><div class="lk-guess__opts">${q.options.map((o, i) => `<button type="button" data-i="${i}">${o}</button>`).join('')}</div><p class="lk-guess__why" data-why hidden></p></div>`;
        const why = side.querySelector<HTMLElement>('[data-why]')!;
        side.querySelectorAll<HTMLButtonElement>('[data-i]').forEach((b) =>
          b.addEventListener('click', () => {
            const i = Number(b.dataset.i);
            if (i !== q.correct) {
              sfx.soft();
              b.disabled = true;
              b.classList.add('no');
              why.hidden = false;
              why.innerHTML = '<b>¡Casi!</b> Piénsalo otra vez: prueba otra opción.';
              return;
            }
            sfx.ok();
            side.querySelectorAll<HTMLButtonElement>('[data-i]').forEach((x) => (x.disabled = true));
            b.classList.add('ok');
            why.hidden = false;
            why.innerHTML = `<b>¡Correcto!</b> ${q.why}`;
            const next = document.createElement('button');
            next.type = 'button';
            next.className = 'lk-btn lk-btn--go';
            next.style.marginTop = '12px';
            next.textContent = qi + 1 < QUESTIONS.length ? 'Siguiente ➜' : 'Terminar';
            next.addEventListener('click', () => {
              qi++;
              if (qi < QUESTIONS.length) ask();
              else finish();
            });
            side.querySelector('.lkl__q')!.appendChild(next);
            next.focus();
          }),
        );
      };
      ask();
    };

    const finish = () => {
      sfx.win();
      root.querySelector<HTMLElement>('[data-dots]')!.innerHTML = dots(3, 3, 'PASO');
      side.innerHTML = `
        <div class="lk-learn">
          <h4>¿QUÉ APRENDISTE?</h4>
          <p style="margin:0 0 12px">El Lunojod 2 dejó de moverse en 1973, pero su <b>espejo</b> sigue trabajando: hoy los observatorios
          todavía le disparan láseres para medir la distancia a la Luna con muchísima precisión.</p>
          <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>
        </div>`;
      side.querySelector('[data-end]')!.addEventListener('click', win);
    };
  };

  brief(root, {
    kicker: 'LUNOJOD 2 · MISIÓN 4',
    title: 'El espejo láser',
    text: 'El Lunojod 2 lleva un espejo especial. Desde la Tierra le disparan un rayo láser y la luz rebota de vuelta.',
    goal: 'Encuentra al robot en la Luna, dispara el láser y calcula la distancia.',
    guess: {
      q: '¿Hay espejos en la Luna?',
      options: ['Sí, los dejaron robots y astronautas', 'No, ninguno'],
      correct: 0,
      why: 'Hay varios: los dejaron misiones Apolo y robots como el Lunojod 2. ¡Todavía se usan!',
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    stopSpeak();
  };
}