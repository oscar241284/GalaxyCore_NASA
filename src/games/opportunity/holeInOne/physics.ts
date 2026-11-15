/**
 * HOYO EN UNO · modelo físico (sin dependencias: ni DOM ni three.js).
 *
 * Unidades: metros y segundos. Ejes como en three.js: X lateral (derecha +), Y arriba,
 * y la nave avanza hacia −Z.
 *
 * Contiene:
 * - El terreno de Meridiani Planum como malla de alturas (la usan la física Y la escena,
 *   así lo que se ve coincide con lo que se simula).
 * - El descenso colgado del paracaídas (viento + cohetes laterales TIRS).
 * - Los rebotes y la rodadura del módulo envuelto en airbags con gravedad marciana.
 * - `predict`, que adelanta la simulación para dibujar la ayuda de puntería.
 */

// ---------------------------------------------------------------- constantes
/** Gravedad de Marte (m/s²). */
export const MARS_G = 3.71;
/** Radio del conjunto de airbags (el real medía unos 5 m de ancho). */
export const BALL_R = 2.4;
/** Paso fijo de simulación: el juego y la predicción dan exactamente el mismo resultado. */
export const STEP = 1 / 120;

/** Fracción de velocidad que conserva en cada rebote (perpendicular al suelo). */
const RESTITUTION = 0.72;
/** Fracción de velocidad paralela al suelo que conserva en cada rebote. */
const BOUNCE_GRIP = 0.86;
/** Por debajo de esta velocidad de impacto deja de rebotar y rueda (m/s). */
const ROLL_BELOW = 1.3;
/** Frenado al rodar: parte constante (m/s²) y parte proporcional a la velocidad (1/s). */
const ROLL_RESIST = 0.1 * MARS_G;
const ROLL_DRAG = 0.3;
/** Límite de seguridad de una simulación (s). */
const MAX_TIME = 70;

/** Tamaño real del cráter Eagle: 22 m de diámetro y 3 m de profundidad. */
export const EAGLE_REAL_RADIUS = 11;
const DEPTH_PER_RADIUS = 3 / 11;

// ---------------------------------------------------------------- dificultad
export type Difficulty = 'cadete' | 'piloto' | 'comandante';
/** Qué muestra la ayuda de puntería: toda la trayectoria, solo el destino o solo el primer bote. */
export type AimAid = 'path' | 'rest' | 'impact';

export interface LevelConfig {
  label: string;
  desc: string;
  /** Radio del cráter Eagle en el juego (m). */
  craterR: number;
  /** Viento medio que empuja la nave hacia delante y amplitud de las rachas (m/s). */
  wind: number;
  gust: number;
  /** Otros cráteres donde el módulo puede quedar atrapado. */
  decoys: number;
  aid: AimAid;
}

export const LEVELS: Record<Difficulty, LevelConfig> = {
  cadete: { label: 'Cadete', desc: 'Cráter grande y guía completa', craterR: 20, wind: 9, gust: 1, decoys: 3, aid: 'path' },
  piloto: { label: 'Piloto', desc: 'Más viento, solo ves el destino', craterR: 15, wind: 10, gust: 2, decoys: 5, aid: 'rest' },
  comandante: { label: 'Comandante', desc: 'Cráter de tamaño real, casi a ciegas', craterR: EAGLE_REAL_RADIUS, wind: 11, gust: 3, decoys: 7, aid: 'impact' },
};

/** Parámetros del descenso (iguales en todas las dificultades). */
export const DESCENT = {
  /** Altura inicial y altura a la que el cable se corta solo (m sobre el suelo). */
  startAlt: 30,
  minAlt: 10,
  /** Velocidad de bajada con paracaídas, ralentizada para poder jugar (m/s). */
  sinkRate: 1.6,
  /** Aceleración de los cohetes laterales TIRS (m/s²) y gasto de su combustible (%/s). */
  tirsAccel: 4.5,
  tirsBurn: 16,
  /** El paracaídas amortigua el balanceo lateral (1/s). */
  lateralDamping: 0.45,
} as const;

// ---------------------------------------------------------------- terreno
export interface Crater {
  x: number;
  z: number;
  r: number;
  depth: number;
  rim: number;
}

export interface Terrain {
  /** Esquina (x mínimo, z mínimo) y tamaño de celda de la malla de alturas. */
  x0: number;
  z0: number;
  cell: number;
  nx: number;
  nz: number;
  heights: Float32Array;
  craters: Crater[];
  eagle: Crater;
}

/** Límites del campo de juego (m). La nave empieza en (0, 0) y avanza hacia −Z. */
export const FIELD = { halfWidth: 130, back: 40, front: -480, cell: 2 } as const;

type Rand = () => number;

