import { AdditiveBlending, BoxGeometry, CanvasTexture, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createControls, createRover, createWorld, followCam } from './world';
import { mountOp, noWebGL } from './opUi';
import { rng } from '../../ui/moonTexture';
import { tr } from '../../i18n';

const EAGLE = { x: 0, z: 0, r: 16, depth: 3, rim: 0.6 };
const SPOTS = [
  { x: 6, z: 4 },
  { x: -8, z: 5 },
  { x: 10.5, z: -7 },
  { x: 2, z: 12.2 },
  { x: -11.5, z: -4 },
  { x: -3, z: -11 },
  { x: 12.4, z: 6.5 },
];
const FACTS = [
  tr('They are tiny! Each little ball is just a few millimeters, like a seed.', '¡Son diminutas! Cada bolita mide pocos milímetros, como una semilla.'),
  tr('They are made of hematite, a mineral that contains iron.', 'Están hechas de hematita, un mineral que tiene hierro.'),
  tr('These little balls usually form when water slowly seeps through rocks.', 'Estas bolitas suelen formarse cuando el agua se filtra lentamente entre las rocas.'),
  tr('Scientists called them «blueberries» because of their shape and color in the photos.', 'Los científicos las llamaron «blueberries» (arándanos) por su forma y su color en las fotos.'),
  tr('The layered rocks at the rim formed from sediment and water a very long time ago.', 'Las rocas en capas del borde se formaron con sedimentos y agua hace muchísimo tiempo.'),
  tr('Hematite had already been detected here from orbit: that is why they chose this place to land.', 'Desde la órbita ya se había detectado hematita aquí: por eso eligieron este lugar para aterrizar.'),
  tr('As the rock wears away, the little balls are left loose on the ground because they are harder.', 'Al gastarse la roca, las bolitas quedan sueltas en el suelo porque son más duras.'),
];
const ARC = { from: -0.6, to: 1.9, r0: 13.2, r1: 15.4 };

