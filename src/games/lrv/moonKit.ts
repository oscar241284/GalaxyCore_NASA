/**
 * Kit lunar común a los minijuegos 3D del LRV (Apolo 15, Hadley-Apennine).
 *
 * - Malla de alturas (`HeightField`): la misma tabla sirve para la física y para dibujar.
 * - `createMoonStage`: renderer propio, cielo negro, Sol rasante, la Tierra y llanura lejana.
 * - `buildAstronaut`: figura low-poly con traje A7LB y mochila.
 * - `blobShadow`: sombra sencilla bajo vehículos y astronautas.
 *
 * En la Luna no hay aire: por eso el cielo es negro de día, no hay niebla que difumine el
 * horizonte y las sombras son muy duras.
 */
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { box, mat, mesh } from '../../three/robots/shared';
import { Bin, hash } from '../shared/three';

/** Gravedad de la Luna (m/s²): un sexto de la terrestre. */
export const MOON_G = 1.62;

export const MOON = {
  light: '#a3a19b',
  dark: '#6e6c68',
  crater: '#565451',
  rock: '#4c4a48',
  holo: '#67e8f9',
} as const;

// ---------------------------------------------------------------- malla de alturas
export interface HeightField {
  x0: number;
  z0: number;
  cell: number;
  nx: number;
  nz: number;
  heights: Float32Array;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function makeField(b: Bounds, cell: number, heightFn: (x: number, z: number) => number): HeightField {
  const nx = Math.round((b.maxX - b.minX) / cell) + 1;
  const nz = Math.round((b.maxZ - b.minZ) / cell) + 1;
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) heights[j * nx + i] = heightFn(b.minX + i * cell, b.minZ + j * cell);
  return { x0: b.minX, z0: b.minZ, cell, nx, nz, heights };
}

/** Altura del suelo (interpolación bilineal). */
export function fieldHeight(f: HeightField, x: number, z: number): number {
  const fx = Math.min(f.nx - 1.001, Math.max(0, (x - f.x0) / f.cell));
  const fz = Math.min(f.nz - 1.001, Math.max(0, (z - f.z0) / f.cell));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const k = j * f.nx + i;
  const h = f.heights;
  return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + f.nx] * (1 - u) + h[k + f.nx + 1] * u) * v;
}

/** Perfil de un cráter de impacto: cuenco con el borde levantado. Devuelve la altura a sumar. */
export function craterProfile(dist: number, r: number, depth: number, rim: number): number {
  const d = dist / r;
  if (d > 1.9) return 0;
  const lip = rim * Math.exp(-(((d - 1) / 0.28) ** 2));
  return d < 1 ? lip - depth * (1 - d * d) : lip;
}

/** Malla low-poly del terreno. `paint` escribe en `out` el color de cada vértice. */
export function fieldMesh(f: HeightField, bin: Bin, paint: (x: number, z: number, h: number, out: Color) => void): Mesh {
  const geo = bin.add(new BufferGeometry());
  const pos = new Float32Array(f.nx * f.nz * 3);
  const col = new Float32Array(f.nx * f.nz * 3);
  const c = new Color();
  for (let j = 0; j < f.nz; j++) {
    for (let i = 0; i < f.nx; i++) {
      const k = j * f.nx + i;
      const x = f.x0 + i * f.cell;
      const z = f.z0 + j * f.cell;
      pos.set([x, f.heights[k], z], k * 3);
      paint(x, z, f.heights[k], c);
      col.set([c.r, c.g, c.b], k * 3);
    }
  }
  const idx = new Uint32Array((f.nx - 1) * (f.nz - 1) * 6);
  let n = 0;
  for (let j = 0; j < f.nz - 1; j++) {
    for (let i = 0; i < f.nx - 1; i++) {
      const a = j * f.nx + i;
      const d = a + f.nx;
      idx.set([a, d, a + 1, a + 1, d, d + 1], n);
      n += 6;
    }
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setIndex(new BufferAttribute(idx, 1));
  return new Mesh(geo, bin.add(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 })));
}

/** Color base del regolito, con manchas suaves. */
export function regolith(x: number, z: number, out: Color): void {
  out.set(MOON.dark).lerp(_light, 0.5 + 0.35 * Math.sin(x * 0.07 + z * 0.045) * Math.cos(z * 0.06) + (hash(x, z) - 0.5) * 0.4);
}
const _light = new Color(MOON.light);

// ---------------------------------------------------------------- escenario
export interface MoonStage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Recursos que viven toda la partida. */
  bin: Bin;
  resize(): void;
  render(): void;
  dispose(): void;
}

/**
 * Crea el renderer y la escena lunar base. `ground` son los límites de la malla de terreno:
 * alrededor se añade una llanura lejana (nunca encima, para no tapar cráteres ni valles).
 */
