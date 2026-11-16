import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  BufferAttribute,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createWorld } from '../op3d/world';
import { mountOp, noWebGL } from '../op3d/opUi';
import { createBurst, glowSprite, glowTexture, injectSpCss, spiritRover, SP_ACCENT, SP_SOFT } from './spKit';
import { tr } from '../../i18n';

interface Step {
  id: 'chute' | 'bags' | 'rockets';
  label: string;
  top: number;
  low: number;
  ok: string;
  early: string;
  late: string;
}
const STEPS: Step[] = [
  {
    id: 'chute',
    label: tr('🪂 Open parachute', '🪂 Abrir paracaídas'),
    top: 12,
    low: 6,
    ok: tr('Parachute open! The heat shield drops off and the spacecraft slows down.', '¡Paracaídas abierto! El escudo de calor se suelta y la nave frena.'),
    early: tr('Not yet: you are going too fast. Wait for the green zone.', 'Todavía no: vas demasiado rápido. Espera a la zona verde.'),
    late: tr('You missed the parachute moment. Let\'s try again!', 'Se pasó el momento del paracaídas. ¡Intentémoslo otra vez!'),
  },
  {
    id: 'bags',
    label: tr('🎈 Inflate airbags', '🎈 Inflar bolsas de aire'),
    top: 1.6,
    low: 0.4,
    ok: tr('Airbags inflated! Now Spirit is inside a giant ball.', '¡Bolsas infladas! Ahora Spirit está dentro de una pelota gigante.'),
    early: tr('It is too early for the airbags. Wait for the green zone.', 'Aún es pronto para las bolsas. Espera a la zona verde.'),
    late: tr('The airbags were missing. Again, a little earlier!', 'Faltaron las bolsas de aire. ¡Otra vez, un poco antes!'),
  },
  {
    id: 'rockets',
    label: tr('🚀 Fire rockets', '🚀 Encender cohetes'),
    top: 0.15,
    low: 0.03,
    ok: tr('Rockets fired! The spacecraft almost stops… we cut the cable!', '¡Cohetes encendidos! La nave casi se detiene… ¡cortamos el cable!'),
    early: tr('Too high for the rockets. Wait for the green zone, near the ground.', 'Muy alto para los cohetes. Espera a la zona verde, cerca del suelo.'),
    late: tr('The rockets had to fire before touching the ground. Try again!', 'Los cohetes debían encenderse antes de tocar el suelo. ¡Reintenta!'),
  },
];

const BALL_R = 1.15;
const hOf = (alt: number) => BALL_R + 3.2 + 190 * Math.pow(Math.max(0, alt) / 20, 0.75);

function chuteTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#f8fafc' : '#f97316';
    g.fillRect(i * 32, 0, 32, 64);
  }
  return new CanvasTexture(c);
}