function closeup(seed: number): HTMLCanvasElement {
  const S = 320;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(seed * 11 + 1);
  g.fillStyle = '#b98b5e';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 9 + r() * 10) {
    g.fillStyle = `rgba(${r() < 0.5 ? '90,55,30' : '230,200,160'},${0.12 + r() * 0.15})`;
    g.fillRect(0, y, S, 3 + r() * 5);
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '70,40,20' : '240,210,170'},${r() * 0.25})`;
    g.fillRect(r() * S, r() * S, 2, 2);
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 8 + r() * 12;
    g.fillStyle = 'rgba(40,20,10,.45)';
    g.beginPath();
    g.ellipse(x + rad * 0.5, y + rad * 0.6, rad, rad * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.35, 1, x, y, rad);
    gr.addColorStop(0, '#9fb0c4');
    gr.addColorStop(0.5, '#56657a');
    gr.addColorStop(1, '#2a2f3a');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#fff';
  g.fillRect(S - 90, S - 22, 60, 5);
  g.font = '700 13px system-ui';
  g.fillText('5 mm', S - 78, S - 28);
  return c;
}

export default function opBerries({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    const ui = mountOp(root, tr('🔍 Find the <b>7 groups of hematite balls</b>. Follow the radar: it beeps faster when you are close.', '🔍 Encuentra los <b>7 grupos de bolitas de hematita</b>. Sigue el radar: suena más rápido cuando estás cerca.'));
    const world = createWorld(ui.canvasHost, { size: 160, seg: 260, seed: 5, hills: 0.8, craters: [EAGLE], rocks: 260, clear: [{ x: 0, z: 0, r: 11 }] });
    if (!world) return noWebGL(root, win);
    world.setTime(0.4);
    const controls = createControls(ui.joy);
    const rover = createRover(world, -4, -7, 0.4);
    const cam = followCam(world, () => rover, ui.canvasHost);

    const slabMat = new MeshStandardMaterial({ color: '#c9a37a', roughness: 0.9, flatShading: true });
    const slabs = new InstancedMesh(new BoxGeometry(1.5, 0.28, 1.1), slabMat, 240);
    slabs.castShadow = slabs.receiveShadow = true;
    const m4 = new Matrix4();
    const r = rng(17);
    let n = 0;
    for (let a = ARC.from; a < ARC.to && n < 230; a += 0.075) {
      for (let layer = 0; layer < 3 && n < 230; layer++) {
        const rad = ARC.r0 + 0.5 + layer * 0.55 + r() * 0.3;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        const y = world.heightAt(x, z) + 0.15 + layer * 0.22;
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -a + (r() - 0.5) * 0.2);
        const tilt = new Quaternion().setFromAxisAngle(new Vector3(Math.sin(a), 0, -Math.cos(a)), 0.25);
        m4.compose(new Vector3(x, y, z), tilt.multiply(q), new Vector3(1 + r() * 0.5, 0.7 + r() * 0.6, 1));
        slabs.setMatrixAt(n++, m4);
      }
    }
    slabs.count = n;
    world.scene.add(slabs);
    const blocked = (x: number, z: number) => {
      const d = Math.hypot(x, z);
      let a = Math.atan2(z, x);
      if (a < -Math.PI / 2) a += Math.PI * 2;
      return d > ARC.r0 && d < ARC.r1 + 0.6 && a > ARC.from && a < ARC.to;
    };

    const berryMat = new MeshStandardMaterial({ color: '#4f5d70', metalness: 0.35, roughness: 0.35 });
    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(160,200,255,1)');
      gr.addColorStop(1, 'rgba(160,200,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new CanvasTexture(c);
    })();
    const spots = SPOTS.map((s, i) => {
      const grp = new Group();
      const N = 60;
      const inst = new InstancedMesh(new SphereGeometry(1, 10, 8), berryMat, N);
      const rr = rng(i + 40);
      for (let k = 0; k < N; k++) {
        const a = rr() * Math.PI * 2;
        const d = Math.sqrt(rr()) * 0.7;
        const x = s.x + Math.cos(a) * d;
        const z = s.z + Math.sin(a) * d;
        const sc = 0.035 + rr() * 0.04;
        m4.compose(new Vector3(x, world.heightAt(x, z) + sc * 0.6, z), new Quaternion(), new Vector3(sc, sc, sc));
        inst.setMatrixAt(k, m4);
      }
      inst.castShadow = true;
      grp.add(inst);
      const glint = new Sprite(new SpriteMaterial({ map: glowTex, blending: AdditiveBlending, transparent: true, depthWrite: false }));
      glint.position.set(s.x, world.heightAt(s.x, s.z) + 0.25, s.z);
      glint.scale.setScalar(0.9);
      grp.add(glint);
      world.scene.add(grp);
      return { ...s, grp, glint, done: false };
    });
    const flagMat = new MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.4 });

    const radar = document.createElement('canvas');
    radar.width = radar.height = 150;
    radar.style.cssText = 'width:120px;height:120px;border-radius:50%;display:block';
    const radarCard = document.createElement('div');
    radarCard.className = 'op__card';
    radarCard.style.cssText = 'padding:6px;border-radius:50%';
    radarCard.appendChild(radar);
    ui.hud.querySelector('[data-cards]')!.appendChild(radarCard);
    const rg = radar.getContext('2d')!;
    const RANGE = 14;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lk-btn lk-btn--go op__btn';
    btn.textContent = '🔬 Usar microscopio';
    btn.hidden = true;
    ui.btns.appendChild(btn);

    let collected = 0;
    let near: (typeof spots)[number] | null = null;
    let beepT = 0;
    let open = false;
    ui.say(tr('Drive with the joystick or the arrow keys. Drag the screen to look around. The radar guides you!', 'Maneja con el joystick o las flechas. Arrastra la pantalla para mirar alrededor. ¡El radar te guía!'));

    const openScope = () => {
      if (!near || open) return;
      open = true;
      const s = near;
      const idx = spots.indexOf(s);
      sfx.ok();
      const panel = ui.panel(`
        <p class="lk-brief__kicker">${tr('MICROSCOPE · GROUP', 'MICROSCOPIO · GRUPO')} ${collected + 1} ${tr('OF', 'DE')} 7</p>
        <div data-img style="display:grid;place-items:center;margin:10px 0"></div>
        <p style="margin:0 0 14px;font-size:17px;line-height:1.5">${FACTS[collected]}</p>
        <button type="button" class="lk-btn lk-btn--go" data-save>💾 ${tr('Save to the collection', 'Guardar en la colección')}</button>`);
      const img = closeup(idx);
      img.style.cssText = 'width:min(300px,70vw);height:auto;border-radius:50%;border:6px solid #1f2937;box-shadow:0 0 0 3px #fcd34d';
      panel.querySelector('[data-img]')!.appendChild(img);
      panel.querySelector<HTMLButtonElement>('[data-save]')!.focus();
      panel.querySelector('[data-save]')!.addEventListener('click', () => {
        s.done = true;
        collected++;
        s.glint.visible = false;
        const flag = new Group();
        const pole = new Mesh(new CylinderGeometry(0.02, 0.02, 1, 6), flagMat);
        pole.position.y = 0.5;
        const cloth = new Mesh(new BoxGeometry(0.35, 0.22, 0.01), flagMat);
        cloth.position.set(0.18, 0.88, 0);
        flag.add(pole, cloth);
        flag.position.set(s.x + 0.9, world.heightAt(s.x + 0.9, s.z), s.z);
        world.scene.add(flag);
        ui.closePanel();
        open = false;
        btn.hidden = true;
        sfx.ok();
        if (collected >= SPOTS.length) finish();
        else {
          ui.toast(`🔵 ${collected} / 7`, 1200);
          ui.say(tr(`Saved! ${SPOTS.length - collected} to go. Follow the radar.`, `¡Guardado! Te faltan ${SPOTS.length - collected}. Sigue el radar.`), 'ok');
        }
      });
    };
    btn.addEventListener('click', openScope);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && near && !open) {
        e.preventDefault();
        openScope();
      }
    };
    document.addEventListener('keydown', onKey);

    world.onFrame((dt, t) => {
      const frozen = open;
      rover.update(dt, frozen ? 0 : controls.throttle, frozen ? 0 : controls.steer, blocked);
      cam.update(dt);
      world.dust.update(dt, rover.group.position);
      let best: (typeof spots)[number] | null = null;
      let bd = 1e9;
      for (const s of spots) {
        if (s.done) continue;
        const d = Math.hypot(s.x - rover.x, s.z - rover.z);
        if (d < bd) {
          bd = d;
          best = s;
        }
        s.glint.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 2.2 + s.x));
      }
      const wasNear = !!near;
      near = best && bd < 2.4 ? best : null;
      btn.hidden = !near || open;
      if (near && !wasNear) {
        ui.say(tr('You are next to a group of little balls! Use the microscope.', '¡Estás junto a un grupo de bolitas! Usa el microscopio.'), 'ok');
        sfx.beep();
      }
      if (best && bd < RANGE && !open) {
        beepT -= dt;
        if (beepT <= 0) {
          sfx.beep();
          beepT = 0.15 + (bd / RANGE) * 1.3;
        }
      }
      const C = 75;
      rg.clearRect(0, 0, 150, 150);
      rg.fillStyle = 'rgba(10,25,20,.85)';
      rg.beginPath();
      rg.arc(C, C, 74, 0, Math.PI * 2);
      rg.fill();
      rg.strokeStyle = 'rgba(52,211,153,.35)';
      for (const k of [0.33, 0.66, 1]) {
        rg.beginPath();
        rg.arc(C, C, 72 * k, 0, Math.PI * 2);
        rg.stroke();
      }
      const sweep = (t * 2) % (Math.PI * 2);
      rg.strokeStyle = 'rgba(52,211,153,.6)';
      rg.beginPath();
      rg.moveTo(C, C);
      rg.lineTo(C + Math.cos(sweep) * 72, C + Math.sin(sweep) * 72);
      rg.stroke();
      for (const s of spots) {
        if (s.done) continue;
        const dx = s.x - rover.x;
        const dz = s.z - rover.z;
        const d = Math.hypot(dx, dz);
        if (d > RANGE) continue;
        const a = Math.atan2(dx, dz) - rover.heading;
        const px = C - Math.sin(a) * (d / RANGE) * 70;
        const py = C - Math.cos(a) * (d / RANGE) * 70;
        rg.fillStyle = `rgba(147,197,253,${1 - d / RANGE + 0.2})`;
        rg.beginPath();
        rg.arc(px, py, 6, 0, Math.PI * 2);
        rg.fill();
      }
      rg.fillStyle = '#fbbf24';
      rg.beginPath();
      rg.moveTo(C, C - 9);
      rg.lineTo(C - 6, C + 6);
      rg.lineTo(C + 6, C + 6);
      rg.closePath();
      rg.fill();
      ui.card('n', tr('BALLS', 'BOLITAS'), `🔵 ${collected} / 7`);
      ui.card('sig', tr('HEMATITE SIGNAL', 'SEÑAL DE HEMATITA'), bd < RANGE ? (bd < 4 ? tr('STRONG!', '¡FUERTE!') : bd < 9 ? tr('medium', 'media') : tr('weak', 'débil')) : '—');
    });

    const finish = () => {
      sfx.win();
      ui.panel(`
        <p class="lk-brief__kicker">${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</p>
        <h3 style="margin:6px 0 10px;font-family:var(--font-ui);font-size:26px">${tr('🔵 Collection complete!', '🔵 ¡Colección completa!')}</h3>
        <p style="margin:0 0 14px;line-height:1.55">${tr(
          'The hematite «blueberries» and the layered rocks of Eagle crater were some of the first strong evidence that Mars <b>had water</b> long ago. And Opportunity found them in its first weeks on Mars!',
          'Las «blueberries» de hematita y las rocas en capas del cráter Eagle fueron una de las primeras pruebas fuertes de que en Marte <b>hubo agua</b> hace mucho tiempo. ¡Y Opportunity las encontró en sus primeras semanas en Marte!',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`).querySelector('[data-end]')!.addEventListener('click', win);
    };

    world.start();
    cleanup = () => {
      document.removeEventListener('keydown', onKey);
      controls.dispose();
      cam.dispose();
      glowTex.dispose();
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('OPPORTUNITY · MISSION 2', 'OPPORTUNITY · MISIÓN 2'),
    title: tr('The blueberries', 'Las bolitas azules'),
    text: tr('Inside Eagle crater, Opportunity saw thousands of tiny balls on the ground and in the rocks.', 'Dentro del cráter Eagle, Opportunity vio miles de bolitas diminutas en el suelo y en las rocas.'),
    goal: tr('Drive the rover, follow the hematite radar and find 7 groups of little balls.', 'Maneja el rover, sigue el radar de hematita y encuentra 7 grupos de bolitas.'),
    art: MER_SVG,
    accent: '#f59e0b',
    soft: '#fcd34d',
    guess: {
      q: tr('How big are the Martian «blueberries»?', '¿Qué tamaño tienen las «bolitas azules» de Marte?'),
      options: [tr('Like a soccer ball', 'Como una pelota de fútbol'), tr('A few millimeters, like a seed', 'Pocos milímetros, como una semilla')],
      correct: 1,
      why: tr('They are tiny: a few millimeters. You can only see them well with the rover\'s microscope.', 'Son diminutas: pocos milímetros. Solo se ven bien con el microscopio del rover.'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
