import type { Body, RobotId } from '../types';
import { tr as t } from '../i18n';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

interface Palette {
  base0: string;
  base1: string;
  base2: string;
  craterIn: string;
  craterOut: string;
  rim: string;
  shadow: string;
  label: string;
}

const MOON: Palette = {
  base0: '#9a9ca2',
  base1: '#7d7f86',
  base2: '#5e6067',
  craterIn: '#b4b6bb',
  craterOut: '#45474d',
  rim: '#c9cbd0',
  shadow: '#2c2d32',
  label: 'rgba(255,255,255,0.42)',
};

const MARS: Palette = {
  base0: '#d08a55',
  base1: '#b0603a',
  base2: '#7f3b22',
  craterIn: '#e0a274',
  craterOut: '#6a2c17',
  rim: '#f0bb8a',
  shadow: '#4a1d0f',
  label: 'rgba(255,240,225,0.5)',
};

function defs(p: string, pal: Palette, body: Body): string {
  const freq = body === 'moon' ? '0.012 0.016' : '0.008 0.02';
  return `<defs>
  <linearGradient id="${p}-base" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${pal.base0}"/>
    <stop offset="0.55" stop-color="${pal.base1}"/>
    <stop offset="1" stop-color="${pal.base2}"/>
  </linearGradient>
  <radialGradient id="${p}-crater" cx="0.62" cy="0.66" r="0.7">
    <stop offset="0" stop-color="${pal.craterIn}"/>
    <stop offset="0.55" stop-color="${pal.base1}"/>
    <stop offset="1" stop-color="${pal.craterOut}"/>
  </radialGradient>
  <radialGradient id="${p}-mare" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${pal.shadow}" stop-opacity="0.55"/>
    <stop offset="0.7" stop-color="${pal.shadow}" stop-opacity="0.35"/>
    <stop offset="1" stop-color="${pal.shadow}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="${p}-ridge" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${pal.rim}"/>
    <stop offset="1" stop-color="${pal.base2}"/>
  </linearGradient>
  <radialGradient id="${p}-vignette" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
  </radialGradient>
  <filter id="${p}-noise" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.1"/>
  </filter>
  <filter id="${p}-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.15"/>
  </filter>
  <filter id="${p}-soft"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;
}

function ground(p: string): string {
  return `<rect width="1000" height="600" fill="url(#${p}-base)"/>
<rect width="1000" height="600" fill="#000" filter="url(#${p}-noise)" opacity="0.22"/>`;
}

function finish(p: string): string {
  return `<rect width="1000" height="600" filter="url(#${p}-grain)" opacity="0.35"/>
<rect width="1000" height="600" fill="url(#${p}-vignette)" pointer-events="none"/>`;
}

function crater(p: string, pal: Palette, x: number, y: number, r: number, squash = 0.86): string {
  const ry = r * squash;
  return `<g>
  <ellipse cx="${f(x + r * 0.08)}" cy="${f(y + ry * 0.1)}" rx="${f(r * 1.12)}" ry="${f(ry * 1.12)}" fill="${pal.rim}" opacity="0.28"/>
  <ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(ry)}" fill="url(#${p}-crater)"/>
  <path d="M${f(x - r)},${f(y)} A${f(r)},${f(ry)} 0 0 1 ${f(x + r)},${f(y)} A${f(r * 1.0)},${f(ry * 0.55)} 0 0 0 ${f(x - r)},${f(y)}Z" fill="${pal.shadow}" opacity="0.45"/>
  <path d="M${f(x - r * 0.7)},${f(y + ry * 0.72)} A${f(r)},${f(ry)} 0 0 0 ${f(x + r * 0.95)},${f(y + ry * 0.3)}" fill="none" stroke="${pal.rim}" stroke-width="${f(Math.max(1, r * 0.08))}" opacity="0.7"/>
</g>`;
}

function craterField(
  p: string,
  pal: Palette,
  seed: number,
  count: number,
  minR: number,
  maxR: number,
  avoid: [number, number, number][] = [],
): string {
  const r = rng(seed);
  let out = '';
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const x = r() * 1000;
    const y = r() * 600;
    const rad = minR + Math.pow(r(), 2.2) * (maxR - minR);
    if (avoid.some(([ax, ay, ar]) => Math.hypot(ax - x, ay - y) < ar + rad)) continue;
    out += crater(p, pal, x, y, rad);
    placed++;
  }
  return out;
}

function pebbles(seed: number, count: number, color: string, shade: string): string {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = r() * 1000;
    const y = r() * 600;
    const s = 1 + r() * 2.6;
    out += `<ellipse cx="${f(x + 0.8)}" cy="${f(y + 0.8)}" rx="${f(s)}" ry="${f(s * 0.7)}" fill="${shade}" opacity="0.5"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.7)}" fill="${color}" opacity="0.65"/>`;
  }
  return out;
}

