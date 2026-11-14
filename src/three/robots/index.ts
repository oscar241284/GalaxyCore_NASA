import type { RobotId, RobotModel } from '../../types';
import { buildLRV } from './lrv';
import { buildLunokhod2 } from './lunokhod2';
import { buildSpirit } from './spirit';
import { buildOpportunity } from './opportunity';

const BUILDERS: Record<RobotId, () => RobotModel> = {
  lrv: buildLRV,
  lunokhod2: buildLunokhod2,
  spirit: buildSpirit,
  opportunity: buildOpportunity,
};

/**
 * Construye un modelo procedural nuevo (low-poly, flatShading) del robot.
 * Origen en la base (y=0), mirando a +Z. `pieces` = hijos directos de `group`.
 * Los `thrusters` son Object3D vacíos anidados dentro de la pieza del chasis
 * (con el chasis en reposo, sus coordenadas coinciden con las del group).
 */
export function buildRobot(id: RobotId): RobotModel {
  return BUILDERS[id]();
}
