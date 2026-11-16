import type { RobotId } from './types';

export const STORAGE_KEY = 'galaxycore-mision:v1';
export const ALL_ROBOTS: RobotId[] = ['lrv', 'spirit', 'opportunity'];
export const TOTAL_LEVELS = 12;
export const TOTAL_STONES = 6;
export const MAX_SCORE = TOTAL_LEVELS * 50 + TOTAL_STONES * 25;
export const POINTS_PER_LEVEL = 50;
export const POINTS_PER_STONE = 25;

export type LevelFlags = [boolean, boolean, boolean, boolean];

export interface GameState {
  name: string;
  assembled: Record<RobotId, boolean>;
  levels: Record<RobotId, LevelFlags>;
  finalDone: boolean;
  stonesCorrect: number;
  score: number;
}

type Listener = (s: GameState) => void;

function emptyRecord<T>(make: () => T): Record<RobotId, T> {
  return ALL_ROBOTS.reduce((acc, id) => {
    acc[id] = make();
    return acc;
  }, {} as Record<RobotId, T>);
}

export function defaultState(): GameState {
  return {
    name: '',
    assembled: emptyRecord(() => false),
    levels: emptyRecord<LevelFlags>(() => [false, false, false, false]),
    finalDone: false,
    stonesCorrect: 0,
    score: 0,
  };
}

let state: GameState = defaultState();
const listeners = new Set<Listener>();

function sanitize(raw: unknown): GameState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<GameState>;
  if (typeof r.name === 'string') base.name = r.name.slice(0, 40);
  for (const id of ALL_ROBOTS) {
    if (r.assembled && typeof r.assembled[id] === 'boolean') base.assembled[id] = r.assembled[id];
    const lv = r.levels?.[id];
    if (Array.isArray(lv)) base.levels[id] = [0, 1, 2, 3].map((i) => !!lv[i]) as LevelFlags;
  }
  base.finalDone = !!r.finalDone;
  base.stonesCorrect = typeof r.stonesCorrect === 'number' ? Math.max(0, Math.min(TOTAL_STONES, r.stonesCorrect)) : 0;
  base.score = computeScore(base);
  return base;
}

function computeScore(s: GameState): number {
  return countLevels(s) * POINTS_PER_LEVEL + (s.finalDone ? s.stonesCorrect * POINTS_PER_STONE : 0);
}

function countLevels(s: GameState): number {
  return ALL_ROBOTS.reduce((n, id) => n + s.levels[id].filter(Boolean).length, 0);
}

function emit() {
  state.score = computeScore(state);
  listeners.forEach((l) => l(state));
}

export function loadState(): GameState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    state = txt ? sanitize(JSON.parse(txt)) : defaultState();
  } catch {
    state = defaultState();
  }
  emit();
  return state;
}

export function saveState(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetState(): void {
  state = defaultState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  emit();
}

export function getState(): Readonly<GameState> {
  return state;
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function commit(autosave = true) {
  emit();
  if (autosave) saveState();
}

export function setName(name: string): void {
  state.name = name.trim().slice(0, 40);
  commit();
}

export function markAssembled(id: RobotId): void {
  state.assembled[id] = true;
  commit();
}

export function markLevel(id: RobotId, index: number): void {
  state.levels[id][index] = true;
  commit();
}

export function setFinalResult(correct: number): void {
  state.finalDone = true;
  state.stonesCorrect = correct;
  commit();
}

export function levelsDone(): number {
  return countLevels(state);
}

export function robotComplete(id: RobotId): boolean {
  return state.levels[id].every(Boolean);
}

export function allLevelsDone(): boolean {
  return levelsDone() >= TOTAL_LEVELS;
}

export function progressPercent(): number {
  return Math.round((levelsDone() / TOTAL_LEVELS) * 100);
}

export function debugCompleteAll(): void {
  for (const id of ALL_ROBOTS) {
    state.assembled[id] = true;
    state.levels[id] = [true, true, true, true];
  }
  if (!state.name) state.name = 'Astronauta';
  emit();
}
