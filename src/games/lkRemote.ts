/**
 * LUNOJOD 2 · MISIÓN 1 · Control remoto desde la Tierra.
 *
 * El Lunojod 2 no tenía piloto: un equipo lo manejaba desde la Tierra y cada orden tardaba en
 * llegar (≈1,3 s de ida y otro tanto la imagen de vuelta). Mecánica: el niño arma una lista de
 * órdenes (avanzar / girar), la envía, ve la señal viajar a la Luna y el robot las ejecuta.
 * Se puede enviar por partes. Si hay un obstáculo, el robot se detiene solo (sin castigo).
 */
import type { GameContext } from './index';
import { brief, dots, ICON, injectKit, say, sfx, stopSpeak } from './lkKit';

type Cmd = 'F' | 'L' | 'R';
interface Stage {
  map: string[];
  task: string;
  target: string;
}

// S = salida (mirando a la derecha) · T = meta · c = cráter · r = roca
const STAGES: Stage[] = [
  {
    task: 'Lleva el robot al punto para fotografiar la sonda Luna 21.',
    target: 'Punto de foto',
    map: ['........', '..r.....', 'S....T..', '........', '....c...'],
  },
  {
    task: 'Rodea el cráter para llegar a las colinas.',
    target: 'Colinas',
    map: ['........', '...c....', 'S..c..T.', '...c....', '........'],
  },
  {
    task: 'Llega a la falla Fossa Recta sin caer en cráteres.',
    target: 'Fossa Recta',
    map: ['..r....T', '..c..r..', 'S.c..c..', '..c..c..', '.....c..'],
  },
];

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const MAX_CMDS = 14;
const SIGNAL_MS = 1300;

const CSS = `
.lkr__signal { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
.lkr__signal svg { width: 40px; height: 40px; flex: none; }
.lkr__line { position: relative; flex: 1; height: 4px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.25) 0 8px, transparent 8px 14px); }
.lkr__pulse { position: absolute; top: 50%; left: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: #67e8f9; box-shadow: 0 0 16px #67e8f9; opacity: 0; }
.lkr__pulse.back { background: #fbbf24; box-shadow: 0 0 16px #fbbf24; }
.lkr__sigtext { min-width: 150px; font-family: var(--font-mono); font-size: 13px; color: var(--muted); text-align: center; }
.lkr__main { display: grid; grid-template-columns: auto minmax(260px, 1fr); gap: 18px; align-items: start; margin-top: 14px; }
.lkr__board { --c: min(70px, calc((100vw - 48px) / 8)); position: relative; display: grid; grid-template-columns: repeat(8, var(--c)); border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,.15);
  background: radial-gradient(circle at 30% 20%, #8d8b85, #5d5c57); box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.lkr__cell { position: relative; width: var(--c); height: var(--c); border: 1px solid rgba(0,0,0,.08); }
.lkr__cell svg { position: absolute; inset: 8%; width: 84%; height: 84%; }
.lkr__cell.path::after { content: ''; position: absolute; left: 50%; top: 50%; width: 22%; height: 22%; transform: translate(-50%,-50%); border-radius: 50%; background: #67e8f9; box-shadow: 0 0 10px #67e8f9; }
.lkr__cell.bump { animation: lkr-bump .6s; }
@keyframes lkr-bump { 0%,100% { background: transparent; } 30% { background: rgba(251,191,36,.6); } }
.lkr__target { position: absolute; inset: 6%; border: 3px dashed #34d399; border-radius: 50%; animation: lkr-ring 1.6s ease-in-out 3; }
.lkr__target span { position: absolute; left: 50%; bottom: -2px; transform: translate(-50%, 100%); padding: 1px 6px; border-radius: 6px; white-space: nowrap; font-size: 10px; font-weight: 800; color: #04140b; background: #34d399; z-index: 2; }
@keyframes lkr-ring { 50% { transform: scale(.85); } }
.lkr__rover { position: absolute; left: 0; top: 0; width: var(--c); height: var(--c); z-index: 3; pointer-events: none;
  transform: translate(calc(var(--c) * var(--x)), calc(var(--c) * var(--y))) rotate(calc(var(--r) * 1deg)); transition: transform .38s ease-in-out; }
.lkr__rover svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 4px rgba(0,0,0,.5)); }
.lkr__panel { display: grid; gap: 12px; }
.lkr__queue { display: flex; flex-wrap: wrap; gap: 6px; min-height: 92px; padding: 10px; border-radius: 16px; border: 2px dashed rgba(255,255,255,.18); background: rgba(0,0,0,.25); align-content: flex-start; }
.lkr__queue:empty::before { content: 'Toca las flechas para armar el camino…'; color: var(--muted); font-size: 14px; }
.lkr__chip { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; font-size: 20px; font-weight: 900; color: #1a0b33; background: #fde68a; }
.lkr__chip.run { background: #67e8f9; transform: scale(1.12); }
.lkr__chip.done { opacity: .35; }
.lkr__pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.lkr__pad .lk-btn { flex-direction: column; gap: 2px; min-height: 70px; font-size: 13px; }
.lkr__pad .lk-btn b { font-size: 26px; line-height: 1; }
.lkr__row { display: flex; flex-wrap: wrap; gap: 8px; }
.lkr__row .lk-btn--go { flex: 1; }
@media (max-width: 820px) { .lkr__main { grid-template-columns: 1fr; justify-items: center; } .lkr__panel { width: 100%; } .lkr__sigtext { min-width: 0; font-size: 12px; } }
`;

