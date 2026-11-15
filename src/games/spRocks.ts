import type { GameContext } from './index';
import { brief, injectKit, MER_SVG, say, sfx, stopSpeak, theme } from './lkKit';
import { rng } from '../ui/moonTexture';
import { tr } from '../i18n';

type Kind = 'vesicles' | 'dark' | 'crumbly' | 'white' | 'patches' | 'nodules';
interface Rock {
  name: string;
  x: number;
  water: boolean;
  kind: Kind;
  look: string;
  inside: string;
  mineral: string;
  why: string;
}

const ROCKS: Rock[] = [
  { name: 'Adirondack', x: 330, water: false, kind: 'vesicles', look: tr('Dark rock with little round holes: gas bubbles that got trapped when the lava cooled.', 'Roca oscura con agujeritos redondos: burbujas de gas que quedaron atrapadas cuando la lava se enfrió.'), inside: '#3f4a3c', mineral: tr('Olivine (a lava mineral)', 'Olivino (mineral de lava)'), why: tr('The gas holes and the olivine show it was born from volcanic lava.', 'Los agujeritos de gas y el olivino muestran que nació de lava volcánica.') },
  { name: 'Clovis', x: 640, water: true, kind: 'crumbly', look: tr('Soft, crumbly rock, yellowish and brown in color.', 'Roca blanda que se desmorona, de color amarillento y café.'), inside: '#b7793a', mineral: tr('Goethite', 'Goetita'), why: tr('Goethite only forms when there is water. A water clue!', 'La goetita solo se forma cuando hay agua. ¡Pista de agua!') },
  { name: 'Humphrey', x: 950, water: false, kind: 'dark', look: tr('Hard, dark rock with tiny shiny crystals.', 'Roca dura y oscura, con cristalitos que brillan.'), inside: '#4b4b4f', mineral: tr('Basalt with olivine', 'Basalto con olivino'), why: tr('It is basalt: lava that cooled. Many rocks on the Gusev plain are like this.', 'Es basalto: lava que se enfrió. Muchas rocas de la llanura de Gusev son así.') },
  { name: 'Pot of Gold', x: 1250, water: true, kind: 'nodules', look: tr('Small rock full of bumps sticking out, like popcorn.', 'Roca pequeña llena de bolitas que sobresalen, como palomitas.'), inside: '#8a4a3a', mineral: tr('Hematite', 'Hematita'), why: tr('The hematite in these little balls usually forms with water.', 'La hematita de estas bolitas se suele formar con agua.') },
  { name: 'Comanche', x: 1560, water: true, kind: 'patches', look: tr('Big rock with light patches inside.', 'Roca grande con manchas claras dentro.'), inside: '#c9b48e', mineral: tr('Carbonates', 'Carbonatos'), why: tr('Carbonates form with water that is not very acidic: a friendlier place for life!', 'Los carbonatos se forman con agua, y no muy ácida: ¡un lugar más amigable para la vida!') },
  { name: 'Gertrude Weise', x: 1860, water: true, kind: 'white', look: tr('It is not a rock: it is very white soil, like talc, that Spirit\'s wheel uncovered.', 'No es roca: es suelo blanquísimo, como talco, que la rueda de Spirit dejó al descubierto.'), inside: '#f5f5f0', mineral: tr('Almost pure silica', 'Sílice casi pura'), why: tr('That much silica forms with hot water, like in geysers or hot springs.', 'Tanta sílice se forma con agua caliente, como la de los géiseres o fuentes termales.') },
];

const SCENE_W = 2100;
const VIEW_H = 330;
const GROUND_Y = 262;

