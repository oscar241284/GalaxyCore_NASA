/**
 * OPPORTUNITY · MISIÓN 1 · Hoyo en uno.
 *
 * El 25 de enero de 2004 el módulo de Opportunity, envuelto en airbags, cayó sobre
 * Meridiani Planum, rebotó 26 veces y rodó hasta quedar dentro del pequeño cráter Eagle
 * (22 m de ancho): "un hoyo en uno interplanetario".
 *
 * Cómo se juega:
 * 1. La nave baja colgada del paracaídas y el viento la empuja hacia delante.
 * 2. Con ◀ ▶ se disparan los cohetes laterales (TIRS) para alinearse con el cráter.
 * 3. Al pulsar CORTAR CABLE se encienden los retrocohetes y el módulo cae y rebota solo:
 *    ya no hay control, igual que en la misión real.
 * 4. Se gana si el módulo queda quieto dentro del cráter Eagle.
 *
 * Reparto de archivos: `physics.ts` calcula, `scene.ts` dibuja en 3D y este archivo une
 * ambos con la interfaz (HUD, radar, controles, paneles y sonido).
 */
import type { GameContext } from '../../index';
import { rng } from '../../../ui/moonTexture';
import { Sfx } from '../../shared/audio';
import { bindHoldButton, bindMuteButton, createCapcom, difficultyHtml, injectOpStyles, reducedMotion, starsHtml, statsHtml } from '../../shared/ui';
import { BALL_R, DESCENT, EAGLE_REAL_RADIUS, FIELD, LEVELS, STEP, createWorld, heightAt, judge, newDescent, predict, releaseBall, stepBall, stepDescent } from './physics';
import type { Ball, Descent, Difficulty, Outcome, Prediction, World } from './physics';
import { createHoleScene } from './scene';
import type { HoleScene, ViewMode } from './scene';

type Status = 'brief' | 'countdown' | 'descent' | 'bouncing' | 'opening' | 'result';

/** Rebotes del aterrizaje real, para compararlo con el del jugador. */
const REAL_BOUNCES = 26;
/** Velocidades de la animación de rebotes que puede elegir el jugador (1 = tiempo real). */
const SPEEDS = [1, 1.5, 2, 3] as const;
/** Al rodar no pasa nada emocionante: como mínimo va a esta velocidad. */
const ROLL_MIN_SPEED = 2;
const SPEED_KEY = 'novacore:hio-speed';
/** Tamaño lógico del radar (px). */
const RADAR = { w: 172, h: 214 };

const CSS = `
.hio-radar { position: absolute; top: 66px; right: 12px; width: ${RADAR.w}px; padding: 22px 6px 6px; border-radius: 12px; border: 1px solid #0b0d10;
  background: linear-gradient(180deg, #3a3f47, #1d2026); box-shadow: 0 10px 30px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.15); }
.hio-radar[hidden] { display: none; }
.hio-radar > span { position: absolute; top: 5px; left: 10px; right: 10px; display: flex; justify-content: space-between; font-family: var(--font-ui); font-size: 9px; letter-spacing: .14em; color: #e5e7eb; }
.hio-radar canvas { display: block; width: 100%; aspect-ratio: ${RADAR.w} / ${RADAR.h}; border-radius: 8px; border: 2px solid #0b0d10; background: #1c0f09; }

.hio-speed { position: absolute; left: 12px; bottom: 16px; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 14px; background: rgba(14,10,32,.82); backdrop-filter: blur(6px); animation: op-in .35s var(--ease-out); }
.hio-speed[hidden] { display: none; }
.hio-speed > span { margin-right: 4px; font-family: var(--font-ui); font-size: 10px; letter-spacing: .14em; color: var(--muted); }
.hio-speed button { min-width: 46px; height: 40px; padding: 0 8px; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; cursor: pointer; font-family: var(--font-ui); font-size: 13px; font-weight: 700; color: var(--fg); background: rgba(255,255,255,.04); transition: all .15s; }
.hio-speed button:hover, .hio-speed button:focus-visible { outline: none; border-color: var(--accent-2); }
.hio-speed button[aria-pressed="true"] { color: #1a1000; border-color: #ffd08a; background: var(--retro-amber); box-shadow: 0 0 14px rgba(255,181,71,.6); }
@media (max-width: 720px) { .hio-speed { left: 8px; bottom: 10px; padding: 6px; gap: 4px; } .hio-speed > span { display: none; } .hio-speed button { min-width: 40px; height: 36px; font-size: 12px; } }
@media (max-width: 720px) { .hio-radar { top: 60px; right: 8px; width: 104px; padding: 16px 4px 4px; } .hio-radar > span { font-size: 7px; left: 6px; right: 6px; } .hio-radar b { display: none; } }
`;

