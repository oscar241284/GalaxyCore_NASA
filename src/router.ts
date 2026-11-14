/**
 * Router = máquina de estados simple de pantallas.
 *
 * Cada pantalla es un módulo en `src/screens/<id>.ts` con `export default` una
 * `ScreenFactory`. Las pantallas 3D se cargan con import() dinámico (code-splitting:
 * three.js solo se descarga al llegar a los podios).
 *
 * Transiciones visuales: la pantalla nueva entra con `.screen--enter` (que se quita en
 * el siguiente frame) y la anterior sale con `.screen--leave` y se elimina tras el fade.
 * La lógica de la pantalla anterior (`unmount`) se limpia ANTES de montar la nueva, así
 * dos pantallas nunca controlan la escena 3D a la vez.
 */
import type { RobotId } from './types';

export type ScreenId =
  | 'home'
  | 'name'
  | 'podiums'
  | 'launch'
  | 'puzzle'
  | 'map'
  | 'final'
  | 'certificate';

export const SCREEN_IDS: ScreenId[] = [
  'home',
  'name',
  'podiums',
  'launch',
  'puzzle',
  'map',
  'final',
  'certificate',
];

/** '*' = desde cualquier pantalla; 'boot' = estado inicial al cargar la página. */
export type FromState = ScreenId | '*' | 'boot';

export interface Transition {
  from: FromState;
  to: ScreenId;
  trigger: string;
}

/** Tabla de transiciones permitidas (fuente para el diagrama de estados). */
export const TRANSITIONS: Transition[] = [
  { from: 'boot', to: 'home', trigger: 'Carga normal de la página' },
  { from: 'boot', to: 'puzzle', trigger: 'URL ?debug=robot=<id> (salta directo al puzzle)' },
  { from: 'home', to: 'name', trigger: 'INICIAR MISIÓN sin nombre guardado, o "Cambiar nombre"' },
  { from: 'home', to: 'podiums', trigger: 'INICIAR MISIÓN con nombre guardado' },
  { from: 'name', to: 'podiums', trigger: 'EMPEZAR (o Enter) con nombre no vacío' },
  { from: 'podiums', to: 'launch', trigger: 'Click en un podio (DESCUBRIR)' },
  { from: 'podiums', to: 'final', trigger: 'Automático al entrar: 16/16 niveles y nivel extra pendiente' },
  { from: 'podiums', to: 'certificate', trigger: 'Botón "Ver certificado" (nivel extra ya hecho)' },
  { from: 'launch', to: 'puzzle', trigger: 'Fin de la animación de despegue' },
  { from: 'puzzle', to: 'map', trigger: 'Robot ensamblado (o "Saltar") + aterrizaje terminado' },
  { from: 'map', to: 'podiums', trigger: 'Botón "← Volver a los robots"' },
  { from: 'final', to: 'certificate', trigger: 'Botón "Ver certificado" tras verificar las piedras' },
  { from: 'certificate', to: 'podiums', trigger: 'Botón "Volver a los robots"' },
  { from: 'certificate', to: 'home', trigger: 'Botón "Volver a empezar" (borra el progreso)' },
  { from: '*', to: 'home', trigger: 'Menú → Reiniciar (con confirmación)' },
];

export interface ScreenParams {
  robot?: RobotId;
  /** true cuando se entra al puzzle sin pasar por el despegue (debug) */
  direct?: boolean;
}

export interface ScreenContext {
  root: HTMLElement;
  params: ScreenParams;
  go: (to: ScreenId, params?: ScreenParams) => void;
}

export interface ScreenInstance {
  /** Limpia listeners, timelines, objetos 3D propios. NO debe quitar `root` (lo hace el router). */
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
};

/** prefers-reduced-motion: multiplicador de duraciones (1 normal, 0.25 reducido). */
export const reducedMotion: boolean =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const MOTION = reducedMotion ? 0.25 : 1;
export const dur = (s: number) => s * MOTION;

const FADE_MS = reducedMotion ? 120 : 450;

type StageModule = typeof import('./three/stage');
let stageMod: StageModule | null = null;

let container: HTMLElement | null = null;
let current: { id: ScreenId; el: HTMLElement; inst: ScreenInstance } | null = null;
let busy = false;
let pending: { to: ScreenId; params: ScreenParams } | null = null;
const changeListeners = new Set<(id: ScreenId) => void>();

export function currentScreen(): ScreenId | null {
  return current?.id ?? null;
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
  if (!container) throw new Error('Router sin inicializar');
  busy = true;
  const from: FromState = current?.id ?? 'boot';
  if (!isAllowed(from, to)) console.warn(`[router] transición no declarada: ${from} → ${to}`);
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

    // 1) limpiar lógica de la pantalla anterior y lanzar su fade-out
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

    // 2) escenario 3D
    if (stageMod) {
      if (def.uses3D) stageMod.showStage();
      else stageMod.hideStage();
    }

    // 3) montar la nueva
    const el = document.createElement('section');
    el.className = `screen screen--${to} screen--enter`;
    el.dataset.screen = to;
    if (def.uses3D) el.style.background = 'transparent';
    container.appendChild(el);
    const inst = await mod.default({ root: el, params, go });
    current = { id: to, el, inst };
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('screen--enter')));
    changeListeners.forEach((l) => l(to));
  } catch (err) {
    console.error('[router] error al cambiar de pantalla', err);
  } finally {
    busy = false;
    if (pending) {
      const p = pending;
      pending = null;
      void run(p.to, p.params);
    }
  }
}
