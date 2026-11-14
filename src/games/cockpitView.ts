/**
 * Vista en primera persona desde la cabina del módulo lunar.
 *
 * El astronauta mira por la ventana delantera, inclinada hacia abajo, y ve la superficie
 * acercarse en perspectiva: cráteres, rocas, montañas en el horizonte, la Tierra, la sombra
 * del propio módulo y la zona de alunizaje marcada sobre el suelo. Una mira fija en el centro
 * indica dónde se posará la nave: el objetivo es llevar la zona hasta la mira.
 *
 * Usa la misma física del simulador 2D (posición lateral, altitud, velocidades); solo cambia
 * cómo se dibuja.
 */
import { fbm, makeNoise, rng } from '../ui/moonTexture';

export interface CockpitState {
  /** Posición lateral (unidades del mundo, 10 = 1 m). */
  x: number;
  /** Altitud de las patas sobre el suelo (unidades). */
  alt: number;
  vx: number;
  vy: number;
  throttle: number;
  left: boolean;
  right: boolean;
  status: 'brief' | 'countdown' | 'flying' | 'landed' | 'crashed';
  zoneX1: number;
  zoneX2: number;
  /** Velocidad máxima segura (unidades/s) para colorear la mira. */
  safeVy: number;
  shake: number;
  flash: number;
  dt: number;
  time: number;
}

interface Feature {
  gx: number;
  gz: number;
  r: number;
  kind: 'crater' | 'rock' | 'patch' | 'pebble';
  tone: number;
}

const THETA = (24 * Math.PI) / 180; // la ventana mira 24° hacia abajo
const S = Math.sin(THETA);
const C = Math.cos(THETA);
const T = Math.tan(THETA);
const EYE = 45; // los ojos del astronauta están ~4,5 m sobre las patas
const SUN_ELEV = Math.tan((15 * Math.PI) / 180); // Sol bajo detrás → sombra hacia adelante

