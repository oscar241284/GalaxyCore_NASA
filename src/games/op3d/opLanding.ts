/**
 * OPPORTUNITY · MISIÓN 1 · ¡Hoyo en uno! (3D)
 *
 * El 25 de enero de 2004 Opportunity rebotó dentro de sus bolsas de aire y rodó hasta quedar
 * DENTRO del pequeño cráter Eagle (≈ 22 m): los científicos lo llamaron un «hoyo en uno».
 * Mecánica: guiar la cápsula bajo el paracaídas con los cohetes laterales (combustible
 * limitado, ráfagas de viento) usando el marcador de caída; a 12 m se suelta la pelota de
 * bolsas de aire, que rebota y rueda con física real sobre el terreno. 3 estrellas si termina
 * dentro del cráter. Se puede repetir para mejorar.
 */
import {
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
  BoxGeometry,
  AdditiveBlending,
} from 'three';
import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createControls, createRover, createWorld, type Rover } from './world';
import { mountOp, noWebGL } from './opUi';

const EAGLE = { x: 0, z: 0, r: 11, depth: 3.2, rim: 0.7 };
const G = 5.2; // gravedad del juego (Marte: 3,71 m/s²; un poco más para que no sea lento)
const BALL_R = 2.4;

export default function opLanding({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    const ui = mountOp(root, '🎯 Guía la cápsula y haz que la pelota de bolsas de aire termine <b>dentro del cráter Eagle</b>.');
    const world = createWorld(ui.canvasHost, {
      size: 420,
      seg: 230,
      seed: 3,
      hills: 1.2,
      craters: [EAGLE, { x: 46, z: -34, r: 7, depth: 1.8 }, { x: -60, z: 28, r: 9, depth: 2.2 }, { x: 80, z: 70, r: 16, depth: 3.5 }, { x: -95, z: -85, r: 22, depth: 4.5 }],
      clear: [{ x: EAGLE.x, z: EAGLE.z, r: EAGLE.r * 1.3 }],
      rocks: 380,
    });
    if (!world) return noWebGL(root, win);
    world.setTime(0.36);
    const controls = createControls(ui.joy);

    // ---------- marcador del cráter (anillo + haz de luz) ----------
    const markGroup = new Group();
    const ring = new Mesh(new RingGeometry(EAGLE.r - 0.6, EAGLE.r + 0.4, 64), new MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(EAGLE.x, world.heightAt(EAGLE.x + EAGLE.r, EAGLE.z) + 0.25, EAGLE.z);
    const beam = new Mesh(new CylinderGeometry(0.6, 0.6, 140, 12, 1, true), new MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
    beam.position.set(EAGLE.x, 70, EAGLE.z);
    markGroup.add(ring, beam);
    world.scene.add(markGroup);
    // marcador de dónde caerá
    const aim = new Mesh(new RingGeometry(1.6, 2.4, 40), new MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false }));
    aim.rotation.x = -Math.PI / 2;
    world.scene.add(aim);

    // ---------- cápsula: paracaídas + concha + pelota ----------
    const capsule = new Group();
    const chuteMat = new MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8, side: DoubleSide });
    const chute = new Mesh(new ConeGeometry(7, 3.5, 24, 1, true), chuteMat);
    chute.position.y = 22;
    const stripe = new Mesh(new ConeGeometry(7.05, 1.2, 24, 1, true), new MeshStandardMaterial({ color: '#f97316', roughness: 0.8, side: DoubleSide }));
    stripe.position.y = 21.2;
    const lines = new Group();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const l = new Mesh(new CylinderGeometry(0.03, 0.03, 13, 4), new MeshBasicMaterial({ color: '#e5e7eb' }));
      const top = new Vector3(Math.cos(a) * 6.8, 20.3, Math.sin(a) * 6.8);
      const bot = new Vector3(0, 8.5, 0);
      l.position.copy(top).add(bot).multiplyScalar(0.5);
      l.lookAt(bot);
      l.rotateX(Math.PI / 2);
      lines.add(l);
    }
    const shell = new Mesh(new ConeGeometry(1.4, 1.3, 20), new MeshStandardMaterial({ color: '#e5e7eb', metalness: 0.4, roughness: 0.45 }));
    shell.position.y = 8;
    const shellGroup = new Group();
    shellGroup.add(chute, stripe, lines, shell);
    const flames = new Mesh(new ConeGeometry(0.5, 3, 12), new MeshBasicMaterial({ color: '#fdba74', transparent: true, opacity: 0.85, blending: AdditiveBlending }));
    flames.rotation.x = Math.PI;
    flames.position.y = 6;
    flames.visible = false;
    shellGroup.add(flames);
    capsule.add(shellGroup);

    const ball = new Group();
    const lobeMat = new MeshStandardMaterial({ color: '#efe3c4', roughness: 0.75 });
    const lobeGeo = new SphereGeometry(1.25, 18, 14);
    const lobes: [number, number, number][] = [];
    for (const y of [-0.8, 0.8]) for (let i = 0; i < 4; i++) lobes.push([Math.cos((i / 4) * Math.PI * 2 + y) * 1.1, y, Math.sin((i / 4) * Math.PI * 2 + y) * 1.1]);
    lobes.push([0, 1.5, 0], [0, -1.5, 0]);
    for (const [x, y, z] of lobes) {
      const m = new Mesh(lobeGeo, lobeMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      ball.add(m);
    }
    const tether = new Mesh(new CylinderGeometry(0.04, 0.04, 5, 4), new MeshBasicMaterial({ color: '#d1d5db' }));
    tether.position.y = 4.5;
    capsule.add(tether);
    capsule.add(ball);
    capsule.traverse((o) => ((o as Mesh).castShadow = true));
    world.scene.add(capsule);

    // pétalos (al final)
    const petals = new Group();
    const petalMat = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.5, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const p = new Group();
      const m = new Mesh(new BoxGeometry(2.2, 0.08, 2.0), petalMat);
      m.position.z = 1.0;
      m.castShadow = m.receiveShadow = true;
      p.add(m);
      p.rotation.y = (i / 4) * Math.PI * 2;
      petals.add(p);
    }
    petals.visible = false;
    world.scene.add(petals);

    // ---------- estado ----------
    let attempt = 0;
    let best = 0;
    let rover: Rover | null = null;
    let phase: 'descent' | 'rockets' | 'ball' | 'open' | 'result' = 'descent';
    const p = new Vector3();
    const v = new Vector3();
    let fuel = 100;
    let gust = 0;
    let gustDir = new Vector3();
    let wind = new Vector3();
    let bounces = 0;
    let still = 0;
    let openT = 0;
    let shellV = new Vector3();
    const camPos = new Vector3();
    const camLook = new Vector3();

    const reset = () => {
      attempt++;
      ui.closePanel();
      phase = 'descent';
      const a = Math.random() * Math.PI * 2;
      p.set(Math.cos(a) * 55, 130, Math.sin(a) * 55);
      wind = new Vector3(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(-2.2).applyAxisAngle(new Vector3(0, 1, 0), (Math.random() - 0.5) * 1.6);
      v.set(wind.x, -11, wind.z);
      fuel = 100;
      bounces = 0;
      still = 0;
      openT = 0;
      gust = 3 + Math.random() * 3;
      capsule.visible = true;
      shellGroup.visible = true;
      shellGroup.position.set(0, 0, 0);
      tether.visible = true;
      ball.visible = true;
      ball.scale.setScalar(1);
      ball.position.set(0, 0, 0);
      ball.rotation.set(0, 0, 0);
      petals.visible = false;
      if (rover) {
        world.scene.remove(rover.group);
        rover = null;
      }
      aim.visible = true;
      markGroup.visible = true;
      camPos.set(p.x - 20, p.y + 22, p.z - 28);
      ui.say(attempt === 1 ? 'Usa el joystick o las flechas para encender los cohetes laterales. Lleva el círculo celeste (dónde caerás) hasta el anillo dorado.' : `Intento ${attempt}. ¡Tú puedes!`);
    };

    const toCam = (x: number, y: number) => {
      // dirección relativa a la cámara (arriba en pantalla = alejarse de la cámara)
      const f = new Vector3();
      world.camera.getWorldDirection(f);
      f.y = 0;
      f.normalize();
      const r = new Vector3(-f.z, 0, f.x);
      return f.multiplyScalar(-y).add(r.multiplyScalar(x));
    };

    const predictLanding = () => {
      const alt = p.y - world.heightAt(p.x, p.z);
      const tFall = Math.max(0, (alt - 10) / Math.max(1, -v.y)) + 1.2;
      return new Vector3(p.x + v.x * tFall * 1.5, 0, p.z + v.z * tFall * 1.5);
    };

    world.onFrame((dt, t) => {
      ring.material.opacity = 0.45 + 0.35 * Math.sin(t * 4);
      if (phase === 'descent' || phase === 'rockets') {
        const alt = p.y - world.heightAt(p.x, p.z);
        // ráfagas de viento
        gust -= dt;
        if (gust < 0) {
          gust = 3 + Math.random() * 4;
          gustDir = new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(2.5 + Math.random() * 2.5);
          if (phase === 'descent') ui.toast('💨 ¡Ráfaga!', 900);
        }
        const gk = Math.max(0, Math.sin(Math.max(0, gust) * 1.2));
        const steer = toCam(controls.steer, controls.throttle);
        const using = (Math.abs(controls.steer) + Math.abs(controls.throttle) > 0.1) && fuel > 0;
        if (using) {
          v.addScaledVector(steer, 4.5 * dt);
          fuel = Math.max(0, fuel - 7 * dt);
          const hs = Math.hypot(v.x, v.z);
          if (hs > 9) {
            v.x *= 9 / hs;
            v.z *= 9 / hs;
          }
        }
        // arrastre hacia la velocidad del viento
        const target = wind.clone().addScaledVector(gustDir, gk);
        v.x += (target.x - v.x) * 0.25 * dt;
        v.z += (target.z - v.z) * 0.25 * dt;
        if (phase === 'descent' && alt < 22) {
          phase = 'rockets';
          ui.say('¡Cohetes de frenado encendidos! Se suelta la pelota…', 'ok');
          sfx.radio();
        }
        if (phase === 'rockets') {
          v.y += (-1 - v.y) * Math.min(1, dt * 2.5);
          flames.visible = true;
          flames.scale.setScalar(0.8 + Math.random() * 0.4);
        } else {
          v.y = -11;
          flames.visible = false;
        }
        p.addScaledVector(v, dt);
        capsule.position.copy(p);
        capsule.rotation.z = -v.x * 0.02;
        capsule.rotation.x = v.z * 0.02;
        const pl = predictLanding();
        aim.position.set(pl.x, world.heightAt(pl.x, pl.z) + 0.3, pl.z);
        if (phase === 'rockets' && alt < 12) {
          // cortar el cable: la pelota cae libre
          phase = 'ball';
          aim.visible = false;
          const bw = new Vector3();
          ball.getWorldPosition(bw);
          capsule.remove(ball);
          world.scene.add(ball);
          ball.position.copy(bw);
          tether.visible = false;
          v.y = -5;
          v.x *= 1.4;
          v.z *= 1.4;
          shellV.set(v.x * 0.5 + 3, 6, v.z * 0.5 + 2);
          flames.visible = true;
          sfx.beep();
        }
        ui.card('alt', 'ALTITUD', `${Math.max(0, alt).toFixed(0)} m`);
        ui.card('fuel', 'COHETES LATERALES', `${fuel.toFixed(0)} %`);
        const d = Math.hypot(pl.x - EAGLE.x, pl.z - EAGLE.z);
        ui.card('dist', 'CAÍDA ↔ CRÁTER', `${d.toFixed(0)} m`);
        // cámara: arriba y detrás, mirando al suelo
        const want = new Vector3(p.x - 16, p.y + 26, p.z - 24);
        camPos.lerp(want, Math.min(1, dt * 2));
        camLook.lerp(new Vector3(p.x + v.x * 2, world.heightAt(p.x, p.z), p.z + v.z * 2), Math.min(1, dt * 3));
      } else if (phase === 'ball') {
        // concha y paracaídas se van volando
        shellGroup.position.addScaledVector(shellV, dt);
        shellV.y -= 1.5 * dt;
        // física de la pelota de bolsas de aire
        v.y -= G * dt;
        ball.position.addScaledVector(v, dt);
        const gy = world.heightAt(ball.position.x, ball.position.z) + BALL_R;
        if (ball.position.y < gy) {
          ball.position.y = gy;
          const n = world.normalAt(ball.position.x, ball.position.z);
          const vn = v.dot(n);
          if (vn < 0) {
            const vnAbs = -vn;
            v.addScaledVector(n, -vn * 1.55); // rebote (restitución 0,55)
            if (vnAbs > 2) {
              bounces++;
              sfx.beep();
              ui.toast(`¡Rebote ${bounces}!`, 600);
            }
          }
          // fricción al rodar
          v.multiplyScalar(1 - Math.min(1, dt * 0.55));
          // la pendiente acelera la pelota (dentro del cráter rueda hacia el centro)
          v.x += n.x * G * dt * 0.9;
          v.z += n.z * G * dt * 0.9;
        }
        const hs = Math.hypot(v.x, v.z);
        ball.rotation.x += (v.z / BALL_R) * dt;
        ball.rotation.z -= (v.x / BALL_R) * dt;
        if (hs < 0.35 && Math.abs(v.y) < 0.6 && ball.position.y - gy < 0.05) still += dt;
        else still = 0;
        if (still > 0.8) {
          phase = 'open';
          ui.say('La pelota se detuvo. Se desinflan las bolsas y se abren los pétalos…');
        }
        camLook.lerp(ball.position, Math.min(1, dt * 4));
        const want = ball.position.clone().add(new Vector3(-14, 10, -14));
        camPos.lerp(want, Math.min(1, dt * 1.6));
        const dd = Math.hypot(ball.position.x - EAGLE.x, ball.position.z - EAGLE.z);
        ui.card('dist', 'PELOTA ↔ CRÁTER', `${dd.toFixed(0)} m`);
        ui.card('alt', 'REBOTES', String(bounces));
      } else if (phase === 'open') {
        openT += dt;
        ball.scale.setScalar(Math.max(0.05, 1 - openT * 0.7));
        if (openT > 1.2 && !rover) {
          rover = createRover(world, ball.position.x, ball.position.z, Math.random() * 6);
          rover.group.scale.setScalar(0.01);
          petals.visible = true;
          petals.position.set(ball.position.x, world.heightAt(ball.position.x, ball.position.z) + 0.05, ball.position.z);
        }
        if (rover) {
          const k = Math.min(1, (openT - 1.2) / 1.2);
          rover.group.scale.setScalar(Math.max(0.01, k));
          petals.children.forEach((c) => ((c.children[0] as Mesh).rotation.x = -0.9 * (1 - k)));
        }
        const tgt = rover ? rover.group.position : ball.position;
        camLook.lerp(tgt.clone().add(new Vector3(0, 1, 0)), Math.min(1, dt * 3));
        const ang = openT * 0.35;
        camPos.lerp(tgt.clone().add(new Vector3(Math.cos(ang) * 8, 4, Math.sin(ang) * 8)), Math.min(1, dt * 1.5));
        if (openT > 3) {
          phase = 'result';
          ball.visible = false;
          result();
        }
      } else if (phase === 'result' && rover) {
        const ang = openT * 0.2;
        openT += dt;
        camPos.lerp(rover.group.position.clone().add(new Vector3(Math.cos(ang) * 8, 4, Math.sin(ang) * 8)), Math.min(1, dt * 1.5));
      }
      world.camera.position.copy(camPos);
      world.camera.lookAt(camLook);
      world.dust.update(dt, camLook);
    });

    const result = () => {
      const d = Math.hypot(ball.position.x - EAGLE.x, ball.position.z - EAGLE.z);
      const inside = d < EAGLE.r * 0.9;
      const stars = inside ? 3 : d < 35 ? 2 : 1;
      best = Math.max(best, stars);
      if (inside) sfx.win();
      else sfx.ok();
      const title = inside ? '⛳ ¡HOYO EN UNO!' : d < 35 ? '¡Muy cerca!' : '¡Aterrizaje seguro!';
      const text = inside
        ? '¡Igual que Opportunity en 2004! Rodó hasta quedar dentro del cráter Eagle, con rocas en capas justo enfrente: un lugar perfecto para buscar pistas de agua.'
        : `La pelota quedó a ${d.toFixed(0)} m del cráter Eagle. Opportunity tuvo suerte y rodó justo adentro: ¿puedes lograrlo?`;
      const panel = ui.panel(`
        <p class="lk-brief__kicker">RESULTADO · INTENTO ${attempt}</p>
        <h3 style="margin:6px 0 4px;font-family:var(--font-ui);font-size:28px">${title}</h3>
        <p style="margin:0 0 6px;font-size:30px;letter-spacing:4px;color:#fde047">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></p>
        <p style="margin:0 0 6px;line-height:1.5">${text}</p>
        <p style="margin:0 0 14px;color:var(--muted)">Rebotes: ${bounces} · Mejor resultado: ${'★'.repeat(best)}</p>
        <div class="lk-brief__row">
          <button type="button" class="lk-btn" data-again>↺ Intentar otra vez</button>
          <button type="button" class="lk-btn lk-btn--go" data-end>¡Misión cumplida!</button>
        </div>`);
      panel.querySelector('[data-again]')!.addEventListener('click', () => {
        world.scene.remove(ball);
        capsule.add(ball);
        reset();
      });
      panel.querySelector('[data-end]')!.addEventListener('click', win);
    };

    reset();
    world.start();
    cleanup = () => {
      controls.dispose();
      world.dispose();
    };
  };

  brief(root, {
    kicker: 'OPPORTUNITY · MISIÓN 1',
    title: '¡Hoyo en uno!',
    text: 'Opportunity llegó a Marte rebotando dentro de bolsas de aire. ¡Y terminó justo dentro de un cráter pequeñito!',
    goal: 'Guía la cápsula con los cohetes laterales y haz que la pelota termine dentro del cráter Eagle.',
    art: MER_SVG,
    accent: '#f59e0b',
    soft: '#fcd34d',
    guess: {
      q: '¿Por qué los científicos llamaron «hoyo en uno» al aterrizaje de Opportunity?',
      options: ['Porque rodó y quedó dentro de un cráter pequeño', 'Porque cayó en un agujero hecho por astronautas'],
      correct: 0,
      why: 'Como en el golf: la pelota de bolsas de aire rodó y entró justo en el cráter Eagle, de solo unos 22 metros.',
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
