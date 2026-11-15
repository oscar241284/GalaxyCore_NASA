import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { Material } from 'three';

const matCache = new Map<string, MeshStandardMaterial>();

export interface MatOpts {
  metalness?: number;
  roughness?: number;
  wireframe?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
}

export function mat(color: string, o: MatOpts = {}): MeshStandardMaterial {
  const key = `${color}|${o.metalness ?? 0.2}|${o.roughness ?? 0.7}|${o.wireframe ? 1 : 0}|${o.emissive ?? ''}|${o.emissiveIntensity ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      metalness: o.metalness ?? 0.2,
      roughness: o.roughness ?? 0.7,
      flatShading: true,
      wireframe: o.wireframe ?? false,
    });
    if (o.emissive) {
      m.emissive.set(o.emissive);
      m.emissiveIntensity = o.emissiveIntensity ?? 0.6;
    }
    matCache.set(key, m);
  }
  return m;
}

export const M = {
  aluminum: () => mat('#c9ccd1', { metalness: 0.6, roughness: 0.4 }),
  darkAlu: () => mat('#7d828a', { metalness: 0.55, roughness: 0.5 }),
  white: () => mat('#e9e7e1', { metalness: 0.1, roughness: 0.8 }),
  gold: () => mat('#d4a43a', { metalness: 0.75, roughness: 0.35 }),
  black: () => mat('#1b1c20', { metalness: 0.3, roughness: 0.6 }),
  solar: () => mat('#1d2b5e', { metalness: 0.5, roughness: 0.3, emissive: '#0b1a4a', emissiveIntensity: 0.25 }),
  solarFrame: () => mat('#9aa0a8', { metalness: 0.6, roughness: 0.5 }),
  rubber: () => mat('#3a3c41', { metalness: 0.1, roughness: 0.9 }),
  lens: () => mat('#0d0f18', { metalness: 0.9, roughness: 0.15, emissive: '#3b82f6', emissiveIntensity: 0.15 }),
};

const geoCache = new Map<string, BufferGeometry>();

function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
}

export function boxGeo(w: number, h: number, d: number): BoxGeometry {
  return cached(`box${w}|${h}|${d}`, () => new BoxGeometry(w, h, d));
}

export function cylGeo(rt: number, rb: number, h: number, seg = 12, open = false): CylinderGeometry {
  return cached(`cyl${rt}|${rb}|${h}|${seg}|${open}`, () => new CylinderGeometry(rt, rb, h, seg, 1, open));
}

export function mesh(geo: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function box(w: number, h: number, d: number, material: Material, x = 0, y = 0, z = 0): Mesh {
  return mesh(boxGeo(w, h, d), material, x, y, z);
}

export function cyl(
  r: number,
  h: number,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 12,
  rb = r,
): Mesh {
  return mesh(cylGeo(r, rb, h, seg), material, x, y, z);
}

const UP = new Vector3(0, 1, 0);

export function strut(a: [number, number, number], b: [number, number, number], t: number, material: Material): Mesh {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const len = va.distanceTo(vb);
  const m = mesh(boxGeo(t, 1, t), material);
  m.scale.y = len;
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(UP, vb.clone().sub(va).normalize()));
  return m;
}

export function rod(a: [number, number, number], b: [number, number, number], r: number, material: Material): Mesh {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const len = va.distanceTo(vb);
  const m = mesh(cylGeo(r, r, 1, 6), material);
  m.scale.y = len;
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(UP, vb.clone().sub(va).normalize()));
  return m;
}

export function wheel(
  r: number,
  w: number,
  tire: Material,
  hub: Material,
  meshLook?: Material,
  seg = 14,
): Group {
  const g = new Group();
  const t = mesh(cylGeo(r, r, w, seg), tire);
  t.rotation.z = Math.PI / 2;
  g.add(t);
  if (meshLook) {
    const wm = mesh(cylGeo(r * 1.02, r * 1.02, w * 1.02, seg), meshLook);
    wm.rotation.z = Math.PI / 2;
    g.add(wm);
  }
  const h = mesh(cylGeo(r * 0.38, r * 0.38, w * 1.12, 8), hub);
  h.rotation.z = Math.PI / 2;
  g.add(h);
  return g;
}

export function piece(name: string): Group {
  const g = new Group();
  g.name = name;
  return g;
}

export function thruster(x: number, y: number, z: number): Object3D {
  const o = new Object3D();
  o.name = 'thruster';
  o.position.set(x, y, z);
  return o;
}
