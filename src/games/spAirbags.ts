/**
 * SPIRIT · MISIÓN 1 · Aterrizaje con bolsas de aire.
 *
 * Spirit llegó a Marte (cráter Gusev, enero de 2004) frenando con un paracaídas, envuelto en
 * bolsas de aire y con cohetes de frenado; luego cayó, rebotó muchas veces y rodó hasta parar.
 * Mecánica: un solo botón cuya acción cambia (paracaídas → bolsas → cohetes); cada paso tiene
 * una zona verde en el altímetro. Si se pasa la zona, se explica y se repite ese paso.
 */
import type { GameContext } from './index';
import { brief, dots, injectKit, MER_SVG, say, sfx, stopSpeak, theme } from './lkKit';
import { rng } from '../ui/moonTexture';

const W = 600;
const H = 720;
const GROUND = 640;

interface Step {
  id: 'chute' | 'bags' | 'rockets';
  label: string;
  top: number; // km
  low: number; // km
  ok: string;
  early: string;
  late: string;
}
const STEPS: Step[] = [
  {
    id: 'chute',
    label: '🪂 Abrir paracaídas',
    top: 12,
    low: 6,
    ok: '¡Paracaídas abierto! El escudo de calor se suelta y la nave frena.',
    early: 'Todavía no: vas demasiado rápido. Espera a la zona verde.',
    late: 'Se pasó el momento del paracaídas. ¡Intentémoslo otra vez!',
  },
  {
    id: 'bags',
    label: '🎈 Inflar bolsas de aire',
    top: 1.6,
    low: 0.4,
    ok: '¡Bolsas infladas! Ahora Spirit está dentro de una pelota gigante.',
    early: 'Aún es pronto para las bolsas. Espera a la zona verde.',
    late: 'Faltaron las bolsas de aire. ¡Otra vez, un poco antes!',
  },
  {
    id: 'rockets',
    label: '🚀 Encender cohetes',
    top: 0.15,
    low: 0.03,
    ok: '¡Cohetes encendidos! La nave casi se detiene… ¡cortamos el cable!',
    early: 'Muy alto para los cohetes. Espera a la zona verde, cerca del suelo.',
    late: 'Los cohetes debían encenderse antes de tocar el suelo. ¡Reintenta!',
  },
];

