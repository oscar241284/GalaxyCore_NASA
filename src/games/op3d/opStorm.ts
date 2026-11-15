import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, speak, stopSpeak, canSpeak } from '../lkKit';
import { createRover, createWorld } from './world';
import { mountOp, noWebGL } from './opUi';
import { tr } from '../../i18n';

interface Sys {
  id: string;
  name: string;
  icon: string;
  cost: number;
  on: boolean;
  locked?: string;
}
const SUN = [0.9, 0.72, 0.52, 0.34, 0.2, 0.1, 0.05, 0.02, 0.02, 0.02];
const TAU = [0.7, 1.5, 2.8, 4.3, 6, 8, 10, 10.8, 10.8, 10.8];
const INPUT = 60;

const CSS = `
.ops__sys { position: absolute; right: 14px; top: 90px; width: min(330px, calc(100% - 28px)); max-height: calc(100% - 104px); overflow-y: auto; display: grid; gap: 8px; z-index: 3; padding-right: 2px; }
.ops__row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: rgba(20,10,6,.72); border: 2px solid rgba(255,220,180,.15); backdrop-filter: blur(6px); cursor: pointer; font: inherit; color: #fff; text-align: left; }
.ops__row:hover:not(:disabled), .ops__row:focus-visible { outline: none; border-color: #fcd34d; }
.ops__row:disabled { cursor: default; opacity: .85; }
.ops__row i { font-style: normal; font-size: 22px; }
.ops__row span { flex: 1; font-weight: 700; font-size: 14px; line-height: 1.2; }
.ops__row span small { display: block; font-weight: 600; font-size: 11px; color: var(--muted); }
.ops__row b { min-width: 46px; padding: 3px 8px; border-radius: 999px; text-align: center; font-size: 12px; color: #1a0b06; background: #86efac; }
.ops__row.off b { background: #64748b; color: #fff; }
.ops__row.off { opacity: .7; }
.ops__bal { padding: 10px 12px; border-radius: 14px; background: rgba(20,10,6,.8); font-size: 14px; line-height: 1.5; }
.ops__bal b { font-family: var(--font-mono); }
.ops__bar { height: 12px; margin-top: 6px; border-radius: 999px; background: rgba(255,255,255,.12); overflow: hidden; }
.ops__bar s { display: block; height: 100%; border-radius: 999px; transition: width .8s ease, background .8s; }
.ops__end { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; padding: 20px; background: #000; opacity: 0; transition: opacity 2s; text-align: center; }
.ops__end.on { opacity: 1; }
.ops__end p { max-width: 640px; margin: 0; font-family: var(--font-ui); font-size: clamp(18px, 2.6vw, 28px); line-height: 1.5; color: #fde68a; opacity: 0; transition: opacity 1.2s; }
.ops__end p.on { opacity: 1; }
.ops__map svg { width: 100%; height: auto; border-radius: 14px; background: #2a160c; }
.ops__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
.ops__stats div { padding: 10px; border-radius: 12px; text-align: center; background: rgba(252,211,77,.1); border: 1px solid rgba(252,211,77,.3); }
.ops__stats b { display: block; font-family: var(--font-ui); font-size: 22px; color: #fde68a; }
.ops__stats small { font-size: 12px; color: var(--muted); }
@media (max-width: 760px) { .ops__sys { top: auto; bottom: 110px; } .ops__row { padding: 7px 10px; } .ops__stats { grid-template-columns: 1fr 1fr 1fr; } }
`;
let injected = false;
function inject() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const ROUTE_SVG = `
<svg viewBox="0 0 400 230" aria-label="${tr('Diagram of Opportunity\'s route', 'Esquema del recorrido de Opportunity')}">
  <circle cx="60" cy="36" r="6" fill="none" stroke="#fcd34d" stroke-width="2"/>
  <circle cx="98" cy="70" r="12" fill="none" stroke="#fcd34d" stroke-width="2"/>
  <circle cx="150" cy="128" r="22" fill="none" stroke="#fcd34d" stroke-width="2"/>
  <path d="M300 60 a120 150 0 0 1 10 170" fill="none" stroke="#fcd34d" stroke-width="3" stroke-dasharray="6 5"/>
  <path d="M60 36 L98 70 L130 104 L150 128 L190 150 L240 170 L290 180 L300 150 L305 120 L312 196" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="ops__route"/>
  <g font-family="system-ui" font-size="11" font-weight="700" fill="#fff">
    <text x="8" y="22">Eagle · 2004</text>
    <text x="110" y="62">Endurance · 2004</text>
    <text x="178" y="120">Victoria · 2006–2008</text>
    <text x="250" y="48">Endeavour · 2011</text>
    <text x="200" y="196">${tr('Marathon!', '¡Maratón!')} · 2015</text>
    <text x="318" y="210">Perseverance · 2018</text>
  </g>
  <circle cx="312" cy="196" r="6" fill="#ef4444"/>
</svg>`;

