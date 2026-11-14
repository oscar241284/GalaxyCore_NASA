import type { Body } from '../types';

/** PRNG determinista (mulberry32). */
function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

const COLORS: Record<Body, { light: string; mid: string; dark: string; speck: string }> = {
  moon: { light: '#b9bbc1', mid: '#85878e', dark: '#4a4c52', speck: '#2f3035' },
  mars: { light: '#e09a68', mid: '#a9542e', dark: '#62260f', speck: '#3e170a' },
};

/**
 * SVG completo de una piedra irregular (viewBox 0 0 140 110), determinista por `seed`.
 * El centro (aprox. 24..116 x 30..80) queda limpio para superponer texto.
 */
export function stoneSVG(body: Body, seed: number): string {
  const r = rng(seed + 1);
  const c = COLORS[body];
  const id = `st-${body}-${seed}`;
  const n = 11;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.25;
    const k = 0.76 + r() * 0.24;
    pts.push([70 + Math.cos(t) * 64 * k, 56 + Math.sin(t) * 48 * k]);
  }
  // Contorno suavizado con curvas cuadráticas entre puntos medios
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    d += i === 0 ? `M${f(mx)},${f(my)}` : '';
    const nb = pts[(i + 2) % n];
    const mx2 = (b[0] + nb[0]) / 2;
    const my2 = (b[1] + nb[1]) / 2;
    d += ` Q${f(b[0])},${f(b[1])} ${f(mx2)},${f(my2)}`;
  }
  d += 'Z';

  // Facetas (low-poly) cerca del borde superior izquierdo
  let facets = '';
  for (let i = 0; i < 3; i++) {
    const a = pts[(7 + i) % n];
    const b = pts[(8 + i) % n];
    facets += `<polygon points="${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(70 + (r() - 0.5) * 20)},${f(40 + r() * 10)}" fill="#fff" opacity="${f(0.05 + r() * 0.07)}"/>`;
  }

  // Pequeños cráteres/poros evitando el centro
  let specks = '';
  for (let i = 0; i < 14; i++) {
    const t = r() * Math.PI * 2;
    const rad = 0.72 + r() * 0.2;
    const x = 70 + Math.cos(t) * 60 * rad;
    const y = 56 + Math.sin(t) * 44 * rad;
    const s = 1 + r() * 2.4;
    specks += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${c.speck}" opacity="0.55"/><circle cx="${f(x - s * 0.3)}" cy="${f(y - s * 0.3)}" r="${f(s * 0.5)}" fill="${c.light}" opacity="0.35"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 110" width="140" height="110" aria-hidden="true">
<defs>
  <radialGradient id="${id}-g" cx="0.38" cy="0.32" r="0.8">
    <stop offset="0" stop-color="${c.light}"/>
    <stop offset="0.55" stop-color="${c.mid}"/>
    <stop offset="1" stop-color="${c.dark}"/>
  </radialGradient>
  <radialGradient id="${id}-c" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#000" stop-opacity="0.38"/>
    <stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-t" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="${seed % 97}"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 0.9"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
</defs>
<ellipse cx="72" cy="102" rx="52" ry="6" fill="#000" opacity="0.35"/>
<path d="${d}" fill="url(#${id}-g)" stroke="${c.dark}" stroke-width="1.5"/>
<path d="${d}" fill="#000" filter="url(#${id}-t)" opacity="0.35"/>
${facets}
${specks}
<ellipse cx="70" cy="56" rx="48" ry="26" fill="url(#${id}-c)"/>
</svg>`;
}