export function createMoonStage(canvas: HTMLCanvasElement, ground: Bounds, fov = 55): MoonStage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const bin = new Bin();
  const scene = new Scene();
  scene.background = new Color('#000000');
  const camera = new PerspectiveCamera(fov, 1, 0.3, 4000);

  // Sol bajo (era la mañana lunar) y muy poca luz de relleno: sombras duras
  scene.add(new HemisphereLight('#9aa0b4', '#2b2a2e', 0.6));
  const sun = new DirectionalLight('#fff6e8', 2.7);
  sun.position.set(-80, 55, 40);
  scene.add(sun);

  // estrellas tenues y la Tierra, que desde la Luna no se mueve en el cielo
  const starPos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const e = 0.08 + hash(i, 2) * 1.4;
    starPos.set([Math.cos(a) * Math.cos(e) * 3000, Math.sin(e) * 3000, Math.sin(a) * Math.cos(e) * 3000], i * 3);
  }
  const starGeo = bin.add(new BufferGeometry());
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const sky = new Group();
  sky.add(new Points(starGeo, bin.add(new PointsMaterial({ color: '#cfd6ff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.55 }))));
  const earth = new Mesh(bin.add(new IcosahedronGeometry(120, 2)), bin.add(new MeshStandardMaterial({ color: '#3b74d9', flatShading: true, roughness: 0.8, emissive: '#0b2a66', emissiveIntensity: 0.5 })));
  earth.position.set(900, 1500, -2400);
  const clouds = new Mesh(bin.add(new IcosahedronGeometry(123, 1)), bin.add(new MeshStandardMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.45 })));
  earth.add(clouds);
  sky.add(earth);
  scene.add(sky);

  // llanura lejana: cuatro bandas alrededor del terreno
  {
    const FAR = 3000;
    const g = ground;
    const quads: [number, number, number, number][] = [
      [-FAR, g.minX, -FAR, FAR],
      [g.maxX, FAR, -FAR, FAR],
      [g.minX, g.maxX, -FAR, g.minZ],
      [g.minX, g.maxX, g.maxZ, FAR],
    ];
    const pos: number[] = [];
    for (const [x0, x1, z0, z1] of quads) pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
    const geo = bin.add(new BufferGeometry());
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    const soil = new Color(MOON.dark).lerp(new Color(MOON.light), 0.5);
    scene.add(new Mesh(geo, bin.add(new MeshStandardMaterial({ color: soil, flatShading: true, roughness: 1, metalness: 0 }))));
  }

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  return {
    renderer,
    scene,
    camera,
    bin,
    resize,
    render: () => {
      sky.position.copy(camera.position); // el cielo acompaña a la cámara: está "infinitamente" lejos
      renderer.render(scene, camera);
    },
    dispose: () => {
      bin.empty();
      renderer.dispose();
    },
  };
}

/**
 * Macizos lejanos de los Apeninos lunares: [x, z, radio, altura]. Son montañas redondeadas
 * (sin agua ni viento que las afile), así que se dibujan como cúpulas medio enterradas.
 */
export function addMassifs(scene: Scene, bin: Bin, list: [number, number, number, number][]): void {
  const geo = bin.add(new IcosahedronGeometry(1, 1));
  const material = bin.add(new MeshStandardMaterial({ color: '#8f8d88', flatShading: true, roughness: 1 }));
  for (const [x, z, r, h] of list) {
    const m = new Mesh(geo, material);
    m.position.set(x, -h * 0.12, z);
    m.scale.set(r, h, r * 0.8);
    m.rotation.y = hash(x, z) * 6;
    scene.add(m);
  }
}

/** Sombra circular oscura para pegar al suelo bajo un objeto. */
export function blobShadow(bin: Bin, radius: number): Mesh {
  const m = new Mesh(
    bin.add(new CircleGeometry(radius, 20)),
    bin.add(new MeshBasicMaterial({ color: '#050505', transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---------------------------------------------------------------- astronauta
export interface Astronaut {
  group: Group;
  legs: [Mesh, Mesh];
  arms: [Mesh, Mesh];
}

/**
 * Astronauta de ~1,9 m, de pie sobre y = 0 y mirando hacia +Z. El comandante llevaba
 * franjas rojas en el traje para distinguirlo en las fotos: `stripes` las añade.
 * Usa materiales y geometrías de la caché compartida de los robots (no se liberan aquí).
 */
export function buildAstronaut(stripes: boolean): Astronaut {
  const suit = mat('#eceae4', { metalness: 0.05, roughness: 0.9 });
  const grey = mat('#b9b7b2', { metalness: 0.1, roughness: 0.8 });
  const visor = mat('#c79a2e', { metalness: 0.9, roughness: 0.2 });
  const red = mat('#d0342c', { metalness: 0.1, roughness: 0.7 });
  const group = new Group();
  const legs = [-0.16, 0.16].map((x) => box(0.24, 0.85, 0.28, suit, x, 0.43, 0)) as [Mesh, Mesh];
  const torso = box(0.62, 0.7, 0.4, suit, 0, 1.2, 0);
  const pack = box(0.52, 0.8, 0.28, grey, 0, 1.28, -0.33); // mochila de soporte vital (PLSS)
  const helmet = mesh(sphere(), suit, 0, 1.78, 0);
  helmet.scale.setScalar(0.27);
  const face = mesh(sphere(), visor, 0, 1.78, 0.1);
  face.scale.set(0.21, 0.2, 0.2);
  const arms = [-0.42, 0.42].map((x) => box(0.2, 0.68, 0.22, suit, x, 1.2, 0.04)) as [Mesh, Mesh];
  group.add(...legs, torso, pack, helmet, face, ...arms);
  if (stripes) group.add(box(0.21, 0.08, 0.23, red, -0.42, 1.3, 0.04), box(0.21, 0.08, 0.23, red, 0.42, 1.3, 0.04), box(0.56, 0.05, 0.05, red, 0, 2.03, 0));
  return { group, legs, arms };
}

let sphereGeo: IcosahedronGeometry | null = null;
/** Esfera low-poly compartida (vive mientras dure la página, como la caché de los robots). */
function sphere(): IcosahedronGeometry {
  return (sphereGeo ??= new IcosahedronGeometry(1, 1));
}

/** Balanceo de piernas y brazos al andar a saltitos. `phase` avanza con la distancia recorrida. */
export function poseWalk(a: Astronaut, phase: number, amount: number): void {
  const s = Math.sin(phase) * 0.6 * amount;
  a.legs[0].rotation.x = s;
  a.legs[1].rotation.x = -s;
  a.arms[0].rotation.x = -s * 0.7;
  a.arms[1].rotation.x = s * 0.7;
}
