/**
 * Efectos ligeros: partículas aditivas (llamas de propulsores, polvo) y destellos.
 * Todo con BufferGeometry + PointsMaterial; sin texturas externas (textura radial en canvas).
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  Points,
  PointsMaterial,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Blending, Texture } from 'three';

let glowTex: Texture | null = null;
/** Textura radial suave compartida (no se libera hasta descargar la página). */
export function glowTexture(): Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new CanvasTexture(c);
  return glowTex;
}

export interface ParticleOptions {
  max: number;
  size: number;
  start: Color | string | number;
  end: Color | string | number;
  blending?: Blending;
  opacity?: number;
}

/**
 * Sistema de partículas en espacio mundo. Con blending aditivo, el color se desvanece
 * hacia `end` (usar negro para que "desaparezca").
 */
export class ParticleSystem {
  readonly points: Points;
  private pos: Float32Array;
  private col: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private cursor = 0;
  private c0: Color;
  private c1: Color;
  private tmp = new Color();
  drag = 1.6;
  gravity = 0;

  constructor(opts: ParticleOptions) {
    const n = opts.max;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new BufferAttribute(this.col, 3));
    const mat = new PointsMaterial({
      size: opts.size,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: opts.opacity ?? 1,
      depthWrite: false,
      blending: opts.blending ?? AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new Points(geo, mat);
    this.points.frustumCulled = false;
    this.c0 = new Color(opts.start);
    this.c1 = new Color(opts.end);
  }

  emit(p: Vector3, v: Vector3, life: number): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.life.length;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  update(dt: number): void {
    const n = this.life.length;
    const damp = Math.exp(-this.drag * dt);
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = i * 3;
      if (this.life[i] <= 0) {
        this.pos[k + 1] = -9999;
        this.col[k] = this.col[k + 1] = this.col[k + 2] = 0;
        continue;
      }
      this.vel[k] *= damp;
      this.vel[k + 1] = this.vel[k + 1] * damp - this.gravity * dt;
      this.vel[k + 2] *= damp;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.tmp.copy(this.c0).lerp(this.c1, t);
      this.col[k] = this.tmp.r;
      this.col[k + 1] = this.tmp.g;
      this.col[k + 2] = this.tmp.b;
    }
    const geo = this.points.geometry;
    (geo.attributes.position as BufferAttribute).needsUpdate = true;
    (geo.attributes.color as BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    (this.points.material as PointsMaterial).dispose();
  }
}

const _p = new Vector3();
const _d = new Vector3();
const _q = new Quaternion();
const _v = new Vector3();

/**
 * Llamas de propulsores: un cono aditivo pegado a cada thruster + partículas en mundo.
 * `intensity` 0..1 controla tamaño del cono y tasa de emisión.
 */
export class ThrusterFlames {
  intensity = 0;
  private particles: ParticleSystem;
  private smoke: ParticleSystem;
  private cones: Group[] = [];
  private coneMat: MeshBasicMaterial;
  private coreMat: MeshBasicMaterial;
  private coneGeo: ConeGeometry;
  private acc = 0;
  private time = 0;

