/**
 * MAPA: fondo SVG (mapBackgroundSVG) → animación de la ruta punteada (revelada con una
 * máscara cuyo trazo sólido anima stroke-dashoffset) + ícono del robot recorriéndola →
 * 4 niveles numerados. Click en nivel → minijuego (src/games) si el nivel tiene uno; si no,
 * quiz (tarjeta + pregunta). Al ganar se marca el nivel.
 * Los niveles se desbloquean en orden: el nivel N solo se abre al completar el N-1.
 */
import gsap from 'gsap';
import type { ScreenFactory } from '../router';
import { dur } from '../router';
import { ROBOTS } from '../data/robots';
import { getState, markLevel, robotComplete } from '../store';
import { mapBackgroundSVG } from '../ui/mapArt';
import { esc, openModal, toast } from '../ui/modal';
import { QUIZZES } from '../data/quizzes';
import { buildQuiz } from '../ui/quiz';
import { getGame, openGame } from '../games';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Estilos de niveles bloqueados / siguiente nivel (se insertan una sola vez). */
const LOCK_CSS = `
.level-node--locked { cursor: not-allowed !important; animation: none !important; }
.level-node--locked .level-node__circle { fill: #15131f; stroke: #4b4760; stroke-dasharray: 5 4; }
.level-node--locked .level-node__num { display: none; }
.level-node--locked .level-node__label { opacity: .45; }
.level-node--locked:hover .level-node__circle, .level-node--locked:focus-visible .level-node__circle { fill: #1d1a2b; stroke: #6b6585; }
.level-node__lock { display: none; pointer-events: none; }
.level-node--locked .level-node__lock { display: inline; }
.level-node__ring { fill: none; stroke: #67e8f9; stroke-width: 3; opacity: 0; pointer-events: none; transform-box: fill-box; transform-origin: center; }
.level-node--next .level-node__ring { animation: level-next 1.6s ease-out infinite; }
.level-node--next .level-node__circle { stroke: #67e8f9; }
@keyframes level-next { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.9); } }
@media (prefers-reduced-motion: reduce) { .level-node--next .level-node__ring { animation: none; opacity: .6; } }
`;
function injectLockStyles(): void {
  if (document.getElementById('map-lock-styles')) return;
  const st = document.createElement('style');
  st.id = 'map-lock-styles';
  st.textContent = LOCK_CSS;
  document.head.appendChild(st);
}

/** Un nivel está desbloqueado si es el primero o si el anterior ya se completó. */
const isUnlocked = (flags: readonly boolean[], i: number) => i === 0 || flags[i - 1];

