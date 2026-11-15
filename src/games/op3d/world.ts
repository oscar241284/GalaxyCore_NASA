import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { buildMER } from '../../three/robots/mer';
import { fbm, makeNoise, rng } from '../../ui/moonTexture';

export interface Crater {
  x: number;
  z: number;
  r: number;
  depth: number;
  rim?: number;
}

export interface WorldOpts {
  size?: number;
  seg?: number;
  seed?: number;
  craters?: Crater[];
  rocks?: number;
  hills?: number;
  clear?: { x: number; z: number; r: number }[];
}

function detailTexture(): CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgb(150,150,150)';
  g.fillRect(0, 0, S, S);
  const r = rng(3);
  const wrapDraw = (f: (ox: number, oy: number) => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) f(ox, oy);
  };
  for (let i = 0; i < 260; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 10 + r() * 60;
    const v = r() < 0.5 ? 110 : 190;
    const a = 0.05 + r() * 0.08;
    wrapDraw((ox, oy) => {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${v},${v},${v},${a})`);
      gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = gr;
      g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 0.5 + Math.pow(r(), 3) * 3.2;
    const v = r() < 0.55 ? 85 : 215;
    const a = 0.25 + r() * 0.5;
    wrapDraw((ox, oy) => {
      if (x + ox < -4 || y + oy < -4 || x + ox > S + 4 || y + oy > S + 4) return;
      g.fillStyle = `rgba(${v},${v},${v},${a})`;
      g.beginPath();
      g.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function dotTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;
const SKY_FRAG = `
uniform vec3 sunDir;
uniform float day;
uniform float storm;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 zenith = vec3(0.55, 0.38, 0.26);
  vec3 horizon = vec3(0.86, 0.66, 0.46);
  vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  vec3 blue = vec3(0.45, 0.62, 0.85);
  float sunLow = 1.0 - clamp(sunDir.y * 2.0, 0.0, 1.0);
  col = mix(col, blue, pow(s, 6.0) * (0.35 + 0.45 * sunLow) * (1.0 - storm));
  col += vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 6.0 * (1.0 - storm * 0.9);
  col += vec3(1.0, 0.9, 0.75) * pow(s, 60.0) * 0.35 * (1.0 - storm);
  col = mix(col, vec3(0.52, 0.31, 0.17) * (0.4 + 0.6 * day), storm * 0.85);
  vec3 night = vec3(0.012, 0.012, 0.03);
  float st = step(0.9965, hash(floor(d * 420.0))) * smoothstep(0.0, 0.3, d.y) * (1.0 - storm);
  night += vec3(st);
  col = mix(night, col, day);
  gl_FragColor = vec4(col, 1.0);
}`;

export interface World {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  sun: DirectionalLight;
  heightAt: (x: number, z: number) => number;
  normalAt: (x: number, z: number) => Vector3;
  setTime: (t: number) => void;
  setStorm: (k: number) => void;
  dust: { setAmount: (k: number) => void; update: (dt: number, center: Vector3) => void };
  addDevil: (x: number, z: number) => DustDevil;
  render: () => void;
  onFrame: (f: (dt: number, t: number) => void) => void;
  start: () => void;
  dispose: () => void;
  size: number;
}

export interface DustDevil {
  pos: Vector3;
  vel: Vector3;
  update: (dt: number) => void;
  remove: () => void;
}

export function createWorld(host: HTMLElement, o: WorldOpts = {}): World | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const size = o.size ?? 360;
  const seg = o.seg ?? 220;
  const seed = o.seed ?? 1;
  const craters = o.craters ?? [];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const scene = new Scene();
  const fogColor = new Color('#c99a72');
  scene.fog = new FogExp2(fogColor, 0.0045);
  const camera = new PerspectiveCamera(55, 1, 0.1, 1200);

  const nH = makeNoise(seed * 7 + 1);
  const nR = makeNoise(seed * 13 + 2);
  const hills = o.hills ?? 2.2;
  const heightAt = (x: number, z: number): number => {
    let h = (fbm(nH, x / 70 + 50, z / 70 + 50, 4) - 0.5) * hills * 2;
    h += (fbm(nR, x / 9 + 10, z / 9 + 10, 2) - 0.5) * 0.35;
    h += Math.sin(x * 0.35 + Math.sin(z * 0.05) * 3) * 0.06;
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      const rim = c.rim ?? c.depth * 0.35;
      if (d < 1) h += -c.depth * (1 - d * d) + rim * Math.pow(d, 6);
      else h += rim * Math.exp(-Math.pow((d - 1) / 0.35, 2));
    }
    return h;
  };
  const normalAt = (x: number, z: number) => {
    const e = 0.35;
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    return new Vector3(-hx, 2 * e, -hz).normalize();
  };

  const geo = new PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new Color('#b8683c');
  const dark = new Color('#7a3f22');
  const light = new Color('#d79a68');
  const nC = makeNoise(seed * 3 + 5);
  const tmp = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const k = fbm(nC, x / 40, z / 40, 3);
    tmp.copy(base).lerp(k > 0.5 ? light : dark, Math.abs(k - 0.5) * 1.3);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 0.8) tmp.lerp(dark, (0.8 - d) * 0.5);
      else if (d < 1.25) tmp.lerp(light, (1 - Math.abs(d - 1) / 0.25) * 0.25);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const detail = detailTexture();
  detail.repeat.set(size / 9, size / 9);
  const groundMat = new MeshStandardMaterial({ vertexColors: true, map: detail, bumpMap: detail, bumpScale: 0.7, roughness: 0.96, metalness: 0 });
  const ground = new Mesh(geo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  {
    const hillGeo = new PlaneGeometry(size * 3.2, size * 3.2, 120, 120);
    hillGeo.rotateX(-Math.PI / 2);
    const hp = hillGeo.attributes.position as BufferAttribute;
    const nHill = makeNoise(seed * 17 + 3);
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i);
      const z = hp.getZ(i);
      const d = Math.max(Math.abs(x), Math.abs(z));
      const k = MathUtils.smoothstep(d, size * 0.48, size * 0.9);
      hp.setY(i, -1.5 + k * (6 + fbm(nHill, x / 90, z / 90, 4) * 34));
    }
    hillGeo.computeVertexNormals();
    const hill = new Mesh(hillGeo, new MeshStandardMaterial({ color: '#a8603a', roughness: 1 }));
    hill.position.y = -0.6;
    hill.receiveShadow = false;
    scene.add(hill);
  }

  const rockGeo = new IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position as BufferAttribute;
  const rr = rng(seed + 99);
  for (let i = 0; i < rp.count; i++) {
    const v = new Vector3().fromBufferAttribute(rp, i);
    v.multiplyScalar(0.75 + rr() * 0.45);
    v.y *= 0.6;
    rp.setXYZ(i, v.x, v.y, v.z);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new MeshStandardMaterial({ color: '#6b3a24', roughness: 0.92, flatShading: true });
  const rockCount = o.rocks ?? 420;
  const rocks = new InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const m4 = new Matrix4();
  const q = new Quaternion();
  const clear = o.clear ?? [];
  let placed = 0;
  for (let i = 0; i < rockCount * 3 && placed < rockCount; i++) {
    const x = (rr() - 0.5) * size * 0.9;
    const z = (rr() - 0.5) * size * 0.9;
    if (clear.some((c) => Math.hypot(c.x - x, c.z - z) < c.r)) continue;
    const s = 0.08 + Math.pow(rr(), 5) * 1.3;
    q.setFromAxisAngle(new Vector3(rr(), rr(), rr()).normalize(), rr() * 6);
    m4.compose(new Vector3(x, heightAt(x, z) + s * 0.15, z), q, new Vector3(s, s, s));
    rocks.setMatrixAt(placed++, m4);
  }
  rocks.count = placed;
  scene.add(rocks);

  const skyMat = new ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { sunDir: { value: new Vector3(0.4, 0.5, 0.3) }, day: { value: 1 }, storm: { value: 0 } },
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new Mesh(new SphereGeometry(900, 32, 16), skyMat);
  scene.add(sky);

  const hemi = new HemisphereLight('#f3c9a0', '#6b3a22', 0.9);
  scene.add(hemi);
  const sun = new DirectionalLight('#fff1dc', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  let sunDir = new Vector3(0.4, 0.5, 0.3).normalize();
  let dayK = 1;
  let stormK = 0;
  const applyLight = () => {
    const vis = dayK * (1 - stormK * 0.85);
    sun.intensity = 2.6 * vis;
    hemi.intensity = 0.25 + 0.75 * dayK * (1 - stormK * 0.35);
    const fc = new Color('#c99a72').lerp(new Color('#8a5532'), stormK).multiplyScalar(0.15 + 0.85 * dayK);
    (scene.fog as FogExp2).color.copy(fc);
    (scene.fog as FogExp2).density = 0.0045 + stormK * 0.022;
    renderer.toneMappingExposure = 1.05 + stormK * 0.25;
  };
  const setTime = (t: number) => {
    const a = (t - 0.25) * Math.PI * 2;
    sunDir = new Vector3(Math.cos(a) * 0.85, Math.sin(a), 0.35).normalize();
    skyMat.uniforms.sunDir.value.copy(sunDir);
    dayK = MathUtils.clamp(sunDir.y * 4 + 0.15, 0, 1);
    skyMat.uniforms.day.value = dayK;
    applyLight();
  };
  const setStorm = (k: number) => {
    stormK = k;
    skyMat.uniforms.storm.value = k;
    applyLight();
  };

  const dot = dotTexture();
  const DN = 900;
  const dPos = new Float32Array(DN * 3);
  const dr = rng(seed + 7);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (dr() - 0.5) * 60;
    dPos[i * 3 + 1] = dr() * 14;
    dPos[i * 3 + 2] = (dr() - 0.5) * 60;
  }
  const dGeo = new BufferGeometry();
  dGeo.setAttribute('position', new BufferAttribute(dPos, 3).setUsage(DynamicDrawUsage));
  const dMat = new PointsMaterial({ color: '#e7b98c', size: 0.12, map: dot, transparent: true, opacity: 0.35, depthWrite: false });
  const dustPts = new Points(dGeo, dMat);
  scene.add(dustPts);
  let dustAmount = 0.35;
  const dust = {
    setAmount: (k: number) => {
      dustAmount = k;
      dMat.opacity = 0.2 + k * 0.6;
      dMat.size = 0.1 + k * 0.25;
    },
    update: (dt: number, center: Vector3) => {
      const wind = 1.5 + dustAmount * 9;
      for (let i = 0; i < DN; i++) {
        let x = dPos[i * 3] + wind * dt;
        let z = dPos[i * 3 + 2] + wind * 0.3 * dt;
        let y = dPos[i * 3 + 1] + Math.sin(i + x * 0.1) * 0.2 * dt;
        if (x - center.x > 30) x -= 60;
        if (x - center.x < -30) x += 60;
        if (z - center.z > 30) z -= 60;
        if (z - center.z < -30) z += 60;
        if (y > 14) y = 0;
        dPos[i * 3] = x;
        dPos[i * 3 + 1] = y;
        dPos[i * 3 + 2] = z;
      }
      dGeo.attributes.position.needsUpdate = true;
      dustPts.position.y = heightAt(center.x, center.z) * 0;
    },
  };

  const devils: DustDevil[] = [];
  const addDevil = (x: number, z: number): DustDevil => {
    const N = 700;
    const p = new Float32Array(N * 3);
    const meta = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      meta[i * 3] = Math.random() * Math.PI * 2;
      meta[i * 3 + 1] = Math.random() * 22;
      meta[i * 3 + 2] = 0.6 + Math.random() * 0.8;
    }
    const gg = new BufferGeometry();
    gg.setAttribute('position', new BufferAttribute(p, 3).setUsage(DynamicDrawUsage));
    const mm = new PointsMaterial({ color: '#e0ad80', size: 1.1, map: dot, transparent: true, opacity: 0.75, depthWrite: false });
    const pts = new Points(gg, mm);
    pts.frustumCulled = false;
    scene.add(pts);
    const dev: DustDevil = {
      pos: new Vector3(x, 0, z),
      vel: new Vector3(),
      update: (dt: number) => {
        dev.pos.addScaledVector(dev.vel, dt);
        const gy = heightAt(dev.pos.x, dev.pos.z);
        for (let i = 0; i < N; i++) {
          meta[i * 3] += dt * (3 + 2 / meta[i * 3 + 2]);
          meta[i * 3 + 1] += dt * 3;
          if (meta[i * 3 + 1] > 22) meta[i * 3 + 1] = 0;
          const hh = meta[i * 3 + 1];
          const rad = meta[i * 3 + 2] * (0.6 + hh * 0.12);
          p[i * 3] = dev.pos.x + Math.cos(meta[i * 3]) * rad;
          p[i * 3 + 1] = gy + hh;
          p[i * 3 + 2] = dev.pos.z + Math.sin(meta[i * 3]) * rad;
        }
        gg.attributes.position.needsUpdate = true;
      },
      remove: () => {
        scene.remove(pts);
        gg.dispose();
        mm.dispose();
        devils.splice(devils.indexOf(dev), 1);
      },
    };
    devils.push(dev);
    return dev;
  };

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  setTime(0.42);

  const frameFns: ((dt: number, t: number) => void)[] = [];
  let raf = 0;
  let last = performance.now();
  let tt = 0;
  let running = false;
  let quality = 2;
  let ftSum = 0;
  let ftN = 0;
  const adapt = (frameMs: number) => {
    ftSum += frameMs;
    ftN++;
    if (ftN < 45) return;
    const avg = ftSum / ftN;
    ftSum = ftN = 0;
    if (avg > 40 && quality > 0) {
      quality--;
      if (quality === 1) {
        renderer.setPixelRatio(1);
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      } else {
        renderer.setPixelRatio(0.7);
        renderer.shadowMap.enabled = false;
        scene.traverse((o) => {
          const m = (o as Mesh).material as Material | undefined;
          if (m) m.needsUpdate = true;
        });
      }
      resize();
    }
  };
  const loop = (now: number) => {
    if (!running) return;
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000);
    last = now;
    tt += dt;
    if (tt > 1) adapt(raw);
    for (const f of frameFns) f(dt, tt);
    const target = new Vector3();
    camera.getWorldDirection(target);
    const focus = camera.position.clone().addScaledVector(target, 12);
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(sunDir, 80);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  return {
    renderer,
    scene,
    camera,
    sun,
    heightAt,
    normalAt,
    setTime,
    setStorm,
    dust,
    addDevil,
    size,
    render: () => renderer.render(scene, camera),
    onFrame: (f) => frameFns.push(f),
    start: () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    dispose: () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      [...devils].forEach((d) => d.remove());
      scene.traverse((ob) => {
        const m = ob as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as Material | Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat && !(mat as unknown as { userData: { shared?: boolean } }).userData?.shared) mat.dispose();
      });
      [detail, dot].forEach((t: Texture) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

export interface Rover {
  group: Group;
  x: number;
  z: number;
  heading: number;
  speed: number;
  setDust: (k: number) => void;
  update: (dt: number, throttle: number, steer: number, blocked?: (x: number, z: number) => boolean) => void;
  place: () => void;
}

export function createRover(world: World, x = 0, z = 0, heading = 0): Rover {
  const model = buildMER('opportunity', '#f59e0b');
  const group = new Group();
  model.group.scale.setScalar(1.15);
  group.add(model.group);
  group.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  const panelMats: MeshStandardMaterial[] = [];
  const clean = new Color('#1d2b5e');
  const dirty = new Color('#a0623a');
  group.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const mat = m.material as MeshStandardMaterial;
    if (mat?.color && mat.color.getHexString() === '1d2b5e') {
      const c = mat.clone();
      m.material = c;
      panelMats.push(c);
    }
  });
  const wheels: Object3D[] = [];
  model.pieces.forEach((p) => {
    if (p.name === 'wheelsLeft' || p.name === 'wheelsRight') p.children.forEach((c) => c.type === 'Group' && wheels.push(c));
  });
  world.scene.add(group);

  const rover: Rover = {
    group,
    x,
    z,
    heading,
    speed: 0,
    setDust: (k: number) => {
      panelMats.forEach((m) => {
        m.color.copy(clean).lerp(dirty, k);
        m.emissiveIntensity = 0.25 * (1 - k);
      });
    },
    place: () => {
      const y = world.heightAt(rover.x, rover.z);
      group.position.set(rover.x, y, rover.z);
      const n = world.normalAt(rover.x, rover.z);
      const up = new Vector3(0, 1, 0);
      const tilt = new Quaternion().setFromUnitVectors(up, n);
      const yaw = new Quaternion().setFromAxisAngle(up, rover.heading);
      group.quaternion.copy(tilt.multiply(yaw));
    },
    update: (dt, throttle, steer, blocked) => {
      const target = throttle * 4.2;
      rover.speed += (target - rover.speed) * Math.min(1, dt * 3);
      rover.heading -= steer * dt * 1.4 * (0.35 + Math.min(1, Math.abs(rover.speed) / 3));
      const nx = rover.x + Math.sin(rover.heading) * rover.speed * dt;
      const nz = rover.z + Math.cos(rover.heading) * rover.speed * dt;
      const half = world.size / 2 - 6;
      if (blocked?.(nx, nz) || Math.abs(nx) > half || Math.abs(nz) > half) rover.speed = 0;
      else {
        rover.x = nx;
        rover.z = nz;
      }
      wheels.forEach((w) => (w.rotation.x += (rover.speed * dt) / 0.15));
      rover.place();
    },
  };
  rover.place();
  return rover;
}

export function followCam(world: World, getTarget: () => { x: number; z: number; heading: number }, host: HTMLElement) {
  let yawOff = 0;
  let dist = 7.5;
  let height = 3.6;
  let dragging = false;
  let lx = 0;
  const down = (e: PointerEvent) => {
    dragging = true;
    lx = e.clientX;
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    yawOff -= (e.clientX - lx) * 0.006;
    lx = e.clientX;
  };
  const up = () => (dragging = false);
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = MathUtils.clamp(dist + e.deltaY * 0.01, 4, 16);
    height = dist * 0.48;
  };
  host.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  host.addEventListener('wheel', wheel, { passive: false });
  const pos = new Vector3();
  const look = new Vector3();
  let init = false;
  return {
    update: (dt: number) => {
      const t = getTarget();
      if (!dragging) yawOff *= 1 - Math.min(1, dt * 0.6);
      const a = t.heading + Math.PI + yawOff;
      const want = new Vector3(t.x + Math.sin(a) * dist, 0, t.z + Math.cos(a) * dist);
      want.y = Math.max(world.heightAt(want.x, want.z) + 1.2, world.heightAt(t.x, t.z) + height);
      const lookAt = new Vector3(t.x, world.heightAt(t.x, t.z) + 1.1, t.z);
      if (!init) {
        pos.copy(want);
        look.copy(lookAt);
        init = true;
      }
      pos.lerp(want, Math.min(1, dt * 3));
      look.lerp(lookAt, Math.min(1, dt * 6));
      world.camera.position.copy(pos);
      world.camera.lookAt(look);
    },
    setDist: (d: number) => {
      dist = d;
      height = d * 0.48;
    },
    dispose: () => {
      host.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      host.removeEventListener('wheel', wheel);
    },
  };
}

export interface Controls {
  throttle: number;
  steer: number;
  dispose: () => void;
}

export function createControls(joyHost: HTMLElement): Controls {
  const keys = new Set<string>();
  const c: Controls = { throttle: 0, steer: 0, dispose: () => {} };
  let jx = 0;
  let jy = 0;
  const sync = () => {
    const kt = (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('s') ? 1 : 0);
    const ks = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
    c.throttle = kt || -jy;
    c.steer = ks || jx;
  };
  const kd = (e: KeyboardEvent) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      keys.add(k);
      sync();
    }
  };
  const ku = (e: KeyboardEvent) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
    sync();
  };
  document.addEventListener('keydown', kd);
  document.addEventListener('keyup', ku);

  joyHost.innerHTML = '<div class="opj__base"><div class="opj__knob"></div></div>';
  const baseEl = joyHost.querySelector<HTMLElement>('.opj__base')!;
  const knob = joyHost.querySelector<HTMLElement>('.opj__knob')!;
  let pid = -1;
  const setJ = (e: PointerEvent) => {
    const r = baseEl.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      dx /= l;
      dy /= l;
    }
    jx = dx;
    jy = dy;
    knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
    sync();
  };
  const jd = (e: PointerEvent) => {
    pid = e.pointerId;
    baseEl.setPointerCapture(pid);
    setJ(e);
    e.preventDefault();
  };
  const jm = (e: PointerEvent) => e.pointerId === pid && setJ(e);
  const ju = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    pid = -1;
    jx = jy = 0;
    knob.style.transform = '';
    sync();
  };
  baseEl.addEventListener('pointerdown', jd);
  baseEl.addEventListener('pointermove', jm);
  baseEl.addEventListener('pointerup', ju);
  baseEl.addEventListener('pointercancel', ju);
  c.dispose = () => {
    document.removeEventListener('keydown', kd);
    document.removeEventListener('keyup', ku);
  };
  return c;
}

export const OP_CSS = `
.op { position: absolute; inset: 0; overflow: hidden; background: #120a06; color: #fff; }
.op__canvas { position: absolute; inset: 0; }
.op__hud { position: absolute; left: 14px; right: 14px; top: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; justify-content: space-between; pointer-events: none; }
.op__card { pointer-events: auto; padding: 10px 14px; border-radius: 16px; background: rgba(20,10,6,.62); border: 1px solid rgba(255,220,180,.18); backdrop-filter: blur(8px); box-shadow: 0 8px 24px rgba(0,0,0,.35); }
.op__card small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .12em; color: #fcd34d; }
.op__card b { font-family: var(--font-mono); font-size: 22px; }
.op__task { max-width: 460px; font-size: 15px; font-weight: 700; line-height: 1.35; }
.op__task b { font-family: inherit; font-size: inherit; color: #fde68a; }
.op__say { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(620px, calc(100% - 260px)); margin: 0; pointer-events: none; }
.op__say.lk-say { background: rgba(20,10,6,.72); backdrop-filter: blur(8px); }
.opj { position: absolute; left: 22px; bottom: 22px; width: 130px; height: 130px; touch-action: none; }
.opj__base { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.08), rgba(255,255,255,.18)); border: 2px solid rgba(255,255,255,.35); display: grid; place-items: center; touch-action: none; cursor: grab; }
.opj__knob { width: 56px; height: 56px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b); box-shadow: 0 4px 14px rgba(0,0,0,.5); pointer-events: none; transition: transform .05s; }
.op__btns { position: absolute; right: 18px; bottom: 22px; display: grid; gap: 10px; justify-items: end; }
.op__btn { min-height: 56px !important; font-size: 16px !important; background: rgba(20,10,6,.7) !important; backdrop-filter: blur(6px); }
.op__center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.op__toast { padding: 14px 22px; border-radius: 18px; font-family: var(--font-ui); font-size: clamp(22px, 3.4vw, 40px); font-weight: 900; text-align: center; color: #fff; background: rgba(20,10,6,.6); text-shadow: 0 4px 20px rgba(0,0,0,.6); animation: op-pop .5s cubic-bezier(.2,1.6,.4,1); }
@keyframes op-pop { from { transform: scale(.4); opacity: 0; } }
.op__panel { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(10,5,3,.55); backdrop-filter: blur(3px); z-index: 5; }
.op__panel > div { width: min(560px, 100%); max-height: 100%; overflow-y: auto; padding: 22px; border-radius: 22px; background: rgba(28,14,8,.94); border: 2px solid #f59e0b; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.op__loading { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-ui); letter-spacing: .14em; color: #fcd34d; background: radial-gradient(circle, #3a1d0e, #120a06); }
@media (max-width: 760px) {
  .op__say { width: calc(100% - 28px); bottom: 168px; }
  .opj { width: 116px; height: 116px; }
  .op__card b { font-size: 18px; }
}
`;

let cssDone = false;
export function injectOpCss(): void {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement('style');
  s.textContent = OP_CSS;
  document.head.appendChild(s);
}
