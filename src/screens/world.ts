import {
  AdditiveBlending,
  AmbientLight,
  Box3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  Quaternion,
  Scene,
  SpotLight,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import type { RobotId, RobotModel } from '../types';
import { buildRobot } from '../three/robots/index';
import { ROBOTS, ROBOT_ORDER } from '../data/robots';
import { onFrame, onResizeStage, registerDisposer, setView, size } from '../three/stage';
import { starPoints, ThrusterFlames } from '../three/effects';

export const CAM_Z = 10;
export const FOV = 40;
const PODIUM_H = 0.7;
const CONTENT_H = 2.15;
const COMPACT_SCALE = 0.8;
export const COMPACT_REGION = 0.62;

export type WorldMode = 'podiums' | 'launch' | 'puzzle' | 'final';

interface PieceHome {
  pos: Vector3;
  quat: Quaternion;
  scale: Vector3;
}

interface MatState {
  m: Material;
  opacity: number;
  transparent: boolean;
}

export interface Slot {
  id: RobotId;
  index: number;
  root: Group;
  podiumMats: MatState[];
  robotMats: MatState[];
  ringMat: MeshStandardMaterial;
  robot: RobotModel;
  pieceHomes: PieceHome[];
  spot: SpotLight;
  beam: Mesh;
  beamMat: MeshBasicMaterial;
  celebrate: PointLight;
  hover: number;
  hoverTarget: number;
  spin: number;
  done: boolean;
}

export interface World {
  scene: Scene;
  camera: PerspectiveCamera;
  slots: Slot[];
  mode: WorldMode;
  layout: { compact: number };
  stars: Points;
  flames: ThrusterFlames | null;
  slot(id: RobotId): Slot;
  applyLayout(): void;
  heroPose(): { pos: Vector3; scale: number };
  toScreen(p: Vector3): { x: number; y: number };
  podiumBase(i: number): Vector3;
  fadePodium(slot: Slot, v: number): void;
  fadeRobot(slot: Slot, v: number): void;
  ensureFlames(slot: Slot): ThrusterFlames;
  disposeFlames(): void;
  resetCamera(): void;
  resetAll(): void;
  activate(): void;
  ambient: AmbientLight;
  heroLight: DirectionalLight;
}

let world: World | null = null;

export function getWorld(): World {
  if (world) return world;
  world = createWorld();
  return world;
}

function cloneMaterials(obj: Object3D, out: MatState[]) {
  const map = new Map<Material, Material>();
  obj.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: Material) => {
      let c = map.get(m);
      if (!c) {
        c = m.clone();
        map.set(m, c);
        out.push({ m: c, opacity: c.opacity, transparent: c.transparent });
      }
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
}

function repivotPieces(model: RobotModel) {
  const g = model.group;
  g.updateMatrixWorld(true);
  const box = new Box3();
  const c = new Vector3();
  for (const p of model.pieces) {
    box.setFromObject(p);
    if (box.isEmpty()) continue;
    box.getCenter(c);
    const cLocalPiece = p.worldToLocal(c.clone());
    for (const child of p.children) child.position.sub(cLocalPiece);
    const cGroup = g.worldToLocal(c.clone());
    p.position.copy(cGroup);
    p.updateMatrixWorld(true);
  }
}

function setFade(states: MatState[], v: number) {
  for (const s of states) {
    const wantT = s.transparent || v < 0.999;
    if (s.m.transparent !== wantT) {
      s.m.transparent = wantT;
      s.m.needsUpdate = true;
    }
    s.m.opacity = s.opacity * v;
    s.m.depthWrite = v > 0.5;
    s.m.visible = v > 0.01;
  }
}

function createWorld(): World {
  const scene = new Scene();
  const { w, h } = size();
  const camera = new PerspectiveCamera(FOV, w / h, 0.1, 200);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  const ambient = new AmbientLight(0x8a8cff, 0.35);
  const hemi = new HemisphereLight(0x5560a0, 0x0a0710, 0.45);
  const key = new DirectionalLight(0xc9c4ff, 0.5);
  key.position.set(-3, 6, 8);
  const rim = new DirectionalLight(0x8b5cf6, 0.6);
  rim.position.set(4, 3, -6);
  const heroLight = new DirectionalLight(0xfff4e6, 0);
  heroLight.position.set(1.5, 4, 12);
  scene.add(ambient, hemi, key, rim, heroLight);

  const stars = starPoints(900, 70);
  scene.add(stars);

  const podGeo = new CylinderGeometry(1.0, 1.15, PODIUM_H, 8);
  const capGeo = new CylinderGeometry(1.05, 1.05, 0.06, 8);
  const ringGeo = new TorusGeometry(1.08, 0.035, 6, 32);
  const beamGeo = new ConeGeometry(1.25, 4.2, 24, 1, true);
  const ownGeos = [podGeo, capGeo, ringGeo, beamGeo];
  const ownMats: Material[] = [];

  const slots: Slot[] = ROBOT_ORDER.map((id, index) => {
    const data = ROBOTS[id];
    const root = new Group();
    root.name = `slot-${id}`;
    const podiumMats: MatState[] = [];
    const podMat = new MeshStandardMaterial({ color: 0x23202f, metalness: 0.6, roughness: 0.45, flatShading: true });
    const capMat = new MeshStandardMaterial({ color: 0x35304a, metalness: 0.5, roughness: 0.5, flatShading: true });
    const ringMat = new MeshStandardMaterial({
      color: 0x111111,
      emissive: new Color(data.accent),
      emissiveIntensity: 0.25,
      flatShading: true,
    });
    const beamMat = new MeshBasicMaterial({
      color: 0xfff4dc,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    ownMats.push(podMat, capMat, ringMat, beamMat);
    for (const m of [podMat, capMat, ringMat]) podiumMats.push({ m, opacity: 1, transparent: false });

    const pod = new Mesh(podGeo, podMat);
    pod.position.y = PODIUM_H / 2;
    const cap = new Mesh(capGeo, capMat);
    cap.position.y = PODIUM_H + 0.03;
    const ring = new Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = PODIUM_H + 0.02;
    root.add(pod, cap, ring);

    const robot = buildRobot(id);
    robot.group.position.set(0, 0, 0);
    repivotPieces(robot);
    const robotMats: MatState[] = [];
    cloneMaterials(robot.group, robotMats);
    const pieceHomes = robot.pieces.map((p) => ({
      pos: p.position.clone(),
      quat: p.quaternion.clone(),
      scale: p.scale.clone(),
    }));
    robot.group.position.y = PODIUM_H + 0.06;
    root.add(robot.group);

    const spot = new SpotLight(0xfff1d6, 0, 0, 0.42, 0.65, 0);
    spot.position.set(0, 5.2, 2.2);
    spot.target.position.set(0, 1.2, 0);
    root.add(spot, spot.target);

    const beam = new Mesh(beamGeo, beamMat);
    beam.position.set(0, PODIUM_H + 2.1, 0.15);
    beam.renderOrder = 5;
    root.add(beam);

    const celebrate = new PointLight(0xffffff, 0, 8, 1.2);
    celebrate.position.set(0, 3.2, 1.5);
    root.add(celebrate);

    scene.add(root);
    return {
      id,
      index,
      root,
      podiumMats,
      robotMats,
      ringMat,
      robot,
      pieceHomes,
      spot,
      beam,
      beamMat,
      celebrate,
      hover: 0,
      hoverTarget: 0,
      spin: 0,
      done: false,
    };
  });

  const layout = { compact: 0 };
  const tmp = new Vector3();

  const frustumAt = (dist: number) => {
    const hh = Math.tan(MathUtils.degToRad(FOV / 2)) * dist;
    return { hh, hw: hh * camera.aspect };
  };

  const slotLayout = (k: number) => {
    const { hh, hw } = frustumAt(CAM_Z);
    const H = hh * 2;
    const cw = (hw * 2) / ROBOT_ORDER.length;
    const sN = Math.min(cw / 2.75, (H * 0.6) / CONTENT_H);
    const sC = sN * COMPACT_SCALE;
    const baseN = -0.05 * H - (CONTENT_H * sN) / 2;
    const regionTop = H / 2 - 0.105 * H;
    const regionBottom = H / 2 - COMPACT_REGION * H;
    const baseC = Math.max(regionBottom + 0.2 * H, regionTop - CONTENT_H * sC);
    return { s: MathUtils.lerp(sN, sC, k), base: MathUtils.lerp(baseN, baseC, k), cw, hw };
  };

  const applyLayout = () => {
    const { s, base, cw, hw } = slotLayout(layout.compact);
    for (const sl of slots) {
      sl.root.position.set(-hw + cw * (sl.index + 0.5), base, 0);
      sl.root.scale.setScalar(s);
    }
  };

  const heroPose = () => {
    const dist = 5;
    const { hh, hw } = frustumAt(dist);
    const scale = Math.min(1.15, (hw * 2 * 0.55) / 2.2, (hh * 2 * 0.48) / 1.4);
    return { pos: new Vector3(0, -0.62 * scale, CAM_Z - dist), scale };
  };

  const toScreen = (p: Vector3) => {
    const { w: sw, h: sh } = size();
    tmp.copy(p).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * sw, y: (-tmp.y * 0.5 + 0.5) * sh };
  };

  const podiumBase = (i: number) => {
    const { s, base, cw, hw } = slotLayout(layout.compact);
    void s;
    return new Vector3(-hw + cw * (i + 0.5), base, 0);
  };

  let flames: ThrusterFlames | null = null;

  const W: World = {
    scene,
    camera,
    slots,
    mode: 'podiums',
    layout,
    stars,
    ambient,
    heroLight,
    get flames() {
      return flames;
    },
    set flames(f) {
      flames = f;
    },
    slot: (id) => slots.find((s) => s.id === id)!,
    applyLayout,
    heroPose,
    toScreen,
    podiumBase,
    fadePodium: (sl, v) => {
      setFade(sl.podiumMats, v);
      sl.beam.visible = v > 0.01;
    },
    fadeRobot: (sl, v) => setFade(sl.robotMats, v),
    ensureFlames(sl) {
      if (flames) return flames;
      flames = new ThrusterFlames(sl.robot.thrusters, scene);
      return flames;
    },
    disposeFlames() {
      flames?.dispose();
      flames = null;
    },
    resetCamera() {
      camera.position.set(0, 0, CAM_Z);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    },
    resetAll() {
      W.disposeFlames();
      W.resetCamera();
      scene.fog = null;
      heroLight.intensity = 0;
      for (const sl of slots) {
        const g = sl.robot.group;
        sl.root.add(g);
        g.position.set(0, PODIUM_H + 0.06, 0);
        g.rotation.set(0, 0, 0);
        g.scale.setScalar(1);
        g.visible = true;
        sl.robot.pieces.forEach((p, i) => {
          const hm = sl.pieceHomes[i];
          p.position.copy(hm.pos);
          p.quaternion.copy(hm.quat);
          p.scale.copy(hm.scale);
          p.visible = true;
        });
        W.fadePodium(sl, 1);
        W.fadeRobot(sl, 1);
        sl.hover = sl.hoverTarget = 0;
        sl.spin = 0;
        sl.spot.intensity = 0;
        sl.spot.color.set(0xfff1d6);
        sl.beamMat.opacity = 0;
        sl.celebrate.intensity = 0;
        sl.root.visible = true;
      }
      layout.compact = 0;
      applyLayout();
    },
    activate() {
      setView(scene, camera);
      applyLayout();
    },
  };

  const offFrame = onFrame((dt, t) => {
    stars.rotation.y = t * 0.004;
    stars.rotation.x = Math.sin(t * 0.05) * 0.02;
    W.flames?.update(dt);
    if (W.mode !== 'podiums' && W.mode !== 'final') return;
    for (const sl of slots) {
      sl.hover += (sl.hoverTarget - sl.hover) * Math.min(1, dt * 7);
      sl.spot.intensity = sl.hover * 9;
      sl.beamMat.opacity = sl.hover * 0.09;
      sl.spin += (sl.hoverTarget * 0.9 - sl.spin) * Math.min(1, dt * 3);
      sl.robot.group.rotation.y += sl.spin * dt;
      sl.ringMat.emissiveIntensity = 0.2 + sl.hover * 1.4 + (sl.done ? 0.6 : 0);
    }
  });
  const offResize = onResizeStage(() => applyLayout());

  registerDisposer(() => {
    offFrame();
    offResize();
    W.disposeFlames();
    for (const sl of slots) {
      for (const s of sl.robotMats) s.m.dispose();
      sl.spot.dispose();
      sl.celebrate.dispose();
    }
    ownGeos.forEach((g) => g.dispose());
    ownMats.forEach((m) => m.dispose());
    stars.geometry.dispose();
    (stars.material as Material).dispose();
    scene.clear();
    world = null;
  });

  applyLayout();
  void tmp;
  return W;
}
