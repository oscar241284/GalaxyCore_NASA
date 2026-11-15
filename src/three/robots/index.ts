import type { RobotId, RobotModel } from '../../types';
import { buildLRV } from './lrv';
import { buildSpirit } from './spirit';
import { buildOpportunity } from './opportunity';

const BUILDERS: Record<RobotId, () => RobotModel> = {
  lrv: buildLRV,
  spirit: buildSpirit,
  opportunity: buildOpportunity,
};

export function buildRobot(id: RobotId): RobotModel {
  return BUILDERS[id]();
}