function mountain(pal: Palette, x: number, y: number, w: number, h: number, skew = 0): string {
  const px = x + skew;
  const top = y - h;
  const mx = px + w * 0.1;
  const my = y - h * 0.38;
  const bx = px + w * 0.04;
  const L = x - w / 2;
  const R = x + w / 2;
  return `<g>
  <polygon points="${f(L)},${f(y)} ${f(px)},${f(top)} ${f(mx)},${f(my)} ${f(bx)},${f(y)}" fill="${pal.craterIn}" opacity="0.42"/>
  <polygon points="${f(L)},${f(y)} ${f(px - w * 0.18)},${f(y - h * 0.45)} ${f(px)},${f(top)}" fill="${pal.rim}" opacity="0.18"/>
  <polygon points="${f(px)},${f(top)} ${f(R)},${f(y)} ${f(bx)},${f(y)} ${f(mx)},${f(my)}" fill="${pal.shadow}" opacity="0.42"/>
  <polyline points="${f(px)},${f(top)} ${f(mx)},${f(my)} ${f(bx)},${f(y)}" fill="none" stroke="${pal.rim}" stroke-opacity="0.25" stroke-width="1.2"/>
</g>`;
}

function label(text: string, x: number, y: number, pal: Palette, size = 14, anchor = 'middle', rotate = 0): string {
  const tr = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" fill="${pal.label}" font-family="Orbitron, 'Space Grotesk', sans-serif" font-size="${size}" letter-spacing="2" text-anchor="${anchor}"${tr} style="text-transform:uppercase;paint-order:stroke" stroke="rgba(0,0,0,0.35)" stroke-width="3">${text}</text>`;
}

