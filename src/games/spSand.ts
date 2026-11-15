import type { GameContext } from './index';
import { brief, dots, injectKit, MER_SVG, say, sfx, stopSpeak, theme } from './lkKit';
import { tr } from '../i18n';

const STAGES: { name: string; map: string[] }[] = [
  { name: tr('Test 1 · Sandbox', 'Prueba 1 · Caja de arena'), map: ['sssssfE', 'srrsffs', 'sfffsrs', 'sfrssss', 'Sfsssrs', 'ssssrss'] },
  { name: tr('Test 2 · Just like Troy', 'Prueba 2 · Igual que en Troy'), map: ['Essrsss', 'fsrffss', 'fsssfrs', 'rrfssfs', 'sffsrfs', 'sssssfS'] },
];
const MAX_SINK = 10;
const START_SINK = 5;
const SCANS = 2;

const CSS = `
.sps { display: grid; grid-template-columns: auto minmax(260px, 360px); gap: 18px; align-items: start; justify-content: center; }
.sps__grid { --c: min(78px, calc((100vw - 60px) / 7), calc((100dvh - 290px) / 6)); display: grid; gap: 4px; padding: 8px; border-radius: 18px; background: #3b2416; border: 2px solid rgba(255,255,255,.12); box-shadow: 0 12px 34px rgba(0,0,0,.5); position: relative; }
.sps__t { position: relative; width: var(--c); height: var(--c); border: 0; border-radius: 10px; padding: 0; cursor: default; overflow: hidden; font: inherit; }
.sps__t.fog { background: repeating-linear-gradient(45deg, #2a1b12 0 8px, #24170f 8px 16px); }
.sps__t.fog::after { content: '?'; position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,.18); font-size: 22px; font-weight: 900; }
.sps__t.s { background: radial-gradient(circle at 30% 30%, #f0b77a, #d9965b); }
.sps__t.s::before { content: ''; position: absolute; inset: 0; background: repeating-radial-gradient(circle at 50% 120%, transparent 0 7px, rgba(150,90,40,.35) 7px 9px); }
.sps__t.f { background: linear-gradient(135deg, #8a5a3c, #6e4630); }
.sps__t.f::before { content: ''; position: absolute; inset: 18%; border-radius: 6px; background: repeating-linear-gradient(0deg, rgba(0,0,0,.15) 0 3px, transparent 3px 8px); }
.sps__t.r { background: #4a2f20; }
.sps__t.r::before { content: ''; position: absolute; inset: 14%; border-radius: 40% 50% 35% 45%; background: radial-gradient(circle at 35% 30%, #8f6a52, #3a241a); }
.sps__t.E { background: linear-gradient(135deg, #34d399, #059669); }
.sps__t.E::before { content: 'SALIDA'; position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 900; color: #04140b; }
.sps__t.can { cursor: pointer; box-shadow: inset 0 0 0 3px #93c5fd; }
.sps__t.can:hover, .sps__t.can:focus-visible { outline: none; box-shadow: inset 0 0 0 4px #fff; }
.sps__t.trail::after { content: ''; position: absolute; left: 50%; top: 50%; width: 18%; height: 18%; transform: translate(-50%,-50%); border-radius: 50%; background: rgba(0,0,0,.35); }
.sps__rover { position: absolute; left: 8px; top: 8px; width: var(--c); height: var(--c); pointer-events: none; transition: transform .45s ease-in-out; display: grid; place-items: center; }
.sps__rover svg { width: 92%; height: auto; filter: drop-shadow(0 3px 3px rgba(0,0,0,.5)); }
.sps__side { display: grid; gap: 12px; }
.sps__sinkview { border-radius: 16px; overflow: hidden; border: 2px solid rgba(255,255,255,.1); }
.sps__sinkview svg { display: block; width: 100%; height: auto; }
.sps__meter { padding: 12px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
.sps__meter small { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: var(--muted); }
.sps__bar { display: grid; grid-template-columns: repeat(${MAX_SINK}, 1fr); gap: 3px; margin-top: 6px; }
.sps__bar i { height: 16px; border-radius: 4px; background: rgba(255,255,255,.1); }
.sps__bar i.on { background: #f59e0b; } .sps__bar i.hot { background: #ef4444; }
.sps__legend { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; color: var(--muted); }
.sps__legend span { display: inline-flex; align-items: center; gap: 6px; }
.sps__legend i { width: 16px; height: 16px; border-radius: 4px; }
@media (max-width: 860px) { .sps { grid-template-columns: 1fr; justify-items: center; } .sps__side { width: 100%; } }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SINK_SVG = `
<svg viewBox="0 0 320 150" aria-hidden="true">
  <rect width="320" height="150" fill="#d9a578"/>
  <g data-roverg>
    <g transform="translate(70 20) scale(.82)">
      <rect x="104" y="20" width="6" height="50" fill="#9ca3af"/><rect x="88" y="8" width="40" height="16" rx="4" fill="#d1d5db"/>
      <path d="M20 66 h180 l-8 10 h-164 z" fill="#1e3a8a"/><rect x="58" y="76" width="104" height="26" rx="4" fill="#e5e7eb"/>
      <path d="M44 120 l26 -18 h80 l26 18" stroke="#9ca3af" stroke-width="5" fill="none"/>
      ${[44, 110, 176].map((x) => `<g transform="translate(${x} 120)"><g data-w><circle r="12" fill="#374151" stroke="#d1d5db" stroke-width="3"/><path d="M-9 0h18M0 -9v18" stroke="#9ca3af" stroke-width="2"/></g></g>`).join('')}
    </g>
  </g>
  <g data-spray opacity="0">${Array.from({ length: 10 }, (_, i) => `<circle cx="${110 + i * 12}" cy="${112 - (i % 3) * 8}" r="3" fill="#f0c08a"/>`).join('')}</g>
  <path d="M0 122 Q80 116 160 124 T320 120 V150 H0Z" fill="#e8b47e"/>
  <path d="M0 128 Q90 122 170 130 T320 126 V150 H0Z" fill="#d09257"/>
