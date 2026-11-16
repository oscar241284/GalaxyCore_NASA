/**
 * Minijuegos 3D del LRV (Apolo 15) que viven en esta carpeta. Se registran en
 * `src/games/index.ts`, dentro de `GAMES.lrv`, en el orden de los niveles del mapa.
 *
 * `moonKit.ts` (escenario lunar) y `ui.ts` (estilos) son comunes a los dos; el sonido, los
 * paneles y la carga diferida vienen de `src/games/shared/`.
 */
import type { LevelGame } from '../index';
import { lazyGame } from '../shared/lazy';

/** Nivel 2 · cráter Spur: conducir el rover y encontrar la Roca Génesis. */
export const GENESIS_ROCK: LevelGame = {
  title: 'Roca Génesis',
  subtitle: 'Misión 2 · Conduce hasta el cráter Spur',
  play: lazyGame(() => import('./genesisRock')),
};

/** Nivel 3 · Hadley Rille: manejar desde Houston la cámara de TV del rover, con retraso. */
export const HOUSTON_CAMERA: LevelGame = {
  title: 'Cámara de Houston',
  subtitle: 'Misión 3 · Maneja la cámara desde la Tierra',
  play: lazyGame(() => import('./houstonCamera')),
};
