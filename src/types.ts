import type { Group, Object3D } from 'three';

export type RobotId = 'lrv' | 'lunokhod2' | 'spirit' | 'opportunity';
export type Body = 'moon' | 'mars';

/** Modelo 3D procedural. `pieces` son hijos directos de `group`, en su posición ensamblada. */
export interface RobotModel {
  group: Group;
  pieces: Object3D[];
  /** Puntos (espacio local del group) donde salen las llamas de los propulsores. */
  thrusters: Object3D[];
}

export interface LevelInfo {
  /** índice del punto de `route` donde se ubica el nivel */
  routeIndex: number;
  title: string;
  /** tarjeta mostrada al marcar como realizado */
  card: { title: string; text: string };
}

export interface RobotData {
  id: RobotId;
  name: string;
  body: Body;
  mission: string;
  accent: string; // color CSS de acento
  /** puntos de la ruta en viewBox 0..1000 x 0..600 */
  route: [number, number][];
  levels: [LevelInfo, LevelInfo, LevelInfo, LevelInfo];
}

export interface StoneFact {
  text: string;
  robot: RobotId;
}
