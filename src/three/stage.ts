import { PerspectiveCamera, Scene, SRGBColorSpace, ACESFilmicToneMapping, WebGLRenderer } from 'three';
import type { Camera } from 'three';

export type FrameFn = (dt: number, elapsed: number) => void;
export type ResizeFn = (w: number, h: number) => void;

let renderer: WebGLRenderer | null = null;
let view: { scene: Scene; camera: Camera } | null = null;
let rafId = 0;
let running = false;
let last = 0;
let elapsed = 0;
const frameFns = new Set<FrameFn>();
const resizeFns = new Set<ResizeFn>();
const disposers = new Set<() => void>();

function ensure(): WebGLRenderer {
  if (renderer) return renderer;
  renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const c = renderer.domElement;
  c.className = 'stage-canvas';
  Object.assign(c.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    opacity: '0',
    transition: 'opacity .5s ease',
    pointerEvents: 'none',
    touchAction: 'none',
  } as Partial<CSSStyleDeclaration>);
  const host = document.querySelector('.app') ?? document.body;
  host.prepend(c);
  window.addEventListener('resize', onResize);
  return renderer;
}

function onResize() {
  if (!renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  if (view && view.camera instanceof PerspectiveCamera) {
    view.camera.aspect = w / h;
    view.camera.updateProjectionMatrix();
  }
  resizeFns.forEach((f) => f(w, h));
}

function loop() {
  if (!running || !renderer) return;
  rafId = requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  elapsed += dt;
  const t = elapsed;
  frameFns.forEach((f) => f(dt, t));
  if (view) renderer.render(view.scene, view.camera);
}

export function getRenderer(): WebGLRenderer {
  return ensure();
}

export function getCanvas(): HTMLCanvasElement {
  return ensure().domElement;
}

export function size(): { w: number; h: number } {
  return { w: window.innerWidth, h: window.innerHeight };
}

export function showStage(): void {
  const r = ensure();
  r.domElement.style.opacity = '1';
  if (!running) {
    running = true;
    last = performance.now();
    loop();
  }
}

export function hideStage(): void {
  if (!renderer) return;
  renderer.domElement.style.opacity = '0';
  window.setTimeout(() => {
    if (renderer && renderer.domElement.style.opacity === '0') {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }, 550);
}

export function isRunning(): boolean {
  return running;
}

export function setView(scene: Scene, camera: Camera): void {
  view = { scene, camera };
  if (camera instanceof PerspectiveCamera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

export function clearView(): void {
  view = null;
  renderer?.clear();
}

export function onFrame(fn: FrameFn): () => void {
  frameFns.add(fn);
  return () => frameFns.delete(fn);
}

export function onResizeStage(fn: ResizeFn): () => void {
  resizeFns.add(fn);
  return () => resizeFns.delete(fn);
}

export function registerDisposer(fn: () => void): () => void {
  disposers.add(fn);
  return () => disposers.delete(fn);
}

export function disposeContent(): void {
  disposers.forEach((d) => {
    try {
      d();
    } catch (e) {
      console.error(e);
    }
  });
  disposers.clear();
  frameFns.clear();
  clearView();
  renderer?.renderLists.dispose();
}
