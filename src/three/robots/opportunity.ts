import type { RobotModel } from '../../types';
import { buildMER } from './mer';

/** Opportunity (MER-B). Gemelo de Spirit con acento naranja/dorado. */
export function buildOpportunity(): RobotModel {
  return buildMER('opportunity', '#f59e0b');
}