function makeCrater(x: number, z: number, r: number): Crater {
  return { x, z, r, depth: r * DEPTH_PER_RADIUS, rim: r * 0.07 };
}

/** Perfil de un cráter de impacto: cuenco parabólico con el borde levantado. */
function craterHeight(c: Crater, x: number, z: number): number {
  const d = Math.hypot(x - c.x, z - c.z) / c.r;
  if (d > 1.9) return 0;
  const rim = c.rim * Math.exp(-(((d - 1) / 0.28) ** 2));
  return d < 1 ? rim - c.depth * (1 - d * d) : rim;
}

interface Relief {
  a: number;
  b: number;
  c: number;
}

/** Meridiani Planum es una de las llanuras más lisas de Marte: solo ondulaciones suaves. */
function plainHeight(k: Relief, x: number, z: number): number {
  const edge = Math.min(1, (FIELD.halfWidth - Math.abs(x)) / 30, (FIELD.back - z) / 30, (z - FIELD.front) / 30);
  const wave = 0.45 * Math.sin(x * 0.043 + k.a) * Math.cos(z * 0.037 + k.b) + 0.22 * Math.sin(x * 0.11 + z * 0.083 + k.c);
  return wave * Math.max(0, edge);
}

function buildTerrain(relief: Relief, craters: Crater[], eagle: Crater): Terrain {
  const { halfWidth, back, front, cell } = FIELD;
  const nx = Math.round((halfWidth * 2) / cell) + 1;
  const nz = Math.round((back - front) / cell) + 1;
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -halfWidth + i * cell;
      const z = front + j * cell;
      let h = plainHeight(relief, x, z);
      for (const c of craters) h += craterHeight(c, x, z);
      heights[j * nx + i] = h;
    }
  }
  return { x0: -halfWidth, z0: front, cell, nx, nz, heights, craters, eagle };
}

/** Altura del suelo (interpolación bilineal de la malla). */
export function heightAt(t: Terrain, x: number, z: number): number {
  const fx = Math.min(t.nx - 1.001, Math.max(0, (x - t.x0) / t.cell));
  const fz = Math.min(t.nz - 1.001, Math.max(0, (z - t.z0) / t.cell));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const k = j * t.nx + i;
  const h = t.heights;
  return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + t.nx] * (1 - u) + h[k + t.nx + 1] * u) * v;
}

/** Pendiente del suelo (dh/dx, dh/dz). */
function slopeAt(t: Terrain, x: number, z: number): [number, number] {
  const e = t.cell * 0.5;
  return [(heightAt(t, x + e, z) - heightAt(t, x - e, z)) / (2 * e), (heightAt(t, x, z + e) - heightAt(t, x, z - e)) / (2 * e)];
}

export function insideField(x: number, z: number): boolean {
  return Math.abs(x) < FIELD.halfWidth - 2 && z < FIELD.back - 2 && z > FIELD.front + 2;
}

// ---------------------------------------------------------------- descenso
export interface Wind {
  base: number;
  gust: number;
  p1: number;
  p2: number;
  cross: number;
}

/** Velocidad del viento de cola (m/s) en el instante `time`: una media más dos rachas. */
export function windAt(w: Wind, time: number): number {
  return w.base + w.gust * (Math.sin(time * 0.75 + w.p1) + 0.5 * Math.sin(time * 1.9 + w.p2));
}

export interface Descent {
  x: number;
  z: number;
  /** Altura sobre el suelo (m). */
  alt: number;
  vx: number;
  /** Velocidad de avance (m/s, positiva hacia delante = −Z). */
  speed: number;
  time: number;
  /** Combustible de los cohetes laterales (0..100). */
  tirs: number;
}

export function newDescent(): Descent {
  return { x: 0, z: 0, alt: DESCENT.startAlt, vx: 0, speed: 0, time: 0, tirs: 100 };
}

/** Avanza el descenso un paso. `steer` es −1 (izquierda), 0 o +1 (derecha). Devuelve si se usó TIRS. */
export function stepDescent(d: Descent, wind: Wind, steer: number, dt: number): boolean {
  const firing = steer !== 0 && d.tirs > 0;
  if (firing) d.tirs = Math.max(0, d.tirs - DESCENT.tirsBurn * dt);
  const ax = (firing ? steer * DESCENT.tirsAccel : 0) + wind.cross - d.vx * DESCENT.lateralDamping;
  d.vx += ax * dt;
  d.speed = windAt(wind, d.time);
  d.x = Math.max(-FIELD.halfWidth + 10, Math.min(FIELD.halfWidth - 10, d.x + d.vx * dt));
  d.z -= d.speed * dt;
  d.alt = Math.max(DESCENT.minAlt, d.alt - DESCENT.sinkRate * dt);
  d.time += dt;
  return firing;
}

