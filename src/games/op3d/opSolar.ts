/**
 * OPPORTUNITY · MISIÓN 3 · Energía solar (3D)
 *
 * Opportunity vivía del Sol. El polvo se acumulaba en sus paneles y bajaba la energía; a veces
 * un golpe de viento o un remolino de polvo los limpiaba. En invierno lo estacionaban en
 * pendientes que miraban al Sol para cargar más. Así viajó durante años hasta el cráter
 * Endeavour (llegó en 2011).
 * Mecánica: viaje con día y noche. La batería carga con el Sol según la hora, el polvo y la
 * inclinación del rover; manejar gasta energía; de noche no se maneja y los calentadores
 * gastan. Los remolinos de polvo limpian los paneles. Meta: llegar a Endeavour.
 */
import { AdditiveBlending, CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three';
import type { GameContext } from '../index';
import { brief, ICON, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createControls, createRover, createWorld, followCam, type DustDevil } from './world';
import { mountOp, noWebGL } from './opUi';

const DAY_LEN = 46; // segundos de juego de 6:00 a 18:00
const NIGHT_LEN = 9;
const GOAL = { x: 0, z: 150 };

export default function opSolar({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    const ui = mountOp(root, '☀️ Llega al <b>cráter Endeavour</b> (el faro). Carga con el Sol, cuida el polvo de los paneles y no manejes de noche.');
    const world = createWorld(ui.canvasHost, {
      size: 420,
      seg: 220,
      seed: 11,
      hills: 4.5,
      craters: [
        { x: 0, z: 330, r: 170, depth: 22, rim: 7 },
        { x: -40, z: -20, r: 10, depth: 2 },
        { x: 50, z: 40, r: 14, depth: 3 },
        { x: -30, z: 90, r: 8, depth: 1.6 },
      ],
      rocks: 420,
      clear: [{ x: 0, z: -130, r: 6 }],
    });
    if (!world) return noWebGL(root, win);
    const controls = createControls(ui.joy);
    const rover = createRover(world, 0, -130, 0);
    const cam = followCam(world, () => rover, ui.canvasHost);

    // faro en Endeavour
    const beacon = new Mesh(new CylinderGeometry(0.8, 0.8, 120, 12, 1, true), new MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false }));
    beacon.position.set(GOAL.x, world.heightAt(GOAL.x, GOAL.z) + 60, GOAL.z);
    const flag = new Mesh(new CylinderGeometry(0.08, 0.08, 4, 8), new MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.6 }));
    flag.position.set(GOAL.x, world.heightAt(GOAL.x, GOAL.z) + 2, GOAL.z);
    world.scene.add(beacon, flag);

    // remolinos de polvo
    const devils: DustDevil[] = [];
    const spawnDevil = () => {
      const ahead = new Vector3(rover.x + (Math.random() - 0.5) * 60, 0, rover.z + 25 + Math.random() * 35);
      const d = world.addDevil(ahead.x, ahead.z);
      d.vel.set((Math.random() - 0.5) * 3, 0, -1 - Math.random() * 2);
      devils.push(d);
    };
    for (let i = 0; i < 3; i++) spawnDevil();

    // ---------- estado ----------
    let clock = 0.27; // hora del día (0,25 = amanecer)
    let sol = 1;
    let battery = 70;
    let dust = 0.25;
    let night = false;
    let sleeping = false;
    let paused = false;
    let rate = 0;
    let lastMsgT = 0;
    let done = false;
    let devilTimer = 10;
    const say = (t: string, k: '' | 'ok' | 'warn' = '', force = false) => {
      const now = performance.now();
      if (!force && now - lastMsgT < 2500) return;
      lastMsgT = now;
      ui.say(t, k);
    };
    ui.say('Maneja hacia el faro. Mira la batería: el Sol carga, manejar gasta, y el polvo tapa los paneles. ¡Busca remolinos para limpiarlos!');

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'lk-btn op__btn';
    pauseBtn.innerHTML = `${ICON.pause}Pausa`;
    ui.btns.appendChild(pauseBtn);
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.innerHTML = paused ? `${ICON.play}Seguir` : `${ICON.pause}Pausa`;
    });

    world.onFrame((dt) => {
      if (paused || done) {
        cam.update(dt);
        return;
      }
      // tiempo: el día avanza; la noche pasa rápido
      if (!night) {
        clock += (0.5 / DAY_LEN) * dt;
        if (clock >= 0.75) {
          night = true;
          say('Se puso el Sol. De noche Opportunity se detiene y los calentadores gastan batería. Zzz…', '', true);
        }
      } else {
        clock += (0.5 / NIGHT_LEN) * dt;
        if (clock >= 1.25) {
          clock = 0.25;
          night = false;
          sol++;
          sleeping = false;
          sfx.ok();
          ui.toast(`☀️ Sol ${sol}`, 1300);
          say(`¡Amanece en Marte! Sol ${sol}. En Marte, un día se llama «sol».`, 'ok', true);
        }
      }
      world.setTime(clock % 1);
      const sunDir = new Vector3(Math.cos((clock - 0.25) * Math.PI * 2) * 0.85, Math.sin((clock - 0.25) * Math.PI * 2), 0.35).normalize();
      const sunUp = Math.max(0, sunDir.y);

      // carga solar: hora del día × paneles limpios × inclinación hacia el Sol
      const n = world.normalAt(rover.x, rover.z);
      const tiltGain = Math.max(0, n.dot(sunDir)) / Math.max(0.15, sunDir.y);
      const tiltBonus = Math.min(1.6, Math.max(0.6, tiltGain));
      rate = night ? -1.1 : 7.5 * Math.min(1, sunUp * 1.6) * (1 - dust * 0.9) * tiltBonus;
      const canDrive = !night && !sleeping && battery > 0;
      const thr = canDrive ? controls.throttle : 0;
      const drive = Math.abs(thr) > 0.05 ? 4.2 * Math.abs(thr) : 0;
      battery = Math.min(100, battery + (rate - drive) * dt);
      if (!night) dust = Math.min(1, dust + 0.006 * dt);
      if (battery <= 0) {
        battery = 0;
        if (!sleeping) {
          sleeping = true;
          sfx.soft();
          say('¡Batería agotada! Opportunity entra en modo de ahorro y espera a que el Sol lo recargue.', 'warn', true);
        }
      }
      if (sleeping && battery > 12) {
        sleeping = false;
        say('Batería recuperada. ¡A seguir!', 'ok', true);
      }
      if (controls.throttle !== 0 && night) say('De noche no se maneja: espera al amanecer.', 'warn');
      rover.update(dt, thr, canDrive ? controls.steer : 0);
      rover.setDust(dust);
      cam.update(dt);
      world.dust.update(dt, rover.group.position);

      // remolinos
      devilTimer -= dt;
      if (devilTimer < 0 && devils.length < 4) {
        devilTimer = 12 + Math.random() * 8;
        spawnDevil();
      }
      for (const d of [...devils]) {
        d.update(dt);
        const dd = Math.hypot(d.pos.x - rover.x, d.pos.z - rover.z);
        if (dd < 4.5 && dust > 0.1) {
          dust = Math.max(0, dust - 0.7 * dt * 2);
          if (dust < 0.12) {
            sfx.win();
            ui.toast('✨ ¡Paneles limpios!', 1400);
            say('¡Un remolino de polvo limpió los paneles! Esto le pasó de verdad a Opportunity varias veces.', 'ok', true);
          }
        }
        if (dd > 120) {
          d.remove();
          devils.splice(devils.indexOf(d), 1);
        }
      }
      if (dust > 0.6 && !night) say('Los paneles están muy sucios: cargan poco. ¡Busca un remolino de polvo (las columnas que giran)!', 'warn');
      else if (!night && tiltBonus > 1.15 && Math.abs(controls.throttle) < 0.05) say('¡Bien! Estacionaste en una pendiente que mira al Sol: los paneles cargan más rápido.', 'ok');

      const dist = Math.hypot(GOAL.x - rover.x, GOAL.z - rover.z);
      const hh = Math.floor(((clock % 1) * 24 + 24) % 24);
      ui.card('sol', night ? '🌙 NOCHE' : '☀️ DÍA', `Sol ${sol} · ${String(hh).padStart(2, '0')}:00`);
      ui.card('bat', 'BATERÍA', `<span style="color:${battery < 20 ? '#f87171' : battery < 45 ? '#fbbf24' : '#86efac'}">${battery.toFixed(0)} %</span>`);
      ui.card('rate', 'CARGA', `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}/s`);
      ui.card('dust', 'POLVO EN PANELES', `${Math.round(dust * 100)} %`);
      ui.card('dist', 'A ENDEAVOUR', `${dist.toFixed(0)} m`);
      if (dist < 12 && !done) {
        done = true;
        sfx.win();
        ui.panel(`
          <p class="lk-brief__kicker">¿QUÉ APRENDISTE?</p>
          <h3 style="margin:6px 0 10px;font-family:var(--font-ui);font-size:26px">🏁 ¡Llegaste a Endeavour en ${sol} ${sol === 1 ? 'sol' : 'soles'}!</h3>
          <p style="margin:0 0 14px;line-height:1.55">El Sol era la fuente de energía de Opportunity. El <b>polvo</b> bajaba la carga y los <b>remolinos y el viento</b>
          a veces limpiaban los paneles. En invierno lo estacionaban en <b>pendientes que miraban al Sol</b>. El viaje real a Endeavour duró unos 3 años: ¡llegó en 2011!</p>
          <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>`).querySelector('[data-end]')!.addEventListener('click', win);
      }
    });

    world.start();
    cleanup = () => {
      controls.dispose();
      cam.dispose();
      world.dispose();
    };
  };

  brief(root, {
    kicker: 'OPPORTUNITY · MISIÓN 3',
    title: 'Energía solar',
    text: 'Opportunity funcionaba con paneles solares. Pero en Marte hay mucho polvo… ¡y el polvo tapa los paneles!',
    goal: 'Viaja hasta el cráter Endeavour cuidando la batería durante el día y la noche.',
    art: MER_SVG,
    accent: '#f59e0b',
    soft: '#fcd34d',
    guess: {
      q: '¿Qué limpiaba a veces el polvo de los paneles de Opportunity?',
      options: ['El viento y los remolinos de polvo', 'Un astronauta con un trapo'],
      correct: 0,
      why: 'Ráfagas de viento y remolinos de polvo a veces barrían los paneles. ¡La energía subía de golpe!',
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
