/**
 * Minijuegos de OPPORTUNITY que viven en esta carpeta. Se registran en `src/games/index.ts`,
 * dentro de `GAMES.opportunity`, en el orden de los niveles del mapa.
 *
 * Lo común (sonido, estilos `op-`, carga diferida) está en `src/games/shared/`.
 */
import type { LevelGame } from '../index';
import { lazyGame } from '../shared/lazy';

/** Nivel 1 · aterrizaje con airbags hasta el cráter Eagle. */
export const HOLE_IN_ONE: LevelGame = {
  title: 'Hoyo en uno',
  subtitle: 'Misión 1 · Rebota hasta el cráter Eagle',
  play: lazyGame(() => import('./holeInOne')),
};
