import type { RobotId } from '../types';
import { injectGameStyles } from './styles';
import lunarLanding from './lunarLanding';
import apollo11Story from './apollo11Story';
import audioFact from './audioFact';
import { withIntro } from './introVideo';
import { HOLE_IN_ONE } from './opportunity';
import spAirbags from './spAirbags';
import spRocks from './spRocks';
import spWheel from './spWheel';
import spSand from './spSand';
import { tr } from '../i18n';
import { setMusicTheme, type MusicTheme } from '../audio/music';
import { currentScreen } from '../router';

const lazyGame =
  (load: () => Promise<{ default: MiniGame }>): MiniGame =>
  (ctx) => {
    let dead = false;
    let cleanup: (() => void) | void;
    ctx.root.innerHTML =
      `<div style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-ui);letter-spacing:.14em;color:#fcd34d;background:radial-gradient(circle,#3a1d0e,#120a06)">${tr('LOADING MARS 3D…', 'CARGANDO MARTE 3D…')}</div>`;
    load()
      .then((m) => {
        if (!dead) cleanup = m.default(ctx);
      })
      .catch(() => {
        if (!dead) ctx.root.innerHTML = `<p style="padding:24px">${tr('The level could not be loaded. Check your connection and try again.', 'No se pudo cargar el nivel. Revisa tu conexión e inténtalo otra vez.')}</p>`;
      });
    return () => {
      dead = true;
      if (typeof cleanup === 'function') cleanup();
    };
  };

export interface GameContext {
  root: HTMLElement;
  win: () => void;
}

export type MiniGame = (ctx: GameContext) => (() => void) | void;

export interface LevelGame {
  title: string;
  subtitle: string;
  play: MiniGame;
}

export const GAMES: Partial<Record<RobotId, (LevelGame | undefined)[]>> = {
  lrv: [
    { title: tr('Landing', 'Aterrizaje'), subtitle: tr('Mission 1 · Land the lunar module', 'Misión 1 · Aterriza el módulo lunar'), play: withIntro('videos/moon_1.mp4', lunarLanding) },
    { title: tr('Apollo 11', 'Apolo 11'), subtitle: tr('Mission 2 · The story of the first Moon landing', 'Misión 2 · La historia del primer alunizaje'), play: apollo11Story },
    { title: tr('Fun fact', 'Dato curioso'), subtitle: tr('Mission 3 · Listen to the fact in English', 'Misión 3 · Escucha el dato en inglés'), play: audioFact },
  ],
  spirit: [
    { title: tr('Airbags', 'Bolsas de aire'), subtitle: tr('Mission 1 · Land on Mars by bouncing', 'Misión 1 · Aterriza en Marte rebotando'), play: spAirbags },
    { title: tr('Clue rocks', 'Rocas pista'), subtitle: tr('Mission 2 · Rock detective', 'Misión 2 · Detective de rocas'), play: spRocks },
    { title: tr('Broken wheel', 'Rueda rota'), subtitle: tr('Mission 3 · Drive in reverse', 'Misión 3 · Maneja de reversa'), play: spWheel },
    { title: tr('Stuck', 'Atrapado'), subtitle: tr('Mission 4 · Get out of the sand', 'Misión 4 · Sal de la arena'), play: spSand },
  ],
  opportunity: [
    HOLE_IN_ONE,
    { title: tr('Blueberries', 'Bolitas azules'), subtitle: tr('Mission 2 · Search for hematite in Eagle crater', 'Misión 2 · Busca hematita en el cráter Eagle'), play: lazyGame(() => import('./op3d/opBerries')) },
    { title: tr('Solar power', 'Energía solar'), subtitle: tr('Mission 3 · Travel to Endeavour', 'Misión 3 · Viaja hasta Endeavour'), play: lazyGame(() => import('./op3d/opSolar')) },
    { title: tr('The great storm', 'La gran tormenta'), subtitle: tr('Mission 4 · Survive the 2018 storm', 'Misión 4 · Resiste la tormenta de 2018'), play: lazyGame(() => import('./op3d/opStorm')) },
  ],
};

export function getGame(robot: RobotId, level: number): LevelGame | undefined {
  return GAMES[robot]?.[level];
}

export function openGame(game: LevelGame, levelNumber: number, onWin: () => void): void {
  injectGameStyles();
  setMusicTheme('game');
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <header class="game-overlay__bar">
      <div>
        <p class="game-overlay__kicker">${tr('Level', 'Nivel')} ${levelNumber}</p>
        <h2 class="game-overlay__title">${game.subtitle}</h2>
      </div>
      <button type="button" class="game-overlay__close" aria-label="${tr('Exit the game', 'Salir del juego')}">×</button>
    </header>
    <div class="game-overlay__body"></div>`;
  (document.querySelector('.app') ?? document.body).appendChild(overlay);

  const behind = Array.from(document.querySelectorAll<HTMLElement>('.screens, .stage-canvas'));
  const prevVisibility = behind.map((el) => el.style.visibility);
  behind.forEach((el) => (el.style.visibility = 'hidden'));

  const body = overlay.querySelector<HTMLElement>('.game-overlay__body')!;
  let won = false;
  let cleanup: (() => void) | void;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    if (typeof cleanup === 'function') cleanup();
    behind.forEach((el, i) => (el.style.visibility = prevVisibility[i]));
    overlay.remove();
    setMusicTheme((currentScreen() ?? 'map') as MusicTheme);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.game-overlay__close')!.addEventListener('click', close);

  const win = () => {
    if (won) return;
    won = true;
    const panel = document.createElement('div');
    panel.className = 'game-win';
    panel.innerHTML = `
      <div class="game-win__card">
        <p class="game-win__kicker">${tr(`Level ${levelNumber} passed`, `Nivel ${levelNumber} superado`)}</p>
        <h3 class="game-win__title">${tr('Mission accomplished!', '¡Misión cumplida!')}</h3>
        <p class="game-win__pts">+50 pts</p>
        <button type="button" class="btn btn--primary" data-continue>${tr('Back to the map', 'Volver al mapa')}</button>
      </div>`;
    body.appendChild(panel);
    const btn = panel.querySelector<HTMLButtonElement>('[data-continue]')!;
    btn.focus();
    btn.addEventListener('click', () => {
      close();
      onWin();
    });
  };

  cleanup = game.play({ root: body, win });
}