  constructor(private thrusters: Object3D[], private world: Object3D, scale = 1) {
    this.particles = new ParticleSystem({ max: 420, size: 0.32 * scale, start: 0xfff1b8, end: 0x000000 });
    this.particles.drag = 2.2;
    this.smoke = new ParticleSystem({
      max: 160,
      size: 0.7 * scale,
      start: 0x5a5470,
      end: 0x000000,
      opacity: 0.5,
    });
    this.smoke.drag = 1.2;
    world.add(this.particles.points, this.smoke.points);
    // cono con la base en el origen del thruster y la punta hacia -Y local
    this.coneGeo = new ConeGeometry(0.11 * scale, 0.6 * scale, 10, 1, true);
    this.coneGeo.rotateX(Math.PI);
    this.coneGeo.translate(0, -0.3 * scale, 0);
    this.coneMat = new MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.coreMat = new MeshBasicMaterial({
      color: 0xfff6d5,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    for (const t of thrusters) {
      const g = new Group();
      const outer = new Mesh(this.coneGeo, this.coneMat);
      const core = new Mesh(this.coneGeo, this.coreMat);
      core.scale.set(0.5, 0.6, 0.5);
      g.add(outer, core);
      g.userData.fx = true;
      t.add(g);
      this.cones.push(g);
    }
    this.setVisible(false);
  }

  private setVisible(v: boolean) {
    for (const c of this.cones) c.visible = v;
  }

  update(dt: number): void {
    this.time += dt;
    const k = this.intensity;
    this.setVisible(k > 0.02);
    for (let i = 0; i < this.cones.length; i++) {
      const flick = 0.85 + Math.sin(this.time * 38 + i * 2.1) * 0.1 + Math.random() * 0.12;
      const s = Math.max(0.001, k) * flick;
      this.cones[i].scale.set(0.6 + 0.4 * s, s * 1.4, 0.6 + 0.4 * s);
    }
    this.coneMat.opacity = 0.75 * Math.min(1, k * 1.5);
    this.coreMat.opacity = 0.9 * Math.min(1, k * 1.5);
    // emisión
    if (k > 0.02 && this.thrusters.length) {
      this.acc += dt * 260 * k;
      while (this.acc >= 1) {
        this.acc -= 1;
        const t = this.thrusters[(Math.random() * this.thrusters.length) | 0];
        t.getWorldPosition(_p);
        t.getWorldQuaternion(_q);
        _d.set(0, -1, 0).applyQuaternion(_q);
        const speed = 2.2 + Math.random() * 2.5 * k;
        _v.copy(_d)
          .multiplyScalar(speed)
          .add(new Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.8));
        this.particles.emit(_p, _v, 0.25 + Math.random() * 0.35);
        if (Math.random() < 0.18) {
          _v.multiplyScalar(0.35);
          this.smoke.emit(_p, _v, 0.8 + Math.random() * 0.8);
        }
      }
    }
    this.particles.update(dt);
    this.smoke.update(dt);
  }

  dispose(): void {
    for (const c of this.cones) c.removeFromParent();
    this.coneGeo.dispose();
    this.coneMat.dispose();
    this.coreMat.dispose();
    this.particles.dispose();
    this.smoke.dispose();
  }
}

/** Ráfaga radial de polvo (aterrizaje). Devuelve el sistema para actualizarlo. */
export function dustBurst(world: Object3D, at: Vector3, color: Color | string | number, count = 140, scale = 1): ParticleSystem {
  const ps = new ParticleSystem({
    max: count,
    size: 0.55 * scale,
    start: color,
    end: 0x000000,
    blending: NormalBlending,
    opacity: 0.75,
  });
  ps.drag = 2.4;
  ps.gravity = 0.4;
  world.add(ps.points);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (1.5 + Math.random() * 3.5) * scale;
    _v.set(Math.cos(a) * sp, Math.random() * 1.2 * scale, Math.sin(a) * sp);
    _p.copy(at).add(new Vector3(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3));
    ps.emit(_p, _v, 0.8 + Math.random() * 1.1);
  }
  return ps;
}

/** Sprite de destello aditivo (para animar su escala/opacidad con GSAP). */
export function flashSprite(color: Color | string | number = 0xffffff): Sprite {
  const mat = new SpriteMaterial({
    map: glowTexture(),
    color: new Color(color),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const s = new Sprite(mat);
  s.renderOrder = 999;
  return s;
}

export function disposeSprite(s: Sprite): void {
  s.removeFromParent();
  s.material.dispose();
}

/** Campo de estrellas 3D (Points) para fondos de escenas. */
export function starPoints(count = 900, radius = 60): Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = radius * (0.6 + Math.random() * 0.4);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = -Math.abs(r * s * Math.sin(th)) - 8;
    c.setHSL(0.62 + Math.random() * 0.15, 0.4, 0.6 + Math.random() * 0.4);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  const mat = new PointsMaterial({
    size: 0.25,
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return new Points(geo, mat);
}
