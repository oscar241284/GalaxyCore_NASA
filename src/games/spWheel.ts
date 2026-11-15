import type { GameContext } from './index';
import { brief, injectKit, MER_SVG, say, sfx, stopSpeak, theme } from './lkKit';
import { rng } from '../ui/moonTexture';
import { tr } from '../i18n';

const MW = 900;
const MH = 1400;
const VW = 900;
const VH = 560;
const HOME = { x: 450, y: 130, rx: 170, ry: 86 };
const SPOTS = [
  { x: 330, y: 1010 },
  { x: 580, y: 720 },
  { x: 380, y: 420 },
];

const CSS = `
.spw__view { position: relative; }
.spw__view canvas { display: block; width: 100%; max-width: calc((100dvh - 290px) * 1.607); margin: 0 auto; height: auto; border-radius: 20px; border: 2px solid rgba(255,255,255,.12); box-shadow: 0 12px 34px rgba(0,0,0,.5); touch-action: none; }
.spw__pad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-width: 640px; margin: 12px auto 0; }
.spw__pad .lk-btn { min-height: 66px; flex-direction: column; gap: 0; font-size: 13px; }
.spw__pad .lk-btn b { font-size: 24px; line-height: 1; }
.spw__pad .lk-btn.held { border-color: #67e8f9; background: rgba(14,116,144,.6); transform: translateY(3px); }
.spw__pad [data-k="back"] { border-color: #22c55e; }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default function spWheel({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let alive = true;
  let raf = 0;
  const cleanups: (() => void)[] = [];

  const start = () => {
    root.innerHTML = `
      <div class="lk"${theme('#3b82f6', '#93c5fd')}><div class="lk__wrap">
        <div class="lk-top"><p class="lk-task"><i>3</i>${tr('Drive in reverse, uncover 3 white patches and reach Home Plate.', 'Maneja de reversa, descubre 3 manchas blancas y llega a Home Plate.')}</p></div>
        <div class="spw__view"><canvas width="${VW}" height="${VH}" aria-label="${tr('Top-down map with Spirit', 'Mapa visto desde arriba con Spirit')}"></canvas></div>
        <div class="spw__pad">
          <button type="button" class="lk-btn" data-k="left"><b>⟲</b>${tr('Turn', 'Girar')}</button>
          <button type="button" class="lk-btn" data-k="fwd"><b>⬆</b>${tr('Forward', 'Adelante')}</button>
          <button type="button" class="lk-btn" data-k="back"><b>⬇</b>${tr('Reverse', 'Reversa')}</button>
          <button type="button" class="lk-btn" data-k="right"><b>⟳</b>${tr('Turn', 'Girar')}</button>
        </div>
        <p class="lk-say" data-say></p>
      </div></div>`;
    const canvas = root.querySelector('canvas')!;
    const g = canvas.getContext('2d')!;
    const sayEl = root.querySelector<HTMLElement>('[data-say]')!;

    const rand = rng(4);
    const rocks: { x: number; y: number; r: number }[] = [];
    const far = (x: number, y: number, d: number) =>
      [...SPOTS, { x: 450, y: 1300 }, { x: HOME.x, y: HOME.y + 60 }].every((p) => Math.hypot(p.x - x, p.y - y) > d);
    while (rocks.length < 34) {
      const x = 40 + rand() * (MW - 80);
      const y = 260 + rand() * (MH - 360);
      if (far(x, y, 110) && rocks.every((r) => Math.hypot(r.x - x, r.y - y) > 70)) rocks.push({ x, y, r: 12 + rand() * 18 });
    }
    const dunes = [
      { x: 620, y: 1120, rx: 140, ry: 60 },
      { x: 250, y: 650, rx: 130, ry: 70 },
      { x: 620, y: 360, rx: 120, ry: 50 },
    ];
    const bg = document.createElement('canvas');
    bg.width = MW;
    bg.height = MH;
    const b = bg.getContext('2d')!;
    b.fillStyle = '#c47c4b';
    b.fillRect(0, 0, MW, MH);
    for (let i = 0; i < 5000; i++) {
      b.fillStyle = rand() < 0.5 ? 'rgba(120,60,30,.18)' : 'rgba(240,190,140,.14)';
      b.beginPath();
      b.arc(rand() * MW, rand() * MH, 1 + rand() * 4, 0, Math.PI * 2);
      b.fill();
    }
    for (const d of dunes) {
      b.fillStyle = '#d9a06b';
      b.beginPath();
      b.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
      b.fill();
      b.strokeStyle = 'rgba(150,90,50,.45)';
      b.lineWidth = 2;
      for (let k = -d.ry + 10; k < d.ry; k += 12) {
        b.beginPath();
        b.moveTo(d.x - d.rx * 0.8, d.y + k);
        b.quadraticCurveTo(d.x, d.y + k - 8, d.x + d.rx * 0.8, d.y + k);
        b.stroke();
      }
    }
    b.fillStyle = '#a9927a';
    b.beginPath();
    b.ellipse(HOME.x, HOME.y, HOME.rx, HOME.ry, 0, 0, Math.PI * 2);
    b.fill();
    b.strokeStyle = 'rgba(255,255,255,.25)';
    for (let k = 0.3; k < 1; k += 0.18) {
      b.beginPath();
      b.ellipse(HOME.x, HOME.y, HOME.rx * k, HOME.ry * k, 0, 0, Math.PI * 2);
      b.stroke();
    }
    b.font = '800 22px system-ui';
    b.fillStyle = '#fff';
    b.textAlign = 'center';
    b.fillText('HOME PLATE', HOME.x, HOME.y + 8);
    for (const r of rocks) {
      b.fillStyle = 'rgba(0,0,0,.3)';
      b.beginPath();
      b.ellipse(r.x + 6, r.y + 6, r.r, r.r * 0.8, 0, 0, Math.PI * 2);
      b.fill();
      b.fillStyle = '#6b3a22';
      b.beginPath();
      b.ellipse(r.x, r.y, r.r, r.r * 0.8, 0, 0, Math.PI * 2);
      b.fill();
      b.fillStyle = '#8f5236';
      b.beginPath();
      b.ellipse(r.x - r.r * 0.25, r.y - r.r * 0.25, r.r * 0.5, r.r * 0.35, 0, 0, Math.PI * 2);
      b.fill();
    }

    const rover = { x: 450, y: 1300, a: Math.PI, sp: 0 };
    const keys = { left: false, right: false, fwd: false, back: false };
    const trench: { x: number; y: number }[] = [];
    const found = SPOTS.map(() => false);
    let camY = MH - VH;
    let msgCool = 0;
    let done = false;
    let t = 0;
    let bursts: { x: number; y: number; t: number }[] = [];
    let lastMsg = '';
    const msg = (text: string, kind: '' | 'ok' | 'warn' = '') => {
      if (text === lastMsg || msgCool > 0) return;
      lastMsg = text;
      msgCool = 1.2;
      say(sayEl, text, kind);
    };
    say(sayEl, tr('The back of Spirit points toward Home Plate. Hold «Reverse» and correct with the turns: the broken wheel pulls it off course!', 'La parte de atrás de Spirit apunta hacia Home Plate. Mantén «Reversa» y corrige con los giros: ¡la rueda rota lo desvía!'));

    const brokenWheel = () => {
      const lx = 16;
      const ly = -20;
      const c = Math.cos(rover.a);
      const s = Math.sin(rover.a);
      return { x: rover.x + lx * c - ly * s, y: rover.y + lx * s + ly * c };
    };
    const blocked = (x: number, y: number) =>
      x < 24 || y < 24 || x > MW - 24 || y > MH - 24 || rocks.some((r) => Math.hypot(r.x - x, r.y - y) < r.r + 20);
    const inDune = (x: number, y: number) => dunes.some((d) => ((x - d.x) / d.rx) ** 2 + ((y - d.y) / d.ry) ** 2 < 1);

    const update = (dt: number) => {
      t += dt;
      msgCool -= dt;
      if (done) return;
      let speed = 0;
      let drift = 0;
      if (keys.back) {
        speed = -72;
        drift = 0.28;
      } else if (keys.fwd) {
        speed = 16;
        drift = 1.5;
        msg(tr('The jammed wheel won\'t let it go forward and makes it turn! Try reverse.', '¡La rueda trabada no deja avanzar y lo hace girar! Prueba de reversa.'), 'warn');
      }
      if (inDune(rover.x, rover.y)) speed *= 0.55;
      if (keys.left) rover.a -= 1.4 * dt;
      if (keys.right) rover.a += 1.4 * dt;
      if (speed) rover.a += drift * dt * (speed < 0 ? 1 : 1);
      const nx = rover.x + Math.sin(rover.a) * speed * dt;
      const ny = rover.y - Math.cos(rover.a) * speed * dt;
      if (speed && blocked(nx, ny)) {
        msg(tr('Careful, a rock! Turn to avoid it.', '¡Cuidado, una roca! Gira para esquivarla.'), 'warn');
        sfx.soft();
      } else if (speed) {
        rover.x = nx;
        rover.y = ny;
        const w = brokenWheel();
        const lastP = trench[trench.length - 1];
        if (!lastP || Math.hypot(lastP.x - w.x, lastP.y - w.y) > 5) trench.push(w);
        SPOTS.forEach((s, i) => {
          if (!found[i] && Math.hypot(s.x - w.x, s.y - w.y) < 34) {
            found[i] = true;
            bursts.push({ x: s.x, y: s.y, t: 0 });
            sfx.ok();
            const n = found.filter(Boolean).length;
            lastMsg = '';
            msgCool = 0;
            msg(n < 3 ? tr(`White soil! The dragged wheel uncovered silica (${n}/3). Look for more patches!`, `¡Suelo blanco! La rueda arrastrada destapó sílice (${n}/3). ¡Busca más manchas!`) : tr('3 of 3! Now reach Home Plate, the light plateau at the top.', '¡3 de 3! Ahora llega a Home Plate, la meseta clara de arriba.'), 'ok');
            msgCool = 3;
          }
        });
      }
      const inHome = ((rover.x - HOME.x) / HOME.rx) ** 2 + ((rover.y - HOME.y) / HOME.ry) ** 2 < 1;
      if (inHome) {
        if (found.every(Boolean)) {
          done = true;
          keys.back = keys.fwd = false;
          finish();
        } else msg(tr(`You reached Home Plate, but some silica patches are missing (${found.filter(Boolean).length}/3). Go back and find them: they shine every now and then.`, `Llegaste a Home Plate, pero faltan manchas de sílice (${found.filter(Boolean).length}/3). Vuelve a buscarlas: brillan de vez en cuando.`), 'warn');
      }
      camY += (rover.y - VH * 0.45 - camY) * Math.min(1, dt * 3);
      camY = Math.max(0, Math.min(MH - VH, camY));
    };

    const draw = () => {
      g.drawImage(bg, 0, camY, VW, VH, 0, 0, VW, VH);
      g.save();
      g.translate(0, -camY);
      SPOTS.forEach((s, i) => {
        if (found[i]) {
          g.fillStyle = '#f8f8f2';
          g.beginPath();
          g.ellipse(s.x, s.y, 30, 18, 0.3, 0, Math.PI * 2);
          g.fill();
        } else {
          g.fillStyle = 'rgba(255,240,220,.18)';
          g.beginPath();
          g.ellipse(s.x, s.y, 26, 15, 0.3, 0, Math.PI * 2);
          g.fill();
          const tw = (Math.sin(t * 2 + i * 2) + 1) / 2;
          if (tw > 0.85) {
            g.fillStyle = `rgba(255,255,255,${(tw - 0.85) * 6})`;
            g.beginPath();
            g.arc(s.x, s.y, 6, 0, Math.PI * 2);
            g.fill();
          }
        }
      });
      if (trench.length > 1) {
        g.strokeStyle = 'rgba(70,35,18,.65)';
        g.lineWidth = 9;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        trench.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        g.stroke();
      }
      g.save();
      g.translate(rover.x, rover.y);
      g.rotate(rover.a);
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(-22, -22, 50, 50);
      for (const [wx, wy] of [[-20, -20], [20, -20], [-22, 0], [22, 0], [-20, 20], [20, 20]]) {
        const broken = wx > 0 && wy < 0;
        g.fillStyle = broken ? '#7f1d1d' : '#1f2937';
        g.fillRect(wx - 5, wy - 7, 10, 14);
        if (broken) {
          g.strokeStyle = '#fca5a5';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(wx - 4, wy - 5);
          g.lineTo(wx + 4, wy + 5);
          g.moveTo(wx + 4, wy - 5);
          g.lineTo(wx - 4, wy + 5);
          g.stroke();
        }
      }
      g.fillStyle = '#1e3a8a';
      g.fillRect(-30, -10, 60, 28);
      g.strokeStyle = '#93c5fd';
      g.lineWidth = 2;
      g.strokeRect(-30, -10, 60, 28);
      g.fillStyle = '#e5e7eb';
      g.fillRect(-12, -24, 24, 18);
      g.fillStyle = '#111827';
      g.fillRect(-6, -30, 12, 6);
      g.fillStyle = '#22c55e';
      g.beginPath();
      g.moveTo(0, 40);
      g.lineTo(-8, 30);
      g.lineTo(8, 30);
      g.closePath();
      g.fill();
      g.restore();
      bursts = bursts.filter((p) => (p.t += 0.016) < 1);
      for (const p of bursts) {
        g.strokeStyle = `rgba(255,255,255,${1 - p.t})`;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(p.x, p.y, 20 + p.t * 60, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(12, 12, 236, 40);
      g.fillStyle = '#fff';
      g.font = '800 17px system-ui';
      g.textAlign = 'left';
      g.fillText(`${tr('Silica', 'Sílice')} ${found.filter(Boolean).length}/3`, 24, 38);
      found.forEach((f, i) => {
        g.fillStyle = f ? '#f8f8f2' : 'rgba(255,255,255,.2)';
        g.beginPath();
        g.arc(150 + i * 30, 32, 10, 0, Math.PI * 2);
        g.fill();
      });
      if (HOME.y + HOME.ry < camY) {
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(VW - 210, 12, 198, 40);
        g.fillStyle = '#fde68a';
        g.fillText('⬆ Home Plate', VW - 196, 38);
      }
      g.fillStyle = 'rgba(127,29,29,.75)';
      g.fillRect(12, VH - 52, 248, 40);
      g.fillStyle = '#fecaca';
      g.font = '700 15px system-ui';
      g.fillText(tr('⚠ Front right wheel jammed', '⚠ Rueda delantera derecha trabada'), 22, VH - 26);
    };

    let last = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    root.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((btn) => {
      const k = btn.dataset.k as keyof typeof keys;
      const on = (e: Event) => {
        e.preventDefault();
        keys[k] = true;
        btn.classList.add('held');
        btn.setPointerCapture?.((e as PointerEvent).pointerId);
      };
      const off = () => {
        keys[k] = false;
        btn.classList.remove('held');
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('lostpointercapture', off);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    const map: Record<string, keyof typeof keys> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'fwd', ArrowDown: 'back' };
    const kd = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      keys[k] = true;
      root.querySelector(`[data-k="${k}"]`)?.classList.add('held');
    };
    const ku = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (!k) return;
      keys[k] = false;
      root.querySelector(`[data-k="${k}"]`)?.classList.remove('held');
    };
    document.addEventListener('keydown', kd);
    document.addEventListener('keyup', ku);
    cleanups.push(() => {
      document.removeEventListener('keydown', kd);
      document.removeEventListener('keyup', ku);
    });

    const finish = () => {
      sfx.win();
      const wrap = root.querySelector('.lk__wrap')!;
      root.querySelector('.spw__pad')!.remove();
      const box = document.createElement('div');
      box.className = 'lk-learn';
      box.innerHTML = `
        <h4>${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</h4>
        <p style="margin:0 0 12px">${tr(
          'When one of Spirit\'s wheels jammed in 2006, the engineers did not give up: they drove it <b>in reverse</b>. And in 2007, the furrow of that wheel uncovered <b>silica soil</b>, a clue that there was hot water. A problem became a discovery!',
          'Cuando una rueda de Spirit se trabó en 2006, los ingenieros no se rindieron: lo manejaron <b>de reversa</b>. Y en 2007, el surco de esa rueda destapó <b>suelo de sílice</b>, una pista de que hubo agua caliente. ¡Un problema se convirtió en un descubrimiento!',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`;
      wrap.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.querySelector('[data-end]')!.addEventListener('click', win);
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 3', 'SPIRIT · MISIÓN 3'),
    title: tr('The broken wheel', 'La rueda rota'),
    text: tr('One of Spirit\'s 6 wheels jammed and stopped turning. But the mission had to go on!', 'Una de las 6 ruedas de Spirit se trabó y dejó de girar. ¡Pero la misión debía seguir!'),
    goal: tr('Drive in reverse dragging the wheel, find 3 white patches and reach Home Plate.', 'Maneja de reversa arrastrando la rueda, encuentra 3 manchas blancas y llega a Home Plate.'),
    art: MER_SVG,
    accent: '#3b82f6',
    soft: '#93c5fd',
    guess: {
      q: tr('When Spirit\'s wheel jammed in 2006, what did the engineers do?', 'Cuando la rueda de Spirit se trabó en 2006, ¿qué hicieron los ingenieros?'),
      options: [tr('They drove it in reverse, dragging the wheel', 'Lo manejaron de reversa, arrastrando la rueda'), tr('They left it still forever', 'Lo dejaron quieto para siempre')],
      correct: 0,
      why: tr('They discovered it moved better in reverse, dragging the broken wheel. And that is how it kept exploring for several more years!', 'Descubrieron que de reversa avanzaba mejor, arrastrando la rueda rota. ¡Y así siguió explorando varios años más!'),
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    cleanups.forEach((f) => f());
    stopSpeak();
  };
}