const CSS = `
.spr__view { position: relative; height: ${VIEW_H}px; overflow: hidden; border-radius: 20px; border: 2px solid rgba(255,255,255,.12); box-shadow: 0 12px 34px rgba(0,0,0,.5);
  background: linear-gradient(180deg, #d9a578 0%, #e8c39a 55%, #c98552 56%); }
.spr__world { position: absolute; left: 0; top: 0; width: ${SCENE_W}px; height: ${VIEW_H}px; transition: transform .1s linear; }
.spr__world svg { display: block; }
.spr__rock { cursor: pointer; }
.spr__rock:hover .spr__ring, .spr__rock:focus .spr__ring { opacity: 1; }
.spr__ring { opacity: 0; transition: opacity .2s; }
.spr__rock.done { cursor: default; }
.spr__tag { font: 700 14px system-ui, sans-serif; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.65); stroke-width: 4px; }
.spr__rover { position: absolute; top: ${GROUND_Y - 96}px; width: 130px; transition: none; pointer-events: none; }
.spr__rover svg { width: 100%; height: auto; }
.spr__hint { position: absolute; left: 12px; top: 10px; padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 14px; background: rgba(0,0,0,.55); }
.spr__nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); background: rgba(0,0,0,.45); color: #fff; font-size: 20px; cursor: pointer; }
.spr__nav--l { left: 10px; } .spr__nav--r { right: 10px; }
.spr__lab { display: grid; grid-template-columns: 240px 1fr; gap: 16px; margin-top: 14px; padding: 16px; border-radius: 20px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
.spr__lab[hidden] { display: none; }
.spr__lens { position: relative; width: 240px; height: 240px; }
.spr__lens canvas { width: 240px; height: 240px; border-radius: 50%; border: 6px solid #1f2937; box-shadow: 0 0 0 3px #93c5fd, 0 10px 24px rgba(0,0,0,.5); }
.spr__lens span { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #1f2937; color: #93c5fd; }
.spr__lab h3 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 22px; }
.spr__tools, .spr__class { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.spr__clue { margin: 6px 0; padding: 10px 12px; border-radius: 12px; font-size: 15px; line-height: 1.45; background: rgba(147,197,253,.1); border-left: 4px solid #93c5fd; }
.spr__clue[hidden] { display: none; }
.spr__class .lk-btn { flex: 1 1 180px; min-height: 58px; font-size: 16px; }
.spr__book { margin-top: 14px; }
.spr__book h4 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 12px; letter-spacing: .14em; color: var(--muted); }
.spr__slots { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.spr__slot { padding: 8px 6px; border-radius: 14px; text-align: center; font-size: 12px; font-weight: 700; border: 2px dashed rgba(255,255,255,.15); color: var(--muted); min-height: 74px; }
.spr__slot.filled { border-style: solid; color: var(--fg); background: rgba(255,255,255,.05); }
.spr__slot.water { border-color: #38bdf8; } .spr__slot.lava { border-color: #f97316; }
.spr__slot b { display: block; font-size: 22px; }
.spr__slot i { font-style: normal; color: #fde047; }
@media (max-width: 760px) { .spr__lab { grid-template-columns: 1fr; justify-items: center; } .spr__slots { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

function rockSvg(r: Rock, i: number): string {
  const y = GROUND_Y + 8;
  const shapes: Record<Kind, string> = {
    vesicles: `<path d="M-46 0 L-30 -50 L6 -64 L40 -38 L48 0 Z" fill="#3a3a3e"/><path d="M-30 -50 L6 -64 L14 -30 L-22 -20Z" fill="#55555b"/>${[[-14, -30], [8, -42], [22, -18], [-26, -10]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.5" fill="#1a1a1c"/>`).join('')}`,
    dark: `<ellipse cx="0" cy="-26" rx="44" ry="30" fill="#2f2f33"/><ellipse cx="-10" cy="-38" rx="20" ry="10" fill="#4a4a50"/><circle cx="14" cy="-30" r="2" fill="#e5e7eb"/><circle cx="-6" cy="-18" r="1.6" fill="#e5e7eb"/>`,
    crumbly: `<path d="M-40 0 Q-44 -30 -18 -40 Q0 -54 20 -38 Q44 -30 40 0 Z" fill="#a8723f"/>${[[-20, -6], [10, -4], [26, -10], [-30, -16]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="6" fill="#c08a52"/>`).join('')}`,
    nodules: `<ellipse cx="0" cy="-18" rx="30" ry="20" fill="#6b3a2c"/>${[[-14, -26], [0, -32], [14, -24], [-6, -14], [10, -12], [20, -16], [-20, -14]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="5" fill="#8f5240"/>`).join('')}`,
    patches: `<path d="M-70 0 L-56 -60 L-10 -84 L40 -70 L70 -30 L74 0 Z" fill="#6f6658"/><ellipse cx="-14" cy="-44" rx="16" ry="8" fill="#cbb994"/><ellipse cx="26" cy="-30" rx="12" ry="6" fill="#cbb994"/>`,
    white: `<ellipse cx="0" cy="-2" rx="64" ry="12" fill="#5a3a26"/><ellipse cx="0" cy="-4" rx="54" ry="8" fill="#f5f5f0"/><path d="M-80 -2 h160" stroke="#8a5234" stroke-width="4"/>`,
  };
  return `<g class="spr__rock" data-rock="${i}" tabindex="0" role="button" aria-label="Investigar ${r.name}" transform="translate(${r.x} ${y})">
    <ellipse class="spr__ring" cx="0" cy="-20" rx="${r.kind === 'patches' ? 92 : 66}" ry="${r.kind === 'patches' ? 70 : 52}" fill="rgba(147,197,253,.18)" stroke="#93c5fd" stroke-width="3" stroke-dasharray="8 6"/>
    ${shapes[r.kind]}
    <text class="spr__tag" x="0" y="${r.kind === 'patches' ? -98 : -78}" text-anchor="middle" data-tag>${r.name}</text>
  </g>`;
}