export default function spAirbags({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    injectSpCss();
    const ui = mountOp(root, tr('🪂 Land <b>Spirit</b> in Gusev crater. Press the button when the marker is in the <b>green zone</b>.', '🪂 Aterriza a <b>Spirit</b> en el cráter Gusev. Pulsa el botón cuando la marca esté en la <b>zona verde</b>.'), { joystick: false, blue: true });
    const world = createWorld(ui.canvasHost, {
      size: 320,
      seg: 200,
      seed: 21,
      hills: 1.4,
      craters: [
        { x: 30, z: 40, r: 14, depth: 2.4 },
        { x: -50, z: -20, r: 22, depth: 3.5 },
        { x: 70, z: -60, r: 10, depth: 1.8 },
        { x: -20, z: 70, r: 8, depth: 1.4 },
      ],
      rocks: 380,
      clear: [{ x: 0, z: 0, r: 4 }],
    });
    if (!world) return noWebGL(root, win);
    world.setTime(0.36);

    const altEl = document.createElement('div');
    altEl.className = 'sp3-alt';
    altEl.innerHTML = '<div class="sp3-alt__zone" data-zone></div><div class="sp3-alt__mark" data-mark></div>';
    ui.wrap.appendChild(altEl);
    const zoneEl = altEl.querySelector<HTMLElement>('[data-zone]')!;
    const markEl = altEl.querySelector<HTMLElement>('[data-mark]')!;
    const flash = document.createElement('div');
    flash.className = 'sp3-flash';
    ui.wrap.appendChild(flash);

    const stepsCard = document.createElement('div');
    stepsCard.className = 'op__card';
    stepsCard.innerHTML = `<small>${tr('SEQUENCE', 'SECUENCIA')}</small><ol class="sp3-steps">${STEPS.map((s, i) => `<li data-li="${i}">${s.label}</li>`).join('')}</ol>`;
    ui.hud.querySelector('[data-cards]')!.appendChild(stepsCard);

    const goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'lk-btn lk-btn--go sp3-go';
    goBtn.textContent = STEPS[0].label;
    ui.btns.appendChild(goBtn);

    // ---------- Nave ----------
    const glowTex = glowTexture('255,255,255');
    const cap = new Group();
    const white = new MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.5, metalness: 0.3 });
    const shieldMat = new MeshStandardMaterial({ color: '#6b2a12', roughness: 0.8, emissive: '#ff5a1f', emissiveIntensity: 0 });
    const backshell = new Group();
    const shellMesh = new Mesh(new CylinderGeometry(0.55, 1.35, 1.35, 28), white);
    shellMesh.castShadow = true;
    backshell.add(shellMesh);
    const ring = new Mesh(new CylinderGeometry(1.38, 1.38, 0.12, 28), new MeshStandardMaterial({ color: '#9ca3af', metalness: 0.6, roughness: 0.4 }));
    ring.position.y = -0.66;
    backshell.add(ring);
    const flames: Mesh[] = [];
    const flameMat = new MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const f = new Mesh(new ConeGeometry(0.22, 1.6, 12, 1, true), flameMat);
      f.rotation.x = Math.PI;
      f.position.set(Math.cos(a) * 1.0, -1.3, Math.sin(a) * 1.0);
      f.visible = false;
      backshell.add(f);
      flames.push(f);
    }
    cap.add(backshell);

    const shield = new Mesh(new SphereGeometry(1.4, 28, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), shieldMat);
    shield.position.y = -0.2;
    cap.add(shield);
    const plasma = glowSprite(glowTex, '#ff8a3d', 9);
    plasma.position.y = -1.6;
    cap.add(plasma);
    const plasma2 = glowSprite(glowTex, '#ffd29a', 4);
    plasma2.position.y = -1.3;
    cap.add(plasma2);

    // Paracaídas
    const chute = new Group();
    const chuteTex = chuteTexture();
    const canopy = new Mesh(new SphereGeometry(3.4, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new MeshStandardMaterial({ map: chuteTex, side: DoubleSide, roughness: 0.9 }));
    canopy.scale.y = 0.75;
    canopy.castShadow = true;
    chute.add(canopy);
    const lineMat = new LineBasicMaterial({ color: '#e5e7eb', transparent: true, opacity: 0.7 });
    const rimY = Math.cos(Math.PI * 0.42) * 3.4 * 0.75;
    const rimR = Math.sin(Math.PI * 0.42) * 3.4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const g = new BufferGeometry().setFromPoints([new Vector3(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), new Vector3(0, -6.2, 0)]);
      chute.add(new Line(g, lineMat));
    }
    chute.position.y = 7;
    chute.visible = false;
    cap.add(chute);

    // Bolsas de aire (con Spirit dentro)
    const ball = new Group();
    const bagMat = new MeshStandardMaterial({ color: '#efe6cc', roughness: 0.75, metalness: 0.05 });
    const lobes: Mesh[] = [];
    const lobeDirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0.6, 0.6, 0.6],
      [-0.6, 0.6, -0.6],
      [0.6, -0.6, -0.6],
      [-0.6, -0.6, 0.6],
    ];
    for (const d of lobeDirs) {
      const m = new Mesh(new SphereGeometry(0.62, 18, 14), bagMat);
      m.userData.dir = new Vector3(...(d as [number, number, number])).normalize();
      m.castShadow = true;
      ball.add(m);
      lobes.push(m);
    }
    const core = new Mesh(new ConeGeometry(0.75, 1.1, 3), new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.5, roughness: 0.4 }));
    ball.add(core);
    const tether = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3(0, 1, 0)]), new LineBasicMaterial({ color: '#d1d5db' }));
    world.scene.add(cap, ball, tether);
    tether.visible = false;
    ball.visible = false;

    const setInflate = (k: number) => {
      lobes.forEach((m) => {
        const d = m.userData.dir as Vector3;
        m.position.copy(d).multiplyScalar(0.55 * k);
        m.scale.setScalar(Math.max(0.01, k));
      });
      core.visible = k < 0.6;
    };
    setInflate(0);

    // Pétalos del módulo
    const lander = new Group();
    const petalMat = new MeshStandardMaterial({ color: '#cfd4dc', metalness: 0.55, roughness: 0.45, side: DoubleSide });
    const petals: Group[] = [];
    const R_IN = 0.95;
    const SIDE = R_IN * 2 * Math.sqrt(3);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const pivot = new Group();
      pivot.position.set(Math.cos(a) * R_IN, 0.05, Math.sin(a) * R_IN);
      pivot.rotation.order = 'YXZ';
      pivot.rotation.y = Math.PI / 2 - a;
      const sh = new Shape();
      sh.moveTo(-SIDE / 2, 0);
      sh.lineTo(SIDE / 2, 0);
      sh.lineTo(0, SIDE * 0.86);
      sh.closePath();
      const pm = new Mesh(new ShapeGeometry(sh), petalMat);
      pm.castShadow = pm.receiveShadow = true;
      pivot.add(pm);
      pivot.rotation.x = -0.62;
      lander.add(pivot);
      petals.push(pivot);
    }
    const base = new Mesh(new CylinderGeometry(R_IN * 2, R_IN * 2, 0.08, 3), petalMat);
    base.rotation.y = Math.PI / 6;
    base.position.y = 0.04;
    lander.add(base);
    lander.visible = false;
    world.scene.add(lander);
    const rover = spiritRover(world, 0, 0, 0);
    rover.group.visible = false;

    // Estelas de velocidad
    const SN = 260;
    const sPos = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 30;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const sGeo = new BufferGeometry();
    sGeo.setAttribute('position', new BufferAttribute(sPos, 3));
    const sMat = new PointsMaterial({ color: '#ffe6c8', size: 0.22, map: glowTex, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending });
    const streaks = new Points(sGeo, sMat);
    streaks.frustumCulled = false;
    world.scene.add(streaks);
    const dust = createBurst(world, '#d9a273', 0.9, 900);

    // ---------- Estado ----------
    const gY = world.heightAt(0, 0);
    let alt = 20;
    let step = 0;
    let chuteOn = false;
    let chuteOpenK = 0;
    let bags = false;
    let bagK = 0;
    let rockets = 0;
    let paused = false;
    let phase: 'fall' | 'drop' | 'bounce' | 'open' | 'done' = 'fall';
    let bounces = 0;
    let openK = 0;
    let shake = 0;
    const scores: number[] = [];
    const shieldFall = { on: false, y: 0, vy: 0, rx: 0 };
    const bsFly = new Vector3();
    const bp = new Vector3();
    const bv = new Vector3();
    let spin = 0;
    const camPos = new Vector3(9, gY + hOf(20) + 2, 12);
    const camLook = new Vector3(0, gY + hOf(20), 0);

    const rate = () => {
      if (!chuteOn) return 1.6;
      if (rockets > 0) return Math.max(0.004, 0.05 * (1 - rockets / 0.8));
      if (alt > 2) return 0.6;
      if (alt > 0.25) return 0.3;
      return 0.05;
    };
    const fmtAlt = (a: number) => (a >= 1 ? `${a.toFixed(1).replace('.', tr('.', ','))} km` : `${Math.max(0, Math.round(a * 1000))} m`);
    const barY = (a: number) => (1 - Math.sqrt(Math.min(20, Math.max(0, a)) / 20)) * 100;

    const updateUi = () => {
      stepsCard.querySelectorAll<HTMLElement>('[data-li]').forEach((li, i) => (li.className = i < step ? 'done' : i === step && phase === 'fall' ? 'now' : ''));
      if (step < STEPS.length) goBtn.textContent = STEPS[step].label;
      const s = STEPS[step];
      if (s) {
        zoneEl.style.display = '';
        zoneEl.style.top = `${barY(s.top)}%`;
        zoneEl.style.height = `${barY(s.low) - barY(s.top)}%`;
      } else zoneEl.style.display = 'none';
    };
    updateUi();
    ui.say(tr('Spirit enters the Martian atmosphere at 19,000 km/h! Press the button when the white marker is in the green zone.', '¡Spirit entra a la atmósfera de Marte a 19 000 km/h! Pulsa el botón cuando la marca blanca esté en la zona verde.'));

    const retryStep = () => {
      const s = STEPS[step];
      alt = s.top + (s.top - s.low) * 0.35;
      paused = false;
      goBtn.disabled = false;
      ui.say(tr('Going back a little… watch for the green zone!', 'Volvemos un poquito atrás… ¡atento a la zona verde!'));
    };

    const act = () => {
      if (phase !== 'fall' || paused) return;
      const s = STEPS[step];
      if (alt > s.top) {
        sfx.soft();
        ui.say(s.early, 'warn');
        return;
      }
      sfx.ok();
      const mid = (s.top + s.low) / 2;
      const d = Math.abs(alt - mid) / ((s.top - s.low) / 2);
      scores.push(d < 0.5 ? 1 : Math.max(0, 1 - (d - 0.5) * 2));
      if (s.id === 'chute') {
        chuteOn = true;
        chute.visible = true;
        shieldFall.on = true;
        shieldFall.y = 0;
        shieldFall.vy = 0;
        shake = 1.2;
        ui.toast(tr('🪂 PARACHUTE!', '🪂 ¡PARACAÍDAS!') + (d < 0.5 ? ' ⭐' : ''), 1300);
      } else if (s.id === 'bags') {
        bags = true;
        ball.visible = true;
        tether.visible = true;
        ui.toast(tr('🎈 AIRBAGS!', '🎈 ¡BOLSAS DE AIRE!') + (d < 0.5 ? ' ⭐' : ''), 1300);
      } else {
        rockets = 0.001;
        flames.forEach((f) => (f.visible = true));
        shake = 0.8;
        ui.toast(tr('🚀 RETROROCKETS!', '🚀 ¡RETROCOHETES!') + (d < 0.5 ? ' ⭐' : ''), 1300);
      }
      ui.say(s.ok, 'ok');
      step++;
      updateUi();
      if (step >= STEPS.length) goBtn.disabled = true;
    };
    goBtn.addEventListener('click', act);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        act();
      }
    };
    document.addEventListener('keydown', onKey);

    const finish = () => {
      sfx.win();
      const prec = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
      const n = prec > 0.66 ? 3 : prec > 0.33 ? 2 : 1;
      const stars = '★'.repeat(n) + '☆'.repeat(3 - n);
      const precText = n === 3 ? tr('NASA engineer precision!', '¡Precisión de ingeniero de la NASA!') : n === 2 ? tr('Very good control!', '¡Muy buen control!') : tr('You did it. Try again to press right in the middle of the green zone.', 'Lo lograste. Prueba otra vez para pulsar justo en el centro de la zona verde.');
      ui.panel(`
        <p class="lk-brief__kicker">${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</p>
        <h3 style="margin:6px 0 6px;font-family:var(--font-ui);font-size:26px">${tr('🛬 Spirit is on Mars!', '🛬 ¡Spirit está en Marte!')}</h3>
        <p style="margin:0 0 8px;font-size:30px;letter-spacing:4px;color:#fde047">${stars}</p>
        <p style="margin:0 0 14px;line-height:1.55">${precText} ${tr(
          `Landing with ${bounces} bounces! Mars has very little air: a parachute alone is not enough to slow down. That is why Spirit used a <b>parachute, rockets and airbags</b>. Each planet needs its own way of landing.`,
          `¡Aterrizaje con ${bounces} rebotes! Marte tiene poco aire: el paracaídas solo no alcanza para frenar. Por eso Spirit usó <b>paracaídas, cohetes y bolsas de aire</b>. Cada planeta necesita su propia forma de aterrizar.`,
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`).querySelector('[data-end]')!.addEventListener('click', win);
    };

    // ---------- Bucle ----------
    world.onFrame((dt, t) => {
      const capY = gY + hOf(alt) + 3.2;
      if (phase === 'fall') {
        if (!paused) {
          alt -= rate() * dt;
          if (rockets > 0) rockets += dt;
          const s = STEPS[step];
          if (s && alt < s.low) {
            paused = true;
            goBtn.disabled = true;
            sfx.soft();
            ui.say(s.late, 'warn');
            window.setTimeout(() => !paused || retryStep(), 2200);
          } else if (rockets > 0.8 || (rockets > 0 && alt <= 0.012)) {
            phase = 'drop';
            bp.set(0, capY - 3.2, 0);
            bv.set(5.5, -3.5, 2.2);
            bsFly.set(-3, 9, -1.5);
            tether.visible = false;
            sfx.beep();
            ui.say(tr('Cable cut! The ball falls toward the ground…', '¡Cable cortado! La pelota cae hacia el suelo…'), 'ok');
          }
        }
        const sway = chuteOn ? Math.sin(t * 1.3) * 0.08 : 0;
        cap.position.set(Math.sin(t * 0.9) * (chuteOn ? 0.25 : 0.05), capY, 0);
        cap.rotation.z = sway;
        const heat = !chuteOn ? Math.min(1, Math.max(0, (alt - 12.5) / 5)) : 0;
        shieldMat.emissiveIntensity = heat * 1.6;
        plasma.material.opacity = heat * (0.75 + Math.random() * 0.25);
        plasma2.material.opacity = heat;
        plasma.scale.setScalar(7 + heat * 4 + Math.random() * 0.6);
        flash.style.opacity = String(heat * 0.9);
        if (chuteOn) {
          chuteOpenK = Math.min(1, chuteOpenK + dt * 1.6);
          const k = chuteOpenK < 1 ? 0.3 + 0.7 * Math.sin((chuteOpenK * Math.PI) / 2) * (1 + 0.08 * Math.sin(chuteOpenK * 12)) : 1 + Math.sin(t * 2) * 0.02;
          canopy.scale.set(k, 0.75 * k, k);
          chute.position.y = 7 + (1 - chuteOpenK) * -3;
        }
        if (shieldFall.on) {
          shieldFall.vy -= 9 * dt;
          shieldFall.y += shieldFall.vy * dt;
          shieldFall.rx += dt * 1.5;
          shield.position.y = -0.2 + shieldFall.y;
          shield.rotation.x = shieldFall.rx;
          plasma.visible = plasma2.visible = false;
          if (shieldFall.y < -60) shield.visible = false;
        }
        if (bags) {
          bagK = Math.min(1, bagK + dt * 1.4);
          const k = bagK < 1 ? bagK * (1 + 0.15 * Math.sin(bagK * 14)) : 1;
          setInflate(k);
          ball.position.set(cap.position.x, capY - 3.2 - BALL_R * 0.2, 0);
          ball.rotation.y += dt * 0.3;
          (tether.geometry as BufferGeometry).setFromPoints([new Vector3(cap.position.x, capY - 0.7, 0), ball.position.clone().setY(ball.position.y + 0.5)]);
        } else if (chuteOn) {
          ball.visible = true;
          setInflate(0);
          ball.position.set(cap.position.x, capY - 2.6, 0);
          tether.visible = true;
          (tether.geometry as BufferGeometry).setFromPoints([new Vector3(cap.position.x, capY - 0.7, 0), ball.position.clone().setY(ball.position.y + 0.4)]);
        }
        flames.forEach((f) => {
          f.scale.set(1, 0.8 + Math.random() * 0.5, 1);
        });
        if (rockets > 0) {
          const near = capY - gY;
          if (near < 12) dust.emit(new Vector3(cap.position.x, gY + 0.2, 0), 6, 9, 1.5);
        }
        // estelas
        const sp = paused ? 0 : rate() * (chuteOn ? 18 : 30);
        for (let i = 0; i < SN; i++) {
          sPos[i * 3 + 1] += sp * dt;
          if (sPos[i * 3 + 1] > 20) sPos[i * 3 + 1] -= 40;
        }
        sGeo.attributes.position.needsUpdate = true;
        streaks.position.set(0, capY, 0);
        sMat.opacity = Math.min(0.85, sp / 25);
        sMat.size = 0.12 + Math.min(0.4, sp / 70);
        // cámara
        const dist = 11 + (alt > 2 ? 3 : 0);
        const want = new Vector3(Math.sin(t * 0.12) * dist * 0.7 + 4, capY + 1.2 + (chuteOn ? 0.5 : -1), dist);
        camPos.lerp(want, Math.min(1, dt * 2.5));
        camLook.lerp(new Vector3(0, capY - (bags ? 2 : 0.6), 0), Math.min(1, dt * 4));
      } else if (phase === 'drop' || phase === 'bounce') {
        // la parte trasera se va volando con el paracaídas
        bsFly.y -= 2 * dt;
        cap.position.addScaledVector(bsFly, dt);
        cap.rotation.z += dt * 0.4;
        flames.forEach((f) => f.scale.set(1, 0.8 + Math.random() * 0.5, 1));
        if (cap.position.y > gY + 60) cap.visible = false;
        bv.y -= 7.5 * dt;
        bp.addScaledVector(bv, dt);
        const floor = world.heightAt(bp.x, bp.z) + BALL_R * 0.95;
        if (bp.y < floor) {
          bp.y = floor;
          if (Math.abs(bv.y) > 2.2) {
            const n = world.normalAt(bp.x, bp.z);
            bv.y = Math.abs(bv.y) * 0.62;
            bv.x = bv.x * 0.82 + n.x * 2;
            bv.z = bv.z * 0.82 + n.z * 2;
            bounces++;
            phase = 'bounce';
            sfx.beep();
            shake = Math.min(1.4, bv.y / 6);
            dust.emit(new Vector3(bp.x, floor - BALL_R * 0.9, bp.z), 70, 5, 3);
            ui.toast(tr(`💥 Bounce ${bounces}!`, `💥 ¡Rebote ${bounces}!`), 800);
            ui.say(tr(`Bounce ${bounces}! The airbags protect Spirit.`, `¡Rebote ${bounces}! Las bolsas de aire protegen a Spirit.`), 'ok');
          } else {
            bv.y = 0;
            bv.x *= 1 - Math.min(1, 1.6 * dt);
            bv.z *= 1 - Math.min(1, 1.6 * dt);
            if (Math.random() < 0.3) dust.emit(new Vector3(bp.x, floor - BALL_R * 0.9, bp.z), 1, 1, 0.6);
            if (Math.hypot(bv.x, bv.z) < 0.25) {
              phase = 'open';
              lander.position.set(bp.x, world.heightAt(bp.x, bp.z), bp.z);
              rover.x = bp.x;
              rover.z = bp.z;
              rover.heading = 0.6;
              rover.place();
              lander.rotation.y = rover.heading;
              ui.say(tr('It stopped! The airbags deflate and the petals open…', '¡Se detuvo! Se desinflan las bolsas y se abren los pétalos…'), 'ok');
            }
          }
        }
        spin += Math.hypot(bv.x, bv.z) * dt;
        ball.position.copy(bp);
        ball.rotation.set(spin * 0.9, spin * 0.3, -spin);
        const want = new Vector3(bp.x - 3, Math.max(bp.y + 2.5, world.heightAt(bp.x - 3, bp.z + 11) + 2), bp.z + 11);
        camPos.lerp(want, Math.min(1, dt * 2.2));
        camLook.lerp(bp, Math.min(1, dt * 5));
      } else if (phase === 'open') {
        openK = Math.min(1, openK + dt * 0.4);
        const deflate = Math.max(0, 1 - openK * 2.4);
        setInflate(deflate);
        ball.rotation.x *= 1 - dt * 3;
        ball.rotation.z *= 1 - dt * 3;
        if (deflate <= 0) ball.visible = false;
        lander.visible = openK > 0.15;
        const pk = Math.min(1, Math.max(0, (openK - 0.35) / 0.45));
        const e = pk < 1 ? 1 - Math.pow(1 - pk, 3) : 1;
        petals.forEach((p) => (p.rotation.x = -0.62 + e * (Math.PI / 2 + 0.62 - 0.04)));
        rover.group.visible = openK > 0.3;
        if (rover.group.visible) {
          const rise = Math.min(1, Math.max(0, (openK - 0.75) / 0.25));
          rover.group.position.y = world.heightAt(rover.x, rover.z) + 0.08 + rise * 0.02;
          rover.group.scale.setScalar(0.92 + rise * 0.08);
        }
        const target = lander.position;
        const a = t * 0.25;
        const want = new Vector3(target.x + Math.sin(a) * 6, target.y + 2.6, target.z + Math.cos(a) * 6);
        camPos.lerp(want, Math.min(1, dt * 1.5));
        camLook.lerp(target.clone().setY(target.y + 0.6), Math.min(1, dt * 3));
        if (openK >= 1) {
          phase = 'done';
          sfx.ok();
          ui.toast(tr('✨ WELCOME TO MARS!', '✨ ¡BIENVENIDO A MARTE!'), 2200);
          window.setTimeout(finish, 1600);
        }
      } else {
        const target = lander.position;
        const a = t * 0.18;
        camPos.lerp(new Vector3(target.x + Math.sin(a) * 6.5, target.y + 2.4, target.z + Math.cos(a) * 6.5), Math.min(1, dt * 1.5));
        camLook.lerp(target.clone().setY(target.y + 0.6), Math.min(1, dt * 3));
      }

      dust.update(dt);
      world.dust.update(dt, camLook);
      if (shake > 0.01) shake *= 1 - Math.min(1, dt * 5);
      world.camera.position.copy(camPos).add(new Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
      world.camera.lookAt(camLook);

      const s = STEPS[step];
      markEl.style.top = `${barY(phase === 'fall' ? alt : 0)}%`;
      ui.card('alt', tr('ALTITUDE', 'ALTITUD'), phase === 'fall' ? fmtAlt(alt) : '0 m');
      ui.card('spd', tr('SPEED', 'VELOCIDAD'), phase === 'fall' ? `${Math.round(rate() * (chuteOn ? 1100 : 3000))} km/h` : phase === 'drop' || phase === 'bounce' ? `${Math.round(bv.length() * 6)} km/h` : '0 km/h');
      const inZone = s && phase === 'fall' && !paused && alt <= s.top && alt >= s.low;
      goBtn.classList.toggle('ready', !!inZone);
    });

    world.start();
    cleanup = () => {
      document.removeEventListener('keydown', onKey);
      glowTex.dispose();
      chuteTex.dispose();
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 1', 'SPIRIT · MISIÓN 1'),
    title: tr('Airbag landing', 'Aterrizaje con bolsas de aire'),
    text: tr('In 2004, Spirit arrived on Mars wrapped in airbags, like a giant ball.', 'En 2004, Spirit llegó a Marte envuelto en bolsas de aire, como una pelota gigante.'),
    goal: tr('Press the button in the green zone: parachute, airbags and rockets.', 'Pulsa el botón en la zona verde: paracaídas, bolsas de aire y cohetes.'),
    art: MER_SVG,
    accent: SP_ACCENT,
    soft: SP_SOFT,
    guess: {
      q: tr('How did Spirit touch the ground when it reached Mars?', '¿Cómo tocó el suelo Spirit al llegar a Marte?'),
      options: [tr('Bouncing inside airbags', 'Rebotando dentro de bolsas de aire'), tr('An astronaut lowered it', 'Lo bajó un astronauta')],
      correct: 0,
      why: tr('It fell inside airbags and bounced many times before stopping. No person has ever gone to Mars!', 'Cayó dentro de bolsas de aire y rebotó muchas veces antes de detenerse. ¡Nunca ha ido una persona a Marte!'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