// ---------------------------------------------------------------- airbags
export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mode: 'air' | 'roll' | 'rest';
  bounces: number;
  /** Tiempo desde que se cortó el cable (s) y distancia recorrida sobre el suelo (m). */
  time: number;
  travelled: number;
  /** Altura máxima alcanzada desde el último bote (m sobre el punto de impacto). */
  apex: number;
  out: boolean;
}

export type BallEvent = { type: 'bounce'; speed: number } | { type: 'roll' } | { type: 'rest' };

/**
 * Estado del módulo justo al cortar el cable. Los retrocohetes (RAD) ya frenaron la caída,
 * así que empieza sin velocidad vertical y conserva la velocidad horizontal que traía.
 */
export function releaseBall(t: Terrain, d: Descent): Ball {
  return {
    x: d.x,
    y: heightAt(t, d.x, d.z) + d.alt + BALL_R,
    z: d.z,
    vx: d.vx,
    vy: 0,
    vz: -d.speed,
    mode: 'air',
    bounces: 0,
    time: 0,
    travelled: 0,
    apex: 0,
    out: false,
  };
}

/** Avanza la simulación un paso fijo (STEP). */
export function stepBall(t: Terrain, b: Ball): BallEvent | null {
  if (b.mode === 'rest') return null;
  const dt = STEP;
  b.time += dt;
  const px = b.x;
  const pz = b.z;
  let event: BallEvent | null = null;

  if (b.mode === 'air') {
    b.vy -= MARS_G * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    const ground = heightAt(t, b.x, b.z) + BALL_R;
    b.apex = Math.max(b.apex, b.y - ground);
    if (b.y <= ground) {
      const [sx, sz] = slopeAt(t, b.x, b.z);
      const inv = 1 / Math.hypot(sx, 1, sz);
      const nx = -sx * inv;
      const ny = inv;
      const nz = -sz * inv;
      const vn = b.vx * nx + b.vy * ny + b.vz * nz; // velocidad contra el suelo (negativa)
      b.y = ground;
      if (vn < 0) {
        const tx = b.vx - vn * nx;
        const ty = b.vy - vn * ny;
        const tz = b.vz - vn * nz;
        if (-vn < ROLL_BELOW) {
          b.mode = 'roll';
          b.vx = tx;
          b.vz = tz;
          b.vy = 0;
          event = { type: 'roll' };
        } else {
          b.vx = tx * BOUNCE_GRIP - vn * RESTITUTION * nx;
          b.vy = ty * BOUNCE_GRIP - vn * RESTITUTION * ny;
          b.vz = tz * BOUNCE_GRIP - vn * RESTITUTION * nz;
          b.bounces++;
          b.apex = 0;
          event = { type: 'bounce', speed: -vn };
        }
      }
    }
  } else {
    // rodando: la pendiente lo acelera y el rozamiento lo frena
    const [sx, sz] = slopeAt(t, b.x, b.z);
    const k = MARS_G / (1 + sx * sx + sz * sz);
    const ax = -sx * k;
    const az = -sz * k;
    const speed = Math.hypot(b.vx, b.vz);
    const brake = ROLL_RESIST + ROLL_DRAG * speed;
    if (speed <= brake * dt && Math.hypot(ax, az) <= ROLL_RESIST) {
      b.vx = b.vz = 0;
      b.mode = 'rest';
      event = { type: 'rest' };
    } else {
      const f = speed > 1e-6 ? brake / speed : 0;
      b.vx += (ax - b.vx * Math.min(f, 1 / dt)) * dt;
      b.vz += (az - b.vz * Math.min(f, 1 / dt)) * dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
    }
    b.y = heightAt(t, b.x, b.z) + BALL_R;
  }

  b.travelled += Math.hypot(b.x - px, b.z - pz);
  if (b.mode !== 'rest' && (!insideField(b.x, b.z) || b.time > MAX_TIME)) {
    b.out = !insideField(b.x, b.z);
    b.vx = b.vy = b.vz = 0;
    b.mode = 'rest';
    event = { type: 'rest' };
  }
  return event;
}

/** Muestreo de la trayectoria prevista: un punto cada TRACE_EVERY pasos, como máximo TRACE_MAX. */
const TRACE_EVERY = 24;
export const TRACE_MAX = 160;

export interface Prediction {
  /** Puntos de impacto (x, z) de cada bote, en orden. */
  impacts: [number, number][];
  rest: { x: number; z: number };
  out: boolean;
}

/**
 * Adelanta la simulación: ¿dónde acabaría el módulo si se cortara el cable ahora mismo?
 * Si se pasa `trace`, se rellena con puntos (x, y, z) de la trayectoria en el aire.
 */
