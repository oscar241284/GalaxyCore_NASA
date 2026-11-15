/**
 * Minijuegos de OPPORTUNITY, en el mismo orden que sus 4 niveles del mapa.
 * `undefined` = ese nivel todavía usa el quiz por defecto.
 *
 * Para añadir el siguiente: crear su carpeta (como `holeInOne/`) con un `index.ts` cuyo
 * `export default` sea un `MiniGame`, y sustituir aquí el `undefined` correspondiente.
 * Lo común a los cuatro (sonido, estilos `op-`, carga diferida) vive en `shared/`.
 */
import type { LevelGame } from '../index';
import { lazyGame } from './shared/lazy';

export const OPPORTUNITY_GAMES: (LevelGame | undefined)[] = [
  { title: 'Hoyo en uno', subtitle: 'Misión 1 · Rebota hasta el cráter Eagle', play: lazyGame(() => import('./holeInOne')) },
  undefined, // Misión 2 · Las bolitas azules
  undefined, // Misión 3 · Energía solar
  undefined, // Misión 4 · La gran tormenta
];
