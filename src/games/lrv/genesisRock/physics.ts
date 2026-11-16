/**
 * CAZADORES DE LA ROCA GÉNESIS · modelo de conducción (solo cálculo: no dibuja ni toca el DOM).
 *
 * Unidades: metros y segundos. X lateral (derecha +), Y arriba; el rover sale mirando a −Z
 * y sube por la ladera del monte Hadley Delta hasta el cráter Spur.
 *
 * Lo que hace especial al manejo:
 * - Dirección SOLO trasera. En la primera salida del Apolo 15 la dirección delantera del
 *   LRV no funcionó, así que giraban las ruedas de atrás: la cola se abre hacia fuera,
 *   como en un montacargas.
 * - Gravedad lunar (1,62 m/s²): al pasar rápido por el borde de un cráter el rover
 *   despega y tarda en caer.
 */
import { MOON_G, craterProfile, fieldHeight, makeField } from '../moonKit';
import type { Bounds, HeightField } from '../moonKit';

// ---------------------------------------------------------------- constantes
/** Velocidad máxima real del LRV: unos 13 km/h. */
export const MAX_SPEED = 13 / 3.6;
const REVERSE_SPEED = 1.6;
const ACCEL = 2.4;
const BRAKE = 4.5;
const COAST = 1.1;
/** Distancia entre ejes (m) y giro máximo de las ruedas traseras (rad). */
export const WHEELBASE = 2.3;
const MAX_STEER = 0.55;
const STEER_RATE = 2.2;
/** Por encima de esta altura (m) las ruedas ya no agarran: no se puede acelerar ni girar. */
export const AIRBORNE = 0.25;
/** Radio de choque del rover (m). */
const ROVER_R = 1.25;

export const FIELD: Bounds = { minX: -60, maxX: 60, minZ: -240, maxZ: 30 };
const CELL = 2;
/** El oxígeno nunca puede bajar de aquí: es lo que haría falta para volver andando al módulo. */
export const WALKBACK_LIMIT = 30;

export type Difficulty = 'cadete' | 'piloto' | 'comandante';
export interface LevelConfig {
  label: string;
  desc: string;
  rocks: number;
  craters: number;
  /** Gasto de oxígeno (%/s). */
  drain: number;
}
export const LEVELS: Record<Difficulty, LevelConfig> = {
  cadete: { label: 'Cadete', desc: 'Pocas rocas y oxígeno de sobra', rocks: 26, craters: 5, drain: 0.5 },
  piloto: { label: 'Piloto', desc: 'Como una salida de verdad', rocks: 44, craters: 8, drain: 0.66 },
  comandante: { label: 'Comandante', desc: 'Campo de rocas y poco margen', rocks: 64, craters: 11, drain: 0.8 },
};

/** Coste en oxígeno (%) de chocar con una roca y de recoger una muestra equivocada. */
export const HIT_COST = 4;
export const WRONG_SAMPLE_COST = 8;

// ---------------------------------------------------------------- mundo
export interface Crater {
  x: number;
  z: number;
  r: number;
}
export interface Rock {
  x: number;
  z: number;
  r: number;
}
export interface World {
  field: HeightField;
  craters: Crater[];
  spur: Crater;
  rocks: Rock[];
  /** Punto de parada junto al borde del cráter Spur (Estación 7). */
  goal: { x: number; z: number; r: number };
}

type Rand = () => number;

export function createWorld(cfg: LevelConfig, rand: Rand): World {
  const spur: Crater = { x: 6, z: -212, r: 20 };
  const goal = { x: 0, z: -182, r: 8 };
  const craters: Crater[] = [spur];
  for (let tries = 0; craters.length <= cfg.craters && tries < 300; tries++) {
    const r = 5 + rand() * 7;
    const x = (rand() * 2 - 1) * 46;
    const z = -22 - rand() * 135;
    if (craters.every((c) => Math.hypot(x - c.x, z - c.z) > (c.r + r) * 1.7)) craters.push({ x, z, r });
  }
  const phase = [rand() * 6.28, rand() * 6.28];
  const field = makeField(FIELD, CELL, (x, z) => {
    const edge = Math.max(0, Math.min(1, (FIELD.maxX - Math.abs(x)) / 20, (FIELD.maxZ - z) / 20, (z - FIELD.minZ) / 14));
    // ladera del Hadley Delta: sube suavemente hacia Spur, con ondulaciones
    let h = Math.max(0, -z) * 0.075 + 0.5 * Math.sin(x * 0.09 + phase[0]) * Math.cos(z * 0.07 + phase[1]);
    for (const c of craters) h += craterProfile(Math.hypot(x - c.x, z - c.z), c.r, c.r * 0.22, c.r * 0.06);
    return h * edge;
  });
  const rocks: Rock[] = [];
  for (let tries = 0; rocks.length < cfg.rocks && tries < 2000; tries++) {
    const r = 0.5 + rand() * rand() * 1.4;
    const x = (rand() * 2 - 1) * 52;
    const z = -14 - rand() * 180;
    const clear = Math.hypot(x - goal.x, z - goal.z) > goal.r + 4 && Math.hypot(x - spur.x, z - spur.z) > spur.r * 0.9 && rocks.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + r + 3.2);
    if (clear) rocks.push({ x, z, r });
  }
  return { field, craters, spur, rocks, goal };
}

// ---------------------------------------------------------------- rover
export interface Rover {
  /** Posición del eje delantero (el punto que "guía": las ruedas de delante no giran). */
  x: number;
  z: number;
  /** Rumbo en radianes: 0 = hacia −Z (cuesta arriba), positivo = hacia la derecha. */
  heading: number;
  speed: number;
  /** Giro actual de las ruedas traseras. */
  steer: number;
  /** Altura del chasis sobre el suelo (> 0 cuando va por el aire) y su velocidad vertical. */
  lift: number;
  vy: number;
  groundY: number;
  odometer: number;
}