export function predict(t: Terrain, d: Descent, trace?: number[]): Prediction {
  const b = releaseBall(t, d);
  const impacts: [number, number][] = [];
  if (trace) trace.length = 0;
  for (let n = 0; b.mode !== 'rest'; n++) {
    const e = stepBall(t, b);
    if (e?.type === 'bounce' && impacts.length < 16) impacts.push([b.x, b.z]);
    if (trace && b.mode === 'air' && n % TRACE_EVERY === 0 && trace.length < TRACE_MAX * 3) trace.push(b.x, b.y, b.z);
  }
  return { impacts, rest: { x: b.x, z: b.z }, out: b.out };
}

// ---------------------------------------------------------------- resultado
export type Outcome =
  | { kind: 'eagle'; offset: number }
  | { kind: 'decoy'; offset: number }
  | { kind: 'out'; offset: number }
  | { kind: 'miss'; offset: number; ahead: number; side: number };

/** Clasifica dónde quedó el módulo. `offset` = distancia al centro del cráter Eagle (m). */
export function judge(t: Terrain, x: number, z: number, out: boolean): Outcome {
  const e = t.eagle;
  const offset = Math.hypot(x - e.x, z - e.z);
  if (out) return { kind: 'out', offset };
  if (offset < e.r * 0.95) return { kind: 'eagle', offset };
  if (t.craters.some((c) => c !== e && Math.hypot(x - c.x, z - c.z) < c.r * 0.95)) return { kind: 'decoy', offset };
  // ahead > 0: se pasó de largo; side > 0: quedó a la derecha
  return { kind: 'miss', offset, ahead: e.z - z, side: x - e.x };
}

// ---------------------------------------------------------------- mundo
export interface World {
  terrain: Terrain;
  wind: Wind;
}

/**
 * Crea un escenario resoluble: primero simula el descenso sin tocar los mandos sobre la
 * llanura vacía, elige un instante de la ventana de juego y coloca el cráter Eagle donde
 * el módulo acabaría (con un desvío lateral que obliga a usar los cohetes TIRS).
 */
export function createWorld(cfg: LevelConfig, rand: Rand): World {
  let world = draftWorld(cfg, rand);
  for (let tries = 0; tries < 12 && !isSolvable(world); tries++) world = draftWorld(cfg, rand);
  return world;
}

function draftWorld(cfg: LevelConfig, rand: Rand): World {
  const relief: Relief = { a: rand() * 6.28, b: rand() * 6.28, c: rand() * 6.28 };
  const wind: Wind = { base: cfg.wind, gust: cfg.gust, p1: rand() * 6.28, p2: rand() * 6.28, cross: (rand() - 0.5) * 0.5 };

  const placeholder = makeCrater(0, 0, 1);
  const plain = buildTerrain(relief, [], placeholder);
  const window = (DESCENT.startAlt - DESCENT.minAlt) / DESCENT.sinkRate;
  const cutAt = window * (0.35 + rand() * 0.35);
  const d = newDescent();
  while (d.time < cutAt) stepDescent(d, { ...wind, cross: 0 }, 0, STEP);
  const nominal = predict(plain, d).rest;

  // desvío lateral mayor que el radio: sin maniobrar no se entra
  const side = (rand() < 0.5 ? -1 : 1) * (cfg.craterR + 5 + rand() * 9);
  const eagle = makeCrater(nominal.x + side, nominal.z, cfg.craterR);
  const craters = [eagle];

  // otros cráteres: nunca tapan el pasillo que lleva al Eagle
  for (let tries = 0; craters.length <= cfg.decoys && tries < 400; tries++) {
    const r = 9 + rand() * 16;
    const x = (rand() * 2 - 1) * (FIELD.halfWidth - r - 12);
    const z = -60 - rand() * (-FIELD.front - 60 - r - 12);
    const blocksLane = Math.abs(x - eagle.x) < r + eagle.r + 14 && z > eagle.z - eagle.r - 20;
    const overlaps = craters.some((c) => Math.hypot(x - c.x, z - c.z) < (c.r + r) * 1.9 + 6);
    if (!blocksLane && !overlaps) craters.push(makeCrater(x, z, r));
  }
  return { terrain: buildTerrain(relief, craters, eagle), wind };
}

/** Comprueba con un piloto automático sencillo que existe algún momento ganador. */
function isSolvable(w: World): boolean {
  const e = w.terrain.eagle;
  const d = newDescent();
  for (let n = 0; d.alt > DESCENT.minAlt; n++) {
    const want = (e.x - d.x) * 0.6 - d.vx;
    stepDescent(d, w.wind, Math.abs(want) > 0.5 ? Math.sign(want) : 0, STEP);
    if (n % 12 === 0) {
      const p = predict(w.terrain, d);
      if (judge(w.terrain, p.rest.x, p.rest.z, p.out).kind === 'eagle') return true;
    }
  }
  return false;
}