export function createCockpit(canvas: HTMLCanvasElement, earthImg: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let dpr = 1;
  let cw = 1;
  let ch = 1;
  // ventana (en píxeles del canvas)
  let wl = 0;
  let wr = 0;
  let wt = 0;
  let wb = 0;
  let F = 1; // distancia focal en píxeles
  let ox = 0; // centro de la mira
  let oy = 0;
  let frame: HTMLCanvasElement | null = null;
  let glass: HTMLCanvasElement | null = null;
  let stars: HTMLCanvasElement | null = null;
  let features: Feature[] = [];
  let ridge = new Float32Array(0);
  let roll = 0;
  let cracks: { x: number; y: number }[][] = [];
  let dust: { gx: number; gz: number; vx: number; vz: number; life: number }[] = [];
  let haze = 0;

  // ---------------------------------------------------------------- geometría
  const windowPath = (g: CanvasRenderingContext2D, inset = 0) => {
    const l = wl - inset;
    const r = wr + inset;
    const t = wt - inset;
    const b = wb + inset;
    const slant = (r - l) * 0.035; // la parte de arriba es un poco más angosta
    const rad = Math.min(r - l, b - t) * 0.07 + inset * 0.5;
    g.beginPath();
    g.moveTo(l + slant + rad, t);
    g.lineTo(r - slant - rad, t);
    g.quadraticCurveTo(r - slant, t, r - slant * 0.6, t + rad);
    g.lineTo(r, b - rad);
    g.quadraticCurveTo(r, b, r - rad, b);
    g.lineTo(l + rad, b);
    g.quadraticCurveTo(l, b, l, b - rad);
    g.lineTo(l + slant * 0.6, t + rad);
    g.quadraticCurveTo(l + slant, t, l + slant + rad, t);
    g.closePath();
  };

  const buildFrame = () => {
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
    // panel metálico
    const bg = g.createLinearGradient(0, 0, cw, ch);
    bg.addColorStop(0, '#2a2e35');
    bg.addColorStop(0.5, '#1b1e23');
    bg.addColorStop(1, '#25292f');
    g.fillStyle = bg;
    g.fillRect(0, 0, cw, ch);
    // ruido de metal cepillado
    const rand = rng(5);
    for (let i = 0; i < (cw * ch) / 900; i++) {
      g.fillStyle = `rgba(255,255,255,${rand() * 0.025})`;
      g.fillRect(rand() * cw, rand() * ch, rand() * 30 * dpr, 1);
    }
    // juntas de paneles
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 2 * dpr;
    const seams = [
      [0, wt * 0.55, cw, wt * 0.55],
      [wl * 0.5, 0, wl * 0.5, ch],
      [cw - wl * 0.5, 0, cw - wl * 0.5, ch],
      [0, wb + (ch - wb) * 0.5, cw, wb + (ch - wb) * 0.5],
    ];
    for (const [a, b, c2, d] of seams) {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c2, d);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.lineWidth = 1 * dpr;
    for (const [a, b, c2, d] of seams) {
      g.beginPath();
      g.moveTo(a + dpr, b + dpr);
      g.lineTo(c2 + dpr, d + dpr);
      g.stroke();
    }
    // marco de la ventana (bisel)
    const bw = Math.max(10, Math.min(cw, ch) * 0.028);
    windowPath(g, bw * 1.1);
    g.fillStyle = '#0d0f12';
    g.fill();
    windowPath(g, bw * 0.75);
    const bev = g.createLinearGradient(0, wt - bw, 0, wb + bw);
    bev.addColorStop(0, '#5a606b');
    bev.addColorStop(0.5, '#2c3037');
    bev.addColorStop(1, '#4a4f58');
    g.fillStyle = bev;
    g.fill();
    windowPath(g, bw * 0.25);
    g.fillStyle = '#111317';
    g.fill();
    // tornillos alrededor
    const bolt = (x: number, y: number, r: number) => {
      const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      rg.addColorStop(0, '#8b919c');
      rg.addColorStop(1, '#2b2f36');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.6)';
      g.lineWidth = r * 0.25;
      g.beginPath();
      g.moveTo(x - r * 0.6, y);
      g.lineTo(x + r * 0.6, y);
      g.stroke();
    };
    const br = Math.max(3, bw * 0.28);
    const off = bw * 1.6;
    const nTop = Math.max(4, Math.round((wr - wl) / (90 * dpr)));
    for (let i = 0; i <= nTop; i++) {
      const x = wl + ((wr - wl) * i) / nTop;
      bolt(x, wt - off, br);
      bolt(x, wb + off, br);
    }
    const nSide = Math.max(3, Math.round((wb - wt) / (90 * dpr)));
    for (let i = 0; i <= nSide; i++) {
      const y = wt + ((wb - wt) * i) / nSide;
      bolt(wl - off, y, br);
      bolt(wr + off, y, br);
    }
    // agujero de la ventana
    g.globalCompositeOperation = 'destination-out';
    windowPath(g);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    frame = c;

    // vidrio: viñeta, reflejo diagonal y sombra interior
    const gc = document.createElement('canvas');
    gc.width = cw;
    gc.height = ch;
    const gg = gc.getContext('2d')!;
    windowPath(gg);
    gg.save();
    gg.clip();
    const vig = gg.createRadialGradient(ox, (wt + wb) / 2, Math.min(wr - wl, wb - wt) * 0.3, ox, (wt + wb) / 2, Math.max(wr - wl, wb - wt) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.55)');
    gg.fillStyle = vig;
    gg.fillRect(0, 0, cw, ch);
    const refl = gg.createLinearGradient(wl, wt, wl + (wr - wl) * 0.45, wb);
    refl.addColorStop(0, 'rgba(180,210,255,.07)');
    refl.addColorStop(0.35, 'rgba(180,210,255,.025)');
    refl.addColorStop(0.36, 'rgba(180,210,255,0)');
    gg.fillStyle = refl;
    gg.fillRect(0, 0, cw, ch);
    gg.strokeStyle = 'rgba(0,0,0,.7)';
    gg.lineWidth = 14 * dpr;
    gg.filter = `blur(${6 * dpr}px)`;
    windowPath(gg);
    gg.stroke();
    gg.restore();
    glass = gc;
  };

  const buildStars = () => {
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
    const rand = rng(91);
    const n = Math.round((cw * ch) / (5200 * dpr));
    for (let i = 0; i < n; i++) {
      const a = Math.pow(rand(), 3);
      g.fillStyle = `rgba(230,236,255,${0.12 + a * 0.6})`;
      const s = (rand() < 0.04 ? 2 : 1) * dpr;
      g.fillRect(rand() * cw, rand() * ch, s, s);
    }
    stars = c;
  };

  // ---------------------------------------------------------------- mundo
  /** Genera cráteres, rocas y manchas sobre el plano del suelo (fuera de la zona). */
  const build = (W: number, zoneX1: number, zoneX2: number, seed: number) => {
    const rand = rng(seed + 7);
    const zw = zoneX2 - zoneX1;
    const zc = (zoneX1 + zoneX2) / 2;
    const inZone = (gx: number, gz: number, r: number) => Math.abs(gx - zc) < zw / 2 + r + 15 && Math.abs(gz) < zw / 2 + r + 15;
    const list: Feature[] = [];
    const add = (count: number, kind: Feature['kind'], rMin: number, rMax: number, pow: number, zMax: number, xPad: number) => {
      for (let i = 0; i < count; i++) {
        const gz = -120 + Math.pow(rand(), 1.8) * zMax;
        const gx = -xPad + rand() * (W + xPad * 2);
        const r = rMin + Math.pow(rand(), pow) * (rMax - rMin);
        if (kind !== 'patch' && inZone(gx, gz, r)) continue;
        list.push({ gx, gz, r, kind, tone: rand() });
      }
    };
    add(70, 'patch', 120, 420, 1, 7000, 2400);
    add(480, 'crater', 4, 150, 3.6, 7000, 2400);
    add(500, 'rock', 1.2, 9, 3, 2500, 1200);
    add(1800, 'pebble', 0.4, 1.4, 1, 900, 700);
    list.sort((a, b) => b.gz - a.gz); // de lejos a cerca
    features = list;
    // perfil de montañas en el horizonte
    const noise = makeNoise(seed + 3);
    ridge = new Float32Array(240);
    for (let i = 0; i < ridge.length; i++) ridge[i] = fbm(noise, i / 24, 0.5, 5);
    cracks = [];
    dust = [];
    haze = 0;
    roll = 0;
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = canvas.width = Math.max(1, Math.round(r.width * dpr));
    ch = canvas.height = Math.max(1, Math.round(r.height * dpr));
    const wide = r.width >= 720;
    if (wide) {
      wl = cw * 0.085;
      wr = cw * 0.915;
      wt = ch * 0.075;
      wb = ch * 0.86;
    } else {
      wl = cw * 0.035;
      wr = cw * 0.965;
      wt = 196 * dpr;
      wb = ch - 168 * dpr;
    }
    const winH = wb - wt;
    F = Math.min(winH * 0.78, (wr - wl) * 0.62);
    ox = (wl + wr) / 2;
    oy = wt + winH * 0.62;
    buildFrame();
    buildStars();
  };

  // ---------------------------------------------------------------- dibujo
  const draw = (s: CockpitState) => {
    const h = Math.max(0, s.alt) + EYE;
    const cx = s.x;
    const cz = -h / T; // la mira apunta siempre al centro (adelante) de la zona
    const winW = wr - wl;
    const winH = wb - wt;
    const zc = (s.zoneX1 + s.zoneX2) / 2;
    const zw = s.zoneX2 - s.zoneX1;
    const flying = s.status === 'flying' || s.status === 'countdown';

    // inclinación suave al usar los propulsores laterales
    const rollTarget = flying ? (s.left ? 0.045 : 0) - (s.right ? 0.045 : 0) - s.vx * 0.0006 : 0;
    roll += (rollTarget - roll) * Math.min(1, s.dt * 3);

    const proj = (gx: number, gz: number) => {
      const dz = gz - cz;
      const depth = h * S + dz * C;
      if (depth < 6) return null;
      const up = -h * C + dz * S;
      return { x: ox + (F * (gx - cx)) / depth, y: oy - (F * up) / depth, d: depth, dist: Math.hypot(gx - cx, dz) };
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    // ---------- exterior (recortado a la ventana) ----------
    ctx.save();
    windowPath(ctx);
    ctx.clip();
    const jit = flying && s.throttle > 0.05 ? s.throttle * 1.3 * dpr : 0;
    const shk = s.shake * dpr * 0.8;
    ctx.translate(ox + (Math.random() - 0.5) * (jit + shk), oy + (Math.random() - 0.5) * (jit + shk));
    ctx.rotate(roll);
    ctx.translate(-ox, -oy);

    const pad = Math.max(winW, winH) * 0.25;
    if (stars) ctx.drawImage(stars, 0, 0);
    const horizon = oy - F * T;
    // la Tierra, arriba a la derecha
    const es = Math.min(winW, winH) * 0.1;
    ctx.drawImage(earthImg, wr - winW * 0.16 - cx * 0.004 * dpr, Math.max(wt + es * 0.4, horizon - winH * 0.24), es, es);

    // montañas lejanas
    const span = winW + pad * 2;
    const rh = winH * 0.06;
    ctx.beginPath();
    ctx.moveTo(wl - pad, horizon + 2);
    const shift = (cx / 2200) * ridge.length;
    for (let i = 0; i <= 120; i++) {
      const f = (i / 120) * ridge.length * 0.5 + shift + ridge.length * 0.25;
      const k = Math.floor(((f % ridge.length) + ridge.length) % ridge.length);
      const v = ridge[k];
      ctx.lineTo(wl - pad + (span * i) / 120, horizon - Math.max(0, v - 0.35) * rh * 3.2);
    }
    ctx.lineTo(wr + pad, horizon + 2);
    ctx.closePath();
    const mg = ctx.createLinearGradient(0, horizon - rh * 2, 0, horizon);
    mg.addColorStop(0, '#a3a19b');
    mg.addColorStop(1, '#55544f');
    ctx.fillStyle = mg;
    ctx.fill();

    // suelo
    const gg = ctx.createLinearGradient(0, horizon, 0, wb + pad);
    gg.addColorStop(0, '#4b4a46');
    gg.addColorStop(0.18, '#6b6a65');
    gg.addColorStop(1, '#9c9a94');
    ctx.fillStyle = gg;
    ctx.fillRect(wl - pad, horizon, winW + pad * 2, wb - horizon + pad);

    // rasgos del terreno
    for (const f of features) {
      if (f.kind === 'pebble' && f.gz - cz > 700) continue;
      const p = proj(f.gx, f.gz);
      if (!p) continue;
      const rx = (F * f.r) / p.d;
      if (rx < 0.5 * dpr || p.x < wl - pad - rx || p.x > wr + pad + rx || p.y < horizon - 2 || p.y > wb + pad + rx) continue;
      const fore = Math.max(0.06, Math.min(1, h / (p.dist + 1)) * 0.85 + 0.15 * S);
      const ry = rx * fore;
      if (f.kind === 'patch') {
        ctx.fillStyle = f.tone < 0.5 ? 'rgba(40,40,38,.10)' : 'rgba(200,198,190,.08)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.kind === 'crater') {
        // interior en sombra del lado del Sol y borde iluminado del lado contrario
        ctx.fillStyle = 'rgba(28,28,26,.55)';
        ctx.beginPath();
        ctx.ellipse(p.x - rx * 0.06, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(70,69,65,.75)';
        ctx.beginPath();
        ctx.ellipse(p.x + rx * 0.12, p.y + ry * 0.12, rx * 0.82, ry * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        if (rx > 2 * dpr) {
          ctx.strokeStyle = 'rgba(205,203,195,.45)';
          ctx.lineWidth = Math.max(0.6, rx * 0.06);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx * 1.02, ry * 1.04, 0, -0.2, Math.PI * 0.9);
          ctx.stroke();
        }
      } else if (f.kind === 'rock') {
        const hgt = rx * 0.7;
        // sombra larga hacia adelante (Sol bajo detrás)
        ctx.fillStyle = 'rgba(20,20,18,.45)';
        ctx.beginPath();
        ctx.ellipse(p.x + rx * 0.3, p.y - ry * 1.6, rx * 0.8, ry * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = f.tone < 0.5 ? '#77756f' : '#8f8d86';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - hgt * 0.35, rx, hgt * 0.6 + ry * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(225,223,215,.55)';
        ctx.beginPath();
        ctx.ellipse(p.x - rx * 0.15, p.y - hgt * 0.55, rx * 0.55, hgt * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = f.tone < 0.5 ? 'rgba(50,50,48,.6)' : 'rgba(200,198,190,.5)';
        ctx.fillRect(p.x, p.y, Math.max(dpr, rx), Math.max(dpr * 0.6, ry));
      }
    }

    // sombra del módulo lunar sobre el suelo (adelante, porque el Sol está detrás)
    if (s.status !== 'crashed') {
      const sz = cz + h / SUN_ELEV;
      const legs = [
        [-40, -40],
        [40, -40],
        [40, 40],
        [-40, 40],
      ];
      const body = [
        [-22, -18],
        [22, -18],
        [22, 18],
        [-22, 18],
      ];
      const stretch = 1 / SUN_ELEV / 2.2;
      const poly = (pts: number[][]) => {
        ctx.beginPath();
        let ok = true;
        pts.forEach(([a, b], i) => {
          const p = proj(cx + a, sz + b * stretch);
          if (!p) {
            ok = false;
            return;
          }
          if (i) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        });
        ctx.closePath();
        return ok;
      };
      const a = Math.min(0.6, 0.25 + 60 / (h + 60));
      ctx.fillStyle = `rgba(10,10,10,${a})`;
      if (poly(body)) ctx.fill();
      ctx.strokeStyle = `rgba(10,10,10,${a})`;
      const pc = proj(cx, sz);
      if (pc) {
        ctx.lineWidth = Math.max(1, (F * 4) / pc.d);
        ctx.beginPath();
        for (const [la, lb] of legs) {
          const p = proj(cx + la, sz + lb * stretch);
          if (!p) continue;
          ctx.moveTo(pc.x, pc.y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }

    // zona de alunizaje
    const zoneVisible = s.status !== 'crashed';
    let zoneCenter: { x: number; y: number; d: number } | null = null;
    if (zoneVisible) {
      const corners = [
        [zc - zw / 2, -zw / 2],
        [zc + zw / 2, -zw / 2],
        [zc + zw / 2, zw / 2],
        [zc - zw / 2, zw / 2],
      ].map(([a, b]) => proj(a, b));
      const pulse = 0.55 + 0.45 * Math.sin(s.time * 4);
      if (corners.every(Boolean)) {
        ctx.beginPath();
        corners.forEach((p, i) => (i ? ctx.lineTo(p!.x, p!.y) : ctx.moveTo(p!.x, p!.y)));
        ctx.closePath();
        ctx.fillStyle = `rgba(103,232,249,${0.08 + pulse * 0.06})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(103,232,249,${0.6 + pulse * 0.35})`;
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([10 * dpr, 7 * dpr]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const c0 = proj(zc, 0);
      if (c0) {
        zoneCenter = c0;
        const m = Math.max(6 * dpr, (F * 12) / c0.d);
        ctx.strokeStyle = `rgba(103,232,249,${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 2.5 * dpr;
        ctx.beginPath();
        ctx.ellipse(c0.x, c0.y, m, m * Math.max(0.3, S + h / (c0.dist + 200)), 0, 0, Math.PI * 2);
        ctx.stroke();
        // etiqueta (sobre el borde lejano), como un marcador del radar
        const far = proj(zc, zw / 2);
        if (far && s.status !== 'landed') {
          const ly = Math.max(horizon + 18 * dpr, far.y - 26 * dpr);
          ctx.strokeStyle = 'rgba(103,232,249,.75)';
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.moveTo(far.x, far.y - 4 * dpr);
          ctx.lineTo(far.x, ly + 6 * dpr);
          ctx.lineTo(far.x + 70 * dpr, ly + 6 * dpr);
          ctx.stroke();
          ctx.fillStyle = 'rgba(103,232,249,.95)';
          ctx.font = `700 ${12 * dpr}px Orbitron, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('ZONA DE ALUNIZAJE', far.x + 4 * dpr, ly);
        }
      }
    }

    // polvo levantado por el motor cerca del suelo
    const dustK = flying && s.alt < 260 && s.throttle > 0.08 ? s.throttle * (1 - s.alt / 260) : 0;
    if (dustK > 0) {
      const n = Math.round(dustK * 220 * s.dt) + (Math.random() < dustK ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.15 + Math.random() * 0.7); // hacia adelante
        const sp = (180 + Math.random() * 320) * (0.6 + dustK);
        dust.push({ gx: cx + Math.cos(a) * 20, gz: cz + Math.sin(a) * 20, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.5 });
      }
    }
    haze += ((s.status === 'landed' ? 0 : dustK * 0.6) - haze) * Math.min(1, s.dt * (s.status === 'landed' ? 0.8 : 3));
    ctx.lineCap = 'round';
    for (const d of dust) {
      d.life -= s.dt;
      d.gx += d.vx * s.dt;
      d.gz += d.vz * s.dt;
      const p1 = proj(d.gx, d.gz);
      const p0 = proj(d.gx - d.vx * 0.05, d.gz - d.vz * 0.05);
      if (!p1 || !p0) continue;
      ctx.strokeStyle = `rgba(205,200,190,${Math.max(0, d.life) * 0.5})`;
      ctx.lineWidth = Math.max(dpr, (F * 1.4) / p1.d);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    dust = dust.filter((d) => d.life > 0);
    if (dust.length > 700) dust.splice(0, dust.length - 700);
    if (haze > 0.01) {
      const hz = ctx.createLinearGradient(0, horizon, 0, wb);
      hz.addColorStop(0, `rgba(190,186,176,${haze * 0.15})`);
      hz.addColorStop(1, `rgba(200,196,186,${haze * 0.75})`);
      ctx.fillStyle = hz;
      ctx.fillRect(wl - pad, horizon, winW + pad * 2, wb - horizon + pad);
    }
    ctx.restore();

    // ---------- mira (fija en el vidrio) ----------
    ctx.save();
    windowPath(ctx);
    ctx.clip();
    const inside = s.x - 32 >= s.zoneX1 && s.x + 32 <= s.zoneX2;
    const fast = s.vy > s.safeVy;
    const rc = s.status === 'crashed' ? '255,90,90' : inside && !fast ? '57,255,138' : inside ? '255,181,71' : '220,230,255';
    ctx.strokeStyle = `rgba(${rc},.38)`;
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(wl, oy);
    ctx.lineTo(wr, oy);
    ctx.moveTo(ox, wt);
    ctx.lineTo(ox, wb);
    ctx.stroke();
    for (const k of [0.07, 0.14, 0.22]) {
      ctx.beginPath();
      ctx.arc(ox, oy, winH * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${rc},.9)`;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(ox, oy, 7 * dpr, 0, Math.PI * 2);
    ctx.stroke();

    // flechas guía si la zona está fuera de la mira
    if (zoneVisible && flying) {
      const zx = zoneCenter ? zoneCenter.x : zc > cx ? wr + 100 : wl - 100;
      const off = zx - ox;
      const need = Math.abs(off) > Math.max(30 * dpr, ((F * zw) / ((zoneCenter?.d ?? 1e9) || 1)) * 0.35);
      if (need) {
        const dir = Math.sign(off);
        const ax = dir > 0 ? Math.min(wr - 30 * dpr, Math.max(ox + 60 * dpr, zx - 30 * dpr)) : Math.max(wl + 30 * dpr, Math.min(ox - 60 * dpr, zx + 30 * dpr));
        const a2 = 0.5 + 0.5 * Math.sin(s.time * 6);
        ctx.fillStyle = `rgba(103,232,249,${0.45 + a2 * 0.5})`;
        for (let i = 0; i < 2; i++) {
          const bx = ax - dir * i * 16 * dpr;
          ctx.beginPath();
          ctx.moveTo(bx + dir * 10 * dpr, oy);
          ctx.lineTo(bx - dir * 4 * dpr, oy - 11 * dpr);
          ctx.lineTo(bx - dir * 4 * dpr, oy + 11 * dpr);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // grietas y estática si choca
    if (s.status === 'crashed') {
      if (!cracks.length) {
        const rand = rng(Math.floor(s.time * 1000));
        const cx0 = ox + (rand() - 0.5) * winW * 0.3;
        const cy0 = oy + (rand() - 0.5) * winH * 0.3;
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * Math.PI * 2 + rand() * 0.3;
          const pts = [{ x: cx0, y: cy0 }];
          let px = cx0;
          let py = cy0;
          const len = winH * (0.3 + rand() * 0.6);
          for (let j = 0; j < 7; j++) {
            const a = ang + (rand() - 0.5) * 0.6;
            px += Math.cos(a) * (len / 7);
            py += Math.sin(a) * (len / 7);
            pts.push({ x: px, y: py });
          }
          cracks.push(pts);
        }
      }
      ctx.fillStyle = 'rgba(120,10,10,.25)';
      ctx.fillRect(wl, wt, winW, winH);
      ctx.strokeStyle = 'rgba(235,240,255,.75)';
      ctx.lineWidth = 1.4 * dpr;
      for (const c of cracks) {
        ctx.beginPath();
        c.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
        ctx.fillRect(wl + Math.random() * winW, wt + Math.random() * winH, 2 * dpr, 2 * dpr);
      }
    }
    ctx.restore();

    if (glass) ctx.drawImage(glass, 0, 0);
    if (frame) ctx.drawImage(frame, 0, 0);
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,240,220,${s.flash})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  };

  return { resize, build, draw };
}