const CSS = `
.spa { display: grid; grid-template-columns: auto minmax(260px, 380px); gap: 18px; align-items: start; justify-content: center; }
.spa canvas { display: block; height: min(calc(100dvh - 190px), 720px); width: auto; max-width: 100%; aspect-ratio: 600 / 720; border-radius: 20px; border: 2px solid rgba(255,255,255,.12); box-shadow: 0 12px 34px rgba(0,0,0,.5); }
.spa__side { display: grid; gap: 12px; }
.spa__alt { padding: 14px; border-radius: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
.spa__alt small { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: var(--muted); }
.spa__alt b { display: block; font-family: var(--font-mono); font-size: 34px; }
.spa__steps { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.spa__steps li { display: flex; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 12px; font-weight: 700; background: rgba(255,255,255,.04); color: var(--muted); }
.spa__steps li.now { color: var(--fg); background: rgba(147,197,253,.14); border: 1px solid #93c5fd; }
.spa__steps li.done { color: #86efac; }
.spa__steps li.done::after { content: '✓'; margin-left: auto; }
.spa__go { min-height: 76px !important; font-size: 20px !important; }
.spa__go.ready { animation: spa-ready .9s ease-in-out infinite; }
@keyframes spa-ready { 50% { box-shadow: 0 5px 0 #0f6b32, 0 0 26px rgba(34,197,94,.8); } }
@media (max-width: 860px) { .spa { grid-template-columns: 1fr; justify-items: center; } .spa canvas { height: min(52dvh, 560px); } .spa__side { width: 100%; } }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default function spAirbags({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  let raf = 0;
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const start = () => {
    root.innerHTML = `
      <div class="lk"${theme('#3b82f6', '#93c5fd')}><div class="lk__wrap">
        <div class="lk-top">
          <p class="lk-task"><i>1</i>Aterriza a Spirit en el cráter Gusev de Marte.</p>
          <span data-dots>${dots(3, 0, 'PASO')}</span>
        </div>
        <div class="spa">
          <canvas width="${W}" height="${H}" aria-label="Descenso de Spirit en Marte"></canvas>
          <div class="spa__side">
            <div class="spa__alt"><small>ALTITUD</small><b data-alt>20,0 km</b></div>
            <ol class="spa__steps">${STEPS.map((s, i) => `<li data-li="${i}">${i + 1}. ${s.label.slice(3)}</li>`).join('')}</ol>
            <button type="button" class="lk-btn lk-btn--go spa__go" data-go>${STEPS[0].label}</button>
            <p class="lk-say" data-say></p>
          </div>
        </div>
      </div></div>`;

    const canvas = root.querySelector('canvas')!;
    const g = canvas.getContext('2d')!;
    const goBtn = root.querySelector<HTMLButtonElement>('[data-go]')!;
    const altEl = root.querySelector<HTMLElement>('[data-alt]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const rand = rng(8);
    const rocks = Array.from({ length: 26 }, () => ({ x: rand() * W, y: GROUND + 6 + rand() * 70, r: 2 + rand() * 9 }));
    const streaks = Array.from({ length: 40 }, () => ({ x: rand() * W, y: rand() * H, l: 20 + rand() * 60 }));

    // estado
    let alt = 20; // km
    let step = 0;
    let chute = false;
    let bags = false;
    let rockets = 0; // tiempo con cohetes encendidos
    let paused = false;
    let phase: 'fall' | 'drop' | 'bounce' | 'open' | 'done' = 'fall';
    let shieldY = -1; // escudo de calor cayendo
    let backshell = { x: 300, y: 0, vx: 0, vy: 0 };
    const ball = { x: 300, y: 0, vx: 0, vy: 0, rot: 0 };
    let bounces = 0;
    let openK = 0;
    let t = 0;
    let shake = 0;
    const dust: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const scores: number[] = []; // precisión de cada paso (0–1)

    const capY = () => (alt > 0.25 ? 250 : 250 + (1 - alt / 0.25) * 330);
    const groundY = () => GROUND + Math.max(0, alt - 0.25) * 380;
    const fmtAlt = (a: number) => (a >= 1 ? `${a.toFixed(1).replace('.', ',')} km` : `${Math.max(0, Math.round(a * 1000))} m`);

    const updateUi = () => {
      root.querySelectorAll<HTMLElement>('[data-li]').forEach((li, i) => (li.className = i < step ? 'done' : i === step && phase === 'fall' ? 'now' : ''));
      root.querySelector('[data-dots]')!.innerHTML = dots(3, step, 'PASO');
      if (step < STEPS.length) goBtn.textContent = STEPS[step].label;
    };
    updateUi();
    say(sayEl, 'Spirit entra a la atmósfera de Marte a gran velocidad. Pulsa el botón cuando el altímetro esté en la zona verde.');

    const retryStep = () => {
      const s = STEPS[step];
      alt = s.top + (s.top - s.low) * 0.35;
      paused = false;
      goBtn.disabled = false;
      say(sayEl, 'Volvemos un poquito atrás… ¡atento a la zona verde!');
    };

    const act = () => {
      if (phase !== 'fall' || paused) return;
      const s = STEPS[step];
      if (alt > s.top) {
        sfx.soft();
        say(sayEl, s.early, 'warn');
        return;
      }
      sfx.ok();
      // precisión: mejor cuanto más cerca del centro de la zona verde
      const mid = (s.top + s.low) / 2;
      const d = Math.abs(alt - mid) / ((s.top - s.low) / 2); // 0 = centro, 1 = borde
      scores.push(d < 0.5 ? 1 : Math.max(0, 1 - (d - 0.5) * 2));
      if (s.id === 'chute') {
        chute = true;
        shieldY = capY() + 30;
      } else if (s.id === 'bags') bags = true;
      else rockets = 0.001;
      say(sayEl, s.ok, 'ok');
      step++;
      updateUi();
      if (step >= STEPS.length) goBtn.disabled = true;
    };
    goBtn.addEventListener('click', act);
    onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        act();
      }
    };
    document.addEventListener('keydown', onKey);

    const rate = () => {
      if (!chute) return 1.6;
      if (rockets > 0) return Math.max(0.004, 0.05 * (1 - rockets / 0.8));
      if (alt > 2) return 0.6;
      if (alt > 0.25) return 0.3;
      return 0.05;
    };

    const update = (dt: number) => {
      t += dt;
      if (phase === 'fall') {
        if (paused) return;
        alt -= rate() * dt;
        if (rockets > 0) rockets += dt;
        // ¿se pasó la zona del paso actual?
        const s = STEPS[step];
        if (s && alt < s.low) {
          paused = true;
          goBtn.disabled = true;
          sfx.soft();
          say(sayEl, s.late, 'warn');
          window.setTimeout(() => alive && retryStep(), 2200);
          return;
        }
        if (rockets > 0.8 || (rockets > 0 && alt <= 0.012)) {
          // cortar el cable: la pelota cae libre
          phase = 'drop';
          backshell = { x: 300, y: capY() - 70, vx: -40, vy: -60 };
          ball.x = 300;
          ball.y = capY();
          ball.vx = 70;
          ball.vy = 40;
          sfx.beep();
        }
      } else if (phase === 'drop' || phase === 'bounce') {
        backshell.x += backshell.vx * dt;
        backshell.y += backshell.vy * dt;
        backshell.vx -= 30 * dt;
        ball.vy += 260 * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.rot += (ball.vx / 40) * dt;
        const floor = GROUND - 42;
        if (ball.y > floor) {
          ball.y = floor;
          if (Math.abs(ball.vy) > 40) {
            ball.vy = -ball.vy * 0.58;
            ball.vx *= 0.85;
            bounces++;
            phase = 'bounce';
            tonePop();
            shake = Math.min(14, Math.abs(ball.vy) / 18);
            for (let i = 0; i < 26; i++)
              dust.push({ x: ball.x + (Math.random() - 0.5) * 60, y: GROUND - 6, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 90, life: 0.8 + Math.random() * 0.6 });
            say(sayEl, `¡Rebote ${bounces}! Las bolsas de aire protegen a Spirit.`, 'ok');
          } else {
            ball.vy = 0;
            ball.vx *= 1 - 2.2 * dt;
            if (Math.abs(ball.vx) < 4) {
              phase = 'open';
              say(sayEl, 'Se detuvo. Se desinflan las bolsas y se abren los pétalos…', 'ok');
            }
          }
        }
        if (ball.x > W - 60) {
          ball.x = W - 60;
          ball.vx = -Math.abs(ball.vx) * 0.5;
        }
      } else if (phase === 'open') {
        openK = Math.min(1, openK + dt * 0.6);
        if (openK >= 1) {
          phase = 'done';
          finish();
        }
      }
    };
    const tonePop = () => sfx.beep();

    const drawCapsule = (x: number, y: number) => {
      // paracaídas
      if (chute) {
        const cy = y - 190;
        g.strokeStyle = 'rgba(255,255,255,.6)';
        g.lineWidth = 1.5;
        for (const dx of [-70, -35, 0, 35, 70]) {
          g.beginPath();
          g.moveTo(x + dx, cy + 20);
          g.lineTo(x + dx * 0.25, y - 40);
          g.stroke();
        }
        g.fillStyle = '#f8fafc';
        g.beginPath();
        g.ellipse(x, cy + 20, 80, 50, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = '#f97316';
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(x, cy + 20);
          g.ellipse(x, cy + 20, 80, 50, 0, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 0.5) * Math.PI) / 4);
          g.closePath();
          g.fill();
        }
      }
      // concha trasera
      g.fillStyle = '#e5e7eb';
      g.strokeStyle = '#6b7280';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 46, y - 10);
      g.lineTo(x - 18, y - 52);
      g.lineTo(x + 18, y - 52);
      g.lineTo(x + 46, y - 10);
      g.closePath();
      g.fill();
      g.stroke();
      if (rockets > 0 && phase === 'fall') {
        for (const dx of [-30, 30]) {
          const fl = 30 + Math.random() * 20;
          const gr = g.createLinearGradient(0, y - 12, 0, y - 12 + fl);
          gr.addColorStop(0, '#fff7ed');
          gr.addColorStop(0.4, '#fb923c');
          gr.addColorStop(1, 'rgba(249,115,22,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(x + dx - 7, y - 12);
          g.lineTo(x + dx + 7, y - 12);
          g.lineTo(x + dx + dx * 0.3, y - 12 + fl);
          g.closePath();
          g.fill();
        }
      }
      if (!chute) {
        // escudo de calor (con brillo al entrar)
        g.fillStyle = '#7c2d12';
        g.beginPath();
        g.ellipse(x, y - 8, 50, 12, 0, 0, Math.PI);
        g.fill();
        if (alt > 13) {
          const k = Math.min(1, (alt - 13) / 5);
          const gl = g.createRadialGradient(x, y + 10, 5, x, y + 10, 90);
          gl.addColorStop(0, `rgba(255,190,90,${0.9 * k})`);
          gl.addColorStop(1, 'rgba(255,120,40,0)');
          g.fillStyle = gl;
          g.beginPath();
          g.ellipse(x, y + 20, 90, 60, 0, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        // cable y módulo (con o sin bolsas)
        g.strokeStyle = '#d1d5db';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y - 10);
        g.lineTo(x, y + 26);
        g.stroke();
        drawBall(x, y + 60, 0, bags ? 1 : 0.45);
      }
    };

    const drawBall = (x: number, y: number, rot: number, inflate: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      if (inflate > 0.5) {
        const pts = [
          [-20, -16],
          [20, -16],
          [-20, 18],
          [20, 18],
          [0, 0],
        ];
        for (const [dx, dy] of pts) {
          const rg = g.createRadialGradient(dx - 8, dy - 8, 2, dx, dy, 30 * inflate);
          rg.addColorStop(0, '#fefce8');
          rg.addColorStop(1, '#d6c8a5');
          g.fillStyle = rg;
          g.beginPath();
          g.arc(dx, dy, 28 * inflate, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = 'rgba(120,100,70,.5)';
          g.lineWidth = 1.5;
          g.stroke();
        }
      } else {
        g.fillStyle = '#d1d5db';
        g.beginPath();
        g.moveTo(-26, 18);
        g.lineTo(0, -24);
        g.lineTo(26, 18);
        g.closePath();
        g.fill();
      }
      g.restore();
    };

    const drawRover = (x: number, y: number) => {
      // pétalos abiertos + rover simple
      g.fillStyle = '#9ca3af';
      g.beginPath();
      g.moveTo(x - 90 * openK, y + 4);
      g.lineTo(x + 90 * openK, y + 4);
      g.lineTo(x + 40, y - 6);
      g.lineTo(x - 40, y - 6);
      g.closePath();
      g.fill();
      if (openK > 0.4) {
        const k = (openK - 0.4) / 0.6;
        g.globalAlpha = k;
        g.fillStyle = '#1e3a8a';
        g.fillRect(x - 46, y - 34, 92, 8);
        g.fillStyle = '#e5e7eb';
        g.fillRect(x - 26, y - 26, 52, 16);
        g.fillStyle = '#9ca3af';
        g.fillRect(x - 3, y - 62, 6, 30);
        g.fillStyle = '#d1d5db';
        g.fillRect(x - 14, y - 70, 28, 10);
        g.fillStyle = '#374151';
        for (const dx of [-30, 0, 30]) {
          g.beginPath();
          g.arc(x + dx, y - 6, 7, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
    };

    const draw = () => {
      g.save();
      if (shake > 0.2) {
        g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.9;
      }
      const sky = g.createLinearGradient(0, 0, 0, H);
      const high = Math.min(1, alt / 15);
      sky.addColorStop(0, `rgb(${Math.round(40 + 140 * (1 - high))},${Math.round(30 + 90 * (1 - high))},${Math.round(40 + 40 * (1 - high))})`);
      sky.addColorStop(1, '#e9c79a');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      // líneas de velocidad mientras cae rápido
      if (phase === 'fall' && !paused) {
        g.strokeStyle = 'rgba(255,255,255,.25)';
        g.lineWidth = 2;
        const sp = rate() * 160;
        for (const s of streaks) {
          s.y -= sp * 0.016 * 6;
          if (s.y < -s.l) s.y = H;
          g.beginPath();
          g.moveTo(s.x, s.y);
          g.lineTo(s.x, s.y + s.l * Math.min(1, sp / 100));
          g.stroke();
        }
      }
      // suelo
      const gy = phase === 'fall' ? groundY() : GROUND;
      if (gy < H) {
        g.fillStyle = '#b4693f';
        g.beginPath();
        g.moveTo(0, gy - 30);
        g.quadraticCurveTo(150, gy - 60, 300, gy - 34);
        g.quadraticCurveTo(450, gy - 12, W, gy - 40);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.fill();
        g.fillStyle = '#c98552';
        g.fillRect(0, gy, W, H - gy);
        for (const r of rocks) {
          g.fillStyle = '#7c3f22';
          g.beginPath();
          g.ellipse(r.x, r.y + (gy - GROUND), r.r, r.r * 0.6, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      // escudo de calor cayendo
      if (shieldY > 0 && shieldY < H) {
        shieldY += 6;
        g.fillStyle = '#7c2d12';
        g.beginPath();
        g.ellipse(300, shieldY, 50, 12, 0, 0, Math.PI);
        g.fill();
      }
      if (phase === 'fall') drawCapsule(300, capY());
      else {
        // concha y paracaídas se alejan
        if (backshell.y > -200) {
          g.save();
          g.translate(backshell.x - 300, backshell.y - (capY() - 70));
          drawCapsule(300, capY());
          g.restore();
        }
        if (phase === 'open' || phase === 'done') drawRover(ball.x, GROUND - 6);
        else drawBall(ball.x, ball.y, ball.rot, 1);
      }
      // polvo de los rebotes
      for (const d of dust) {
        d.life -= 0.016;
        d.x += d.vx * 0.016;
        d.y += d.vy * 0.016;
        d.vy += 60 * 0.016;
        if (d.life <= 0) continue;
        g.fillStyle = `rgba(214,160,110,${d.life * 0.6})`;
        g.beginPath();
        g.arc(d.x, d.y, 4 + (1 - d.life) * 10, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      // altímetro con zona verde
      const ax = 22;
      const top = 40;
      const bot = H - 40;
      const toY = (a: number) => top + (bot - top) * (1 - Math.sqrt(Math.min(20, Math.max(0, a)) / 20));
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(ax - 8, top - 8, 34, bot - top + 16);
      const s = STEPS[step];
      if (s && phase === 'fall') {
        g.fillStyle = 'rgba(34,197,94,.75)';
        g.fillRect(ax, toY(s.top), 18, toY(s.low) - toY(s.top));
      }
      g.fillStyle = '#fff';
      g.beginPath();
      const ay = toY(alt);
      g.moveTo(ax + 22, ay);
      g.lineTo(ax + 34, ay - 7);
      g.lineTo(ax + 34, ay + 7);
      g.fill();
      altEl.textContent = phase === 'fall' ? fmtAlt(alt) : '0 m';
      const inZone = s && phase === 'fall' && !paused && alt <= s.top && alt >= s.low;
      goBtn.classList.toggle('ready', !!inZone);
    };

    let last = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      if (phase !== 'done') raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const finish = () => {
      sfx.win();
      draw();
      const prec = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
      const n = prec > 0.66 ? 3 : prec > 0.33 ? 2 : 1;
      const stars = '★'.repeat(n) + '☆'.repeat(3 - n);
      const precText = n === 3 ? '¡Precisión de ingeniero de la NASA!' : n === 2 ? '¡Muy buen control!' : 'Lo lograste. Prueba otra vez para pulsar justo en el centro de la zona verde.';
      const side = root.querySelector('.spa__side')!;
      const box = document.createElement('div');
      box.className = 'lk-learn';
      box.innerHTML = `
        <h4>¿QUÉ APRENDISTE?</h4>
        <p style="margin:0 0 8px;font-size:28px;letter-spacing:4px;color:#fde047">${stars}</p>
        <p style="margin:0 0 12px">${precText} ¡Aterrizaje con ${bounces} rebotes! Marte tiene poco aire: el paracaídas solo no alcanza para frenar.
        Por eso Spirit usó <b>paracaídas, cohetes y bolsas de aire</b>. Cada planeta necesita su propia forma de aterrizar.</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>`;
      side.appendChild(box);
      box.querySelector('[data-end]')!.addEventListener('click', win);
    };
  };

  brief(root, {
    kicker: 'SPIRIT · MISIÓN 1',
    title: 'Aterrizaje con bolsas de aire',
    text: 'En 2004, Spirit llegó a Marte envuelto en bolsas de aire, como una pelota gigante.',
    goal: 'Pulsa el botón en la zona verde: paracaídas, bolsas de aire y cohetes.',
    art: MER_SVG,
    accent: '#3b82f6',
    soft: '#93c5fd',
    guess: {
      q: '¿Cómo tocó el suelo Spirit al llegar a Marte?',
      options: ['Rebotando dentro de bolsas de aire', 'Lo bajó un astronauta'],
      correct: 0,
      why: 'Cayó dentro de bolsas de aire y rebotó muchas veces antes de detenerse. ¡Nunca ha ido una persona a Marte!',
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    if (onKey) document.removeEventListener('keydown', onKey);
    stopSpeak();
  };
}