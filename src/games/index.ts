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
import { withIntro } from './introVideo';
import lkRemote from './lkRemote';
import lkDayNight from './lkDayNight';
import lkPhotos from './lkPhotos';
import lkLaser from './lkLaser';
import spAirbags from './spAirbags';
import spRocks from './spRocks';
import spWheel from './spWheel';
import spSand from './spSand';

/**
 * Carga diferida: los niveles 3D de Opportunity (three.js) solo se descargan al abrirlos,
 * así la app inicial sigue siendo liviana.
 */
const lazyGame =
  (load: () => Promise<{ default: MiniGame }>): MiniGame =>
  (ctx) => {
    let dead = false;
    let cleanup: (() => void) | void;
    ctx.root.innerHTML =
      '<div style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-ui);letter-spacing:.14em;color:#fcd34d;background:radial-gradient(circle,#3a1d0e,#120a06)">CARGANDO MARTE 3D…</div>';
    load()
      .then((m) => {
        if (!dead) cleanup = m.default(ctx);
      })
      .catch(() => {
        if (!dead) ctx.root.innerHTML = '<p style="padding:24px">No se pudo cargar el nivel. Revisa tu conexión e inténtalo otra vez.</p>';
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
  /** nombre corto que se muestra en el nodo del mapa */
  title: string;
  /** subtítulo de la pantalla del juego */
  subtitle: string;
  play: MiniGame;
}

/** Juegos por robot, en el mismo orden que sus 4 niveles. `undefined` = usa el quiz. */
export const GAMES: Partial<Record<RobotId, (LevelGame | undefined)[]>> = {
  lrv: [
    { title: 'Aterrizaje', subtitle: 'Misión 1 · Aterriza el módulo lunar', play: withIntro('videos/moon_1.mp4', lunarLanding) },
    { title: 'Apolo 11', subtitle: 'Misión 2 · La historia del primer alunizaje', play: apollo11Story },
    { title: 'Dato curioso', subtitle: 'Misión 3 · Escucha el dato en inglés', play: audioFact },
  ],
  lunokhod2: [
    { title: 'Control remoto', subtitle: 'Misión 1 · Maneja el robot desde la Tierra', play: lkRemote },
    { title: 'Día y noche', subtitle: 'Misión 2 · Sobrevive a la noche lunar', play: lkDayNight },
    { title: 'Foto por foto', subtitle: 'Misión 3 · Elige el camino mirando fotos', play: lkPhotos },
    { title: 'Espejo láser', subtitle: 'Misión 4 · Mide la distancia a la Luna', play: lkLaser },
  ],
  spirit: [
    { title: 'Bolsas de aire', subtitle: 'Misión 1 · Aterriza en Marte rebotando', play: spAirbags },
    { title: 'Rocas pista', subtitle: 'Misión 2 · Detective de rocas', play: spRocks },
    { title: 'Rueda rota', subtitle: 'Misión 3 · Maneja de reversa', play: spWheel },
    { title: 'Atrapado', subtitle: 'Misión 4 · Sal de la arena', play: spSand },
  ],
  opportunity: [
    { title: 'Hoyo en uno', subtitle: 'Misión 1 · Aterriza dentro del cráter Eagle', play: lazyGame(() => import('./op3d/opLanding')) },
    { title: 'Bolitas azules', subtitle: 'Misión 2 · Busca hematita en el cráter Eagle', play: lazyGame(() => import('./op3d/opBerries')) },
    { title: 'Energía solar', subtitle: 'Misión 3 · Viaja hasta Endeavour', play: lazyGame(() => import('./op3d/opSolar')) },
    { title: 'La gran tormenta', subtitle: 'Misión 4 · Resiste la tormenta de 2018', play: lazyGame(() => import('./op3d/opStorm')) },
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
