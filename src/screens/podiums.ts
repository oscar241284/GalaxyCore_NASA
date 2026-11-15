import type { ScreenFactory } from '../router';
import { ROBOTS, ROBOT_ORDER } from '../data/robots';
import { allLevelsDone, getState, robotComplete } from '../store';
import { onResizeStage } from '../three/stage';
import { getWorld } from './world';
import type { World } from './world';
import { esc } from '../ui/modal';
import { tr } from '../i18n';

export function buildPodiumLayer(root: HTMLElement): { layer: HTMLElement; cols: HTMLElement[] } {
  const layer = document.createElement('div');
  layer.className = 'podiums';
  Object.assign(layer.style, { position: 'absolute', inset: '0' });
  const cols = ROBOT_ORDER.map((id, i) => {
    const d = ROBOTS[id];
    const col = document.createElement('div');
    col.className = 'podium';
    col.dataset.robot = id;
    col.tabIndex = 0;
    col.setAttribute('role', 'button');
    col.setAttribute('aria-label', tr(`Discover ${d.name}`, `Descubrir ${d.name}`));
    Object.assign(col.style, {
      position: 'absolute',
      top: '0',
      left: `${(i * 100) / ROBOT_ORDER.length}%`,
      width: `${100 / ROBOT_ORDER.length}%`,
      height: '100%',
      cursor: 'pointer',
    });
    col.innerHTML = `
      <div class="podium__label" style="position:absolute;left:0;right:0;text-align:center">
        <div class="podium__name">${esc(d.name)}</div>
        <div class="podium__discover">${tr('DISCOVER', 'DESCUBRIR')}</div>
      </div>`;
    layer.appendChild(col);
    return col;
  });
  root.appendChild(layer);
  return { layer, cols };
}

export function positionLabels(world: World, cols: HTMLElement[]): void {
  cols.forEach((col, i) => {
    const p = world.toScreen(world.podiumBase(i));
    const label = col.querySelector<HTMLElement>('.podium__label');
    if (label) label.style.top = `${Math.round(p.y + 14)}px`;
  });
}

const podiums: ScreenFactory = ({ root, go }) => {
  const world = getWorld();
  world.resetAll();
  world.mode = 'podiums';
  world.activate();

  const { cols } = buildPodiumLayer(root);
  const hint = document.createElement('p');
  hint.className = 'hud-hint';
  hint.textContent = tr('Hover over a podium and click to discover its robot', 'Pasa el cursor sobre un podio y haz click para descubrir su robot');
  root.appendChild(hint);

  const s = getState();
  cols.forEach((col, i) => {
    const sl = world.slots[i];
    sl.done = robotComplete(sl.id);
    col.classList.toggle('podium--done', sl.done);
    if (sl.done) col.querySelector('.podium__discover')!.textContent = tr('COMPLETED · SEE AGAIN', 'COMPLETADO · VOLVER A VER');
  });

  if (s.finalDone) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost';
    btn.type = 'button';
    btn.textContent = tr('View certificate', 'Ver certificado');
    Object.assign(btn.style, { position: 'absolute', right: '24px', bottom: '24px', zIndex: '2' });
    btn.addEventListener('click', () => go('certificate'));
    root.appendChild(btn);
  }

  let launched = false;
  const setHover = (i: number, on: boolean) => {
    world.slots[i].hoverTarget = on ? 1 : 0;
    cols[i].classList.toggle('podium--hover', on);
  };
  const launch = (i: number) => {
    if (launched) return;
    launched = true;
    setHover(i, true);
    go('launch', { robot: world.slots[i].id });
  };

  const offs: (() => void)[] = [];
  cols.forEach((col, i) => {
    const enter = () => setHover(i, true);
    const leave = () => setHover(i, false);
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && world.slots[i].hoverTarget < 1) {
        cols.forEach((_, j) => setHover(j, j === i));
        e.preventDefault();
        (col as HTMLElement & { _touchArmed?: boolean })._touchArmed = true;
      }
    };
    const click = () => {
      const c = col as HTMLElement & { _touchArmed?: boolean };
      if (c._touchArmed) {
        c._touchArmed = false;
        return;
      }
      launch(i);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launch(i);
      }
    };
    col.addEventListener('pointerenter', enter);
    col.addEventListener('pointerleave', leave);
    col.addEventListener('focus', enter);
    col.addEventListener('blur', leave);
    col.addEventListener('pointerdown', down);
    col.addEventListener('click', click);
    col.addEventListener('keydown', key);
    offs.push(() => {
      col.removeEventListener('pointerenter', enter);
      col.removeEventListener('pointerleave', leave);
      col.removeEventListener('focus', enter);
      col.removeEventListener('blur', leave);
      col.removeEventListener('pointerdown', down);
      col.removeEventListener('click', click);
      col.removeEventListener('keydown', key);
    });
  });

  positionLabels(world, cols);
  offs.push(onResizeStage(() => positionLabels(world, cols)));

  if (allLevelsDone() && !s.finalDone) {
    launched = true;
    window.setTimeout(() => go('final'), 50);
  }

  return {
    unmount() {
      offs.forEach((o) => o());
    },
  };
};

export default podiums;
