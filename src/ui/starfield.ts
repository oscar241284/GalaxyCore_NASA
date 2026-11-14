/** Fondo de estrellas en canvas 2D: 3 capas con parallax (puntero) y titileo. */
import { reducedMotion } from '../router';

interface Star {
  x: number;
  y: number;
  r: number;
  layer: number;
  phase: number;
  speed: number;
  hue: number;
}

export interface Starfield {
  canvas: HTMLCanvasElement;
  destroy(): void;
}

export function createStarfield(host: HTMLElement, density = 1): Starfield {
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  host.prepend(canvas);
  const ctx = canvas.getContext('2d')!;
  let stars: Star[] = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let mx = 0;
  let my = 0;
  let px = 0;
  let py = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = host.clientWidth || window.innerWidth;
    h = host.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const n = Math.round(((w * h) / 2600) * density);
    stars = Array.from({ length: n }, () => {
      const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + layer * 0.45 + Math.random() * 0.5,
        layer,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 2.2,
        hue: Math.random() < 0.15 ? 270 : Math.random() < 0.2 ? 30 : 220,
      };
    });
  };

  const onMove = (e: PointerEvent) => {
    mx = e.clientX / w - 0.5;
    my = e.clientY / h - 0.5;
  };

  const draw = (t: number) => {
    raf = requestAnimationFrame(draw);
    const time = t / 1000;
    px += (mx - px) * 0.05;
    py += (my - py) * 0.05;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const depth = (s.layer + 1) * 10;
      // deriva lenta + parallax
      let x = s.x - px * depth * 2 + (reducedMotion ? 0 : time * (s.layer + 1) * 1.5);
      const y = s.y - py * depth * 2;
      x = ((x % w) + w) % w;
      const tw = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = `hsl(${s.hue} 80% ${80 + s.layer * 6}%)`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.layer === 2 && tw > 0.85) {
        ctx.globalAlpha = (tw - 0.85) * 3;
        ctx.fillRect(x - s.r * 3, y - 0.3, s.r * 6, 0.6);
        ctx.fillRect(x - 0.3, y - s.r * 3, 0.6, s.r * 6);
      }
    }
    ctx.globalAlpha = 1;
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove);
  raf = requestAnimationFrame(draw);

  return {
    canvas,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      // el canvas se queda (congelado) para el fade-out; se elimina con su pantalla
    },
  };
}
