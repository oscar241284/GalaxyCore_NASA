import type { RobotModel } from '../../types';
import { buildMER } from './mer';

export function buildOpportunity(): RobotModel {
  return buildMER('opportunity', '#f59e0b');
}
