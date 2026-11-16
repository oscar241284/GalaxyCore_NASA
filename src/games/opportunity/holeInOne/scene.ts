/**
 * HOYO EN UNO · escena 3D low-poly (three.js).
 *
 * Solo dibuja: recibe el estado que calcula `physics.ts` y lo muestra. Todo el escenario es
 * geometría procedural (sin fotos de fondo), inspirado en las imágenes de NASA/JPL del
 * lugar de aterrizaje: llanura oscura y lisa, cráter Eagle con roca clara en el borde,
 * marcas de los rebotes, paracaídas y carcasa que caen lejos.
 *
 * Usa su propio WebGLRenderer sobre el canvas del juego (el escenario principal queda
 * oculto mientras hay un minijuego abierto) y lo libera en `dispose()`.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  Points,
  Quaternion,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
} from 'three';
import type { Sprite } from 'three';
import gsap from 'gsap';
import { ParticleSystem, disposeSprite, flashSprite, glowTexture } from '../../../three/effects';
import { buildRobot } from '../../../three/robots';
import { Bin, hash } from '../../shared/three';
import { BALL_R, FIELD, TRACE_MAX, heightAt } from './physics';
import type { AimAid, Ball, Crater, Descent, Prediction, Terrain } from './physics';

// ---------------------------------------------------------------- paleta
const SKY_HORIZON = '#dcae82'; // cielo marciano de día: polvo color caramelo
const SKY_ZENITH = '#a47a5a';
const SOIL_DARK = '#74391f'; // Meridiani: arena basáltica oscura
const SOIL_LIGHT = '#9a5631';
const CRATER_DUST = '#b9774c';
const OUTCROP = '#dcb892'; // roca clara del borde del cráter Eagle
const DUST = '#c98a5a';
const AIRBAG = '#e8dfc8';
const AIRBAG_DUSTY = '#c79568';
const HOLO = '#67e8f9'; // mismo cian que marca el objetivo en los demás juegos
const AIM = '#ffd166';
const AIM_OK = '#39ff8a';

/** Largo del cable entre los airbags y la carcasa (el real medía 20 m; aquí se acorta para verlo entero). */
const BRIDLE = 9;
const CANOPY_R = 6.5;
const MAX_MARKS = 16;
const MAX_IMPACT_DOTS = 16;
/** Tamaño del rover plegado dentro del módulo y ya desplegado. */
const ROVER_STOWED = 0.5;
const ROVER_DEPLOYED = 0.85;
/** Altura del módulo dentro de los airbags (respecto a su centro). */
const LANDER_STOWED_Y = -1.3;

export type ViewMode = 'idle' | 'descent' | 'bouncing' | 'opened';

export interface FrameState {
  mode: ViewMode;
  descent: Descent;
  ball: Ball | null;
  prediction: Prediction | null;
  /** Puntos (x, y, z) de la trayectoria prevista. */
  trace: number[];
  aid: AimAid;
  /** ¿La predicción acaba dentro del cráter Eagle? */
  onTarget: boolean;
  steer: number;
  time: number;
  dt: number;
}

export interface HoleScene {
  setTerrain(t: Terrain): void;
  reset(): void;
  resize(): void;
  frame(s: FrameState): void;
  /** Retrocohetes, corte del cable y la carcasa se aleja con el paracaídas. */
  release(): void;
  bounce(ball: Ball, speed: number): void;
  /** Desinfla los airbags, abre los pétalos y muestra el rover. */
  open(ball: Ball, onDone: () => void): void;
  dispose(): void;
}

