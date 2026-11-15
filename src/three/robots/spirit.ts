import type { RobotModel } from '../../types';
import { buildMER } from './mer';

export function buildSpirit(): RobotModel {
  return buildMER('spirit', '#3b82f6');
}
