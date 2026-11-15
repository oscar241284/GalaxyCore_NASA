import './styles/index.css';
import { takeResume } from './i18n';
import { go, initRouter, onScreenChange, type ScreenId, type ScreenParams } from './router';
import { initMusic, setMusicTheme } from './audio/music';
import type { RobotId } from './types';
import { ALL_ROBOTS, debugCompleteAll, getState, loadState } from './store';
import { mountHeader } from './ui/header';

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
  (getState() as { name: string }).name = 'Astronaut';
}

initMusic();
onScreenChange((id) => setMusicTheme(id));
initRouter(screens);
const RESUMABLE: ScreenId[] = ['home', 'podiums', 'explore', 'map'];
const resume = takeResume();

if (debug.robot) go('puzzle', { robot: debug.robot, direct: true });
else if (
  resume &&
  (getState().name || resume.screen === 'explore') &&
  (RESUMABLE as string[]).includes(resume.screen) &&
  (resume.screen !== 'map' || resume.params.robot)
)
  go(resume.screen as ScreenId, resume.params as ScreenParams);
else go('home');