const EARTH = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#2563eb"/><path d="M9 14c4-4 9-2 10 2s-3 5-1 9-4 6-7 3-5-10-2-14z" fill="#22c55e"/><path d="M24 8c4 1 8 6 7 10s-5 1-6-2-4-6-1-8z" fill="#22c55e"/></svg>';
const MOON = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#cbd5e1"/><circle cx="14" cy="14" r="4" fill="#94a3b8"/><circle cx="25" cy="24" r="5" fill="#94a3b8"/><circle cx="26" cy="12" r="2" fill="#94a3b8"/></svg>';
const CRATER = '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="21" rx="18" ry="16" fill="#3f3e3a"/><ellipse cx="22" cy="23" rx="13" ry="11" fill="#2a2926"/><path d="M4 18a16 14 0 0 1 30-6" stroke="#b5b3ab" stroke-width="2.5" fill="none"/></svg>';
const ROCK = '<svg viewBox="0 0 40 40"><ellipse cx="24" cy="30" rx="14" ry="5" fill="rgba(0,0,0,.35)"/><path d="M8 28l4-12 10-6 9 5 3 13z" fill="#7a7872"/><path d="M12 16l10-6 9 5-9 3z" fill="#aeaca5"/></svg>';
const LANDER = '<svg viewBox="0 0 40 40"><path d="M10 30l4-10h12l4 10M8 30h6M26 30h6" stroke="#d1d5db" stroke-width="2.5" fill="none"/><rect x="12" y="10" width="16" height="12" rx="3" fill="#9ca3af" stroke="#e5e7eb" stroke-width="2"/></svg>';
/** Lunojod visto desde arriba, mirando a la derecha. */
const ROVER_TOP = `<svg viewBox="0 0 60 60">
  ${[12, 24, 36, 48].map((x) => `<rect x="${x - 5}" y="6" width="10" height="8" rx="2" fill="#1f2937"/><rect x="${x - 5}" y="46" width="10" height="8" rx="2" fill="#1f2937"/>`).join('')}
  <rect x="6" y="13" width="48" height="34" rx="9" fill="#c9ccd3" stroke="#4b5563" stroke-width="2"/>
  <ellipse cx="28" cy="30" rx="18" ry="13" fill="#1e3a8a" stroke="#93c5fd" stroke-width="2"/>
  <circle cx="52" cy="24" r="3" fill="#111827"/><circle cx="52" cy="36" r="3" fill="#111827"/>
  <path d="M54 30l5 0" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
</svg>`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default function lkRemote({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  const timers: number[] = [];
  const wait = (ms: number) => new Promise<void>((res) => timers.push(window.setTimeout(() => alive && res(), ms)));
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const play = (stageIdx: number) => {
    const st = STAGES[stageIdx];
    const H = st.map.length;
    const W = st.map[0].length;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : st.map[y][x]);
    let sx = 0;
    let sy = 0;
    let tx = 0;
    let ty = 0;
    st.map.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === 'S') [sx, sy] = [x, y];
        if (ch === 'T') [tx, ty] = [x, y];
      }),
    );
    let rx = sx;
    let ry = sy;
    let dir = 0;
    let turns = 0; // giro acumulado (para animar sin saltos)
    let queue: Cmd[] = [];
    let busy = false;
    let bumps = 0;
    let sends = 0;

    const cell = (ch: string, x: number, y: number) => {
      let inner = '';
      if (ch === 'c') inner = CRATER;
      else if (ch === 'r') inner = ROCK;
      else if (ch === 'S' && stageIdx === 0) inner = LANDER;
      if (ch === 'T') inner = `<div class="lkr__target"><span>${st.target}</span></div>`;
      return `<div class="lkr__cell" data-x="${x}" data-y="${y}">${inner}</div>`;
    };

    root.innerHTML = `
      <div class="lk"><div class="lk__wrap">
        <div class="lk-top">
          <p class="lk-task"><i>${stageIdx + 1}</i>${st.task}</p>
          ${dots(STAGES.length, stageIdx)}
        </div>
        <div class="lkr__signal">
          ${EARTH}<span class="lkr__sigtext" data-sig>Equipo en la Tierra</span>
          <div class="lkr__line"><span class="lkr__pulse" data-pulse></span></div>
          ${MOON}
        </div>
        <div class="lkr__main">
          <div class="lkr__board" style="grid-template-columns: repeat(${W}, var(--c))">
            ${st.map.map((row, y) => [...row].map((ch, x) => cell(ch, x, y)).join('')).join('')}
            <div class="lkr__rover" data-rover>${ROVER_TOP}</div>
          </div>
          <div class="lkr__panel">
            <div class="lkr__queue" data-queue aria-live="polite"></div>
            <div class="lkr__pad">
              <button type="button" class="lk-btn" data-cmd="L"><b>↺</b>Girar</button>
              <button type="button" class="lk-btn" data-cmd="F"><b>⬆</b>Avanzar</button>
              <button type="button" class="lk-btn" data-cmd="R"><b>↻</b>Girar</button>
            </div>
            <div class="lkr__row">
              <button type="button" class="lk-btn lk-btn--small" data-undo>⌫ Borrar</button>
              <button type="button" class="lk-btn lk-btn--small" data-help>${ICON.help}Pista</button>
              <button type="button" class="lk-btn lk-btn--go" data-send>📡 Enviar a la Luna</button>
            </div>
            <p class="lk-say" data-say></p>
          </div>
        </div>
      </div></div>`;

    const roverEl = root.querySelector<HTMLElement>('[data-rover]')!;
    const qEl = root.querySelector<HTMLElement>('[data-queue]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const sigEl = root.querySelector<HTMLElement>('[data-sig]')!;
    const pulse = root.querySelector<HTMLElement>('[data-pulse]')!;
    const sendBtn = root.querySelector<HTMLButtonElement>('[data-send]')!;
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('.lkr__pad button, .lkr__row button'));

    const place = () => {
      roverEl.style.setProperty('--x', String(rx));
      roverEl.style.setProperty('--y', String(ry));
      roverEl.style.setProperty('--r', String(turns * 90));
    };
    place();
    const renderQueue = (runIdx = -1) => {
      qEl.innerHTML = queue
        .map((c, i) => `<span class="lkr__chip${i === runIdx ? ' run' : i < runIdx ? ' done' : ''}" aria-label="${c === 'F' ? 'avanzar' : c === 'L' ? 'girar a la izquierda' : 'girar a la derecha'}">${c === 'F' ? '⬆' : c === 'L' ? '↺' : '↻'}</span>`)
        .join('');
      sendBtn.disabled = busy || !queue.length;
    };
    const lock = (on: boolean) => {
      busy = on;
      btns.forEach((b) => (b.disabled = on));
      renderQueue();
    };
    say(sayEl, stageIdx === 0 ? 'Arma el camino con las flechas y luego pulsa «Enviar a la Luna». El robot mira hacia la derecha.' : 'Puedes enviar el camino completo o por partes.');
    renderQueue();

    const add = (c: Cmd) => {
      if (busy) return;
      if (queue.length >= MAX_CMDS) {
        say(sayEl, `Máximo ${MAX_CMDS} órdenes por envío. ¡Envía estas primero!`, 'warn');
        return;
      }
      sfx.click();
      queue.push(c);
      clearPath();
      renderQueue();
    };

    const clearPath = () => root.querySelectorAll('.lkr__cell.path').forEach((c) => c.classList.remove('path'));

    /** Camino más corto desde la posición actual (para la pista). */
    const solve = (): Cmd[] => {
      const key = (x: number, y: number, d: number) => `${x},${y},${d}`;
      const prev = new Map<string, [string, Cmd] | null>();
      const q: [number, number, number][] = [[rx, ry, dir]];
      prev.set(key(rx, ry, dir), null);
      while (q.length) {
        const [x, y, d] = q.shift()!;
        if (x === tx && y === ty) {
          const out: Cmd[] = [];
          let k = key(x, y, d);
          while (prev.get(k)) {
            const [pk, c] = prev.get(k)!;
            out.unshift(c);
            k = pk;
          }
          return out;
        }
        const nexts: [number, number, number, Cmd][] = [
          [x + DX[d], y + DY[d], d, 'F'],
          [x, y, (d + 3) % 4, 'L'],
          [x, y, (d + 1) % 4, 'R'],
        ];
        for (const [nx, ny, nd, c] of nexts) {
          const ch = at(nx, ny);
          if (ch === '#' || ch === 'c' || ch === 'r') continue;
          const k = key(nx, ny, nd);
          if (prev.has(k)) continue;
          prev.set(k, [key(x, y, d), c]);
          q.push([nx, ny, nd]);
        }
      }
      return [];
    };

    const showHint = () => {
      const path = solve();
      clearPath();
      let x = rx;
      let y = ry;
      let d = dir;
      for (const c of path) {
        if (c === 'F') {
          x += DX[d];
          y += DY[d];
          root.querySelector(`.lkr__cell[data-x="${x}"][data-y="${y}"]`)?.classList.add('path');
        } else d = (d + (c === 'L' ? 3 : 1)) % 4;
      }
      const first = path.slice(0, 4).map((c) => (c === 'F' ? '⬆' : c === 'L' ? '↺' : '↻')).join(' ');
      say(sayEl, `Pista: sigue los puntos azules. Empieza con ${first}${path.length > 4 ? ' …' : ''}`, 'warn');
    };

    const travel = async (back: boolean) => {
      pulse.classList.toggle('back', back);
      pulse.style.transition = 'none';
      pulse.style.left = back ? '100%' : '0%';
      pulse.style.opacity = '1';
      void pulse.offsetWidth;
      pulse.style.transition = `left ${SIGNAL_MS}ms linear`;
      pulse.style.left = back ? '0%' : '100%';
      sigEl.textContent = back ? 'La imagen vuelve… 1,3 s' : 'Orden en camino… 1,3 s';
      sfx.radio();
      await wait(SIGNAL_MS);
      pulse.style.opacity = '0';
    };

    const send = async () => {
      if (busy || !queue.length) return;
      lock(true);
      clearPath();
      sends++;
      say(sayEl, 'Señal enviada. La Luna está a unos 384.000 km: la orden tarda en llegar…');
      await travel(false);
      sigEl.textContent = 'El robot ejecuta las órdenes';
      let blocked = false;
      for (let i = 0; i < queue.length; i++) {
        renderQueue(i);
        const c = queue[i];
        if (c === 'F') {
          const nx = rx + DX[dir];
          const ny = ry + DY[dir];
          const ch = at(nx, ny);
          if (ch === '#' || ch === 'c' || ch === 'r') {
            blocked = true;
            const cellEl = root.querySelector(`.lkr__cell[data-x="${nx}"][data-y="${ny}"]`);
            cellEl?.classList.remove('bump');
            void (cellEl as HTMLElement | null)?.offsetWidth;
            cellEl?.classList.add('bump');
            sfx.soft();
            break;
          }
          rx = nx;
          ry = ny;
        } else {
          dir = (dir + (c === 'L' ? 3 : 1)) % 4;
          turns += c === 'L' ? -1 : 1;
        }
        place();
        sfx.beep();
        await wait(420);
        if (rx === tx && ry === ty) break;
      }
      await travel(true);
      sigEl.textContent = 'Equipo en la Tierra';
      queue = [];
      if (rx === tx && ry === ty) {
        sfx.ok();
        const next = stageIdx + 1;
        if (next < STAGES.length) {
          say(sayEl, `¡Llegaste! Lo lograste con ${sends} ${sends === 1 ? 'envío' : 'envíos'}. Siguiente destino…`, 'ok');
          await wait(1600);
          play(next);
        } else finish();
        return;
      }
      lock(false);
      if (blocked) {
        bumps++;
        const what = 'Había un obstáculo adelante: el robot se detuvo solo para no dañarse.';
        say(sayEl, bumps >= 2 ? `${what} ¿Quieres una pista? Toca «Pista».` : `${what} Arma un nuevo camino desde aquí.`, 'warn');
      } else say(sayEl, 'Órdenes cumplidas. ¿Qué sigue? Arma el próximo tramo.');
    };

    root.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((b) => b.addEventListener('click', () => add(b.dataset.cmd as Cmd)));
    root.querySelector('[data-undo]')!.addEventListener('click', () => {
      if (busy) return;
      queue.pop();
      renderQueue();
    });
    root.querySelector('[data-help]')!.addEventListener('click', () => !busy && showHint());
    sendBtn.addEventListener('click', send);
    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') add('F');
      else if (e.key === 'ArrowLeft') add('L');
      else if (e.key === 'ArrowRight') add('R');
      else if (e.key === 'Backspace' && !busy) {
        queue.pop();
        renderQueue();
      } else if (e.key === 'Enter') void send();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
  };

  const finish = () => {
    sfx.win();
    const wrap = root.querySelector('.lk__wrap')!;
    const box = document.createElement('div');
    box.className = 'lk-learn';
    box.innerHTML = `
      <h4>¿QUÉ APRENDISTE?</h4>
      <p style="margin:0 0 12px">Como las órdenes tardaban en llegar, el equipo del Lunojod 2 <b>planeaba cada tramo</b> antes de enviarlo.
      ¡Igual que tú! Así recorrió unos 40 km en la Luna en 1973.</p>
      <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>`;
    wrap.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    box.querySelector('[data-end]')!.addEventListener('click', win);
  };

  brief(root, {
    kicker: 'LUNOJOD 2 · MISIÓN 1',
    title: 'Control remoto desde la Tierra',
    text: 'El Lunojod 2 no tenía piloto. Un equipo lo manejaba desde la Tierra, enviando órdenes por radio.',
    goal: 'Arma el camino con flechas y envíalo a la Luna. Llega a 3 destinos.',
    guess: {
      q: 'Si el equipo pulsa «avanzar» en la Tierra, ¿el robot se mueve al instante?',
      options: ['Sí, al instante', 'No, la orden tarda en llegar'],
      correct: 1,
      why: 'La señal tarda más de 1 segundo en llegar a la Luna, y la imagen tarda otro tanto en volver. Por eso había que pensar antes de mover.',
    },
    onStart: () => play(0),
  });

  return () => {
    alive = false;
    timers.forEach((t) => window.clearTimeout(t));
    if (onKey) document.removeEventListener('keydown', onKey);
    stopSpeak();
  };
}