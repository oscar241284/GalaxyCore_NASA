import type { RobotModel } from '../../types';
import { buildMER } from './mer';

/** Spirit (MER-A). Acento azul en mástil, cabeza Pancam, antena y herramientas. */
export function buildSpirit(): RobotModel {
  return buildMER('spirit', '#3b82f6');
}