export function createHoleScene(canvas: HTMLCanvasElement, reduceMotion: boolean): HoleScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const bin = new Bin(); // vive toda la partida
  const terrainBin = new Bin(); // se renueva al cambiar de escenario
  const tweens: gsap.core.Animation[] = [];
  const track = <T extends gsap.core.Animation>(t: T): T => {
    tweens.push(t);
    return t;
  };

  const scene = new Scene();
  scene.background = new Color(SKY_HORIZON);
  scene.fog = new Fog(SKY_HORIZON, 170, 640);
  const camera = new PerspectiveCamera(55, 1, 0.5, 1600);
  camera.position.set(0, 44, 46);

  scene.add(new HemisphereLight('#ffe2c4', '#6b3a22', 1.15));
  const sun = new DirectionalLight('#fff1de', 1.9);
  sun.position.set(-70, 90, 50);
  scene.add(sun);

  // ---------- cielo ----------
  const skyGeo = bin.add(new SphereGeometry(1200, 20, 10));
  {
    const pos = skyGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const lo = new Color(SKY_HORIZON);
    const hi = new Color(SKY_ZENITH);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(lo).lerp(hi, Math.min(1, Math.max(0, pos.getY(i) / 700)));
      col.set([c.r, c.g, c.b], i * 3);
    }
    skyGeo.setAttribute('color', new BufferAttribute(col, 3));
  }
  const sky = new Mesh(skyGeo, bin.add(new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })));
  const sunDisc: Sprite = flashSprite('#fff4e0'); // el Sol se ve más pequeño desde Marte
  sunDisc.material.opacity = 0.95;
  sunDisc.material.fog = false;
  sunDisc.scale.setScalar(70);
  sunDisc.position.set(-420, 330, -700);
  sky.add(sunDisc);
  scene.add(sky);

  // llanura lejana: cuatro bandas ALREDEDOR del campo de juego. No puede ser un plano entero
  // porque taparía el interior de los cráteres, que queda por debajo del nivel del suelo.
  {
    const FAR = 1600;
    const { halfWidth: hw, back, front } = FIELD;
    const quads: [number, number, number, number][] = [
      [-FAR, -hw, -FAR, FAR],
      [hw, FAR, -FAR, FAR],
      [-hw, hw, -FAR, front],
      [-hw, hw, back, FAR],
    ];
    const pos: number[] = [];
    for (const [x0, x1, z0, z1] of quads) pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
    const geo = bin.add(new BufferGeometry());
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    const soil = new Color(SOIL_DARK).lerp(new Color(SOIL_LIGHT), 0.5);
    scene.add(new Mesh(geo, bin.add(new MeshStandardMaterial({ color: soil, flatShading: true, roughness: 1, metalness: 0 }))));
  }

  // ---------- terreno (se crea en setTerrain) ----------
  const terrainGroup = new Group();
  scene.add(terrainGroup);
  let terrain: Terrain | null = null;
  let target: Object3D | null = null;
  /** El haz y el banderín se apagan al ganar para dejar ver el rover. */
  const showTargetMarkers = (on: boolean) => {
    if (!target) return;
    (target.userData.beam as Object3D).visible = on;
    (target.userData.pole as Object3D[]).forEach((o) => (o.visible = on));
  };
  const groundY = (x: number, z: number) => (terrain ? heightAt(terrain, x, z) : 0);

  const buildTerrainMesh = (t: Terrain): Mesh => {
    const geo = terrainBin.add(new BufferGeometry());
    const pos = new Float32Array(t.nx * t.nz * 3);
    const col = new Float32Array(t.nx * t.nz * 3);
    const dark = new Color(SOIL_DARK);
    const light = new Color(SOIL_LIGHT);
    const dust = new Color(CRATER_DUST);
    const rock = new Color(OUTCROP);
    const c = new Color();
    for (let j = 0; j < t.nz; j++) {
      for (let i = 0; i < t.nx; i++) {
        const k = j * t.nx + i;
        const x = t.x0 + i * t.cell;
        const z = t.z0 + j * t.cell;
        pos.set([x, t.heights[k], z], k * 3);
        c.copy(dark).lerp(light, 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.031) * Math.cos(z * 0.043) + (hash(x, z) - 0.5) * 0.5);
        for (const cr of t.craters) {
          const d = Math.hypot(x - cr.x, z - cr.z) / cr.r;
          if (d > 1.25) continue;
          c.lerp(dust, 0.45 * Math.min(1, (1.25 - d) * 2)); // polvo claro acumulado dentro
          // el Eagle deja ver roca clara en capas en la parte alta de su pared
          if (cr === t.eagle && d > 0.55 && d < 1.02 && hash(z, x) > 0.35) c.lerp(rock, 0.85);
        }
        col.set([c.r, c.g, c.b], k * 3);
      }
    }
    const idx = new Uint32Array((t.nx - 1) * (t.nz - 1) * 6);
    let n = 0;
    for (let j = 0; j < t.nz - 1; j++) {
      for (let i = 0; i < t.nx - 1; i++) {
        const a = j * t.nx + i;
        const b = a + 1;
        const d = a + t.nx;
        const e = d + 1;
        idx.set([a, d, b, b, d, e], n);
        n += 6;
      }
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 3));
    geo.setIndex(new BufferAttribute(idx, 1));
    const m = terrainBin.add(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
    return new Mesh(geo, m);
  };

  /** Piedras sueltas (pocas: Meridiani casi no tiene) y losas claras en el borde del Eagle. */
  const buildRocks = (t: Terrain): Object3D[] => {
    const dummy = new Object3D();
    const stones = new InstancedMesh(terrainBin.add(new DodecahedronGeometry(1, 0)), terrainBin.add(new MeshStandardMaterial({ color: '#5a2d1b', flatShading: true, roughness: 1 })), 70);
    for (let i = 0; i < stones.count; i++) {
      const x = (hash(i, 1.7) * 2 - 1) * 120;
      const z = 30 - hash(i, 9.1) * 500;
      const s = 0.25 + hash(i, 4.3) * 0.6;
      dummy.position.set(x, heightAt(t, x, z) + s * 0.3, z);
      dummy.rotation.set(hash(i, 2) * 6, hash(i, 3) * 6, 0);
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
    }
    const e = t.eagle;
    const slabs = new InstancedMesh(terrainBin.add(new BoxGeometry(1, 1, 1)), terrainBin.add(new MeshStandardMaterial({ color: OUTCROP, flatShading: true, roughness: 0.95 })), 34);
    for (let i = 0; i < slabs.count; i++) {
      const a = Math.PI * (0.15 + 1.3 * (i / slabs.count)) + hash(i, 5) * 0.2;
      const d = e.r * (0.72 + hash(i, 6) * 0.24);
      const x = e.x + Math.cos(a) * d;
      const z = e.z - Math.sin(a) * d;
      dummy.position.set(x, heightAt(t, x, z) + 0.1, z);
      dummy.rotation.set(0, -a + (hash(i, 7) - 0.5), (hash(i, 8) - 0.5) * 0.3);
      dummy.scale.set(1.2 + hash(i, 9) * 2.2, 0.25 + hash(i, 10) * 0.3, 0.8 + hash(i, 11) * 1.2);
      dummy.updateMatrix();
      slabs.setMatrixAt(i, dummy.matrix);
    }
    return [stones, slabs];
  };

  /** Señales del objetivo: aro en el borde, haz de luz y banderín (¡es un hoyo de golf!). */
  const buildTarget = (t: Terrain, e: Crater): Object3D => {
    const g = new Group();
    const floor = heightAt(t, e.x, e.z);
    g.position.set(e.x, floor, e.z);
    const ring = new Mesh(terrainBin.add(new TorusGeometry(e.r, 0.28, 6, 56)), terrainBin.add(new MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0.85, fog: false })));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = e.depth + e.rim + 0.5;
    const beam = new Mesh(
      terrainBin.add(new CylinderGeometry(1.4, 1.4, 90, 12, 1, true)),
      terrainBin.add(new MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide, fog: false })),
    );
    beam.position.y = 45;
    const pole = new Mesh(terrainBin.add(new CylinderGeometry(0.12, 0.12, 11, 6)), terrainBin.add(new MeshStandardMaterial({ color: '#f1f1f1', roughness: 0.6 })));
    pole.position.y = 5.5;
    const flagGeo = terrainBin.add(new BufferGeometry());
    flagGeo.setAttribute('position', new BufferAttribute(new Float32Array([0, 11, 0, 0, 8.4, 0, 4.2, 9.7, 0]), 3));
    const flag = new Mesh(flagGeo, terrainBin.add(new MeshBasicMaterial({ color: '#f59e0b', side: DoubleSide })));
    g.add(ring, beam, pole, flag);
    g.userData.beam = beam;
    g.userData.pole = [pole, flag];
    return g;
  };

  // ---------- ayuda de puntería ----------
  const aimMat = bin.add(new MeshBasicMaterial({ color: AIM, transparent: true, opacity: 0.95, depthTest: false, fog: false, side: DoubleSide }));
  const aimRing = new Mesh(bin.add(new RingGeometry(BALL_R * 1.15, BALL_R * 1.75, 36)), aimMat);
  aimRing.rotation.x = -Math.PI / 2;
  aimRing.renderOrder = 20;
  const aimBeam = new Mesh(
    bin.add(new CylinderGeometry(0.45, 0.45, 34, 8, 1, true)),
    bin.add(new MeshBasicMaterial({ color: AIM, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, fog: false })),
  );
  aimBeam.position.z = 17; // el aro está tumbado: su eje Z local apunta hacia arriba
  aimBeam.rotation.x = Math.PI / 2;
  aimRing.add(aimBeam);
  const dotGeo = bin.add(new CircleGeometry(1.1, 14));
  const dotMat = bin.add(new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthTest: false, fog: false }));
  const impactDots = Array.from({ length: MAX_IMPACT_DOTS }, () => {
    const m = new Mesh(dotGeo, dotMat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 19;
    m.visible = false;
    return m;
  });
  const traceGeo = bin.add(new BufferGeometry());
  const tracePos = new Float32Array(TRACE_MAX * 3);
  traceGeo.setAttribute('position', new BufferAttribute(tracePos, 3));
  const tracePts = new Points(traceGeo, bin.add(new PointsMaterial({ color: AIM, size: 1.3, map: glowTexture(), transparent: true, depthWrite: false, fog: false })));
  tracePts.frustumCulled = false;
  const aimGroup = new Group();
  aimGroup.add(aimRing, tracePts, ...impactDots);
  scene.add(aimGroup);

  // ---------- sombra y marcas de rebote ----------
  const shadow = new Mesh(bin.add(new CircleGeometry(BALL_R * 1.05, 24)), bin.add(new MeshBasicMaterial({ color: '#1a0a05', transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  const markGeo = bin.add(new CircleGeometry(BALL_R * 0.95, 18));
  const markMat = bin.add(new MeshBasicMaterial({ color: '#3d1a0c', transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  const marks = Array.from({ length: MAX_MARKS }, () => {
    const m = new Mesh(markGeo, markMat);
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    return m;
  });
  let markCursor = 0;

  // ---------- módulo con airbags ----------
  const ballPivot = new Group(); // posición + aplastamiento al rebotar
  const bags = new Group(); // gira al rodar
  const bagMat = bin.add(new MeshStandardMaterial({ color: AIRBAG, flatShading: true, roughness: 0.92, metalness: 0 }));
  const lobeGeo = bin.add(new IcosahedronGeometry(1, 1));
  const core = new Mesh(lobeGeo, bagMat);
  core.scale.setScalar(BALL_R * 0.66);
  bags.add(core);
  // 4 airbags de 6 lóbulos cada uno = 24 lóbulos repartidos sobre una esfera
  const lobes: Mesh[] = [];
  for (let i = 0; i < 24; i++) {
    const y = 1 - (2 * (i + 0.5)) / 24;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    const lobe = new Mesh(lobeGeo, bagMat);
    lobe.position.set(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(BALL_R * 0.6);
    lobe.scale.setScalar(BALL_R * 0.44);
    lobes.push(lobe);
    bags.add(lobe);
  }
  ballPivot.add(bags);
  scene.add(ballPivot);
  const bagClean = new Color(AIRBAG);
  const bagDusty = new Color(AIRBAG_DUSTY);

  // módulo de aterrizaje (tetraedro de pétalos) con el rover dentro: se ve al ganar
  const lander = new Group();
  lander.visible = false;
  const petalMat = bin.add(new MeshStandardMaterial({ color: '#e9e7e1', flatShading: true, roughness: 0.8, metalness: 0.1, side: DoubleSide }));
  const BASE_R = 2.1;
  const EDGE = BASE_R * Math.sqrt(3);
  const triGeo = bin.add(new BufferGeometry());
  triGeo.setAttribute('position', new BufferAttribute(new Float32Array([-EDGE / 2, 0, 0, EDGE / 2, 0, 0, 0, 0, (EDGE * Math.sqrt(3)) / 2]), 3));
  triGeo.computeVertexNormals();
  const base = new Mesh(triGeo, petalMat);
  base.position.z = -BASE_R / 2;
  lander.add(base);
  const PETAL_CLOSED = -1.91; // ángulo entre caras de un tetraedro
  const petals: Group[] = [];
  for (const deg of [-90, 30, 150]) {
    const a = (deg * Math.PI) / 180;
    const hinge = new Group();
    hinge.position.set(Math.cos(a) * (BASE_R / 2), 0, Math.sin(a) * (BASE_R / 2));
    hinge.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
    const fold = new Group();
    fold.rotation.x = PETAL_CLOSED;
    fold.add(new Mesh(triGeo, petalMat));
    hinge.add(fold);
    petals.push(fold);
    lander.add(hinge);
  }
  const rover = buildRobot('opportunity').group; // materiales y geometrías en caché compartida: no se liberan aquí
  rover.scale.setScalar(ROVER_STOWED);
  rover.position.y = 0.06;
  lander.add(rover);
  ballPivot.add(lander);

  // ---------- paracaídas + carcasa ----------
  const chute = new Group();
  {
    const canopyGeo = bin.add(new SphereGeometry(CANOPY_R, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed());
    const p = canopyGeo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const white = new Color('#f2efe8');
    const orange = new Color('#e8703a');
    for (let f = 0; f < p.count; f += 3) {
      const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3;
      const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      const gore = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 12 + 1e-4);
      const c = gore % 2 ? orange : white;
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f + v) * 3);
    }
    canopyGeo.setAttribute('color', new BufferAttribute(col, 3));
    const canopy = new Mesh(canopyGeo, bin.add(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: DoubleSide })));
    const shellTop = BRIDLE + 2.6;
    const rimY = shellTop + 11;
    canopy.position.y = rimY;
    const shell = new Mesh(bin.add(new ConeGeometry(2.3, 2.6, 14)), bin.add(new MeshStandardMaterial({ color: '#cdbb9c', flatShading: true, roughness: 0.8 })));
    shell.position.y = BRIDLE + 1.3;
    const lines: number[] = [0, BALL_R * 0.9, 0, 0, BRIDLE, 0]; // cable (bridle)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      lines.push(0, shellTop, 0, Math.cos(a) * CANOPY_R, rimY, Math.sin(a) * CANOPY_R);
    }
    const lineGeo = bin.add(new BufferGeometry());
    lineGeo.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
    const cords = new LineSegments(lineGeo, bin.add(new LineBasicMaterial({ color: '#f3ede2', transparent: true, opacity: 0.8 })));
    chute.add(canopy, shell, cords);
    chute.userData.cords = cords;
  }
  // llamas: retrocohetes RAD (frenan la caída) y cohetes laterales TIRS
  const flameMat = bin.add(new MeshBasicMaterial({ color: '#ffb057', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, fog: false }));
  const flameGeo = bin.add(new ConeGeometry(0.55, 5, 8));
  const radFlames = new Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const f = new Mesh(flameGeo, flameMat);
    f.rotation.x = Math.PI; // punta hacia abajo
    f.position.set(Math.cos(a) * 1.5, BRIDLE - 2.4, Math.sin(a) * 1.5);
    radFlames.add(f);
  }
  radFlames.visible = false;
  const tirs: Sprite[] = [-1, 1].map((side) => {
    const s = flashSprite('#ffc070');
    s.scale.setScalar(4.5);
    s.position.set(side * 3, BRIDLE + 1.2, 0);
    chute.add(s);
    return s;
  });
  const radFlash = flashSprite('#ffd9a0');
  radFlash.position.y = BRIDLE - 1;
  chute.add(radFlames, radFlash);
  scene.add(chute);

  // ---------- polvo ----------
  const bursts: { ps: ParticleSystem; age: number }[] = [];
  const _v = new Vector3();
  const _p = new Vector3();
  const _look = new Vector3(0, 0, -60);
  const _wantPos = new Vector3();
  const _wantLook = new Vector3();
  const _axis = new Vector3();
  const UPRIGHT = new Quaternion();
  let shake = 0;
  let orbit = 0;
  let released = false;
  let snapCamera = true;

  /** Nube de polvo de un impacto: se aclara hasta el color del suelo y desaparece. */
  const dustPuff = (x: number, y: number, z: number, scale: number): ParticleSystem => {
    const count = 90;
    const ps = new ParticleSystem({ max: count, size: 0.7 * scale, start: DUST, end: SOIL_LIGHT, blending: NormalBlending, opacity: 0.7 });
    ps.drag = 2.2;
    ps.gravity = 0.5;
    scene.add(ps.points);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.5 + Math.random() * 3.5) * scale;
      _p.set(x + Math.cos(a) * 0.6, y, z + Math.sin(a) * 0.6);
      _v.set(Math.cos(a) * sp, Math.random() * 1.6 * scale, Math.sin(a) * sp);
      ps.emit(_p, _v, 0.9 + Math.random() * 1.2);
    }
    return ps;
  };

  const setTerrain = (t: Terrain) => {
    terrain = t;
    terrainGroup.clear();
    terrainBin.empty();
    target = buildTarget(t, t.eagle);
    terrainGroup.add(buildTerrainMesh(t), ...buildRocks(t), target);
  };

  const killTweens = () => {
    tweens.forEach((t) => t.kill());
    tweens.length = 0;
  };

  const reset = () => {
    killTweens();
    bursts.forEach((b) => b.ps.dispose());
    bursts.length = 0;
    marks.forEach((m) => (m.visible = false));
    markCursor = 0;
    released = false;
    snapCamera = true;
    shake = 0;
    orbit = 0;
    chute.visible = true;
    chute.rotation.set(0, 0, 0);
    chute.scale.setScalar(1);
    (chute.userData.cords as LineSegments).visible = true;
    radFlames.visible = false;
    radFlames.scale.setScalar(1);
    radFlash.material.opacity = 0;
    tirs.forEach((s) => (s.material.opacity = 0));
    ballPivot.scale.setScalar(1);
    bags.visible = true;
    bags.scale.setScalar(1);
    bags.position.y = 0;
    bags.quaternion.identity();
    lobes.forEach((l) => l.scale.setScalar(BALL_R * 0.44));
    core.scale.setScalar(BALL_R * 0.66);
    bagMat.color.copy(bagClean);
    lander.visible = false;
    lander.position.y = LANDER_STOWED_Y;
    rover.scale.setScalar(ROVER_STOWED);
    petals.forEach((p) => (p.rotation.x = PETAL_CLOSED));
    aimGroup.visible = true;
    showTargetMarkers(true);
  };

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const updateAim = (s: FrameState) => {
    const p = s.prediction;
    aimGroup.visible = s.mode === 'descent' && !!p;
    if (!aimGroup.visible || !p) return;
    aimMat.color.set(s.onTarget ? AIM_OK : AIM);
    (aimBeam.material as MeshBasicMaterial).color.copy(aimMat.color);
    const showRest = s.aid !== 'impact';
    // sin guía completa, el aro marca solo el primer bote
    const at = showRest || !p.impacts.length ? p.rest : { x: p.impacts[0][0], z: p.impacts[0][1] };
    aimRing.position.set(at.x, groundY(at.x, at.z) + 0.3, at.z);
    aimRing.scale.setScalar(1 + 0.08 * Math.sin(s.time * 6));
    const showPath = s.aid === 'path';
    impactDots.forEach((dot, i) => {
      dot.visible = showPath && i < p.impacts.length;
      if (dot.visible) dot.position.set(p.impacts[i][0], groundY(p.impacts[i][0], p.impacts[i][1]) + 0.25, p.impacts[i][1]);
    });
    tracePts.visible = showPath;
    if (showPath) {
      const n = Math.min(s.trace.length, tracePos.length);
      for (let i = 0; i < n; i++) tracePos[i] = s.trace[i];
      traceGeo.attributes.position.needsUpdate = true;
      traceGeo.setDrawRange(0, n / 3);
    }
  };

  const updateCamera = (s: FrameState) => {
    const wide = camera.aspect < 1 ? 1.6 : 1; // en vertical hay que alejarse más
    const b = s.ball;
    if (s.mode === 'opened' && b) {
      orbit += s.dt * 0.35;
      _wantPos.set(b.x + Math.sin(orbit) * 8.5 * wide, b.y + 4, b.z + Math.cos(orbit) * 8.5 * wide);
      _wantLook.set(b.x, b.y - 1, b.z);
    } else if (s.mode === 'bouncing' && b) {
      const g = groundY(b.x, b.z);
      const h = b.y - g;
      _wantPos.set(b.x + 15 * wide, g + 9 + h * 0.35, b.z + 31 * wide);
      _wantLook.set(b.x, g + h * 0.6, b.z - 6);
    } else {
      const d = s.descent;
      const g = groundY(d.x, d.z);
      const e = terrain?.eagle;
      _wantPos.set(d.x, g + d.alt + 19, d.z + 62 * wide);
      _wantLook.set(d.x + ((e?.x ?? d.x) - d.x) * 0.3, g + 9, d.z - 40);
    }
    const k = snapCamera ? 1 : 1 - Math.exp(-(s.mode === 'bouncing' ? 4 : 2.5) * s.dt);
    snapCamera = false;
    camera.position.lerp(_wantPos, k);
    _look.lerp(_wantLook, k);
    // la cámara nunca se mete bajo el suelo (por ejemplo, al seguir al módulo dentro de un cráter)
    camera.position.y = Math.max(camera.position.y, groundY(camera.position.x, camera.position.z) + 2.5);
    camera.lookAt(_look);
    if (shake > 0.01 && !reduceMotion) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= Math.exp(-6 * s.dt);
    }
    sky.position.copy(camera.position);
  };

  const frame = (s: FrameState) => {
    const d = s.descent;
    const b = s.ball;
    const px = b ? b.x : d.x;
    const pz = b ? b.z : d.z;
    const g = groundY(px, pz);
    const py = b ? b.y : g + d.alt + BALL_R;
    ballPivot.position.set(px, py, pz);

    if (b && b.mode !== 'rest') {
      // gira según avanza, como una pelota
      const speed = Math.hypot(b.vx, b.vz);
      if (speed > 0.05) bags.rotateOnWorldAxis(_axis.set(b.vz, 0, -b.vx).normalize(), (speed / BALL_R) * s.dt);
    }

    if (!released) {
      chute.position.copy(ballPivot.position);
      chute.rotation.z = -d.vx * 0.03 + Math.sin(s.time * 0.9) * 0.03;
      chute.rotation.x = Math.sin(s.time * 0.7 + 1) * 0.025;
      tirs[0].material.opacity = s.steer > 0 ? 0.9 : 0; // empuja a la derecha: sale por la izquierda
      tirs[1].material.opacity = s.steer < 0 ? 0.9 : 0;
    }

    const h = py - BALL_R - g;
    shadow.position.set(px, g + 0.15, pz);
    shadow.scale.setScalar(1 / (1 + h * 0.035));
    (shadow.material as MeshBasicMaterial).opacity = 0.45 / (1 + h * 0.06);

    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      burst.age += s.dt;
      burst.ps.update(s.dt);
      if (burst.age > 2.6) {
        burst.ps.dispose();
        bursts.splice(i, 1);
      }
    }

    updateAim(s);
    updateCamera(s);
    renderer.render(scene, camera);
  };

  const release = () => {
    released = true;
    tirs.forEach((s) => (s.material.opacity = 0));
    (chute.userData.cords as LineSegments).visible = true;
    radFlames.visible = true;
    radFlames.scale.set(1, 1, 1);
    radFlash.scale.setScalar(16);
    radFlash.material.opacity = 1;
    shake = 0.5;
    track(gsap.to(radFlash.material, { opacity: 0, duration: 0.7, ease: 'power2.out' }));
    track(gsap.to(radFlames.scale, { x: 0.2, y: 0.05, z: 0.2, duration: 1.1, ease: 'power2.in', onComplete: () => void (radFlames.visible = false) }));
    // sin el peso del módulo, la carcasa sube y el viento se la lleva lejos (como en la foto orbital)
    track(gsap.to(chute.position, { y: '+=38', z: '-=60', x: '+=26', duration: 7, ease: 'power1.out' }));
    track(gsap.to(chute.rotation, { z: 0.5, x: -0.3, duration: 7, ease: 'power1.inOut', onComplete: () => void (chute.visible = false) }));
  };

  const bounce = (b: Ball, speed: number) => {
    const g = groundY(b.x, b.z);
    const mark = marks[markCursor++ % MAX_MARKS];
    mark.position.set(b.x, g + 0.12, b.z);
    mark.scale.setScalar(0.6 + Math.min(0.6, speed * 0.05));
    mark.visible = true;
    bursts.push({ ps: dustPuff(b.x, g + 0.3, b.z, 1.2 + speed * 0.22), age: 0 });
    shake = Math.min(0.9, speed * 0.07);
    bagMat.color.copy(bagClean).lerp(bagDusty, Math.min(1, b.bounces / 9)); // el polvo marciano los tiñe
    if (!reduceMotion) {
      const squash = Math.max(0.6, 1 - speed * 0.035);
      track(gsap.fromTo(ballPivot.scale, { x: 2 - squash, y: squash, z: 2 - squash }, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' }));
    }
  };

  const open = (b: Ball, onDone: () => void) => {
    orbit = Math.atan2(camera.position.x - b.x, camera.position.z - b.z);
    lander.visible = true;
    showTargetMarkers(false);
    const fast = reduceMotion ? 0.01 : 1;
    const tl = track(gsap.timeline({ onComplete: onDone }));
    // 1) los airbags se desinflan y se recogen (primero se enderezan: el aplastado es en vertical)
    const turn = { t: 0 };
    tl.to(turn, { t: 1, duration: 0.7 * fast, ease: 'power1.inOut', onUpdate: () => void bags.quaternion.slerp(UPRIGHT, turn.t) }, 0);
    tl.to(lobes.map((l) => l.scale), { x: BALL_R * 0.16, y: BALL_R * 0.16, z: BALL_R * 0.16, duration: 1.8 * fast, ease: 'power1.inOut' }, 0);
    tl.to(core.scale, { x: BALL_R * 0.2, y: BALL_R * 0.2, z: BALL_R * 0.2, duration: 1.8 * fast, ease: 'power1.inOut' }, 0);
    tl.to(bags.scale, { x: 1.5, y: 0.12, z: 1.5, duration: 1.8 * fast, ease: 'power1.inOut' }, 0);
    tl.to(bags.position, { y: -BALL_R + 0.15, duration: 1.8 * fast, ease: 'power1.inOut' }, 0);
    tl.to(lander.position, { y: -BALL_R + 0.3, duration: 1.8 * fast, ease: 'power1.inOut' }, 0);
    // 2) los pétalos se abren (así el módulo se endereza solo, caiga como caiga)
    tl.to(petals.map((p) => p.rotation), { x: 0.06, duration: 1.6 * fast, ease: 'power2.inOut', stagger: 0.18 * fast }, 1.5 * fast);
    // 3) el rover, que viajó plegado, se despliega
    tl.to(rover.scale, { x: ROVER_DEPLOYED, y: ROVER_DEPLOYED, z: ROVER_DEPLOYED, duration: 1.2 * fast, ease: 'back.out(1.4)' }, 2.6 * fast);
    tl.to({}, { duration: 0.9 * fast });
  };

  const dispose = () => {
    killTweens();
    bursts.forEach((b) => b.ps.dispose());
    [sunDisc, radFlash, ...tirs].forEach(disposeSprite);
    terrainBin.empty();
    bin.empty();
    renderer.dispose();
  };

  resize();
  reset();
  return { setTerrain, reset, resize, frame, release, bounce, open, dispose };
}
