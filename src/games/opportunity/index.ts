/**
 * Minijuegos de OPPORTUNITY que viven en esta carpeta. Se registran en `src/games/index.ts`,
 * dentro de `GAMES.opportunity`, en el orden de los niveles del mapa.
 *
 * Lo común (sonido, estilos `op-`, carga diferida) está en `shared/`.
 */
import type { LevelGame } from '../index';
import { lazyGame } from './shared/lazy';
import { tr } from '../../i18n';

/** Nivel 1 · aterrizaje con airbags hasta el cráter Eagle. */
export const HOLE_IN_ONE: LevelGame = {
  title: tr('Hole in one', 'Hoyo en uno'),
  subtitle: tr('Mission 1 · Bounce your way to Eagle crater', 'Misión 1 · Rebota hasta el cráter Eagle'),
  play: lazyGame(() => import('./holeInOne')),
};