function lrvMap(): string {
  const p = 'lrv';
  const pal = MOON;
  const rille =
    'M210,-20 C250,60 300,100 285,160 C270,220 310,250 318,300 C326,350 300,390 345,420 C330,450 270,470 220,520 C180,560 140,585 95,620';
  let s = defs(p, pal, 'moon') + ground(p);
  s += `<ellipse cx="120" cy="300" rx="320" ry="380" fill="url(#${p}-mare)"/>`;
  s += `<g>
    <polygon points="660,0 1000,0 1000,250 900,230 800,180 720,110" fill="${pal.base2}" opacity="0.55"/>
    ${mountain(pal, 860, 215, 330, 210, 20)}
    ${mountain(pal, 760, 150, 200, 120, -10)}
    ${mountain(pal, 960, 150, 180, 150, 10)}
    ${mountain(pal, 700, 95, 120, 70)}
  </g>`;
  s += `<g>
    <polygon points="300,600 360,540 470,510 600,500 760,505 900,530 1000,520 1000,600" fill="${pal.base2}" opacity="0.5"/>
    ${mountain(pal, 560, 610, 420, 120, 30)}
    ${mountain(pal, 800, 615, 380, 110, -20)}
    ${mountain(pal, 400, 620, 260, 80, 10)}
    ${mountain(pal, 960, 620, 200, 120)}
  </g>`;
  s += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${rille}" stroke="${pal.rim}" stroke-width="50" opacity="0.35"/>
    <path d="${rille}" stroke="${pal.shadow}" stroke-width="38"/>
    <path d="${rille}" stroke="#3d3e44" stroke-width="16" transform="translate(4 3)"/>
    <path d="${rille}" stroke="#55575d" stroke-width="5" opacity="0.7" transform="translate(6 4)"/>
  </g>`;
  s += craterField(p, pal, 15, 46, 3, 16, [
    [520, 290, 30],
    [300, 280, 40],
    [860, 120, 140],
  ]);
  s += crater(p, pal, 440, 512, 34);
  s += crater(p, pal, 705, 478, 13);
  s += crater(p, pal, 610, 400, 18);
  s += crater(p, pal, 520, 120, 26);
  s += crater(p, pal, 570, 140, 16);
  s += pebbles(151, 120, pal.rim, pal.shadow);
  s += finish(p);
  s += label('Hadley Rille', 245, 120, pal, 15, 'middle', 62);
  s += label('Mons Hadley', 860, 60, pal, 16);
  s += label('Hadley Delta', 640, 585, pal, 16);
  s += label('Elbow', 395, 430, pal, 11, 'start');
  s += label('St. George', 440, 470, pal, 11);
  s += label('Spur', 728, 470, pal, 11, 'start');
  s += label('Dune', 610, 375, pal, 10);
  s += label('North Complex', 545, 92, pal, 11);
  s += label('Base Falcon', 545, 275, pal, 10, 'start');
  s += label('Montes Apenninus', 990, 290, pal, 12, 'end');
  return s;
}

function spiritMap(): string {
  const p = 'spirit';
  const pal = MARS;
  let s = defs(p, pal, 'mars') + ground(p);
  s += `<path d="M-20,90 C120,40 250,10 380,-20" fill="none" stroke="${pal.rim}" stroke-width="40" opacity="0.18" filter="url(#${p}-soft)"/>`;
  const hill = (hx: number, hy: number, w: number, h: number, levels: number, seed: number) => {
    const r = rng(seed);
    let g = '';
    for (let i = 0; i < levels; i++) {
      const k = 1 - i / levels;
      const pts: string[] = [];
      const n = 12;
      for (let j = 0; j < n; j++) {
        const t = (j / n) * Math.PI * 2;
        const jit = 0.85 + r() * 0.3;
        pts.push(`${f(hx + Math.cos(t) * w * k * jit - i * 3)},${f(hy + Math.sin(t) * h * k * jit - i * 3)}`);
      }
      const shade = i / levels;
      const col = shade < 0.5 ? pal.base2 : pal.craterIn;
      g += `<polygon points="${pts.join(' ')}" fill="${col}" opacity="${f(0.25 + shade * 0.35)}" stroke="${pal.rim}" stroke-opacity="0.25" stroke-width="1"/>`;
    }
    return g;
  };
  s += `<ellipse cx="740" cy="360" rx="260" ry="190" fill="${pal.shadow}" opacity="0.25" filter="url(#${p}-soft)"/>`;
  s += hill(740, 290, 120, 85, 6, 3);
  s += hill(860, 420, 90, 70, 5, 9);
  s += hill(635, 320, 55, 40, 3, 13);
  s += hill(900, 250, 70, 60, 4, 17);
  s += hill(800, 485, 55, 28, 3, 21);
  s += `<ellipse cx="727" cy="455" rx="38" ry="26" fill="${pal.craterIn}" opacity="0.8"/>
  <ellipse cx="727" cy="455" rx="30" ry="19" fill="none" stroke="${pal.rim}" stroke-width="2" opacity="0.6"/>
  <ellipse cx="727" cy="455" rx="20" ry="12" fill="none" stroke="${pal.rim}" stroke-width="1.5" opacity="0.5"/>`;
  s += `<ellipse cx="688" cy="468" rx="14" ry="8" fill="#f3d2a8" opacity="0.55"/>`;
  s += crater(p, pal, 225, 125, 42);
  s += crater(p, pal, 360, 180, 14);
  s += crater(p, pal, 470, 330, 12);
  s += craterField(p, pal, 33, 42, 3, 12, [
    [740, 360, 230],
    [225, 125, 50],
  ]);
  s += `<g fill="none" stroke="${pal.shadow}" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round">
    <path d="M60,420 C200,380 330,470 470,430"/>
    <path d="M120,540 C260,500 380,560 540,520"/>
    <path d="M300,60 C420,100 520,40 640,90"/>
  </g>`;
  s += pebbles(333, 160, pal.rim, pal.shadow);
  s += finish(p);
  s += label(t('Gusev Crater', 'Cráter Gusev'), 30, 40, pal, 16, 'start');
  s += label('Bonneville', 225, 70, pal, 11);
  s += label('Columbia Hills', 760, 175, pal, 17);
  s += label('Husband Hill', 760, 240, pal, 10, 'start');
  s += label('McCool Hill', 900, 405, pal, 10);
  s += label('West Spur', 600, 268, pal, 10);
  s += label('Home Plate', 775, 445, pal, 10, 'start');
  s += label('Troy', 660, 495, pal, 10);
  s += label("Ma'adim Vallis ↓", 120, 585, pal, 11, 'start');
  return s;
}

function opportunityMap(): string {
  const p = 'opportunity';
  const pal = MARS;
  let s = defs(p, pal, 'mars') + ground(p);
  const r = rng(404);
  let ripples = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * 1000;
    const y = r() * 600;
    const len = 30 + r() * 70;
    ripples += `<path d="M${f(x)},${f(y)} q${f(len / 2)},${f(-6 - r() * 4)} ${f(len)},0" />`;
  }
  s += `<g fill="none" stroke="${pal.shadow}" stroke-opacity="0.22" stroke-width="2.2">${ripples}</g>`;
  const ecx = 1060;
  const ecy = 430;
  const er = 380;
  s += `<circle cx="${ecx}" cy="${ecy}" r="${er - 10}" fill="${pal.shadow}" opacity="0.35"/>`;
  s += `<circle cx="${ecx}" cy="${ecy}" r="${er - 60}" fill="${pal.shadow}" opacity="0.25" filter="url(#${p}-soft)"/>`;
  const seg = (deg0: number, deg1: number, w: number) => {
    const t0 = (deg0 * Math.PI) / 180;
    const t1 = (deg1 * Math.PI) / 180;
    const xa = ecx + er * Math.cos(t0);
    const ya = ecy + er * Math.sin(t0);
    const xb = ecx + er * Math.cos(t1);
    const yb = ecy + er * Math.sin(t1);
    const d = `M${f(xa)},${f(ya)} A${er},${er} 0 0 0 ${f(xb)},${f(yb)}`;
    return `<path d="${d}" stroke="${pal.shadow}" stroke-width="${w + 10}" opacity="0.4" transform="translate(6 4)"/>
    <path d="${d}" stroke="url(#${p}-ridge)" stroke-width="${w}"/>
    <path d="${d}" stroke="${pal.rim}" stroke-width="3" opacity="0.55" transform="translate(-4 -3)"/>`;
  };
  s += `<circle cx="${ecx}" cy="${ecy}" r="${er}" fill="none" stroke="${pal.rim}" stroke-width="6" opacity="0.18"/>`;
  s += `<g fill="none" stroke-linecap="round">
    ${seg(178, 171, 10)}
    ${seg(-120, -128, 14)}
    ${seg(-142, -150, 18)}
    ${seg(-163, -170, 12)}
    ${seg(170, 160, 20)}
    ${seg(155, 140, 22)}
    ${seg(132, 122, 16)}
  </g>`;
  s += crater(p, pal, 152, 166, 22);
  s += crater(p, pal, 272, 195, 36);
  s += crater(p, pal, 306, 375, 40);
  s += crater(p, pal, 265, 272, 8);
  s += crater(p, pal, 470, 347, 11);
  s += craterField(p, pal, 44, 34, 2.5, 9, [
    [152, 166, 30],
    [272, 195, 45],
    [306, 375, 50],
    [ecx, ecy, er + 20],
  ]);
  s += pebbles(444, 110, pal.rim, pal.shadow);
  s += finish(p);
  s += label('Meridiani Planum', 30, 560, pal, 16, 'start');
  s += label('Eagle', 152, 130, pal, 10);
  s += label('Endurance', 315, 170, pal, 11, 'start');
  s += label('Victoria', 306, 437, pal, 11);
  s += label(t('Endeavour Crater', 'Cráter Endeavour'), 900, 420, pal, 18);
  s += label('Cabo York', 662, 352, pal, 10, 'end');
  s += label('Cabo Tribulation', 672, 470, pal, 10, 'end');
  s += label('Perseverance Valley', 728, 548, pal, 10, 'start');
  return s;
}

export function mapBackgroundSVG(body: Body, robot: RobotId): string {
  switch (robot) {
    case 'lrv':
      return lrvMap();
    case 'spirit':
      return spiritMap();
    case 'opportunity':
      return opportunityMap();
    default:
      return body === 'moon' ? lrvMap() : spiritMap();
  }
}
