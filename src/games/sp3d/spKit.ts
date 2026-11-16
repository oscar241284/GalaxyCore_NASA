import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DynamicDrawUsage, Points, PointsMaterial, Sprite, SpriteMaterial, Vector3 } from 'three';
import { createRover, type Rover, type World } from '../op3d/world';

export const SP_ACCENT = '#3b82f6';
export const SP_SOFT = '#93c5fd';

export function spiritRover(world: World, x = 0, z = 0, heading = 0): Rover {
  return createRover(world, x, z, heading, { name: 'spirit', accent: SP_ACCENT });
}

export function glowTexture(rgb = '255,255,255'): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.35, `rgba(${rgb},.45)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function glowSprite(tex: CanvasTexture, color: string, scale: number): Sprite {
  const s = new Sprite(new SpriteMaterial({ map: tex, color: new Color(color), blending: AdditiveBlending, transparent: true, depthWrite: false }));
  s.scale.setScalar(scale);
  return s;
}

export function textSprite(text: string, color = '#ffffff', bg = 'rgba(10,20,40,.72)'): Sprite {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = '800 44px system-ui, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 48;
  c.width = w;
  c.height = 76;
  g.font = font;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(0, 0, w, 76, 38);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, 40);
  const tex = new CanvasTexture(c);
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.renderOrder = 10;
  s.scale.set((w / 76) * 0.55, 0.55, 1);
  return s;
}

export interface Burst {
  emit: (at: Vector3, n: number, spread?: number, up?: number) => void;
  update: (dt: number) => void;
}

export function createBurst(world: World, color = '#d9a273', size = 0.55, N = 700): Burst {
  const pos = new Float32Array(N * 3).fill(-9999);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage));
  const tex = glowTexture('255,255,255');
  const mat = new PointsMaterial({ color, size, map: tex, transparent: true, opacity: 0.8, depthWrite: false });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  world.scene.add(pts);
  let head = 0;
  return {
    emit: (at, n, spread = 3, up = 2.5) => {
      for (let k = 0; k < n; k++) {
        const i = head;
        head = (head + 1) % N;
        const a = Math.random() * Math.PI * 2;
        const sp = spread * (0.3 + Math.random() * 0.7);
        pos[i * 3] = at.x + Math.cos(a) * 0.3;
        pos[i * 3 + 1] = at.y + Math.random() * 0.2;
        pos[i * 3 + 2] = at.z + Math.sin(a) * 0.3;
        vel[i * 3] = Math.cos(a) * sp;
        vel[i * 3 + 1] = up * (0.4 + Math.random() * 0.8);
        vel[i * 3 + 2] = Math.sin(a) * sp;
        life[i] = 1 + Math.random() * 0.8;
      }
    },
    update: (dt) => {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -9999;
          continue;
        }
        const drag = 1 - Math.min(1, dt * 1.6);
        vel[i * 3] *= drag;
        vel[i * 3 + 2] *= drag;
        vel[i * 3 + 1] = vel[i * 3 + 1] * drag - 1.2 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export const SP_CSS = `
.sp3-alt { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 46px; height: min(52vh, 420px); border-radius: 23px; background: rgba(8,14,30,.6); border: 1px solid rgba(147,197,253,.35); backdrop-filter: blur(6px); pointer-events: none; }
.sp3-alt__zone { position: absolute; left: 8px; right: 8px; border-radius: 8px; background: rgba(34,197,94,.75); box-shadow: 0 0 16px rgba(34,197,94,.8); transition: top .3s, height .3s; }
.sp3-alt__mark { position: absolute; left: -10px; right: -10px; height: 4px; margin-top: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 10px #fff; }
.sp3-alt__mark::after { content: ''; position: absolute; right: -12px; top: -6px; border: 8px solid transparent; border-right-color: #fff; }
.sp3-steps { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; font-size: 14px; font-weight: 700; }
.sp3-steps li { color: rgba(255,255,255,.5); }
.sp3-steps li.now { color: #fff; }
.sp3-steps li.now::before { content: '▶ '; color: #93c5fd; }
.sp3-steps li.done { color: #86efac; }
.sp3-steps li.done::after { content: ' ✓'; }
.sp3-go { min-height: 80px !important; min-width: 250px; font-size: 21px !important; }
.sp3-go.ready { animation: sp3-ready .8s ease-in-out infinite; }
@keyframes sp3-ready { 50% { box-shadow: 0 5px 0 #0f6b32, 0 0 34px rgba(34,197,94,.95); transform: scale(1.04); } }
.sp3-flash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle, rgba(255,200,140,.0), rgba(255,140,60,.35)); opacity: 0; transition: opacity .2s; }
.sp3-pad { position: absolute; left: 18px; bottom: 20px; display: grid; grid-template-columns: repeat(3, 72px); grid-template-rows: repeat(2, 64px); gap: 8px; }
.sp3-pad .lk-btn { min-height: 0; padding: 4px; flex-direction: column; gap: 0; font-size: 12px; background: rgba(8,14,30,.7); backdrop-filter: blur(6px); }
.sp3-pad .lk-btn b { font-size: 24px; line-height: 1; }
.sp3-pad .lk-btn.held { border-color: #67e8f9; background: rgba(14,116,144,.75); transform: translateY(3px); }
.sp3-pad [data-k="back"] { border-color: #22c55e; }
.sp3-lens { width: 220px; height: 220px; border-radius: 50%; border: 6px solid #1f2937; box-shadow: 0 0 0 3px #93c5fd, 0 10px 24px rgba(0,0,0,.5); }
.sp3-lab { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: start; }
.sp3-lab h3 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 24px; }
.sp3-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.sp3-row .lk-btn { flex: 1 1 160px; }
.sp3-clue { margin: 6px 0; padding: 10px 12px; border-radius: 12px; font-size: 15px; line-height: 1.45; background: rgba(147,197,253,.12); border-left: 4px solid #93c5fd; }
.sp3-clue[hidden] { display: none; }
.sp3-book { display: flex; gap: 6px; }
.sp3-book i { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font-style: normal; font-size: 15px; background: rgba(255,255,255,.08); border: 2px dashed rgba(255,255,255,.25); }
.sp3-book i.water { border: 2px solid #38bdf8; background: rgba(56,189,248,.2); }
.sp3-book i.lava { border: 2px solid #f97316; background: rgba(249,115,22,.2); }
.sp3-sink { display: grid; grid-template-columns: repeat(10, 12px); gap: 3px; margin-top: 4px; }
.sp3-sink i { height: 18px; border-radius: 4px; background: rgba(255,255,255,.12); }
.sp3-sink i.on { background: #f59e0b; } .sp3-sink i.hot { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.sp3-legend { display: grid; gap: 4px; font-size: 12px; font-weight: 700; }
.sp3-legend span { display: flex; gap: 6px; align-items: center; }
.sp3-legend i { width: 14px; height: 14px; border-radius: 4px; }
@media (max-width: 760px) {
  .sp3-alt { height: 36vh; top: 42%; }
  .sp3-lab { grid-template-columns: 1fr; justify-items: center; }
  .sp3-lens { width: 180px; height: 180px; }
  .sp3-pad { grid-template-columns: repeat(3, 62px); grid-template-rows: repeat(2, 56px); }
  .sp3-go { min-width: 0; }
}
`;

let cssDone = false;
export function injectSpCss(): void {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement('style');
  s.textContent = SP_CSS;
  document.head.appendChild(s);
}
