/**
 * MINIJUEGOS de los niveles. Cada nivel puede tener un juego propio; si no lo tiene,
 * el mapa usa el quiz por defecto (src/data/quizzes.ts).
 *
 * Un juego recibe un contenedor vacío y una función `win()` que debe llamar cuando el
 * jugador supera la misión. Devuelve una función de limpieza (listeners, animaciones…).
 */
import type { RobotId } from '../types';
import { injectGameStyles } from './styles';
import lunarLanding from './lunarLanding';
import apollo11Story from './apollo11Story';
import audioFact from './audioFact';

export interface GameContext {
  root: HTMLElement;
  win: () => void;
}

export type MiniGame = (ctx: GameContext) => (() => void) | void;

export interface LevelGame {
  /** nombre corto que se muestra en el nodo del mapa */
  title: string;
  /** subtítulo de la pantalla del juego */
  subtitle: string;
  play: MiniGame;
}

/** Juegos por robot, en el mismo orden que sus 4 niveles. `undefined` = usa el quiz. */
export const GAMES: Partial<Record<RobotId, (LevelGame | undefined)[]>> = {
  lrv: [
    { title: 'Aterrizaje', subtitle: 'Misión 1 · Aterriza el módulo lunar', play: lunarLanding },
    { title: 'Apolo 11', subtitle: 'Misión 2 · La historia del primer alunizaje', play: apollo11Story },
    { title: 'Dato curioso', subtitle: 'Misión 3 · Escucha el dato en inglés', play: audioFact },
  ],
};

export function getGame(robot: RobotId, level: number): LevelGame | undefined {
  return GAMES[robot]?.[level];
}

/** Abre el juego a pantalla completa. `onWin` se llama al pulsar "Volver al mapa" tras ganar. */
export function openGame(game: LevelGame, levelNumber: number, onWin: () => void): void {
  injectGameStyles();
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <header class="game-overlay__bar">
      <div>
        <p class="game-overlay__kicker">Nivel ${levelNumber}</p>
        <h2 class="game-overlay__title">${game.subtitle}</h2>
      </div>
      <button type="button" class="game-overlay__close" aria-label="Salir del juego">×</button>
    </header>
    <div class="game-overlay__body"></div>`;
  (document.querySelector('.app') ?? document.body).appendChild(overlay);

  // ocultar lo que queda detrás (mapa, escena 3D) para que el juego vaya fluido
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
        <p class="game-win__kicker">Nivel ${levelNumber} superado</p>
        <h3 class="game-win__title">¡Misión cumplida!</h3>
        <p class="game-win__pts">+50 pts</p>
        <button type="button" class="btn btn--primary" data-continue>Volver al mapa</button>
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