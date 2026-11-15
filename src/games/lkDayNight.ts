/**
 * LUNOJOD 2 · MISIÓN 2 · Día y noche lunar (simulación).
 *
 * El Lunojod tenía una tapa con panel solar: de día se abría para cargar baterías y de noche
 * se cerraba para guardar el calor; una fuente de calor de polonio-210 lo mantenía tibio
 * durante la noche lunar (≈ 14 días terrestres, unos −170 °C afuera).
 * Mecánica: abrir/cerrar la tapa y avanzar. Si la tapa queda abierta de noche, el robot se
 * enfría y el juego vuelve al atardecer para reintentar (sin perder lo avanzado).
 */
import type { GameContext } from './index';
import { brief, ICON, injectKit, say, sfx, stopSpeak } from './lkKit';

const DAY = 24; // segundos de juego que dura el día lunar
const NIGHT = 9; // la noche pasa más rápido (el robot duerme)
const GOAL_KM = 2;
const GOAL_NIGHTS = 2;

const CSS = `
.lkd__scene { position: relative; border-radius: 20px; overflow: hidden; border: 2px solid rgba(255,255,255,.12); box-shadow: 0 12px 34px rgba(0,0,0,.5); }
.lkd__scene svg { display: block; width: 100%; height: auto; }
.lkd__clock { position: absolute; top: 10px; left: 12px; padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 800; background: rgba(0,0,0,.6); }
.lkd__out { position: absolute; top: 10px; right: 12px; padding: 6px 12px; border-radius: 999px; font-family: var(--font-mono); font-size: 14px; background: rgba(0,0,0,.6); }
.lkd__gauges { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.lkd__g { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
.lkd__g small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .1em; color: var(--muted); }
.lkd__g b { display: block; margin: 2px 0 6px; font-family: var(--font-mono); font-size: 22px; }
.lkd__bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; }
.lkd__bar s { display: block; height: 100%; border-radius: 999px; transition: width .2s; }
.lkd__g.warn { border-color: #fbbf24; }
.lkd__g.bad { border-color: #ef4444; background: rgba(239,68,68,.12); }
.lkd__ctrl { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.lkd__ctrl .lk-btn { min-height: 60px; font-size: 16px; }
.lkd__ctrl [data-lid], .lkd__ctrl [data-drive] { flex: 1 1 200px; }
@media (max-width: 700px) { .lkd__gauges { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SCENE = `
<svg viewBox="0 0 800 330" aria-label="Escena lunar con el Lunojod 2">
  <defs>
    <radialGradient id="lkdSun"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#fde68a"/><stop offset="1" stop-color="rgba(253,230,138,0)"/></radialGradient>
    <linearGradient id="lkdGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f8d87"/><stop offset="1" stop-color="#5b5a55"/></linearGradient>
  </defs>
  <rect width="800" height="330" fill="#03030a"/>
  <g data-stars opacity="0">${Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 137) % 800}" cy="${(i * 53) % 200}" r="${i % 7 ? 1 : 1.8}" fill="#fff"/>`).join('')}</g>
  <g transform="translate(690 60)"><circle r="20" fill="#2563eb"/><path d="M-12 -6c5-6 12-3 12 2s-4 6-2 11-6 6-9 2-5-11-1-15z" fill="#22c55e"/></g>
  <circle data-sun r="46" fill="url(#lkdSun)"/>
  <path d="M0 238 q120 -14 240 -4 t260 2 t300 -6 V330 H0z" fill="#6f6e69"/>
  <rect y="246" width="800" height="84" fill="url(#lkdGround)"/>
  <g data-ground>
    ${[0, 800].map((o) => `<g transform="translate(${o} 0)">
      <ellipse cx="80" cy="290" rx="46" ry="9" fill="#4a4945"/><ellipse cx="300" cy="270" rx="22" ry="5" fill="#4a4945"/>
      <ellipse cx="520" cy="300" rx="60" ry="11" fill="#4a4945"/><ellipse cx="700" cy="268" rx="18" ry="4" fill="#4a4945"/>
      <circle cx="430" cy="262" r="5" fill="#a8a69f"/><circle cx="150" cy="258" r="3" fill="#a8a69f"/><circle cx="640" cy="310" r="6" fill="#a8a69f"/></g>`).join('')}
  </g>
  <g transform="translate(290 154)">
    <ellipse cx="110" cy="118" rx="96" ry="7" fill="rgba(0,0,0,.45)"/>
    <rect x="40" y="16" width="5" height="34" fill="#9ca3af"/><circle cx="42" cy="14" r="6" fill="#d1d5db"/>
    <path d="M30 52 h160 l-12 40 h-136 z" fill="#c9ccd3" stroke="#6b7280" stroke-width="3"/>
    <circle cx="176" cy="70" r="7" fill="#111827" stroke="#9ca3af" stroke-width="2"/>
    <rect x="44" y="92" width="132" height="6" rx="3" fill="#6b7280"/>
    ${[52, 92, 132, 172].map((x) => `<g data-wheel transform="translate(${x} 104)"><circle r="15" fill="#374151" stroke="#d1d5db" stroke-width="3"/><path d="M-12 0h24M0 -12v24" stroke="#9ca3af" stroke-width="3"/></g>`).join('')}
    <g data-lidg style="transform-origin: 26px 50px; transition: transform .7s ease-in-out">
      <path d="M26 50 q84 -34 168 0 z" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3"/>
      <g opacity=".85">${Array.from({ length: 7 }, (_, i) => `<line x1="${44 + i * 20}" y1="${50 - (i < 4 ? i * 4 + 10 : (6 - i) * 4 + 10)}" x2="${44 + i * 20}" y2="50" stroke="#60a5fa" stroke-width="2"/>`).join('')}</g>
    </g>
    <g data-heat opacity="0"><circle cx="110" cy="74" r="9" fill="#f97316"/><circle cx="110" cy="74" r="16" fill="rgba(249,115,22,.35)"/></g>
  </g>
  <rect data-dark width="800" height="330" fill="#000010" opacity="0" style="transition: opacity .8s"/>
