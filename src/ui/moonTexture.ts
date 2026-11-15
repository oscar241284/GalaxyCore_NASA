export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed = 1): (x: number, y: number, periodX?: number) => number {
  const r = rng(seed);
  const table = new Float32Array(256 * 256);
  for (let i = 0; i < table.length; i++) table[i] = r();
  const at = (ix: number, iy: number) => table[((iy & 255) << 8) | (ix & 255)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, y, periodX = 0) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = fade(x - x0);
    const fy = fade(y - y0);
    let xa = x0;
    let xb = x0 + 1;
    if (periodX > 0) {
      xa = ((xa % periodX) + periodX) % periodX;
      xb = ((xb % periodX) + periodX) % periodX;
    }
    const a = at(xa, y0);
    const b = at(xb, y0);
    const c = at(xa, y0 + 1);
    const d = at(xb, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

export function fbm(
  noise: (x: number, y: number, p?: number) => number,
  x: number,
  y: number,
  octaves = 5,
  periodX = 0,
): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq, periodX ? periodX * freq : 0);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export interface MoonMaps {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
}

export function createMoonMaps(width = 1024, seed = 7): MoonMaps {
  const W = width;
  const H = width / 2;
  const noise = makeNoise(seed);
  const rand = rng(seed * 31 + 5);

  const lw = 256;
  const lh = 128;
  const low = document.createElement('canvas');
  low.width = lw;
  low.height = lh;
  const lctx = low.getContext('2d')!;
  const lowImg = lctx.createImageData(lw, lh);
  const lowBump = document.createElement('canvas');
  lowBump.width = lw;
  lowBump.height = lh;
  const lbctx = lowBump.getContext('2d')!;
  const lowBumpImg = lbctx.createImageData(lw, lh);
  const PX = 6;
  const mariaVals = new Float32Array(lw * lh);
  const hlVals = new Float32Array(lw * lh);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const u = (x / lw) * PX;
      const v = (y / lh) * (PX / 2);
      mariaVals[y * lw + x] = fbm(noise, u * 0.45 + 11, v * 0.45 + 3, 4, PX * 0.45);
      hlVals[y * lw + x] = fbm(noise, u * 2.2 + 40, v * 2.2 + 7, 5, PX * 2.2);
    }
  }
  const sorted = Float32Array.from(mariaVals).sort();
  const pLow = sorted[Math.floor(sorted.length * 0.18)];
  const pHigh = sorted[Math.floor(sorted.length * 0.32)];
  for (let k = 0; k < lw * lh; k++) {
    const t = Math.max(0, Math.min(1, (pHigh - mariaVals[k]) / (pHigh - pLow)));
    const m = t * t * (3 - 2 * t);
    const hl = hlVals[k];
    const lum = 178 + (hl - 0.5) * 80 - m * 88;
    const i = k * 4;
    lowImg.data[i] = lum + 3 - m * 4;
    lowImg.data[i + 1] = lum + 1 - m * 2;
    lowImg.data[i + 2] = lum - 2 + m * 3;
    lowImg.data[i + 3] = 255;
    const hb = 128 + (hl - 0.5) * 150 - m * 24;
    lowBumpImg.data[i] = lowBumpImg.data[i + 1] = lowBumpImg.data[i + 2] = hb;
    lowBumpImg.data[i + 3] = 255;
  }
  lctx.putImageData(lowImg, 0, 0);
  lbctx.putImageData(lowBumpImg, 0, 0);

  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const cctx = color.getContext('2d')!;
  cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(low, 0, 0, W, H);

  const bump = document.createElement('canvas');
  bump.width = W;
  bump.height = H;
  const bctx = bump.getContext('2d')!;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(lowBump, 0, 0, W, H);

  const drawWrapped = (x: number, fn: (cx: number) => void) => {
    fn(x);
    if (x < W * 0.1) fn(x + W);
    if (x > W * 0.9) fn(x - W);
  };

  const crater = (x: number, y: number, r: number, young: boolean) => {
    const lat = ((y / H) - 0.5) * Math.PI;
    const sx = 1 / Math.max(0.25, Math.cos(lat));
    drawWrapped(x, (cx) => {
      bctx.save();
      bctx.translate(cx, y);
      bctx.scale(sx, 1);
      const g = bctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.35);
      g.addColorStop(0, 'rgba(60,60,60,0.85)');
      g.addColorStop(0.5, 'rgba(85,85,85,0.6)');
      g.addColorStop(0.7, 'rgba(205,205,205,0.6)');
      g.addColorStop(0.8, 'rgba(150,150,150,0.3)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
      bctx.fill();
      if (r > 10) {
        const p = bctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.18);
        p.addColorStop(0, 'rgba(200,200,200,0.8)');
        p.addColorStop(1, 'rgba(60,60,60,0)');
        bctx.fillStyle = p;
        bctx.beginPath();
        bctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
        bctx.fill();
      }
      bctx.restore();

      cctx.save();
      cctx.translate(cx, y);
      cctx.scale(sx, 1);
      const c = cctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      c.addColorStop(0, young ? 'rgba(235,235,230,0.35)' : 'rgba(80,80,78,0.18)');
      c.addColorStop(0.45, 'rgba(225,225,220,0.22)');
      c.addColorStop(1, 'rgba(225,225,220,0)');
      cctx.fillStyle = c;
      cctx.beginPath();
      cctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      cctx.fill();
      if (young) {
        cctx.strokeStyle = 'rgba(240,240,235,0.05)';
        const rays = 18 + Math.floor(rand() * 10);
        for (let k = 0; k < rays; k++) {
          const a = rand() * Math.PI * 2;
          const len = r * (2.5 + rand() * 5);
          cctx.lineWidth = 0.6 + rand() * r * 0.08;
          cctx.beginPath();
          cctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          cctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          cctx.stroke();
        }
      }
      cctx.restore();
    });
  };

  const big = Math.round(W / 90);
  for (let i = 0; i < big; i++) crater(rand() * W, H * (0.12 + rand() * 0.76), W * (0.01 + rand() * 0.016), i < 2);
  for (let i = 0; i < W / 8; i++) crater(rand() * W, H * (0.05 + rand() * 0.9), W * (0.003 + Math.pow(rand(), 2) * 0.006), false);
  for (let i = 0; i < W * 1.5; i++) crater(rand() * W, H * (0.03 + rand() * 0.94), W * (0.0006 + Math.pow(rand(), 2) * 0.002), false);

  const grain = (ctx: CanvasRenderingContext2D, amount: number) => {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * amount;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  };
  grain(cctx, 14);
  grain(bctx, 26);

  return { color, bump };
}
