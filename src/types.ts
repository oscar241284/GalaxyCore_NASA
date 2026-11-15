import type { Group, Object3D } from 'three';

export type RobotId = 'lrv' | 'spirit' | 'opportunity';
export type Body = 'moon' | 'mars';

export interface RobotModel {
  group: Group;
  pieces: Object3D[];
  thrusters: Object3D[];
}

export interface LevelInfo {
  routeIndex: number;
  title: string;
  card: { title: string; text: string };
}

export interface RobotData {
  id: RobotId;
  name: string;
  body: Body;
  mission: string;
  accent: string;
  route: [number, number][];
  levels: [LevelInfo, LevelInfo, LevelInfo, LevelInfo];
}

export interface StoneFact {
  text: string;
  robot: RobotId;
}
