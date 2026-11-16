import { AdditiveBlending, BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, RingGeometry, SphereGeometry, Vector3 } from 'three';
import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createWorld, followCam } from '../op3d/world';
import { mountOp, noWebGL } from '../op3d/opUi';
import { createBurst, glowSprite, glowTexture, injectSpCss, spiritRover, SP_ACCENT, SP_SOFT, textSprite } from './spKit';
import { rng } from '../../ui/moonTexture';
import { tr } from '../../i18n';

const START = { x: 0, z: -70 };
const HOME = { x: 4, z: 66, r: 11 };
const SPOTS = [
  { x: -9, z: -38 },
  { x: 12, z: -2 },
  { x: -7, z: 32 },
];
const DUNES = [
  { x: 14, z: -48, rx: 9, rz: 5 },
  { x: -14, z: 12, rx: 8, rz: 6 },
  { x: 16, z: 40, rx: 8, rz: 4 },
];

export default function spWheel({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    injectSpCss();
    const ui = mountOp(root, tr('🛞 Drive <b>in reverse</b>, uncover <b>3 white patches</b> with the dragged wheel and reach <b>Home Plate</b>.', '🛞 Maneja <b>de reversa</b>, descubre <b>3 manchas blancas</b> con la rueda arrastrada y llega a <b>Home Plate</b>.'), { joystick: false, blue: true });
    const world = createWorld(ui.canvasHost, {
      size: 200,
      seg: 220,
      seed: 44,
      hills: 1.6,
      craters: [
        { x: HOME.x, z: HOME.z, r: HOME.r + 4, depth: -1.4, rim: 0 },
        { x: -30, z: -10, r: 10, depth: 2 },
        { x: 34, z: 20, r: 12, depth: 2.2 },
      ],
      rocks: 300,
      clear: [{ x: START.x, z: START.z, r: 5 }, { x: HOME.x, z: HOME.z, r: HOME.r + 2 }, ...SPOTS.map((s) => ({ ...s, r: 3 }))],
    });
    if (!world) return noWebGL(root, win);
    world.setTime(0.33);
    const rover = spiritRover(world, START.x, START.z, Math.PI);
    const travel = { x: START.x, z: START.z, heading: 0 };
    const cam = followCam(world, () => travel, ui.canvasHost);
    cam.setDist(8.5);
    const glowTex = glowTexture('255,255,255');
    const burst = createBurst(world, '#ffffff', 0.4, 500);
    const dust = createBurst(world, '#c98a5c', 0.5, 600);

    // Rueda trabada (delantera derecha) pintada de rojo
    const broken = rover.wheels[0];
    broken?.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) m.material = new MeshStandardMaterial({ color: '#b91c1c', emissive: '#7f1d1d', emissiveIntensity: 0.6, roughness: 0.5 });
    });
    const warn = glowSprite(glowTex, '#ef4444', 0.9);
    rover.group.add(warn);
    if (broken) {
      const wp = new Vector3();
      broken.getWorldPosition(wp);
      rover.group.worldToLocal(wp);
      warn.position.copy(wp);
    }

    // Home Plate: meseta clara en capas
    const hg = world.heightAt(HOME.x, HOME.z);
    const plate = new Group();
    const layerMat = (c: string) => new MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
    [
      [HOME.r, 0.6, '#b9a58c'],
      [HOME.r * 0.86, 0.5, '#cbb89e'],
      [HOME.r * 0.7, 0.4, '#d8c7ad'],
    ].forEach(([r, h, c], i) => {
      const m = new Mesh(new CylinderGeometry(r as number, (r as number) + 0.6, h as number, 40), layerMat(c as string));
      m.position.y = hg - 0.25 + i * 0.45;
      m.receiveShadow = m.castShadow = true;
      plate.add(m);
    });
    plate.position.set(HOME.x, 0, HOME.z);
    const plateTop = hg - 0.25 + 2 * 0.45 + 0.2;
    const homeLabel = textSprite('🏁 HOME PLATE', '#fde68a');
    homeLabel.position.set(0, plateTop + 4, 0);
    homeLabel.scale.multiplyScalar(2.2);
    plate.add(homeLabel);
    const beacon = new Mesh(new CylinderGeometry(0.6, 0.6, 60, 12, 1, true), new MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
    beacon.position.y = plateTop + 30;
    plate.add(beacon);
    world.scene.add(plate);

    // Dunas (frenan)
    const duneMat = new MeshStandardMaterial({ color: '#dba574', roughness: 1 });
    DUNES.forEach((d) => {
      const m = new Mesh(new SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), duneMat);
      m.scale.set(d.rx, 0.9, d.rz);
      m.position.set(d.x, world.heightAt(d.x, d.z) - 0.35, d.z);
      m.receiveShadow = true;
      world.scene.add(m);
    });

    // Rocas grandes (obstáculos)
    const rand = rng(9);
    const boulders: { x: number; z: number; r: number }[] = [];
    const avoid = [START, HOME, ...SPOTS];
    while (boulders.length < 26) {
      const x = (rand() - 0.5) * 70;
      const z = -60 + rand() * 115;
      if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < 9) || boulders.some((b) => Math.hypot(b.x - x, b.z - z) < 7)) continue;
      boulders.push({ x, z, r: 0.8 + rand() * 1.3 });
    }
    const bMat = new MeshStandardMaterial({ color: '#6b3a24', roughness: 0.9, flatShading: true });
    boulders.forEach((b, i) => {
      const m = new Mesh(new SphereGeometry(1, 7, 5), bMat);
      m.scale.set(b.r, b.r * 0.7, b.r * (0.8 + (i % 3) * 0.15));
      m.rotation.y = i;
      m.position.set(b.x, world.heightAt(b.x, b.z) + b.r * 0.2, b.z);
      m.castShadow = m.receiveShadow = true;
      world.scene.add(m);
    });

    // Manchas de sílice (escondidas)
    const silicaMat = new MeshStandardMaterial({ color: '#fafaf5', emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 1 });
    const hintMat = new MeshBasicMaterial({ color: '#fff7ed', transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false });
    const spots = SPOTS.map((s) => {
      const y = world.heightAt(s.x, s.z) + 0.04;
      const hint = new Mesh(new CircleGeometry(1.4, 24), hintMat);
      hint.rotation.x = -Math.PI / 2;
      hint.position.set(s.x, y, s.z);
      const white = new Mesh(new CircleGeometry(2, 28), silicaMat);
      white.rotation.x = -Math.PI / 2;
      white.position.set(s.x, y + 0.01, s.z);
      white.scale.setScalar(0.01);
      white.visible = false;
      const tw = glowSprite(glowTex, '#ffffff', 1.2);
      tw.position.set(s.x, y + 0.5, s.z);
      const ring = new Mesh(new RingGeometry(1.8, 2.2, 40), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.x, y + 0.08, s.z);
      world.scene.add(hint, white, tw, ring);
      return { ...s, hint, white, tw, ring, found: false, k: 0 };
    });

    // Surco de la rueda arrastrada
    const MAXT = 3000;
    const trench = new InstancedMesh(new BoxGeometry(0.34, 0.03, 0.4), new MeshStandardMaterial({ color: '#4a2412', roughness: 1 }), MAXT);
    trench.count = 0;
    trench.receiveShadow = true;
    world.scene.add(trench);
    const m4 = new Matrix4();
    const lastT = new Vector3(1e9, 0, 0);

    // Controles: cruceta con «Reversa»
    const pad = document.createElement('div');
    pad.className = 'sp3-pad';
    pad.innerHTML = `
      <span></span>
      <button type="button" class="lk-btn" data-k="back"><b>⬆</b>${tr('Reverse', 'Reversa')}</button>
      <span></span>
      <button type="button" class="lk-btn" data-k="left"><b>⟲</b>${tr('Turn', 'Girar')}</button>
      <button type="button" class="lk-btn" data-k="fwd"><b>⬇</b>${tr('Forward', 'Adelante')}</button>
      <button type="button" class="lk-btn" data-k="right"><b>⟳</b>${tr('Turn', 'Girar')}</button>`;
    ui.wrap.appendChild(pad);
    const keys = { left: false, right: false, fwd: false, back: false };
    pad.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => {
      const k = b.dataset.k as keyof typeof keys;
      const on = (e: PointerEvent) => {
        e.preventDefault();
        keys[k] = true;
        b.classList.add('held');
        b.setPointerCapture?.(e.pointerId);
      };
      const off = () => {
        keys[k] = false;
        b.classList.remove('held');
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    const map: Record<string, keyof typeof keys> = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'back', w: 'back', ArrowDown: 'fwd', s: 'fwd' };
    const kd = (e: KeyboardEvent) => {
      const k = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!k) return;
      e.preventDefault();
      keys[k] = true;
      pad.querySelector(`[data-k="${k}"]`)?.classList.add('held');
    };
    const ku = (e: KeyboardEvent) => {
      const k = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!k) return;
      keys[k] = false;
      pad.querySelector(`[data-k="${k}"]`)?.classList.remove('held');
    };
    document.addEventListener('keydown', kd);
    document.addEventListener('keyup', ku);

    let msgT = 0;
    let lastMsg = '';
    const msg = (text: string, kind: '' | 'ok' | 'warn' = '', force = false) => {
      if (!force && (text === lastMsg || msgT > 0)) return;
      lastMsg = text;
      msgT = 2.2;
      ui.say(text, kind);
    };
    ui.say(tr('Spirit\'s back points toward Home Plate (the yellow beacon). Hold «Reverse» and correct with the turns: the red wheel is jammed and pulls it off course!', 'La parte de atrás de Spirit apunta hacia Home Plate (el faro amarillo). Mantén «Reversa» y corrige con los giros: ¡la rueda roja está trabada y lo desvía!'));

    let speed = 0;
    let done = false;
    let bumpCool = 0;
    const isBlocked = (x: number, z: number) => boulders.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 1) || Math.abs(x) > 90 || Math.abs(z) > 90;
    const inDune = (x: number, z: number) => DUNES.some((d) => ((x - d.x) / d.rx) ** 2 + ((z - d.z) / d.rz) ** 2 < 1);
    const wheelWorld = new Vector3();

    world.onFrame((dt, t) => {
      msgT -= dt;
      bumpCool -= dt;
      let target = 0;
      let drift = 0;
      if (!done) {
        if (keys.back) {
          target = -3.4;
          drift = 0.22;
        } else if (keys.fwd) {
          target = 0.7;
          drift = 1.6;
          msg(tr('The jammed wheel won\'t let it go forward and makes it spin! Try reverse.', '¡La rueda trabada no deja avanzar y lo hace girar! Prueba de reversa.'), 'warn');
        }
        if (inDune(rover.x, rover.z)) {
          target *= 0.5;
          if (Math.abs(speed) > 0.5) msg(tr('Soft sand: it goes slower here.', 'Arena blanda: aquí avanza más lento.'));
        }
      }
      speed += (target - speed) * Math.min(1, dt * 3);
      const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      rover.heading -= steer * dt * 1.2;
      if (Math.abs(speed) > 0.05) rover.heading += drift * dt * Math.sign(speed) * (Math.abs(speed) / 3.4 + 0.2);
      const nx = rover.x + Math.sin(rover.heading) * speed * dt;
      const nz = rover.z + Math.cos(rover.heading) * speed * dt;
      if (Math.abs(speed) > 0.05 && isBlocked(nx, nz)) {
        speed = 0;
        if (bumpCool <= 0) {
          sfx.soft();
          bumpCool = 0.8;
        }
        msg(tr('Careful, a rock! Turn to avoid it.', '¡Cuidado, una roca! Gira para esquivarla.'), 'warn');
      } else {
        rover.x = nx;
        rover.z = nz;
      }
      rover.wheels.forEach((w, i) => {
        if (i !== 0) w.rotation.x += (speed * dt) / 0.15;
      });
      rover.place();
      travel.x = rover.x;
      travel.z = rover.z;
      travel.heading = rover.heading + Math.PI;
      cam.update(dt);
      world.dust.update(dt, rover.group.position);
      warn.material.opacity = 0.5 + 0.5 * Math.sin(t * 6);

      if (broken && Math.abs(speed) > 0.3) {
        broken.getWorldPosition(wheelWorld);
        if (wheelWorld.distanceTo(lastT) > 0.22 && trench.count < MAXT) {
          const y = world.heightAt(wheelWorld.x, wheelWorld.z) + 0.02;
          m4.compose(new Vector3(wheelWorld.x, y, wheelWorld.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rover.heading), new Vector3(1, 1, 1));
          trench.setMatrixAt(trench.count++, m4);
          trench.instanceMatrix.needsUpdate = true;
          lastT.copy(wheelWorld);
          if (Math.random() < 0.5) dust.emit(new Vector3(wheelWorld.x, y, wheelWorld.z), 2, 0.8, 1);
        }
        spots.forEach((s) => {
          if (s.found || Math.hypot(s.x - wheelWorld.x, s.z - wheelWorld.z) > 1.8) return;
          s.found = true;
          s.white.visible = true;
          s.hint.visible = false;
          s.tw.visible = false;
          burst.emit(new Vector3(s.x, world.heightAt(s.x, s.z) + 0.2, s.z), 120, 5, 4);
          sfx.ok();
          const n = spots.filter((x) => x.found).length;
          ui.toast(tr(`⚪ SILICA ${n}/3!`, `⚪ ¡SÍLICE ${n}/3!`), 1400);
          msg(
            n < 3
              ? tr(`White soil! The dragged wheel uncovered silica (${n}/3). Look for more twinkling patches!`, `¡Suelo blanco! La rueda arrastrada destapó sílice (${n}/3). ¡Busca más manchas que brillan!`)
              : tr('3 of 3! Now reach Home Plate, the layered plateau with the yellow beacon.', '¡3 de 3! Ahora llega a Home Plate, la meseta en capas con el faro amarillo.'),
            'ok',
            true,
          );
        });
      }
      spots.forEach((s, i) => {
        if (s.found) {
          s.k = Math.min(1, s.k + dt * 2);
          s.white.scale.setScalar(s.k);
          const rm = s.ring.material as MeshBasicMaterial;
          rm.opacity = Math.max(0, 1 - s.k) * 0.9;
          s.ring.scale.setScalar(1 + s.k * 2);
        } else {
          const tw = (Math.sin(t * 2.2 + i * 2) + 1) / 2;
          s.tw.material.opacity = tw > 0.7 ? (tw - 0.7) * 3.3 : 0;
        }
      });
      burst.update(dt);
      dust.update(dt);

      const nFound = spots.filter((x) => x.found).length;
      const dHome = Math.hypot(HOME.x - rover.x, HOME.z - rover.z);
      ui.card('si', tr('SILICA', 'SÍLICE'), `${'⚪'.repeat(nFound)}${'◌'.repeat(3 - nFound)} ${nFound}/3`);
      ui.card('home', tr('TO HOME PLATE', 'A HOME PLATE'), `${Math.max(0, dHome - HOME.r).toFixed(0)} m`);
      ui.card('w', tr('⚠ WHEEL', '⚠ RUEDA'), `<span style="color:#fca5a5">${tr('jammed', 'trabada')}</span>`);
      if (!done && dHome < HOME.r) {
        if (nFound === 3) {
          done = true;
          keys.back = keys.fwd = false;
          sfx.win();
          ui.toast(tr('🏁 HOME PLATE!', '🏁 ¡HOME PLATE!'), 1800);
          window.setTimeout(finish, 1400);
        } else msg(tr(`You reached Home Plate, but some silica patches are missing (${nFound}/3). Go back and find them: they twinkle every now and then.`, `Llegaste a Home Plate, pero faltan manchas de sílice (${nFound}/3). Vuelve a buscarlas: brillan de vez en cuando.`), 'warn');
      }
    });

    const finish = () => {
      pad.remove();
      ui.panel(`
        <p class="lk-brief__kicker">${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</p>
        <h3 style="margin:6px 0 10px;font-family:var(--font-ui);font-size:26px">${tr('🛞 A problem became a discovery!', '🛞 ¡Un problema se volvió un descubrimiento!')}</h3>
        <p style="margin:0 0 14px;line-height:1.55">${tr(
          'When one of Spirit\'s wheels jammed in 2006, the engineers did not give up: they drove it <b>in reverse</b>. And in 2007, the furrow of that wheel uncovered <b>silica soil</b>, a clue that there was hot water. A problem became a discovery!',
          'Cuando una rueda de Spirit se trabó en 2006, los ingenieros no se rindieron: lo manejaron <b>de reversa</b>. Y en 2007, el surco de esa rueda destapó <b>suelo de sílice</b>, una pista de que hubo agua caliente. ¡Un problema se convirtió en un descubrimiento!',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`).querySelector('[data-end]')!.addEventListener('click', win);
    };

    world.start();
    cleanup = () => {
      document.removeEventListener('keydown', kd);
      document.removeEventListener('keyup', ku);
      cam.dispose();
      glowTex.dispose();
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 3', 'SPIRIT · MISIÓN 3'),
    title: tr('The broken wheel', 'La rueda rota'),
    text: tr('One of Spirit\'s 6 wheels jammed and stopped turning. But the mission had to go on!', 'Una de las 6 ruedas de Spirit se trabó y dejó de girar. ¡Pero la misión debía seguir!'),
    goal: tr('Drive in reverse dragging the wheel, find 3 white patches and reach Home Plate.', 'Maneja de reversa arrastrando la rueda, encuentra 3 manchas blancas y llega a Home Plate.'),
    art: MER_SVG,
    accent: SP_ACCENT,
    soft: SP_SOFT,
    guess: {
      q: tr('When Spirit\'s wheel jammed in 2006, what did the engineers do?', 'Cuando la rueda de Spirit se trabó en 2006, ¿qué hicieron los ingenieros?'),
      options: [tr('They drove it in reverse, dragging the wheel', 'Lo manejaron de reversa, arrastrando la rueda'), tr('They left it still forever', 'Lo dejaron quieto para siempre')],
      correct: 0,
      why: tr('They discovered it moved better in reverse, dragging the broken wheel. And that is how it kept exploring for several more years!', 'Descubrieron que de reversa avanzaba mejor, arrastrando la rueda rota. ¡Y así siguió explorando varios años más!'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