export default function opStorm({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;
  const timers: number[] = [];
  const later = (f: () => void, ms: number) => timers.push(window.setTimeout(f, ms));

  const start = () => {
    inject();
    const ui = mountOp(root, tr('🌪️ A giant storm is coming. <b>Turn off everything that is not needed</b> so Opportunity can last as long as possible.', '🌪️ Se acerca una tormenta gigante. <b>Apaga lo que no sea necesario</b> para que Opportunity aguante el mayor tiempo posible.'), { joystick: false });
    const world = createWorld(ui.canvasHost, {
      size: 300,
      seg: 200,
      seed: 21,
      hills: 3,
      craters: [{ x: 0, z: -150, r: 140, depth: 18, rim: 6 }],
      rocks: 380,
      clear: [{ x: 0, z: 2, r: 5 }],
    });
    if (!world) return noWebGL(root, win);
    world.setTime(0.42);
    const rover = createRover(world, 0, 2, 2.6);

    const systems: Sys[] = [
      { id: 'cam', name: tr('Cameras', 'Cámaras'), icon: '📷', cost: 10, on: true },
      { id: 'arm', name: tr('Robotic arm', 'Brazo robótico'), icon: '🦾', cost: 12, on: true },
      { id: 'wheels', name: tr('Wheels (driving)', 'Ruedas (manejar)'), icon: '🛞', cost: 18, on: true },
      { id: 'radio', name: tr('Radio to Earth', 'Radio a la Tierra'), icon: '📡', cost: 8, on: true },
      { id: 'heat', name: tr('Heaters', 'Calentadores'), icon: '🔥', cost: 26, on: true, locked: tr('Always: without heat the electronics break', 'Siempre: sin calor la electrónica se rompe') },
      { id: 'clock', name: tr('Mission clock', 'Reloj de la misión'), icon: '⏰', cost: 4, on: true, locked: tr('Always: it needs it to wake up', 'Siempre: lo necesita para despertar') },
    ];
    const panel = document.createElement('div');
    panel.className = 'ops__sys';
    ui.wrap.appendChild(panel);

    let sol = 0;
    let battery = 60;
    let busy = false;
    let sent = false;
    let alive = true;
    let stormK = 0;
    let stormTarget = 0;
    let camA = 0;

    const load = () => systems.filter((s) => s.on).reduce((a, s) => a + s.cost, 0);
    const income = () => Math.round(INPUT * SUN[Math.min(sol, SUN.length - 1)]);

    const render = () => {
      const inc = income();
      const out = load();
      const bal = inc - out;
      panel.innerHTML = `
        ${systems
          .map(
            (s) => `<button type="button" class="ops__row${s.on ? '' : ' off'}" data-sys="${s.id}" ${s.locked || busy ? 'disabled' : ''} aria-pressed="${s.on}">
          <i>${s.icon}</i><span>${s.name}<small>${s.locked ?? tr(`Uses ${s.cost} per sol`, `Gasta ${s.cost} por sol`)}</small></span><b>${s.on ? 'ON' : 'OFF'}</b></button>`,
          )
          .join('')}
        <div class="ops__bal">
          ☀️ ${tr('Solar energy today', 'Energía del Sol hoy')}: <b>+${inc}</b><br>⚡ ${tr('Used by what is on', 'Gasto con lo encendido')}: <b>−${out}</b><br>
          ${tr('Balance', 'Balance')}: <b style="color:${bal >= 0 ? '#86efac' : '#f87171'}">${bal >= 0 ? '+' : ''}${bal}</b>
          <div class="ops__bar"><s style="width:${Math.max(0, Math.min(100, battery))}%;background:${battery < 25 ? '#ef4444' : battery < 50 ? '#f59e0b' : '#22c55e'}"></s></div>
          ${tr('Battery', 'Batería')}: <b>${Math.max(0, Math.round(battery))}</b> / 100
        </div>
        <button type="button" class="lk-btn lk-btn--go" data-next ${busy ? 'disabled' : ''}>🌙 ${tr('Go to the next sol', 'Pasar al siguiente sol')}</button>
        ${!sent && systems.find((s) => s.id === 'radio')!.on && sol >= 2 ? `<button type="button" class="lk-btn" data-msg ${busy ? 'disabled' : ''}>📨 ${tr('Send a message to Earth', 'Enviar un mensaje a la Tierra')}</button>` : ''}`;
      panel.querySelectorAll<HTMLButtonElement>('[data-sys]').forEach((b) =>
        b.addEventListener('click', () => {
          const s = systems.find((x) => x.id === b.dataset.sys)!;
          s.on = !s.on;
          sfx.click();
          render();
        }),
      );
      panel.querySelector('[data-next]')?.addEventListener('click', nextSol);
      panel.querySelector('[data-msg]')?.addEventListener('click', sendMsg);
      ui.card('sol', tr('STORM SOL', 'SOL DE LA TORMENTA'), `${sol + 1}`);
      ui.card('tau', tr('DUST IN THE SKY (τ)', 'POLVO EN EL CIELO (τ)'), TAU[Math.min(sol, TAU.length - 1)].toFixed(1).replace('.', tr('.', ',')));
    };

    const sendMsg = () => {
      const p = ui.panel(`
        <p class="lk-brief__kicker">${tr('MESSAGE TO EARTH', 'MENSAJE A LA TIERRA')}</p>
        <h3 style="margin:6px 0 12px;font-family:var(--font-ui)">${tr('What do you send to the team?', '¿Qué envías al equipo?')}</h3>
        <div style="display:grid;gap:8px">
          <button type="button" class="lk-btn" data-m="0">📷 ${tr('A photo of the dark sky', 'Una foto del cielo oscuro')}</button>
          <button type="button" class="lk-btn" data-m="1">📊 ${tr('The battery and dust data', 'Los datos de batería y polvo')}</button>
          <button type="button" class="lk-btn" data-m="2">👋 ${tr('A hello for the team', 'Un saludo para el equipo')}</button>
        </div>`);
      p.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) =>
        b.addEventListener('click', () => {
          sent = true;
          battery -= 4;
          sfx.radio();
          ui.closePanel();
          ui.say(
            [tr('Photo sent: the Sun can barely be seen. Opportunity\'s last real images were very dark.', 'Foto enviada: el Sol casi no se ve. Las últimas imágenes reales de Opportunity eran muy oscuras.'), tr('Data sent: it shows the record dust and the battery going down. That is how the team knew what was happening.', 'Datos enviados: muestran el récord de polvo y la batería bajando. Así supo el equipo lo que pasaba.'), tr('Greeting sent. The team on Earth loved it very much!', 'Saludo enviado. ¡El equipo de la Tierra lo quería muchísimo!')][Number(b.dataset.m)],
            'ok',
          );
          render();
        }),
      );
    };

    const nextSol = () => {
      if (busy) return;
      busy = true;
      sfx.click();
      const inc = income();
      const out = load();
      render();
      ui.toast(tr('🌙 The night passes…', '🌙 Pasa la noche…'), 1600);
      stormTarget = Math.min(1, TAU[Math.min(sol + 1, TAU.length - 1)] / 9);
      later(() => {
        if (!alive) return;
        battery = Math.min(100, battery + inc - out);
        sol++;
        busy = false;
        if (battery < 0) return fault();
        const s = sol + 1;
        if (battery < 20) ui.say(tr(`Sol ${s}: the battery is very low (${Math.round(battery)}). The sky is almost black…`, `Sol ${s}: la batería está muy baja (${Math.round(battery)}). El cielo está casi negro…`), 'warn');
        else if (inc - out < 0) ui.say(tr(`Sol ${s}: +${inc} came in and −${out} was used. What else can you turn off?`, `Sol ${s}: entró +${inc} y se gastó −${out}. ¿Qué más puedes apagar?`), 'warn');
        else ui.say(tr(`Sol ${s}: the dust keeps increasing. Battery: ${Math.round(battery)}.`, `Sol ${s}: el polvo sigue aumentando. Batería: ${Math.round(battery)}.`));
        sfx.beep();
        render();
      }, 2200);
    };

    const fault = () => {
      busy = true;
      render();
      sfx.soft();
      ui.say(tr('Battery at zero. Opportunity goes into «low-power fault» mode and shuts down to protect itself…', 'Batería en cero. Opportunity entra en «falla de baja energía» y se apaga para protegerse…'), 'warn');
      stormTarget = 1;
      later(ending, 3500);
    };

    const ending = () => {
      if (!alive) return;
      const survived = sol;
      const end = document.createElement('div');
      end.className = 'ops__end';
      const lines = [
        tr('June 10, 2018: Opportunity\'s last signal arrives.', '10 de junio de 2018: llega la última señal de Opportunity.'),
        tr('For 8 months, NASA sent it more than 1,000 commands to wake it up.', 'Durante 8 meses, la NASA le envió más de 1000 órdenes para despertarlo.'),
        tr('It never answered. On February 13, 2019, the mission ended.', 'Nunca respondió. El 13 de febrero de 2019, la misión terminó.'),
        tr('It was supposed to work for 90 days… and it worked for almost 15 years.', 'Iba a trabajar 90 días… y trabajó casi 15 años.'),
      ];
      end.innerHTML = `<div>${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
      ui.wrap.appendChild(end);
      requestAnimationFrame(() => end.classList.add('on'));
      const ps = Array.from(end.querySelectorAll('p'));
      ps.forEach((p, i) =>
        later(() => {
          p.classList.add('on');
          if (canSpeak) speak(lines[i]);
        }, 2200 + i * 3200),
      );
      later(() => celebrate(survived), 2200 + lines.length * 3200 + 800);
    };

    const celebrate = (survived: number) => {
      if (!alive) return;
      sfx.win();
      const stars = survived >= 7 ? 3 : survived >= 5 ? 2 : 1;
      const p = ui.panel(`
        <p class="lk-brief__kicker">${tr('OPPORTUNITY\'S MARATHON', 'LA MARATÓN DE OPPORTUNITY')}</p>
        <h3 style="margin:6px 0 4px;font-family:var(--font-ui);font-size:24px">${tr(`You kept Opportunity going for ${survived} ${survived === 1 ? 'sol' : 'sols'} in the storm`, `Mantuviste a Opportunity ${survived} ${survived === 1 ? 'sol' : 'soles'} en la tormenta`)}</h3>
        <p style="margin:0 0 8px;font-size:26px;letter-spacing:4px;color:#fde047">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></p>
        <div class="ops__map">${ROUTE_SVG}</div>
        <div class="ops__stats">
          <div><b>45 km</b><small>${tr('traveled', 'recorridos')}</small></div>
          <div><b>~15 ${tr('years', 'años')}</b><small>${tr('instead of 90 days', 'en vez de 90 días')}</small></div>
          <div><b>2015</b><small>${tr('completed a marathon', 'completó una maratón')}</small></div>
        </div>
        <p style="margin:0 0 14px;line-height:1.55">${stars < 3 ? tr('Tip: turning off cameras, arm and wheels saves a lot of energy. ', 'Consejo: apagar cámaras, brazo y ruedas ahorra mucha energía. ') : ''}${tr(
          'Opportunity found clues of ancient water, broke records and paved the way for new explorers like Curiosity and Perseverance. <b>Thank you, Oppy!</b>',
          'Opportunity encontró pistas de agua antigua, batió récords y abrió el camino a nuevos exploradores como Curiosity y Perseverance. <b>¡Gracias, Oppy!</b>',
        )}</p>
        <div class="lk-brief__row">
          <button type="button" class="lk-btn" data-again>↺ ${tr('Play the storm again', 'Jugar la tormenta otra vez')}</button>
          <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>
        </div>`);
      ui.wrap.querySelector('.ops__end')?.remove();
      p.querySelector('[data-end]')!.addEventListener('click', win);
      p.querySelector('[data-again]')!.addEventListener('click', () => {
        cleanup?.();
        start();
      });
    };

    world.onFrame((dt) => {
      stormK += (stormTarget - stormK) * Math.min(1, dt * 0.8);
      world.setStorm(stormK);
      world.dust.setAmount(0.3 + stormK * 0.7);
      rover.setDust(Math.min(0.9, 0.3 + stormK * 0.6));
      camA += dt * 0.08;
      const R = 9 - stormK * 2;
      const y = world.heightAt(rover.x, rover.z);
      world.camera.position.set(rover.x + Math.sin(camA) * R, y + 3.2, rover.z + Math.cos(camA) * R);
      const right = { x: Math.cos(camA), z: -Math.sin(camA) };
      const shift = ui.wrap.clientWidth > 760 ? 2.6 : 0;
      world.camera.lookAt(rover.x + right.x * shift, y + 1, rover.z + right.z * shift);
      world.dust.update(dt, rover.group.position);
    });

    render();
    ui.say(tr('Storm sol 1. Dust starts to block the Sun. Tap the systems to turn them off, then go to the next sol.', 'Sol 1 de la tormenta. El polvo empieza a tapar el Sol. Toca los sistemas para apagarlos y luego pasa al siguiente sol.'));
    world.start();
    cleanup = () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('OPPORTUNITY · MISSION 4', 'OPPORTUNITY · MISIÓN 4'),
    title: tr('The great storm', 'La gran tormenta'),
    text: tr('In 2018, a dust storm covered ALL of Mars. The sky got so dark that almost no sunlight got through.', 'En 2018, una tormenta de polvo cubrió TODO Marte. El cielo se puso tan oscuro que casi no llegaba la luz del Sol.'),
    goal: tr('Decide which systems to turn off each sol so Opportunity can hold out as long as possible.', 'Decide qué sistemas apagar cada sol para que Opportunity resista el mayor tiempo posible.'),
    art: MER_SVG,
    accent: '#f59e0b',
    soft: '#fcd34d',
    guess: {
      q: tr('If a solar robot is left with almost no light, what is best to do?', 'Si un robot solar se queda casi sin luz, ¿qué conviene hacer?'),
      options: [tr('Turn off everything that is not needed', 'Apagar todo lo que no sea necesario'), tr('Drive faster to get out', 'Manejar más rápido para salir')],
      correct: 0,
      why: tr('No Sun means no charge: you have to save every drop of energy, like the Opportunity team did.', 'Sin Sol no hay carga: hay que ahorrar cada gota de energía, como hizo el equipo de Opportunity.'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