export function newRover(w: World): Rover {
  const r: Rover = { x: 0, z: 16, heading: 0, speed: 0, steer: 0, lift: 0, vy: 0, groundY: 0, odometer: 0 };
  const c = roverCenter(r);
  r.groundY = fieldHeight(w.field, c.x, c.z);
  return r;
}

export interface Input {
  /** −1 izquierda … +1 derecha */
  turn: number;
  /** +1 acelerar, −1 frenar / marcha atrás */
  drive: number;
}

export type DriveEvent = { type: 'hit'; speed: number } | { type: 'land'; speed: number } | null;

/** Centro del chasis (a medio camino entre ejes). */
export function roverCenter(r: Rover): { x: number; z: number } {
  return { x: r.x - Math.sin(r.heading) * (WHEELBASE / 2), z: r.z + Math.cos(r.heading) * (WHEELBASE / 2) };
}

export function stepRover(w: World, r: Rover, input: Input, dt: number): DriveEvent {
  let event: DriveEvent = null;
  const airborne = r.lift > AIRBORNE;
  const fx = Math.sin(r.heading);
  const fz = -Math.cos(r.heading);

  if (!airborne) {
    // pendiente en el sentido de la marcha: cuesta arriba frena, cuesta abajo acelera
    const slope = (fieldHeight(w.field, r.x + fx, r.z + fz) - fieldHeight(w.field, r.x - fx, r.z - fz)) / 2;
    let a = -MOON_G * slope;
    if (input.drive > 0) a += r.speed < 0 ? BRAKE : ACCEL;
    else if (input.drive < 0) a -= r.speed > 0 ? BRAKE : ACCEL;
    else a -= Math.sign(r.speed) * Math.min(COAST, Math.abs(r.speed) / dt);
    r.speed = Math.max(-REVERSE_SPEED, Math.min(MAX_SPEED, r.speed + a * dt));

    // a más velocidad, menos giro (si no, vuelca)
    const want = input.turn * MAX_STEER * (1 - 0.45 * Math.abs(r.speed) / MAX_SPEED);
    r.steer += Math.max(-STEER_RATE * dt, Math.min(STEER_RATE * dt, want - r.steer));
    r.heading += ((r.speed * Math.tan(r.steer)) / WHEELBASE) * dt;
  }

  const nx = r.x + Math.sin(r.heading) * r.speed * dt;
  const nz = r.z - Math.cos(r.heading) * r.speed * dt;
  r.odometer += Math.abs(r.speed) * dt;
  r.x = Math.max(FIELD.minX + 6, Math.min(FIELD.maxX - 6, nx));
  r.z = Math.max(FIELD.minZ + 8, Math.min(FIELD.maxZ - 6, nz));

  // choques con rocas (se comprueba el centro del chasis)
  const c = roverCenter(r);
  for (const rock of w.rocks) {
    const dx = c.x - rock.x;
    const dz = c.z - rock.z;
    const d = Math.hypot(dx, dz);
    const min = rock.r + ROVER_R;
    if (d < min && d > 1e-4) {
      r.x += (dx / d) * (min - d);
      r.z += (dz / d) * (min - d);
      if (Math.abs(r.speed) > 0.6) event = { type: 'hit', speed: Math.abs(r.speed) };
      r.speed *= -0.25;
    }
  }

  // vertical: pegado al suelo salvo que este "desaparezca" más rápido de lo que cae en la Luna
  const ground = fieldHeight(w.field, c.x, c.z);
  const rise = (ground - r.groundY) / dt;
  r.groundY = ground;
  if (r.lift > 0 || rise < r.vy - MOON_G * dt * 1.5) {
    r.vy -= MOON_G * dt;
    r.lift += (r.vy - rise) * dt;
    if (r.lift <= 0) {
      if (r.vy - rise < -1.2) event = event ?? { type: 'land', speed: rise - r.vy };
      r.lift = 0;
      r.vy = rise;
    }
  } else {
    r.vy = rise;
  }
  return event;
}

export function atGoal(w: World, r: Rover): boolean {
  return Math.hypot(r.x - w.goal.x, r.z - w.goal.z) < w.goal.r && Math.abs(r.speed) < 1.2 && r.lift === 0;
}

// ---------------------------------------------------------------- muestras
export type SampleId = 'genesis' | 'basalt' | 'breccia' | 'green' | 'clod';

export interface Sample {
  id: SampleId;
  name: string;
  /** Qué dice Houston si la eliges. */
  verdict: string;
}

/** Las cinco candidatas del borde del cráter Spur. Todas existen en las muestras del Apolo 15. */
export const SAMPLES: Sample[] = [
  { id: 'genesis', name: 'Anortosita', verdict: '¡Esa es! Blanca, con cristales que brillan: una anortosita de la corteza original de la Luna.' },
  { id: 'basalt', name: 'Basalto', verdict: 'Eso es basalto: lava oscura enfriada, como la de los mares lunares. No es la que buscamos.' },
  { id: 'breccia', name: 'Brecha', verdict: 'Es una brecha: trozos de roca pegados por los impactos de meteoritos. Sigue buscando.' },
  { id: 'green', name: 'Suelo verde', verdict: '¡Suelo verde! Son bolitas de vidrio volcánico, otro hallazgo real del Apolo 15… pero hoy buscamos otra.' },
  { id: 'clod', name: 'Terrón', verdict: 'Solo era un terrón de polvo lunar: se deshizo en la pinza.' },
];