function injectStyles(): void {
  injectOpStyles();
  if (document.getElementById('hio-styles')) return;
  const s = document.createElement('style');
  s.id = 'hio-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Dibujo del panel de instrucciones: paracaídas, carcasa, cable y airbags sobre el cráter. */
const BRIEF_ART = `
<svg viewBox="0 0 200 200" role="img" aria-label="Módulo con airbags colgado del paracaídas">
  <ellipse cx="128" cy="150" rx="46" ry="11" fill="#5c2c18"/><ellipse cx="128" cy="147" rx="46" ry="11" fill="none" stroke="#67e8f9" stroke-width="2"/>
  <path d="M128 148V112l16 6-16 6" fill="#f59e0b" stroke="#f1f1f1" stroke-width="2" stroke-linejoin="round"/>
  <path d="M38 52a34 30 0 0 1 68 0z" fill="#f2efe8"/><path d="M55 52a17 30 0 0 1 17-30v30zM89 52a17 30 0 0 0-17-30v30z" fill="#e8703a"/>
  <path d="M38 52 72 92M106 52 72 92M72 52v40M72 100v22" stroke="#f3ede2" stroke-width="1.5"/>
  <path d="M62 100h20l-10-12z" fill="#cdbb9c"/>
  <g fill="#e8dfc8" stroke="#b9a988" stroke-width="1.5"><circle cx="72" cy="136" r="13"/><circle cx="60" cy="130" r="8"/><circle cx="84" cy="130" r="8"/><circle cx="62" cy="144" r="8"/><circle cx="82" cy="144" r="8"/><circle cx="72" cy="124" r="7"/></g>
  <path d="M90 150q14-22 30-6" fill="none" stroke="#ffd166" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/>
</svg>`;

export default function holeInOne({ root, win }: GameContext): () => void {
  injectStyles();
  const sfx = new Sfx();

  root.innerHTML = `
    <div class="op">
      <canvas class="op-view" aria-label="Vista 3D del descenso sobre Meridiani Planum"></canvas>
      <div class="op-hud" hidden>
        <div class="op-hud__top"><span>MER-B · EDL</span><span data-phase>DESCENSO</span></div>
        <div class="op-hud__grid">
          <div class="op-hud__cell"><span>ALTURA</span><b data-alt>—</b></div>
          <div class="op-hud__cell"><span>VELOCIDAD</span><b data-speed>—</b></div>
          <div class="op-hud__cell"><span>REBOTES</span><b data-bounces>0</b></div>
          <div class="op-hud__cell"><span>AL CRÁTER</span><b data-dist>—</b></div>
          <div class="op-hud__cell op-hud__wide"><span>COHETES TIRS <em data-tirsp>100%</em></span><i class="op-bar"><s data-tirs></s></i></div>
          <div class="op-hud__note" data-note></div>
        </div>
      </div>
      <div class="op-tools"><button type="button" class="op-tool" data-mute></button></div>
      <div class="hio-radar" aria-hidden="true" hidden><span><span><b>RADAR · </b>VISTA AÉREA</span><i>▲</i></span><canvas></canvas></div>
      <div class="op-capcom" aria-live="polite"></div>
      <div class="op-pad disabled">
        <button type="button" class="op-key" data-ctl="left" aria-label="Cohetes laterales: mover a la izquierda"><span class="op-key__icon">◀</span>TIRS</button>
        <button type="button" class="op-key op-key--main" data-ctl="cut" aria-label="Cortar el cable"><span class="op-key__icon">✂</span>CORTAR<br>CABLE</button>
        <button type="button" class="op-key" data-ctl="right" aria-label="Cohetes laterales: mover a la derecha"><span class="op-key__icon">▶</span>TIRS</button>
      </div>
      <div class="hio-speed" role="group" aria-label="Velocidad de la animación" hidden>
        <span>VELOCIDAD</span>
        ${SPEEDS.map((v) => `<button type="button" data-speed-x="${v}" aria-pressed="false">${v}×</button>`).join('')}
      </div>
      <div class="op-panel" data-panel hidden></div>
      <div class="op-count" data-count></div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const view = $<HTMLCanvasElement>('canvas.op-view');
  const panel = $('[data-panel]');

  let scene: HoleScene;
  try {
    scene = createHoleScene(view, reducedMotion());
  } catch {
    root.innerHTML = '<p class="op-loading">Este minijuego necesita WebGL y tu navegador no pudo iniciarlo.</p>';
    return () => sfx.stop();
  }

  const hud = $('.op-hud');
  const hudPhase = $('[data-phase]');
  const hudAlt = $('[data-alt]');
  const hudSpeed = $('[data-speed]');
  const hudBounces = $('[data-bounces]');
  const hudDist = $('[data-dist]');
  const hudTirs = $('[data-tirs]');
  const hudTirsP = $('[data-tirsp]');
  const hudNote = $('[data-note]');
  const radarBox = $('.hio-radar');
  const radar = $<HTMLCanvasElement>('.hio-radar canvas');
  const radarCtx = radar.getContext('2d')!;
  const pad = $('.op-pad');
  const speedBox = $('.hio-speed');
  const speedBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-speed-x]'));
  const countEl = $('[data-count]');
  const capcom = createCapcom($('.op-capcom'), sfx, 'MER-B');
  bindMuteButton($<HTMLButtonElement>('[data-mute]'), sfx);

  // ---------- estado ----------
  let difficulty: Difficulty = 'cadete';
  let cfg = LEVELS[difficulty];
  let status: Status = 'brief';
  let world: World;
  let descent: Descent = newDescent();
  let ball: Ball | null = null;
  let prediction: Prediction | null = null;
  const trace: number[] = [];
  let onTarget = false;
  let attempts = 0;
  let time = 0;
  let acc = 0; // tiempo pendiente de simular
  let frameNo = 0;
  let seed = (Date.now() & 0xffff) + 1;
  let speed: number = SPEEDS[0]; // velocidad de la animación de rebotes; se recuerda entre partidas
  try {
    const saved = Number(localStorage.getItem(SPEED_KEY));
    if ((SPEEDS as readonly number[]).includes(saved)) speed = saved;
  } catch {
    /* sin almacenamiento */
  }
  const keys = { left: false, right: false };
  const touch = { left: false, right: false };
  const flags = { alt20: false, target: false };
  const impacts: [number, number][] = []; // botes reales, para el radar
  const timers: number[] = [];

  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
  };
  const steer = () => (keys.right || touch.right ? 1 : 0) - (keys.left || touch.left ? 1 : 0);
  const eagle = () => world.terrain.eagle;

  // ---------- partida ----------
  const newWorld = () => {
    cfg = LEVELS[difficulty];
    world = createWorld(cfg, rng(seed++));
    scene.setTerrain(world.terrain);
    attempts = 0;
    resetAttempt();
  };

  /** Vuelve al inicio del descenso en el mismo escenario (mismo cráter y mismo viento). */
  const resetAttempt = () => {
    clearTimers();
    descent = newDescent();
    ball = null;
    prediction = null;
    onTarget = false;
    acc = 0;
    impacts.length = 0;
    flags.alt20 = flags.target = false;
    capcom.clear();
    countEl.innerHTML = '';
    speedBox.hidden = true;
    scene.reset();
    sfx.loop('wind', 0, 500);
    sfx.loop('tirs', 0, 2400, 'highpass');
    sfx.loop('roll', 0, 160);
  };

  const startCountdown = () => {
    sfx.init();
    panel.hidden = true;
    resetAttempt();
    attempts++;
    status = 'countdown';
    hud.hidden = radarBox.hidden = false;
    const steps = ['3', '2', '1', 'GO'];
    steps.forEach((s, i) =>
      later(i * 700, () => {
        countEl.innerHTML = `<span>${s}</span>`;
        sfx.tone(s === 'GO' ? 1046 : 660, s === 'GO' ? 0.4 : 0.15, 'sine', 0.08);
      }),
    );
    later(steps.length * 700 - 250, () => {
      countEl.innerHTML = '';
      status = 'descent';
      pad.classList.remove('disabled');
      capcom.say('Paracaídas abierto y airbags inflados. ¡Lleva la nave hacia el cráter Eagle!');
    });
  };

  /** Retrocohetes + corte del cable: a partir de aquí el módulo va solo. */
  const cut = (auto: boolean) => {
    if (status !== 'descent') return;
    status = 'bouncing';
    pad.classList.add('disabled');
    speedBox.hidden = false;
    ball = releaseBall(world.terrain, descent);
    scene.release();
    sfx.loop('wind', 0, 500);
    sfx.loop('tirs', 0, 2400, 'highpass');
    sfx.burst({ dur: 1.1, from: 2600, to: 180, vol: 0.5 });
    sfx.tone(60, 0.5, 'sine', 0.3);
    capcom.say(auto ? 'Altura mínima: retrocohetes y corte de cable automáticos.' : 'Retrocohetes encendidos… ¡cable cortado!', 'craft');
    later(1500, () => capcom.say('Ya no hay control: ahora todo depende de los rebotes.'));
  };

  const onBounce = (b: Ball, speed: number) => {
    scene.bounce(b, speed);
    impacts.push([b.x, b.z]);
    sfx.burst({ dur: 0.45, from: 700 + speed * 40, to: 60, vol: Math.min(0.85, 0.15 + speed * 0.06) });
    sfx.tone(52 + speed * 2, 0.22, 'sine', Math.min(0.4, speed * 0.04));
    navigator.vibrate?.(Math.min(40, speed * 4));
    if (b.bounces === 1) capcom.say('¡Primer rebote! Los airbags aguantan.', 'craft');
    else if (b.bounces === 4) capcom.say(`En la misión real rebotó ${REAL_BOUNCES} veces. ¡Sigue, sigue!`);
  };

  const finish = (b: Ball) => {
    speedBox.hidden = true;
    sfx.loop('roll', 0, 160);
    const outcome = judge(world.terrain, b.x, b.z, b.out);
    if (outcome.kind === 'eagle') {
      status = 'opening';
      sfx.beep(true);
      capcom.say('¡Hoyo en uno! El módulo se detuvo dentro del cráter Eagle.');
      later(1400, () => capcom.say('Airbags desinflados. Abriendo pétalos…', 'craft'));
      later(900, () => sfx.burst({ dur: 1.6, from: 1800, to: 300, vol: 0.12, type: 'highpass' }));
      scene.open(b, () => {
        sfx.success();
        showResult(b, outcome.offset);
      });
      return;
    }
    status = 'result';
    sfx.fail();
    later(600, () => showMiss(outcome));
  };

  /** Cuántas veces más rápido que el tiempo real avanza ahora la simulación. */
  const simSpeed = () => (status !== 'bouncing' || !ball ? 1 : ball.mode === 'roll' ? Math.max(speed, ROLL_MIN_SPEED) : speed);

  const setSpeed = (v: number) => {
    speed = v;
    speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speedX) === v)));
    try {
      localStorage.setItem(SPEED_KEY, String(v));
    } catch {
      /* sin almacenamiento */
    }
  };

  // ---------- simulación ----------
  const update = (dt: number) => {
    time += dt;
    if (status === 'descent') {
      acc += dt;
      let firing = false;
      for (; acc >= STEP && status === 'descent'; acc -= STEP) {
        firing = stepDescent(descent, world.wind, steer(), STEP);
        if (descent.alt <= DESCENT.minAlt) cut(true);
      }
      sfx.loop('wind', 0.03 + descent.speed * 0.004, 300 + descent.speed * 40);
      sfx.loop('tirs', firing ? 0.07 : 0, 2400, 'highpass');
      // la predicción cuesta unos miles de pasos: basta con recalcularla cada dos fotogramas
      if (status === 'descent' && frameNo % 2 === 0) {
        prediction = predict(world.terrain, descent, trace);
        onTarget = judge(world.terrain, prediction.rest.x, prediction.rest.z, prediction.out).kind === 'eagle';
      }
      if (!flags.alt20 && descent.alt < 20) {
        flags.alt20 = true;
        capcom.say(`20 metros. El cable se corta solo a los ${DESCENT.minAlt}.`, 'craft');
      }
      if (!flags.target && onTarget && cfg.aid !== 'impact') {
        flags.target = true;
        capcom.say('¡El anillo está en verde! Corta el cable ahora.');
      }
    } else if (status === 'bouncing' && ball) {
      acc += dt * simSpeed();
      for (; acc >= STEP && ball.mode !== 'rest'; acc -= STEP) {
        const e = stepBall(world.terrain, ball);
        if (e?.type === 'bounce') onBounce(ball, e.speed);
        else if (e?.type === 'roll') capcom.say('Ya no rebota: ahora rueda.', 'craft');
        else if (e?.type === 'rest') finish(ball);
      }
      sfx.loop('roll', ball.mode === 'roll' ? Math.min(0.2, Math.hypot(ball.vx, ball.vz) * 0.03) : 0, 160);
    }
  };

  // ---------- HUD ----------
  const updateHud = () => {
    const e = eagle();
    const x = ball ? ball.x : descent.x;
    const z = ball ? ball.z : descent.z;
    const alt = ball ? Math.max(0, ball.y - BALL_R - heightAt(world.terrain, x, z)) : descent.alt;
    const speed = ball ? Math.hypot(ball.vx, ball.vz) : descent.speed;
    hudAlt.textContent = `${alt.toFixed(alt < 10 ? 1 : 0)} m`;
    hudSpeed.textContent = `${speed.toFixed(1)} m/s`;
    hudBounces.textContent = String(ball?.bounces ?? 0);
    hudDist.textContent = `${Math.hypot(x - e.x, z - e.z).toFixed(0)} m`;
    hudTirs.style.width = `${descent.tirs}%`;
    hudTirs.classList.toggle('warn', descent.tirs < 25);
    hudTirsP.textContent = `${Math.ceil(descent.tirs)}%`;
    hudAlt.classList.toggle('warn', status === 'descent' && descent.alt < DESCENT.minAlt + 4);

    if (status === 'descent' || status === 'countdown') {
      hudPhase.textContent = 'DESCENSO';
      const dx = e.x - descent.x;
      hudNote.textContent = Math.abs(dx) < 4 ? '✓ ALINEADO CON EAGLE' : `EAGLE ${dx > 0 ? '▶' : '◀'} ${Math.abs(dx).toFixed(0)} m`;
      hudDist.classList.toggle('ok', onTarget && cfg.aid !== 'impact');
    } else if (status === 'bouncing') {
      hudPhase.textContent = ball?.mode === 'roll' ? 'RODANDO' : 'REBOTANDO';
      hudNote.textContent = 'SIN CONTROL · ¡A REBOTAR!';
      hudDist.classList.remove('ok');
    } else {
      hudPhase.textContent = status === 'opening' ? 'EN EL CRÁTER' : 'DETENIDO';
      hudNote.textContent = status === 'opening' ? '★ HOYO EN UNO ★' : 'MÓDULO DETENIDO';
    }
  };

  /** Radar: vista aérea con el norte arriba (la nave avanza hacia arriba). */
  const drawRadar = () => {
    const c = radarCtx;
    const e = eagle();
    const near = FIELD.back; // borde inferior
    const far = Math.max(FIELD.front, e.z - 110);
    const k = RADAR.h / (near - far); // px por metro
    const sx = (x: number) => RADAR.w / 2 + x * k;
    const sy = (z: number) => (z - far) * k;
    c.setTransform(radar.width / RADAR.w, 0, 0, radar.height / RADAR.h, 0, 0);
    c.clearRect(0, 0, RADAR.w, RADAR.h);
    c.fillStyle = '#3a1c10';
    c.fillRect(sx(-FIELD.halfWidth), 0, FIELD.halfWidth * 2 * k, RADAR.h);
    for (const cr of world.terrain.craters) {
      c.beginPath();
      c.arc(sx(cr.x), sy(cr.z), cr.r * k, 0, Math.PI * 2);
      c.fillStyle = cr === e ? 'rgba(103,232,249,.25)' : '#24100a';
      c.fill();
      c.lineWidth = cr === e ? 2 : 1;
      c.strokeStyle = cr === e ? '#67e8f9' : '#6b3a22';
      c.stroke();
    }
    // botes ya dados
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (const [x, z] of impacts) c.fillRect(sx(x) - 1.5, sy(z) - 1.5, 3, 3);
    // ayuda de puntería (lo mismo que se ve en 3D)
    if (status === 'descent' && prediction) {
      const p = prediction;
      const color = onTarget && cfg.aid !== 'impact' ? '#39ff8a' : '#ffd166';
      if (cfg.aid === 'path') {
        c.strokeStyle = 'rgba(255,209,102,.6)';
        c.setLineDash([2, 3]);
        c.beginPath();
        c.moveTo(sx(descent.x), sy(descent.z));
        for (const [x, z] of p.impacts) c.lineTo(sx(x), sy(z));
        c.lineTo(sx(p.rest.x), sy(p.rest.z));
        c.stroke();
        c.setLineDash([]);
      }
      const at = cfg.aid !== 'impact' || !p.impacts.length ? p.rest : { x: p.impacts[0][0], z: p.impacts[0][1] };
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(sx(at.x), sy(at.z), 5, 0, Math.PI * 2);
      c.stroke();
    }
    // la nave / el módulo
    const x = ball ? ball.x : descent.x;
    const z = ball ? ball.z : descent.z;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(sx(x), sy(z), 3.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#f59e0b';
    c.lineWidth = 1.5;
    c.stroke();
  };

  // ---------- paneles ----------
  const keyHtml = `
    <div class="op-keys">
      <span class="op-cap" data-cap="left">←</span><span class="op-cap" data-cap="right">→</span> cohetes laterales
      <span class="op-cap" data-cap="cut">ESPACIO</span> cortar el cable
    </div>`;

  const showBrief = () => {
    status = 'brief';
    hud.hidden = radarBox.hidden = true;
    pad.classList.add('disabled');
    const rules = () => `
      <li><i>1</i><span>El viento empuja la nave. Usa <b>◀ ▶</b> para ponerte en línea con la <b>bandera</b> del cráter Eagle.</span></li>
      <li><i>2</i><span>${
        cfg.aid === 'impact'
          ? 'El <b>anillo amarillo</b> solo marca el <b>primer bote</b>: el resto tendrás que calcularlo tú.'
          : 'El <b>anillo amarillo</b> muestra dónde quedará el módulo. Cuando esté dentro del cráter se pone <b>verde</b>.'
      }</span></li>
      <li><i>3</i><span>Pulsa <b>CORTAR CABLE</b> en el momento justo. Cuanto más alto cortes, más lejos rebota.</span></li>
      <li><i>4</i><span>Después ya <b>no hay control</b>: en Marte la gravedad es un tercio de la terrestre y los botes son enormes.</span></li>`;
    const size = () => (cfg.craterR === EAGLE_REAL_RADIUS ? 'Cráter de tamaño real: 22 m de ancho.' : `Cráter ampliado a ${cfg.craterR * 2} m para practicar (el real mide 22 m).`);
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker">Misión 1 · Opportunity · Meridiani Planum</p>
      <h3 class="op-panel__title">Haz rebotar el módulo hasta dentro del cráter Eagle</h3>
      <div class="op-brief">
        <div class="op-brief__art">${BRIEF_ART}</div>
        <ul class="op-rules" data-rules>${rules()}</ul>
      </div>
      ${difficultyHtml(LEVELS, difficulty)}
      ${keyHtml}
      <p class="op-text op-text--small" data-size>${size()} En celular usa los botones de la esquina.</p>
      <div class="op-actions"><button type="button" class="op-go" data-go>INICIAR DESCENSO</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff as Difficulty;
        panel.querySelectorAll('[data-diff]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        sfx.init();
        sfx.tone(660, 0.08, 'sine', 0.05);
        newWorld();
        panel.querySelector('[data-rules]')!.innerHTML = rules();
        panel.querySelector('[data-size]')!.textContent = `${size()} En celular usa los botones de la esquina.`;
      }),
    );
    panel.querySelector('[data-go]')!.addEventListener('click', startCountdown);
    panel.querySelector<HTMLButtonElement>('[data-go]')!.focus();
  };

  const showResult = (b: Ball, offset: number) => {
    status = 'result';
    const stars = 1 + (attempts === 1 ? 1 : 0) + (offset < eagle().r * 0.5 ? 1 : 0);
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Cráter Eagle · ${cfg.label}</p>
      <h3 class="op-panel__title ok center">¡Hoyo en uno!</h3>
      ${starsHtml(stars)}
      ${statsHtml([
        ['Rebotes', String(b.bounces)],
        ['Recorrido', `${b.travelled.toFixed(0)} m`],
        ['Al centro', `${offset.toFixed(1)} m`],
        ['Intentos', String(attempts)],
      ])}
      <p class="op-text">El 25 de enero de 2004 el módulo de Opportunity rebotó ${REAL_BOUNCES} veces y rodó hasta el interior del cráter Eagle,
      de solo 22 m de ancho. Nadie apuntó ahí: fue pura suerte, y los científicos lo llamaron «un hoyo en uno interplanetario».
      En las paredes del cráter le esperaba roca formada con agua.</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-again>Volver a jugar</button>
        <button type="button" class="op-go" data-continue>CONTINUAR</button>
      </div>`;
    panel.querySelector('[data-again]')!.addEventListener('click', () => {
      newWorld();
      showBrief();
    });
    panel.querySelector('[data-continue]')!.addEventListener('click', () => {
      panel.hidden = true;
      win();
    });
    panel.querySelector<HTMLButtonElement>('[data-continue]')!.focus();
  };

  const showMiss = (o: Exclude<Outcome, { kind: 'eagle' }>) => {
    const m = o.offset.toFixed(0);
    let title = `Se quedó a ${m} m del cráter Eagle`;
    let tip = '';
    if (o.kind === 'decoy') {
      title = '¡Cráter equivocado!';
      tip = `El módulo quedó atrapado en otro cráter, a ${m} m del Eagle. Fíjate en la bandera y en el aro azul.`;
    } else if (o.kind === 'out') {
      title = 'Se fue demasiado lejos';
      tip = 'El módulo salió de la zona de aterrizaje. Corta el cable antes o más abajo para que rebote menos.';
    } else if (Math.abs(o.side) > Math.abs(o.ahead)) {
      tip = `Quedó ${Math.abs(o.side).toFixed(0)} m a la ${o.side > 0 ? 'derecha' : 'izquierda'}. Usa los cohetes laterales para alinearte antes de cortar.`;
    } else {
      tip = o.ahead > 0 ? 'Se pasó de largo: corta el cable un poco antes.' : 'Se quedó corto: espera un poco más antes de cortar.';
    }
    panel.hidden = false;
    panel.innerHTML = `
      <p class="op-panel__kicker center">Módulo detenido · intento ${attempts}</p>
      <h3 class="op-panel__title bad center">${title}</h3>
      <p class="op-text">${tip}<br>El robot está a salvo: los airbags lo protegieron. Pero el reto es el hoyo en uno… ¡y la NASA lo logró sin poder apuntar!</p>
      <div class="op-actions">
        <button type="button" class="op-alt" data-brief>Cambiar dificultad</button>
        <button type="button" class="op-go" data-retry>REINTENTAR</button>
      </div>`;
    panel.querySelector('[data-brief]')!.addEventListener('click', () => {
      resetAttempt();
      showBrief();
    });
    panel.querySelector('[data-retry]')!.addEventListener('click', startCountdown);
    panel.querySelector<HTMLButtonElement>('[data-retry]')!.focus();
  };

  // ---------- bucle ----------
  const viewMode = (): ViewMode => (status === 'bouncing' ? 'bouncing' : status === 'opening' ? 'opened' : status === 'result' && ball ? 'opened' : status === 'descent' ? 'descent' : 'idle');
  let raf = 0;
  let last = performance.now();
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    frameNo++;
    update(dt);
    scene.frame({ mode: viewMode(), descent, ball, prediction, trace, aid: cfg.aid, onTarget: onTarget && cfg.aid !== 'impact', steer: status === 'descent' ? steer() : 0, time, dt: dt * simSpeed() });
    if (!hud.hidden) {
      updateHud();
      drawRadar();
    }
    raf = requestAnimationFrame(loop);
  };

  // ---------- controles ----------
  const keyMap: Record<string, 'left' | 'right' | 'cut'> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'cut',
    ArrowUp: 'cut',
    KeyW: 'cut',
  };
  const padBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ctl]'));
  const lightKey = (k: string, on: boolean) => {
    panel.querySelector(`[data-cap="${k}"]`)?.classList.toggle('is-on', on);
    padBtns.find((b) => b.dataset.ctl === k)?.classList.toggle('is-on', on);
  };
  const onKey = (e: KeyboardEvent) => {
    const k = keyMap[e.code];
    if (!k) return;
    const down = e.type === 'keydown';
    const playing = status === 'descent' || status === 'countdown' || status === 'bouncing';
    if (e.code === 'Space' && !playing && status !== 'brief') return; // no robar el "clic" de los botones
    if (e.code === 'Space' && status === 'brief' && document.activeElement instanceof HTMLButtonElement) return;
    if (playing) e.preventDefault();
    lightKey(k, down);
    if (k === 'cut') {
      if (down && !e.repeat) cut(false);
    } else {
      keys[k] = down;
    }
    if (down && status === 'brief') {
      sfx.init();
      sfx.tone(k === 'cut' ? 520 : 760, 0.06, 'sine', 0.04);
    }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  padBtns.forEach((b) => {
    const k = b.dataset.ctl as 'left' | 'right' | 'cut';
    bindHoldButton(b, (down) => {
      sfx.init();
      b.classList.toggle('is-on', down);
      if (k === 'cut') {
        if (down) cut(false);
      } else {
        touch[k] = down;
      }
    });
  });

  speedBtns.forEach((b) =>
    b.addEventListener('click', () => {
      setSpeed(Number(b.dataset.speedX));
      sfx.tone(520 + speed * 120, 0.07, 'sine', 0.05);
    }),
  );
  setSpeed(speed);

  const resize = () => {
    scene.resize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    radar.width = RADAR.w * dpr;
    radar.height = RADAR.h * dpr;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(view);
  resize();
  newWorld();
  showBrief();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    clearTimers();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    scene.dispose();
    sfx.stop();
  };
}