</svg>`;

export default function spSand({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  const timers: number[] = [];
  const later = (f: () => void, ms: number) => timers.push(window.setTimeout(() => alive && f(), ms));

  const play = (si: number) => {
    const st = STAGES[si];
    const H = st.map.length;
    const W = st.map[0].length;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : st.map[y][x]);
    let px = 0;
    let py = 0;
    st.map.forEach((row, y) => [...row].forEach((ch, x) => ch === 'S' && ([px, py] = [x, y])));
    let sink = START_SINK;
    let scans = SCANS;
    let moves = 0;
    let busy = false;
    const seen = new Set<string>();
    const trail = new Set<string>([`${px},${py}`]);
    const reveal = (r: number) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) seen.add(`${px + dx},${py + dy}`);
    };
    reveal(1);

    root.innerHTML = `
      <div class="lk"${theme('#3b82f6', '#93c5fd')}><div class="lk__wrap">
        <div class="lk-top"><p class="lk-task"><i>4</i>${st.name}: ${tr('get the twin rover to the green exit.', 'saca al rover gemelo hasta la salida verde.')}</p>${dots(STAGES.length, si, tr('TEST', 'PRUEBA'))}</div>
        <div class="sps">
          <div class="sps__grid" data-grid style="grid-template-columns: repeat(${W}, var(--c))"></div>
          <div class="sps__side">
            <div class="sps__sinkview">${SINK_SVG}</div>
            <div class="sps__meter"><small>${tr('SINKING', 'HUNDIMIENTO')}</small><div class="sps__bar" data-bar></div></div>
            <div class="sps__legend">
              <span><i style="background:#e8a96c"></i>${tr('Soft sand: sinks more', 'Arena blanda: se hunde más')}</span>
              <span><i style="background:#7c5036"></i>${tr('Firm ground: helps you get out', 'Suelo firme: ayuda a salir')}</span>
              <span><i style="background:#3a241a"></i>${tr('Rock: cannot pass', 'Roca: no se puede pasar')}</span>
            </div>
            <button type="button" class="lk-btn" data-scan>📡 ${tr('Scan around', 'Escanear alrededor')} (${scans})</button>
            <p class="lk-say" data-say></p>
          </div>
        </div>
      </div></div>`;
    const grid = root.querySelector<HTMLElement>('[data-grid]')!;
    const bar = root.querySelector<HTMLElement>('[data-bar]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const scanBtn = root.querySelector<HTMLButtonElement>('[data-scan]')!;
    const roverG = root.querySelector<SVGGElement>('[data-roverg]')!;
    const spray = root.querySelector<SVGGElement>('[data-spray]')!;
    const wheels = Array.from(root.querySelectorAll<SVGGElement>('[data-w]'));
    const roverEl = document.createElement('div');
    roverEl.className = 'sps__rover';
    roverEl.innerHTML = MER_SVG;

    const adj = (x: number, y: number) => Math.abs(x - px) + Math.abs(y - py) === 1;
    const render = () => {
      grid.innerHTML = '';
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const ch = at(x, y);
          const vis = seen.has(`${x},${y}`);
          const b = document.createElement('button');
          b.type = 'button';
          const can = !busy && vis && adj(x, y) && ch !== 'r';
          b.className = `sps__t ${vis ? (ch === 'S' ? 'f' : ch) : 'fog'}${can ? ' can' : ''}${trail.has(`${x},${y}`) ? ' trail' : ''}`;
          b.disabled = !can;
          b.setAttribute('aria-label', vis ? { s: 'arena blanda', f: 'suelo firme', S: 'suelo firme', r: 'roca', E: 'salida' }[ch] ?? '' : 'desconocido');
          if (can) b.addEventListener('click', () => move(x, y));
          grid.appendChild(b);
        }
      grid.appendChild(roverEl);
      roverEl.style.transform = `translate(calc((var(--c) + 4px) * ${px}), calc((var(--c) + 4px) * ${py}))`;
      bar.innerHTML = Array.from({ length: MAX_SINK }, (_, i) => `<i class="${i < sink ? (sink >= 8 ? 'on hot' : 'on') : ''}"></i>`).join('');
      roverG.setAttribute('transform', `translate(0 ${sink * 3.2})`);
      scanBtn.disabled = busy || scans <= 0;
      scanBtn.textContent = `📡 ${tr('Scan around', 'Escanear alrededor')} (${scans})`;
    };
    say(sayEl, si === 0 ? tr('You are an engineer on Earth. Tap a neighboring square to move the twin rover. Look for firm ground!', 'Eres ingeniero en la Tierra. Toca una casilla vecina para mover el rover gemelo. ¡Busca suelo firme!') : tr('This box copies the sand at Troy, where Spirit got stuck. Plan your route carefully!', 'Esta caja copia la arena de Troy, donde quedó Spirit. ¡Planea bien tu ruta!'));
    render();

    const spin = (soft: boolean) => {
      spray.setAttribute('opacity', soft ? '1' : '0');
      wheels.forEach((w, i) => w.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${soft ? 720 : 360}deg)` }], { duration: 450, delay: i * 20 }));
      later(() => spray.setAttribute('opacity', '0'), 450);
    };

    const move = (x: number, y: number) => {
      if (busy) return;
      busy = true;
      const ch = at(x, y);
      px = x;
      py = y;
      moves++;
      trail.add(`${x},${y}`);
      reveal(1);
      if (ch === 's') {
        sink += 2;
        spin(true);
        sfx.soft();
      } else {
        sink = Math.max(0, sink - 1);
        spin(false);
        sfx.click();
      }
      render();
      later(() => {
        busy = false;
        if (ch === 'E') {
          sfx.ok();
          if (si + 1 < STAGES.length) {
            say(sayEl, tr(`It got out of the sand in ${moves} moves! Now, a harder test…`, `¡Salió de la arena en ${moves} movimientos! Ahora, una prueba más difícil…`), 'ok');
            later(() => play(si + 1), 1800);
          } else finish();
          return;
        }
        if (sink >= MAX_SINK) {
          sfx.soft();
          say(sayEl, tr('It sank up to its axles! That is what happened to Spirit. Let\'s reset the sandbox and try another route with more firm ground.', '¡Se hundió hasta los ejes! Así le pasó a Spirit. Reiniciemos la caja de arena e intenta otra ruta con más suelo firme.'), 'warn');
          later(() => play(si), 2600);
          return;
        }
        if (ch === 's') say(sayEl, sink >= 8 ? tr('Careful! It is sinking deep. Find firm ground now.', '¡Cuidado! Está muy hundido. Busca suelo firme ya.') : tr('Soft sand: the wheels slip and it sinks a little more.', 'Arena blanda: las ruedas patinan y se hunde un poco más.'), sink >= 8 ? 'warn' : '');
        else say(sayEl, tr('Firm ground: the wheels grip and the rover rises a little. Nice!', 'Suelo firme: las ruedas agarran y el rover sube un poco. ¡Bien!'), 'ok');
        render();
      }, 480);
    };

    scanBtn.addEventListener('click', () => {
      if (busy || scans <= 0) return;
      scans--;
      reveal(2);
      sfx.radio();
      say(sayEl, tr('Scan complete: now you can see farther. Use it to plan the route.', 'Escaneo completo: ahora ves más lejos. Úsalo para planear la ruta.'));
      render();
    });
  };

  const finish = () => {
    sfx.win();
    const wrap = root.querySelector('.lk__wrap')!;
    const box = document.createElement('div');
    box.className = 'lk-learn';
    box.innerHTML = `
      <h4>${tr('THE REAL STORY', 'LA HISTORIA REAL')}</h4>
      <p style="margin:0 0 12px">${tr(
        'In 2009, Spirit got stuck in the sand at <b>Troy</b>. On Earth, engineers tested maneuvers with a twin rover, just like you did. On Mars it could not get out, and in 2010 the winter cold left it without power. But Spirit was supposed to work for 90 days… <b>and it explored for more than 6 years!</b> Its discoveries about water on Mars still help scientists.',
        'En 2009, Spirit quedó atrapado en la arena de <b>Troy</b>. En la Tierra, los ingenieros probaron maniobras con un rover gemelo, como hiciste tú. En Marte no logró salir, y en 2010 el frío del invierno lo dejó sin energía. Pero Spirit iba a trabajar 90 días… <b>¡y exploró más de 6 años!</b> Sus descubrimientos sobre el agua de Marte siguen ayudando a los científicos.',
      )}</p>
      <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`;
    wrap.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    box.querySelector('[data-end]')!.addEventListener('click', win);
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 4', 'SPIRIT · MISIÓN 4'),
    title: tr('Stuck in the sand', 'Atrapado en la arena'),
    text: tr('In 2009, Spirit\'s wheels sank into soft sand. A way out had to be found!', 'En 2009, las ruedas de Spirit se hundieron en arena blanda. ¡Había que encontrar una salida!'),
    goal: tr('As an engineer, get the twin rover out of 2 sandboxes without it sinking all the way.', 'Como ingeniero, saca al rover gemelo de 2 cajas de arena sin que se hunda del todo.'),
    art: MER_SVG,
    accent: '#3b82f6',
    soft: '#93c5fd',
    guess: {
      q: tr('How did the engineers look for a way to get Spirit out of the sand?', '¿Cómo buscaron los ingenieros la forma de sacar a Spirit de la arena?'),
      options: [tr('By testing with a twin rover in a sandbox', 'Probando con un rover gemelo en una caja de arena'), tr('By sending an astronaut to push it', 'Enviando un astronauta a empujarlo')],
      correct: 0,
      why: tr('They built a sandbox on Earth similar to the one on Mars and tested maneuvers with a twin rover.', 'Armaron en la Tierra una caja de arena parecida a la de Marte y probaron maniobras con un rover gemelo.'),
    },
    onStart: () => play(0),
  });

  return () => {
    alive = false;
    timers.forEach((t) => window.clearTimeout(t));
    stopSpeak();
  };
}
