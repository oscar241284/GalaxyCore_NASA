import gsap from 'gsap';
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import type { ScreenFactory } from '../router';
import { dur } from '../router';
import { ROBOTS } from '../data/robots';
import { onFrame } from '../three/stage';
import { getWorld } from './world';
import { esc } from '../ui/modal';
import { tr } from '../i18n';

const TAU = Math.PI * 2;

const launch: ScreenFactory = ({ root, go, params }) => {
  const id = params.robot ?? 'lrv';
  const world = getWorld();
  world.mode = 'launch';
  world.activate();
  const slot = world.slot(id);
  const g = slot.robot.group;

  root.innerHTML = `<p class="hud-hint">${tr('Lifting off', 'Despegando')}: <strong>${esc(ROBOTS[id].name)}</strong></p>`;

  const fade = { other: 1 };
  const others = world.slots.filter((s) => s !== slot);

  const ry = ((g.rotation.y % TAU) + TAU) % TAU;
  g.rotation.y = ry;
  const baseYaw = { v: ry > Math.PI ? ry - TAU : ry };
  g.rotation.y = baseYaw.v;
  world.scene.attach(g);
  const p0 = g.position.clone();
  const s0 = g.scale.x;
  const hero = world.heroPose();

  const { hw } = (() => {
    const hh = Math.tan(MathUtils.degToRad(20)) * (10 - 1.5);
    return { hw: hh * world.camera.aspect };
  })();
  const leftX = Math.max(Math.min(p0.x - 2.2, -2.4), -hw * 0.85);
  const curve = new CatmullRomCurve3(
    [
      p0.clone(),
      p0.clone().add(new Vector3(0, 1.3 * s0, 0)),
      new Vector3(leftX, p0.y + 2.6 * s0, 1.2),
      new Vector3(Math.min(leftX + 0.6, -1.4), 0.9, 3.4),
      hero.pos.clone(),
    ],
    false,
    'centripetal',
  );

  const flames = world.ensureFlames(slot);
  flames.intensity = 0;

  const st = { t: 0, shake: 0 };
  const tan = new Vector3();
  const offFrame = onFrame(() => {
    const t = st.t;
    curve.getPointAt(t, g.position);
    if (st.shake > 0) {
      g.position.x += (Math.random() - 0.5) * st.shake;
      g.position.y += (Math.random() - 0.5) * st.shake;
    }
    const e = t * t * (3 - 2 * t);
    g.scale.setScalar(MathUtils.lerp(s0, hero.scale, e));
    curve.getTangentAt(Math.min(t, 0.999), tan);
    const env = Math.sin(Math.PI * t);
    g.rotation.z = MathUtils.clamp(-tan.x * 0.55, -0.6, 0.6) * env;
    g.rotation.x = -MathUtils.clamp(tan.y, -1, 1) * 0.28 * env;
    g.rotation.y = baseYaw.v + Math.atan2(tan.x, Math.max(0.2, tan.z + 0.6)) * 0.45 * env;
    for (const o of others) {
      world.fadePodium(o, fade.other);
      world.fadeRobot(o, fade.other);
    }
    slot.spot.intensity = 9 * fade.other;
    slot.beamMat.opacity = 0.09 * fade.other;
  });

  const tl = gsap.timeline({
    onComplete: () => {
      flames.intensity = 0.3;
      go('puzzle', { robot: id });
    },
  });
  tl.to(baseYaw, { v: 0, duration: dur(0.5), ease: 'power2.out' }, 0)
    .to(fade, { other: 0, duration: dur(0.8), ease: 'power1.out' }, 0)
    .to(flames, { intensity: 0.55, duration: dur(0.5), ease: 'power1.in' }, 0)
    .to(st, { shake: 0.03 * s0, duration: dur(0.5) }, 0)
    .to(world.heroLight, { intensity: 2.2, duration: dur(2.5), ease: 'power1.in' }, 0.4)
    .addLabel('lift', dur(0.5))
    .to(flames, { intensity: 1, duration: dur(0.25) }, 'lift')
    .set(st, { shake: 0 }, 'lift')
    .to(st, { t: 0.16, duration: dur(0.6), ease: 'expo.out' }, 'lift')
    .to(st, { t: 1, duration: dur(2.1), ease: 'power2.inOut' })
    .to(flames, { intensity: 0.45, duration: dur(0.8) }, '-=0.8');

  return {
    unmount() {
      tl.kill();
      offFrame();
    },
  };
};

export default launch;
