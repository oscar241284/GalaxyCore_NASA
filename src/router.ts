import type { RobotId } from './types';

export type ScreenId =
  | 'home'
  | 'name'
  | 'podiums'
  | 'launch'
  | 'puzzle'
  | 'map'
  | 'final'
  | 'certificate'
  | 'explore';

export const SCREEN_IDS: ScreenId[] = [
  'home',
  'name',
  'podiums',
  'launch',
  'puzzle',
  'map',
  'final',
  'certificate',
  'explore',
];

export type FromState = ScreenId | '*' | 'boot';

export interface Transition {
  from: FromState;
  to: ScreenId;
  trigger: string;
}

export const TRANSITIONS: Transition[] = [
  { from: 'boot', to: 'home', trigger: 'Normal page load' },
  { from: 'boot', to: 'puzzle', trigger: 'URL ?debug=robot=<id> (jumps straight to the puzzle)' },
  { from: 'boot', to: 'podiums', trigger: 'Reload after switching language' },
  { from: 'boot', to: 'map', trigger: 'Reload after switching language' },
  { from: 'boot', to: 'explore', trigger: 'Reload after switching language' },
  { from: 'home', to: 'name', trigger: 'PLAY with no saved name, or "Write my name"' },
  { from: 'home', to: 'podiums', trigger: 'PLAY with a saved name' },
  { from: 'name', to: 'podiums', trigger: 'START (or Enter) with a non-empty name' },
  { from: 'podiums', to: 'launch', trigger: 'Click on a podium (DISCOVER)' },
  { from: 'podiums', to: 'final', trigger: 'Automatic on entry: 12/12 levels and bonus level pending' },
  { from: 'podiums', to: 'certificate', trigger: '"View certificate" button (bonus level done)' },
  { from: 'launch', to: 'puzzle', trigger: 'End of the liftoff animation' },
  { from: 'puzzle', to: 'map', trigger: 'Robot assembled (or "Skip") + landing finished' },
  { from: 'map', to: 'podiums', trigger: '"← Back to the robots" button' },
  { from: 'final', to: 'certificate', trigger: '"View certificate" button after checking the rocks' },
  { from: 'certificate', to: 'podiums', trigger: '"Back to the robots" button' },
  { from: 'certificate', to: 'home', trigger: '"Start over" button (erases progress)' },
  { from: '*', to: 'home', trigger: 'Menu → Restart (with confirmation)' },
  { from: 'home', to: 'explore', trigger: '«Explorers» button (Ghosts of Space)' },
  { from: 'explore', to: 'home', trigger: '«← Home» button' },
  { from: 'explore', to: 'podiums', trigger: '«Play its missions» on an explorer with levels' },
];

export interface ScreenParams {
  robot?: RobotId;
  world?: 'moon' | 'mars';
  direct?: boolean;
}

export interface ScreenContext {
  root: HTMLElement;
  params: ScreenParams;
  go: (to: ScreenId, params?: ScreenParams) => void;
}

export interface ScreenInstance {
  unmount(): void;
}

export type ScreenFactory = (ctx: ScreenContext) => ScreenInstance | Promise<ScreenInstance>;

interface ScreenDef {
  uses3D: boolean;
  load: () => Promise<{ default: ScreenFactory }>;
}

const SCREENS: Record<ScreenId, ScreenDef> = {
  home: { uses3D: false, load: () => import('./screens/home') },
  name: { uses3D: false, load: () => import('./screens/name') },
  podiums: { uses3D: true, load: () => import('./screens/podiums') },
  launch: { uses3D: true, load: () => import('./screens/launch') },
  puzzle: { uses3D: true, load: () => import('./screens/puzzle') },
  map: { uses3D: false, load: () => import('./screens/map') },
  final: { uses3D: true, load: () => import('./screens/final') },
  certificate: { uses3D: false, load: () => import('./screens/certificate') },
  explore: { uses3D: false, load: () => import('./screens/explore') },
};

export const reducedMotion: boolean =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const MOTION = reducedMotion ? 0.25 : 1;
export const dur = (s: number) => s * MOTION;

const FADE_MS = reducedMotion ? 120 : 450;

type StageModule = typeof import('./three/stage');
let stageMod: StageModule | null = null;

let container: HTMLElement | null = null;
let current: { id: ScreenId; el: HTMLElement; inst: ScreenInstance; params: ScreenParams } | null = null;
let busy = false;
let pending: { to: ScreenId; params: ScreenParams } | null = null;
const changeListeners = new Set<(id: ScreenId) => void>();

export function currentScreen(): ScreenId | null {
  return current?.id ?? null;
}

export function currentParams(): ScreenParams {
  return current?.params ?? {};
}

export function onScreenChange(fn: (id: ScreenId) => void): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function isAllowed(from: FromState, to: ScreenId): boolean {
  return TRANSITIONS.some((t) => (t.from === from || t.from === '*') && t.to === to);
}

export function initRouter(el: HTMLElement): void {
  container = el;
}

export function go(to: ScreenId, params: ScreenParams = {}): void {
  if (busy) {
    pending = { to, params };
    return;
  }
  void run(to, params);
}

async function run(to: ScreenId, params: ScreenParams): Promise<void> {
  if (!container) throw new Error('Router not initialized');
  busy = true;
  const from: FromState = current?.id ?? 'boot';
  if (!isAllowed(from, to)) console.warn(`[router] undeclared transition: ${from} → ${to}`);
  const def = SCREENS[to];
  try {
    const [mod] = await Promise.all([
      def.load(),
      def.uses3D && !stageMod
        ? import('./three/stage').then((m) => {
            stageMod = m;
          })
        : Promise.resolve(),
    ]);

    const prev = current;
    if (prev) {
      try {
        prev.inst.unmount();
      } catch (e) {
        console.error(e);
      }
      prev.el.classList.add('screen--leave');
      prev.el.setAttribute('aria-hidden', 'true');
      prev.el.style.pointerEvents = 'none';
      window.setTimeout(() => prev.el.remove(), FADE_MS);
    }
    if (to === 'home') stageMod?.disposeContent();

    if (stageMod) {
      if (def.uses3D) stageMod.showStage();
      else stageMod.hideStage();
    }

    const el = document.createElement('section');
    el.className = `screen screen--${to} screen--enter`;
    el.dataset.screen = to;
    if (def.uses3D) el.style.background = 'transparent';
    container.appendChild(el);
    const inst = await mod.default({ root: el, params, go });
    current = { id: to, el, inst, params };
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('screen--enter')));
    changeListeners.forEach((l) => l(to));
  } catch (err) {
    console.error('[router] error while switching screens', err);
  } finally {
    busy = false;
    if (pending) {
      const p = pending;
      pending = null;
      void run(p.to, p.params);
    }
  }
}