</svg>`;

export default function lkDayNight({ root, win }: GameContext): () => void {
  injectKit();
  inject();
  let raf = 0;
  let alive = true;
  const timers: number[] = [];
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const start = () => {
    root.innerHTML = `
      <div class="lk"><div class="lk__wrap">
        <div class="lk-top">
          <p class="lk-task"><i>2</i>Recorre ${GOAL_KM} km y sobrevive ${GOAL_NIGHTS} noches lunares.</p>
        </div>
        <div class="lkd__scene">${SCENE}
          <span class="lkd__clock" data-clock>Día lunar 1 · Amanecer</span>
          <span class="lkd__out" data-out>Afuera: +20 °C</span>
        </div>
        <div class="lkd__gauges">
          <div class="lkd__g" data-gbat><small>🔋 BATERÍA</small><b data-bat>40 %</b><div class="lkd__bar"><s data-batbar style="background:#34d399"></s></div></div>
          <div class="lkd__g" data-gtemp><small>🌡️ DENTRO DEL ROBOT</small><b data-temp>+20 °C</b><div class="lkd__bar"><s data-tempbar style="background:#f97316"></s></div></div>
          <div class="lkd__g"><small>🛞 RECORRIDO</small><b data-km>0,0 / ${GOAL_KM} km</b><div class="lkd__bar"><s data-kmbar style="background:#67e8f9"></s></div></div>
          <div class="lkd__g"><small>🌙 NOCHES SUPERADAS</small><b data-nights>0 / ${GOAL_NIGHTS}</b><div class="lkd__bar"><s data-nbar style="background:#a78bfa"></s></div></div>
        </div>
        <div class="lkd__ctrl">
          <button type="button" class="lk-btn" data-lid>☀️ Abrir tapa solar</button>
          <button type="button" class="lk-btn" data-drive>🛞 Avanzar</button>
          <button type="button" class="lk-btn lk-btn--small" data-pause>${ICON.pause}Pausa</button>
        </div>
        <p class="lk-say" data-say></p>
      </div></div>`;

    const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
    const sayEl = q<HTMLElement>('[data-say]');
    const lidBtn = q<HTMLButtonElement>('[data-lid]');
    const driveBtn = q<HTMLButtonElement>('[data-drive]');
    const pauseBtn = q<HTMLButtonElement>('[data-pause]');
    const sun = q<SVGCircleElement>('[data-sun]');
    const lidG = q<SVGGElement>("[data-lidg]");
    const heat = q<SVGGElement>('[data-heat]');
    const dark = q<SVGRectElement>('[data-dark]');
    const starsG = q<SVGGElement>('[data-stars]');
    const groundG = q<SVGGElement>('[data-ground]');
    const wheels = Array.from(root.querySelectorAll<SVGGElement>('[data-wheel]'));

    // estado
    let t = 0; // tiempo dentro del ciclo día+noche
    let dayN = 1;
    let battery = 40;
    let temp = 20;
    let km = 0;
    let nights = 0;
    let lidOpen = false;
    let driving = false;
    let paused = false;
    let scroll = 0;
    let wheelRot = 0;
    let warned = false;
    let lastMsg = '';
    let snapshot = { battery, km, lidOpen };
    let done = false;
    let holdUntil = 0; // mantiene visible un mensaje importante unos segundos

    const msg = (text: string, kind: '' | 'ok' | 'warn' = '', hold = 0) => {
      if (text === lastMsg) return;
      const now = performance.now();
      if (!hold && now < holdUntil) return;
      if (hold) holdUntil = now + hold;
      lastMsg = text;
      say(sayEl, text, kind);
    };
    msg('Amanece en la Luna. Abre la tapa solar para cargar la batería.');

    const setLid = (open: boolean) => {
      lidOpen = open;
      lidG.style.transform = open ? 'rotate(-118deg)' : 'rotate(0deg)';
      lidBtn.innerHTML = open ? '🌙 Cerrar tapa' : '☀️ Abrir tapa solar';
      lidBtn.classList.toggle('lk-btn--on', open);
      sfx.click();
    };
    const setDrive = (on: boolean) => {
      driving = on;
      driveBtn.innerHTML = on ? '⏹ Detener' : '🛞 Avanzar';
      driveBtn.classList.toggle('lk-btn--on', on);
    };
    lidBtn.addEventListener('click', () => setLid(!lidOpen));
    driveBtn.addEventListener('click', () => {
      const night = t >= DAY;
      if (night) {
        msg('De noche el robot duerme para ahorrar energía. Espera al amanecer.', 'warn');
        return;
      }
      if (!driving && battery <= 1) {
        msg('Sin batería. Abre la tapa y espera a que cargue.', 'warn');
        return;
      }
      sfx.click();
      setDrive(!driving);
    });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.innerHTML = paused ? `${ICON.play}Seguir` : `${ICON.pause}Pausa`;
    });
    onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 't' || e.key === 'T') lidBtn.click();
      else if (e.key === 'ArrowUp' || e.key === 'Enter') driveBtn.click();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);

    const fmt = (n: number) => n.toFixed(1).replace('.', ',');
    const els = {
      clock: q<HTMLElement>('[data-clock]'),
      out: q<HTMLElement>('[data-out]'),
      bat: q<HTMLElement>('[data-bat]'),
      batbar: q<HTMLElement>('[data-batbar]'),
      gbat: q<HTMLElement>('[data-gbat]'),
      temp: q<HTMLElement>('[data-temp]'),
      tempbar: q<HTMLElement>('[data-tempbar]'),
      gtemp: q<HTMLElement>('[data-gtemp]'),
      km: q<HTMLElement>('[data-km]'),
      kmbar: q<HTMLElement>('[data-kmbar]'),
      nights: q<HTMLElement>('[data-nights]'),
      nbar: q<HTMLElement>('[data-nbar]'),
    };

    let last = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!paused && !done) step(dt);
      render();
      raf = requestAnimationFrame(loop);
    };

    const step = (dt: number) => {
      const wasNight = t >= DAY;
      t += dt;
      const night = t >= DAY;
      // inicio de la noche
      if (night && !wasNight) {
        if (driving) setDrive(false);
        warned = false;
      }
      // fin de la noche → amanecer
      if (t >= DAY + NIGHT) {
        t = 0;
        dayN++;
        nights++;
        sfx.ok();
        msg(nights >= GOAL_NIGHTS && km < GOAL_KM ? `¡${nights} noches superadas! Ahora avanza hasta completar ${GOAL_KM} km.` : `¡Sobreviviste la noche ${nights}! Amanece otra vez: abre la tapa para cargar.`, 'ok', 3000);
      }
      // guardar el estado al empezar el atardecer (para reintentar)
      if (!night && t >= DAY - 6 && t - dt < DAY - 6) snapshot = { battery, km, lidOpen };

      if (!night) {
        if (lidOpen) battery += 7 * dt;
        if (driving) {
          battery -= 10 * dt;
          km += 0.085 * dt;
          if (battery <= 0) {
            battery = 0;
            setDrive(false);
            msg('¡Batería agotada! Abre la tapa solar y espera a que cargue.', 'warn');
          }
        }
        temp += (20 - temp) * Math.min(1, dt * 1.5);
        if (t >= DAY - 6 && lidOpen) {
          if (!warned) {
            warned = true;
            sfx.beep();
          }
          msg('¡El Sol se está poniendo! Cierra la tapa antes de que llegue la noche helada.', 'warn');
        } else if (t > 2 && !lidOpen && battery < 30 && !driving) msg('La batería está baja. Abre la tapa solar para cargar.');
      } else {
        battery -= 0.6 * dt; // radio y relojes encendidos
        if (lidOpen) {
          temp -= 32 * dt;
          msg('¡Brr! La tapa está abierta y el calor se escapa. ¡Ciérrala ya!', 'warn');
          if (temp < -20) {
            // se congeló: volver al atardecer
            sfx.soft();
            battery = snapshot.battery;
            km = snapshot.km;
            setLid(snapshot.lidOpen);
            t = DAY - 6;
            temp = 20;
            warned = false;
            lastMsg = '';
            msg('El robot se enfrió demasiado. Volvamos al atardecer: esta vez cierra la tapa a tiempo.', 'warn', 3500);
            paused = true; // pausa breve para que el niño lea y entienda
            timers.push(window.setTimeout(() => (paused = false), 2500));
          }
        } else {
          temp += (15 - temp) * Math.min(1, dt * 1.2); // el calentador de polonio lo mantiene tibio
          if (t > DAY + 0.5) msg('Noche lunar (≈ 14 días en la Tierra). Tapa cerrada y el calentador mantiene tibio al robot. Zzz…');
        }
      }
      battery = Math.max(0, Math.min(100, battery));
      if (driving) {
        scroll = (scroll + dt * 90) % 800;
        wheelRot += dt * 360;
      }
      if (km >= GOAL_KM && nights >= GOAL_NIGHTS && !done) {
        done = true;
        setDrive(false);
        finish();
      }
    };

    const render = () => {
      const night = t >= DAY;
      const p = Math.min(1, t / DAY);
      sun.setAttribute('cx', String(60 + 680 * p));
      sun.setAttribute('cy', String(250 - 200 * Math.sin(Math.PI * p)));
      sun.style.opacity = night ? '0' : '1';
      dark.setAttribute('opacity', night ? '0.6' : p < 0.08 || p > 0.92 ? '0.25' : '0');
      starsG.setAttribute('opacity', night ? '1' : '0.15');
      groundG.setAttribute('transform', `translate(${-scroll} 0)`);
      wheels.forEach((w) => {
        const base = w.getAttribute('transform')!.split(')')[0] + ')';
        w.setAttribute('transform', `${base} rotate(${wheelRot})`);
      });
      heat.setAttribute('opacity', night && !lidOpen ? '1' : '0');
      const phase = night ? 'Noche' : p < 0.15 ? 'Amanecer' : p > 0.75 ? 'Atardecer' : 'Mediodía';
      els.clock.textContent = `${night ? '🌙' : '☀️'} Día lunar ${dayN} · ${phase}`;
      els.out.textContent = `Afuera: ${night ? '−170' : p < 0.15 || p > 0.85 ? '+20' : '+120'} °C`;
      els.bat.textContent = `${Math.round(battery)} %`;
      els.batbar.style.width = `${battery}%`;
      els.gbat.className = `lkd__g${battery < 15 ? ' bad' : battery < 30 ? ' warn' : ''}`;
      els.temp.textContent = `${temp >= 0 ? '+' : '−'}${Math.abs(Math.round(temp))} °C`;
      els.tempbar.style.width = `${Math.max(0, Math.min(100, ((temp + 20) / 45) * 100))}%`;
      els.gtemp.className = `lkd__g${temp < 0 ? ' bad' : temp < 10 ? ' warn' : ''}`;
      els.km.textContent = `${fmt(Math.min(km, GOAL_KM))} / ${GOAL_KM} km`;
      els.kmbar.style.width = `${Math.min(100, (km / GOAL_KM) * 100)}%`;
      els.nights.textContent = `${Math.min(nights, GOAL_NIGHTS)} / ${GOAL_NIGHTS}`;
      els.nbar.style.width = `${Math.min(100, (nights / GOAL_NIGHTS) * 100)}%`;
      driveBtn.disabled = night;
    };

    const finish = () => {
      sfx.win();
      const wrap = root.querySelector('.lk__wrap')!;
      const box = document.createElement('div');
      box.className = 'lk-learn';
      box.innerHTML = `
        <h4>¿QUÉ APRENDISTE?</h4>
        <p style="margin:0 0 12px">En la Luna, el día y la noche duran unas <b>2 semanas cada uno</b>. De día hace más de +100 °C y de noche unos −170 °C.
        El Lunojod 2 abría su tapa con <b>panel solar</b> para cargar de día, y de noche la cerraba: un <b>calentador de polonio</b> lo mantenía tibio.</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>`;
      wrap.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.querySelector('[data-end]')!.addEventListener('click', win);
    };

    raf = requestAnimationFrame(loop);
  };

  brief(root, {
    kicker: 'LUNOJOD 2 · MISIÓN 2',
    title: 'Día y noche lunar',
    text: 'El Lunojod tenía una tapa con un panel solar. De día se abría para cargar la batería.',
    goal: `Carga con el Sol, avanza ${GOAL_KM} km y cierra la tapa antes de cada noche.`,
    guess: {
      q: '¿Cuánto dura una noche en la Luna?',
      options: ['Unas 12 horas, como aquí', 'Unas 2 semanas'],
      correct: 1,
      why: 'La Luna gira muy despacio: el día dura unas 2 semanas y la noche otras 2. ¡Y de noche hace muchísimo frío!',
    },
    onStart: start,
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    if (onKey) document.removeEventListener('keydown', onKey);
    stopSpeak();
  };
}