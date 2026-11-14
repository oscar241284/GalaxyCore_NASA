import './styles/index.css';
import { go, initRouter } from './router';
import type { RobotId } from './types';
import { ALL_ROBOTS, debugCompleteAll, getState, loadState } from './store';
import { mountHeader } from './ui/header';

/**
 * Flags de depuración (?debug=...):
 *   ?debug=allcomplete        → marca los 16 niveles y los 4 robots como completados (no se guarda)
 *   ?debug=robot=lrv          → salta directo al puzzle del robot indicado
 *   ?debug=allcomplete,robot=spirit  → ambos (separados por coma)
 */
function parseDebug(): { allComplete: boolean; robot: RobotId | null } {
  const raw = new URLSearchParams(location.search).getAll('debug').join(',');
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  let robot: RobotId | null = null;
  for (const p of parts) {
    const m = /^robot[=:](\w+)$/.exec(p);
    if (m && (ALL_ROBOTS as string[]).includes(m[1])) robot = m[1] as RobotId;
  }
  return { allComplete: parts.includes('allcomplete'), robot };
}

const app = document.getElementById('app')!;
app.classList.add('app');

const screens = document.createElement('main');
screens.className = 'screens';
Object.assign(screens.style, { position: 'relative', zIndex: '1', minHeight: '100%' });
app.appendChild(screens);
mountHeader(app);

loadState();
const debug = parseDebug();
if (debug.allComplete) debugCompleteAll();
if (debug.robot && !getState().name) {
  // nombre provisional solo en memoria para poder probar el puzzle directamente
  (getState() as { name: string }).name = 'Astronauta';
}

initRouter(screens);
if (debug.robot) go('puzzle', { robot: debug.robot, direct: true });
else go('home');