function scene(): string {
  const rand = rng(31);
  const pebbles = Array.from({ length: 120 }, () => `<ellipse cx="${rand() * SCENE_W}" cy="${GROUND_Y + 14 + rand() * 60}" rx="${2 + rand() * 6}" ry="${1 + rand() * 3}" fill="#8f5534" opacity=".8"/>`).join('');
  return `<svg width="${SCENE_W}" height="${VIEW_H}" viewBox="0 0 ${SCENE_W} ${VIEW_H}">
    <path d="M0 190 Q200 150 420 176 T860 168 T1300 150 T1760 172 T${SCENE_W} 160 V${GROUND_Y} H0Z" fill="#c7895c"/>
    <path d="M0 214 Q300 196 640 210 T1300 204 T${SCENE_W} 210 V${GROUND_Y} H0Z" fill="#bd7a4c"/>
    <text x="1520" y="150" class="spr__tag" style="font-size:13px" text-anchor="middle">Colinas Columbia</text>
    <rect y="${GROUND_Y}" width="${SCENE_W}" height="${VIEW_H - GROUND_Y}" fill="#c98552"/>
    ${pebbles}
    ${ROCKS.map(rockSvg).join('')}
  </svg>`;
}

function drawLens(c: HTMLCanvasElement, r: Rock, drill: number) {
  const g = c.getContext('2d')!;
  const S = c.width;
  const rand = rng(r.name.length * 13);
  const base: Record<Kind, string> = { vesicles: '#4a4a50', dark: '#36363b', crumbly: '#b07a45', nodules: '#6e3d2e', patches: '#776e5f', white: '#e9e8e1' };
  g.fillStyle = base[r.kind];
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.12})`;
    g.fillRect(rand() * S, rand() * S, 3, 3);
  }
  if (r.kind === 'vesicles')
    for (let i = 0; i < 22; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rr = 6 + rand() * 14;
      g.fillStyle = '#18181b';
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.arc(x, y, rr, Math.PI * 1.1, Math.PI * 1.7);
      g.stroke();
    }
  if (r.kind === 'dark')
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rand() < 0.5 ? '#6b8f5a' : '#d4d4d8';
      g.save();
      g.translate(rand() * S, rand() * S);
      g.rotate(rand() * 3);
      g.fillRect(-5, -2, 10, 4);
      g.restore();
    }
  if (r.kind === 'crumbly')
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rand() < 0.5 ? '#d6a46a' : '#8a5a2b';
      g.beginPath();
      g.arc(rand() * S, rand() * S, 3 + rand() * 9, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'nodules')
    for (let i = 0; i < 18; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rr = 10 + rand() * 12;
      const gr = g.createRadialGradient(x - rr / 3, y - rr / 3, 1, x, y, rr);
      gr.addColorStop(0, '#c07a5e');
      gr.addColorStop(1, '#5a2a1c');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'patches')
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(230,214,176,.85)';
      g.beginPath();
      g.ellipse(rand() * S, rand() * S, 14 + rand() * 26, 8 + rand() * 12, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'white')
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`;
      g.beginPath();
      g.arc(rand() * S, rand() * S, 1 + rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
  if (drill > 0) {
    const rr = (S * 0.34) * drill;
    g.fillStyle = r.inside;
    g.beginPath();
    g.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 3;
    for (let k = 0.3; k < 1; k += 0.25) {
      g.beginPath();
      g.arc(S / 2, S / 2, rr * k, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

export default function spRocks({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  let raf = 0;

  const start = () => {
    root.innerHTML = `
      <div class="lk"${theme('#3b82f6', '#93c5fd')}><div class="lk__wrap">
        <div class="lk-top"><p class="lk-task"><i>2</i>${tr('Investigate the 6 rocks and find out which ones formed with water.', 'Investiga las 6 rocas y descubre cuáles se formaron con agua.')}</p></div>
        <div class="spr__view" data-view>
          <div class="spr__world" data-world>${scene()}<div class="spr__rover" data-rover>${MER_SVG}</div></div>
          <span class="spr__hint" data-hint>${tr('Tap a rock to go investigate it', 'Toca una roca para ir a investigarla')}</span>
          <button type="button" class="spr__nav spr__nav--l" data-pan="-1" aria-label="${tr('Look left', 'Mirar a la izquierda')}">◀</button>
          <button type="button" class="spr__nav spr__nav--r" data-pan="1" aria-label="${tr('Look right', 'Mirar a la derecha')}">▶</button>
        </div>
        <div class="spr__lab" data-lab hidden>
          <div class="spr__lens"><canvas width="240" height="240" data-lens></canvas><span data-lenslabel>${tr('MICROSCOPE', 'MICROSCOPIO')}</span></div>
          <div>
            <h3 data-name></h3>
            <div class="spr__tools">
              <button type="button" class="lk-btn" data-tool="lens">🔍 ${tr('Microscope', 'Microscopio')}</button>
              <button type="button" class="lk-btn" data-tool="drill">⚙️ ${tr('Drill + spectrometer', 'Taladro + espectrómetro')}</button>
            </div>
            <p class="spr__clue" data-clue1 hidden></p>
            <p class="spr__clue" data-clue2 hidden></p>
            <div class="spr__class">
              <button type="button" class="lk-btn" data-class="water" disabled>💧 ${tr('Formed with water', 'Se formó con agua')}</button>
              <button type="button" class="lk-btn" data-class="lava" disabled>🌋 ${tr('Formed with lava', 'Se formó con lava')}</button>
            </div>
          </div>
        </div>
        <p class="lk-say" data-say></p>
        <div class="spr__book"><h4>${tr('DETECTIVE NOTEBOOK', 'CUADERNO DEL DETECTIVE')}</h4><div class="spr__slots">${ROCKS.map((r, i) => `<div class="spr__slot" data-slot="${i}"><b>?</b>${r.name}</div>`).join('')}</div></div>
      </div></div>`;

    const view = root.querySelector<HTMLElement>('[data-view]')!;
    const world = root.querySelector<HTMLElement>('[data-world]')!;
    const roverEl = root.querySelector<HTMLElement>('[data-rover]')!;
    const lab = root.querySelector<HTMLElement>('[data-lab]')!;
    const lens = root.querySelector<HTMLCanvasElement>('[data-lens]')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
    const clue1 = root.querySelector<HTMLElement>('[data-clue1]')!;
    const clue2 = root.querySelector<HTMLElement>('[data-clue2]')!;
    const classBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-class]'));
    const wheels = Array.from(roverEl.querySelectorAll('circle[r="12"]'));

    let roverX = 120;
    let camX = 0;
    let target: number | null = null;
    let current = -1;
    let driving = false;
    let tries = 0;
    const solved = new Map<number, boolean>();
    say(sayEl, tr('You are Spirit\'s detective. Pick a rock, travel to it and look for clues with your tools.', 'Eres el detective de Spirit. Elige una roca, viaja hasta ella y busca pistas con tus herramientas.'));

    const placeRover = () => {
      roverEl.style.left = `${roverX - 65}px`;
      const vw = view.clientWidth;
      camX = Math.max(0, Math.min(SCENE_W - vw, camX));
      world.style.transform = `translateX(${-camX}px)`;
    };
    const follow = () => {
      camX = roverX - view.clientWidth / 2;
      placeRover();
    };
    follow();

    let last = performance.now();
    let wheelRot = 0;
    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (target !== null) {
        const dx = target - roverX;
        const step = Math.sign(dx) * Math.min(Math.abs(dx), 300 * dt);
        roverX += step;
        wheelRot += step * 3;
        wheels.forEach((w) => w.setAttribute('stroke-dasharray', `6 ${4 + (Math.abs(wheelRot) % 6)}`));
        roverEl.style.transform = dx < 0 ? 'scaleX(-1)' : 'none';
        follow();
        if (Math.abs(dx) < 1) {
          target = null;
          driving = false;
          arrive();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    root.querySelectorAll<HTMLButtonElement>('[data-pan]').forEach((b) =>
      b.addEventListener('click', () => {
        camX += Number(b.dataset.pan) * view.clientWidth * 0.6;
        world.style.transition = 'transform .5s ease';
        placeRover();
        window.setTimeout(() => (world.style.transition = ''), 520);
      }),
    );

    const goTo = (i: number) => {
      if (driving || solved.has(i)) return;
      sfx.click();
      current = i;
      driving = true;
      lab.hidden = true;
      target = ROCKS[i].x - 110;
      say(sayEl, `Rumbo a ${ROCKS[i].name}…`);
    };
    root.querySelectorAll<SVGGElement>('[data-rock]').forEach((el) => {
      const i = Number(el.dataset.rock);
      el.addEventListener('click', () => goTo(i));
      el.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') goTo(i);
      });
    });

    let used = { lens: false, drill: false };
    const arrive = () => {
      const r = ROCKS[current];
      sfx.ok();
      used = { lens: false, drill: false };
      tries = 0;
      lab.hidden = false;
      root.querySelector('[data-name]')!.textContent = r.name;
      root.querySelector('[data-lenslabel]')!.textContent = tr('CAMERA', 'CÁMARA');
      clue1.hidden = clue2.hidden = true;
      classBtns.forEach((b) => {
        b.disabled = true;
        b.classList.remove('lk-btn--on');
      });
      const g = lens.getContext('2d')!;
      g.fillStyle = '#111';
      g.fillRect(0, 0, 240, 240);
      g.fillStyle = '#93c5fd';
      g.font = '700 16px system-ui';
      g.textAlign = 'center';
      g.fillText(tr('Use a tool', 'Usa una herramienta'), 120, 124);
      say(sayEl, tr(`You reached ${r.name}. Use the microscope or the drill to look for clues.`, `Llegaste a ${r.name}. Usa el microscopio o el taladro para buscar pistas.`));
      lab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) =>
      b.addEventListener('click', () => {
        if (current < 0) return;
        const r = ROCKS[current];
        const tool = b.dataset.tool as 'lens' | 'drill';
        sfx.beep();
        if (tool === 'lens') {
          used.lens = true;
          drawLens(lens, r, used.drill ? 1 : 0);
          root.querySelector('[data-lenslabel]')!.textContent = tr('MICROSCOPE', 'MICROSCOPIO');
          clue1.hidden = false;
          clue1.innerHTML = `🔍 ${r.look}`;
        } else {
          used.drill = true;
          root.querySelector('[data-lenslabel]')!.textContent = tr('DRILL', 'TALADRO');
          let k = 0;
          const grind = () => {
            if (!alive) return;
            k = Math.min(1, k + 0.04);
            drawLens(lens, r, k);
            if (k < 1) {
              if (Math.random() < 0.4) sfx.click();
              requestAnimationFrame(grind);
            } else {
              clue2.hidden = false;
              clue2.innerHTML = `⚙️ ${tr('Inside ground smooth. The spectrometer detects', 'Interior pulido. El espectrómetro detecta')}: <b>${r.mineral}</b>.`;
            }
          };
          grind();
        }
        classBtns.forEach((x) => (x.disabled = false));
      }),
    );

    classBtns.forEach((b) =>
      b.addEventListener('click', () => {
        const r = ROCKS[current];
        const saidWater = b.dataset.class === 'water';
        if (saidWater !== r.water) {
          tries++;
          sfx.soft();
          b.disabled = true;
          say(sayEl, tr(`Almost! Look at the clues again${used.lens && used.drill ? '' : ' (try the other tool)'}.`, `¡Casi! Mira otra vez las pistas${used.lens && used.drill ? '' : ' (prueba la otra herramienta)'}.`), 'warn');
          return;
        }
        sfx.ok();
        const first = tries === 0;
        solved.set(current, first);
        const slot = root.querySelector<HTMLElement>(`[data-slot="${current}"]`)!;
        slot.className = `spr__slot filled ${r.water ? 'water' : 'lava'}`;
        slot.innerHTML = `<b>${r.water ? '💧' : '🌋'}</b>${r.name}${first ? '<br><i>★</i>' : ''}`;
        const el = root.querySelector<SVGGElement>(`[data-rock="${current}"]`)!;
        el.classList.add('done');
        el.querySelector('[data-tag]')!.textContent = `${r.water ? '💧' : '🌋'} ${r.name}`;
        say(sayEl, `${tr('Well done, detective!', '¡Bien, detective!')} ${r.why}`, 'ok');
        classBtns.forEach((x) => (x.disabled = true));
        if (solved.size === ROCKS.length) window.setTimeout(() => alive && finish(), 1800);
        else window.setTimeout(() => alive && (lab.hidden = true), 2600);
      }),
    );

    const finish = () => {
      sfx.win();
      lab.hidden = true;
      const stars = [...solved.values()].filter(Boolean).length;
      const box = document.createElement('div');
      box.className = 'lk-learn';
      box.innerHTML = `
        <h4>${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</h4>
        <p style="margin:0 0 8px;font-size:22px;color:#fde047">${'★'.repeat(stars)}<span style="opacity:.3">${'★'.repeat(ROCKS.length - stars)}</span> ${stars}/6 ${tr('on the first try', 'al primer intento')}</p>
        <p style="margin:0 0 12px">${tr(
          'Rocks are like a diary of the past. On the Gusev plain, Spirit found <b>lava</b> rocks; in the Columbia Hills it found <b>goethite, hematite, carbonates and silica</b>: clues that long ago there was <b>water</b> on Mars, even hot water!',
          'Las rocas son como un diario del pasado. En la llanura de Gusev, Spirit encontró rocas de <b>lava</b>; en las colinas Columbia encontró <b>goetita, hematita, carbonatos y sílice</b>: pistas de que hace mucho tiempo hubo <b>agua</b> en Marte, ¡incluso agua caliente!',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`;
      root.querySelector('.spr__book')!.before(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.querySelector('[data-end]')!.addEventListener('click', win);
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 2', 'SPIRIT · MISIÓN 2'),
    title: tr('Rock detective', 'Detective de rocas'),
    text: tr('Spirit had a microscope, a drill to grind rocks and instruments that read what they are made of.', 'Spirit tenía un microscopio, un taladro para pulir rocas y aparatos que leen de qué están hechas.'),
    goal: tr('Travel to 6 rocks, investigate them and decide: did they form with water or with lava?', 'Viaja a 6 rocas, investígalas y decide: ¿se formaron con agua o con lava?'),
    art: MER_SVG,
    accent: '#3b82f6',
    soft: '#93c5fd',
    guess: {
      q: tr('How can we know if there was water on Mars millions of years ago?', '¿Cómo se puede saber si hubo agua en Marte hace millones de años?'),
      options: [tr('By studying its rocks and soil', 'Estudiando sus rocas y su suelo'), tr('By listening to the wind', 'Escuchando el viento')],
      correct: 0,
      why: tr('Some minerals only form with water. If you find them in a rock, it is a clue that there was water!', 'Algunos minerales solo se forman con agua. Si los encuentras en una roca, ¡es una pista de que hubo agua!'),
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    stopSpeak();
  };
}