/** Catmull-Rom → Bézier cúbica: ruta suave que pasa por todos los puntos. */
export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const mapScreen: ScreenFactory = ({ root, go, params }) => {
  injectLockStyles();
  const id = params.robot ?? 'lrv';
  const data = ROBOTS[id];
  const maskId = `route-mask-${id}`;
  const d = smoothPath(data.route);
  const routeClass = data.body === 'moon' ? 'map__route--moon' : 'map__route--mars';

  root.innerHTML = `
    <div class="map-screen">
      <div class="map map--cover" style="position:absolute;inset:0;width:100%;height:100%;max-width:none;aspect-ratio:auto;border:0;border-radius:0;z-index:0">
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img"
        aria-label="Mapa de la ruta de ${esc(data.name)}">
        <g class="map__bg">${mapBackgroundSVG(data.body, id)}</g>
        <defs>
          <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="600">
            <path data-reveal d="${d}" fill="none" stroke="#fff" stroke-width="16"
              stroke-linecap="round" stroke-linejoin="round" />
          </mask>
        </defs>
        <path class="map__route ${routeClass}" d="${d}" fill="none" mask="url(#${maskId})" />
        <g class="map__robot" style="opacity:0">
          <circle r="13" fill="${data.accent}" fill-opacity="0.25" />
          <circle r="7" fill="${data.accent}" stroke="#0b0820" stroke-width="2" />
        </g>
        <g class="map__levels"></g>
      </svg>
      </div>
      <button class="btn btn--back" type="button" data-back aria-label="Volver a los robots">Volver a los robots</button>
      <h2 class="map__title" style="position:relative;z-index:2;margin-bottom:auto">${esc(data.name)}<small>${esc(data.mission)}</small></h2>
      <p class="hud-hint" data-hint style="z-index:2">Trazando la ruta de la misión…</p>
    </div>`;

  const svg = root.querySelector<SVGSVGElement>('.map svg')!;
  const reveal = root.querySelector<SVGPathElement>('[data-reveal]')!;
  const robotIcon = root.querySelector<SVGGElement>('.map__robot')!;
  const levelsG = root.querySelector<SVGGElement>('.map__levels')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  root.querySelector('[data-back]')!.addEventListener('click', () => go('podiums'));

  // cubrir en horizontal; en móvil vertical usar "meet" para no perder nodos
  const fitMap = () => {
    svg.setAttribute('preserveAspectRatio', window.innerHeight > window.innerWidth ? 'xMidYMid meet' : 'xMidYMid slice');
  };
  fitMap();
  window.addEventListener('resize', fitMap);

  const len = reveal.getTotalLength();
  reveal.style.strokeDasharray = `${len}`;
  reveal.style.strokeDashoffset = `${len}`;

  const tl = gsap.timeline();
  const prog = { v: 0 };
  // 1) mapa
  tl.from(svg.querySelector('.map__bg'), { opacity: 0, duration: dur(0.8), ease: 'power1.out' })
    .from(root.querySelector('.map__title'), { opacity: 0, y: -12, duration: dur(0.5) }, '-=0.3')
    // 2) ruta
    .set(robotIcon, { opacity: 1 })
    .to(prog, {
      v: 1,
      duration: dur(Math.min(5, 1.6 + len / 900)),
      ease: 'power1.inOut',
      onUpdate: () => {
        reveal.style.strokeDashoffset = `${len * (1 - prog.v)}`;
        const p = reveal.getPointAtLength(len * prog.v);
        robotIcon.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
      },
    })
    // 3) niveles
    .add(() => buildLevels());

  const nodes: SVGGElement[] = [];
  const labels: string[] = data.levels.map((lv, i) => getGame(id, i)?.title ?? lv.title);

  /** Aplica a cada nodo su estado: realizado, siguiente (para jugar) o bloqueado. */
  const refreshStates = () => {
    const flags = getState().levels[id];
    const next = flags.findIndex((f, i) => !f && isUnlocked(flags, i));
    nodes.forEach((g, i) => {
      const locked = !isUnlocked(flags, i);
      g.classList.toggle('level-node--done', flags[i]);
      g.classList.toggle('level-node--locked', locked);
      g.classList.toggle('level-node--next', i === next);
      g.style.cursor = locked ? 'not-allowed' : 'pointer';
      g.setAttribute('aria-disabled', String(locked));
      g.setAttribute(
        'aria-label',
        `Nivel ${i + 1}: ${labels[i]}${flags[i] ? ' (realizado)' : locked ? ' (bloqueado)' : ''}`,
      );
    });
    if (next >= 0) hint.textContent = next === 0 ? 'Empieza por el nivel 1' : `¡Sigue con el nivel ${next + 1}!`;
    else hint.textContent = '¡Completaste todos los niveles de este robot!';
  };

  const buildLevels = () => {
    data.levels.forEach((lv, i) => {
      const [x, y] = data.route[Math.min(lv.routeIndex, data.route.length - 1)];
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'level-node');
      g.setAttribute('transform', `translate(${x},${y})`);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.innerHTML = `
        <g class="level-node__inner">
          <circle class="level-node__ring" r="22" />
          <circle class="level-node__circle" r="22" />
          <text class="level-node__num">${i + 1}</text>
          <text class="level-node__check">✓</text>
          <g class="level-node__lock" transform="translate(-9,-11)">
            <path d="M4 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="#a49cc9" stroke-width="2.4" stroke-linecap="round"/>
            <rect x="1" y="9" width="16" height="12" rx="3" fill="#a49cc9"/>
            <circle cx="9" cy="15" r="2" fill="#15131f"/>
          </g>
          <text class="level-node__label" y="42"
            style="font-size:13px;font-weight:700;letter-spacing:.06em;paint-order:stroke;stroke:rgba(5,4,13,.85);stroke-width:4px">${esc(labels[i])}</text>
        </g>`;
      const open = () => onLevel(i, g);
      g.addEventListener('click', open);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
      levelsG.appendChild(g);
      nodes.push(g);
    });
    refreshStates();
    const pop = gsap.from(
      nodes.map((n) => n.querySelector('.level-node__inner')),
      { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: dur(0.5), stagger: dur(0.15), ease: 'back.out(2)' },
    );
    window.setTimeout(() => pop.progress(1), 2500);
  };

  const completeLevel = (i: number) => {
    if (getState().levels[id][i]) {
      toast(`Nivel ${i + 1} completado otra vez`);
      return;
    }
    markLevel(id, i);
    refreshStates();
    if (robotComplete(id)) {
      toast(`¡${data.name}: 4/4 niveles completados!`);
      return;
    }
    toast(`Nivel ${i + 1} superado · +50 pts`);
    const nextNode = nodes[i + 1];
    if (nextNode) {
      // animación de desbloqueo del siguiente nivel
      window.setTimeout(() => {
        toast(`¡Nivel ${i + 2} desbloqueado!`);
        gsap.fromTo(
          nextNode.querySelector('.level-node__inner'),
          { scale: 1.6, transformOrigin: '50% 50%' },
          { scale: 1, duration: dur(0.7), ease: 'elastic.out(1, 0.45)' },
        );
      }, 900);
    }
  };

  /** Feedback al tocar un nivel bloqueado. */
  const denyLocked = (i: number, node: SVGGElement) => {
    const flags = getState().levels[id];
    const need = flags.findIndex((f, n) => !f && isUnlocked(flags, n));
    toast(`Nivel bloqueado: completa primero el nivel ${need + 1}`);
    gsap.fromTo(
      node.querySelector('.level-node__inner'),
      { x: -6 },
      { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)' },
    );
    const target = nodes[need];
    if (target) {
      gsap.fromTo(
        target.querySelector('.level-node__inner'),
        { scale: 1.35, transformOrigin: '50% 50%' },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', delay: 0.15 },
      );
    }
    void i;
  };

  const onLevel = (i: number, node: SVGGElement) => {
    const lv = data.levels[i];
    const game = getGame(id, i);

    // nivel bloqueado: hay que terminar el anterior
    if (!isUnlocked(getState().levels[id], i)) {
      denyLocked(i, node);
      return;
    }

    // nivel con minijuego: siempre se puede jugar (también para repetirlo)
    if (game) {
      openGame(game, i + 1, () => completeLevel(i));
      return;
    }

    // nivel de quiz ya superado: mostrar su tarjeta en un modal centrado
    if (getState().levels[id][i]) {
      openModal({
        title: lv.card.title,
        body: lv.card.text,
        actions: [{ label: 'Cerrar', variant: 'ghost' }],
      });
      return;
    }
    let closeQuiz = () => {};
    const body = buildQuiz(lv, QUIZZES[id][i], () => {
      closeQuiz();
      completeLevel(i);
    });
    closeQuiz = openModal({
      title: `Nivel ${i + 1} · ${lv.title}`,
      body,
      actions: [{ label: 'Cerrar', variant: 'ghost' }],
    });
  };

  return {
    unmount() {
      tl.kill();
      gsap.killTweensOf(nodes);
      window.removeEventListener('resize', fitMap);
    },
  };
};

export default mapScreen;