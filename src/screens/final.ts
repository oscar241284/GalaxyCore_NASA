import gsap from 'gsap';
import type { ScreenFactory } from '../router';
import { dur, reducedMotion } from '../router';
import { ROBOTS, ROBOT_ORDER, STONES } from '../data/robots';
import type { Body, RobotId, StoneFact } from '../types';
import { setFinalResult, TOTAL_LEVELS } from '../store';
import { onResizeStage } from '../three/stage';
import { stoneSVG } from '../ui/stoneArt';
import { esc, openModal } from '../ui/modal';
import { getWorld, COMPACT_REGION } from './world';
import { buildPodiumLayer, positionLabels } from './podiums';
import { tr } from '../i18n';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface StoneState {
  fact: StoneFact;
  el: HTMLElement;
  placedIn: RobotId | null;
}

const finalScreen: ScreenFactory = ({ root, go }) => {
  const world = getWorld();
  world.resetAll();
  world.mode = 'final';
  world.activate();

  const { layer, cols } = buildPodiumLayer(root);
  cols.forEach((c) => {
    c.removeAttribute('role');
    c.removeAttribute('tabindex');
    c.style.cursor = 'default';
    c.querySelector('.podium__discover')?.remove();
    const tray = document.createElement('div');
    tray.className = 'podium__stones';
    Object.assign(tray.style, {
      position: 'absolute',
      left: '6px',
      right: '6px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0px',
      justifyContent: 'center',
    });
    c.appendChild(tray);
  });
  positionLabels(world, cols);

  const timeline: gsap.core.Timeline[] = [];
  const offs: (() => void)[] = [];
  let stonesWrap: HTMLElement | null = null;
  const stones: StoneState[] = [];
  let verified = false;

  const placeTrays = () => {
    cols.forEach((c, i) => {
      const label = c.querySelector<HTMLElement>('.podium__label')!;
      const tray = c.querySelector<HTMLElement>('.podium__stones')!;
      const p = world.toScreen(world.podiumBase(i));
      tray.style.top = `${Math.round(p.y + 14 + label.offsetHeight + 2)}px`;
    });
  };

  const relayout = () => {
    positionLabels(world, cols);
    placeTrays();
  };
  offs.push(onResizeStage(relayout));

  openModal({
    title: tr('Bonus level unlocked!', '¡Nivel extra desbloqueado!'),
    body: tr(`You completed all ${TOTAL_LEVELS} challenges. Final mission: sort each sample rock by dragging it to the robot that studied it.`, `Completaste las ${TOTAL_LEVELS} pruebas. Última misión: clasifica cada piedra de muestra arrastrándola al robot que la estudió.`),
    dismissable: false,
    actions: [{ label: tr('Start', 'Comenzar'), variant: 'primary', onClick: () => celebrate() }],
  });

  const celebrate = () => {
    cols.forEach((c) => c.classList.add('podium--celebrate'));
    world.mode = 'launch';
    const flick = { k: 0 };
    const tl = gsap.timeline({ onComplete: compact });
    tl.to(flick, {
      k: 1,
      duration: dur(0.18),
      repeat: reducedMotion ? 1 : 9,
      yoyo: true,
      ease: 'power1.inOut',
      onUpdate: () => {
        for (const sl of world.slots) {
          sl.celebrate.intensity = flick.k * 14;
          sl.spot.color.set(0xffffff);
          sl.spot.intensity = flick.k * 12;
          sl.beamMat.opacity = flick.k * 0.14;
          sl.ringMat.emissiveIntensity = 0.3 + flick.k * 2;
        }
      },
    });
    timeline.push(tl);
  };

  const compact = () => {
    cols.forEach((c) => c.classList.remove('podium--celebrate'));
    world.mode = 'final';
    for (const sl of world.slots) sl.spot.color.set(0xfff1d6);
    layer.classList.add('podiums--compact');
    layer.style.transform = 'none';
    cols.forEach((c) => (c.style.height = `${COMPACT_REGION * 100}%`));
    const tl = gsap.timeline({ onComplete: showStones });
    tl.to(world.layout, {
      compact: 1,
      duration: dur(1),
      ease: 'power2.inOut',
      onUpdate: () => {
        world.applyLayout();
        relayout();
      },
    });
    for (const sl of world.slots) {
      sl.hoverTarget = 0.45;
      sl.celebrate.intensity = 0;
    }
    timeline.push(tl);
  };

  const showStones = () => {
    relayout();
    stonesWrap = document.createElement('div');
    stonesWrap.className = 'stones';
    Object.assign(stonesWrap.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '0',
      top: `${COMPACT_REGION * 100}%`,
      zIndex: '2',
      alignContent: 'flex-start',
      overflowY: 'auto',
    });
    stonesWrap.innerHTML = `<p class="hud-hint" style="position:static;transform:none;margin:8px auto 12px;width:fit-content">${tr('Drag each rock to the matching robot', 'Arrastra cada piedra al robot que corresponde')}</p>`;
    const tray = document.createElement('div');
    tray.className = 'stones__tray';
    Object.assign(tray.style, { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', width: '100%' });
    stonesWrap.appendChild(tray);
    const actions = document.createElement('div');
    actions.className = 'stones__actions';
    Object.assign(actions.style, { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', width: '100%' });
    actions.innerHTML = `<button class="btn btn--primary" type="button" data-verify disabled>${tr('Check', 'Verificar')}</button>`;
    stonesWrap.appendChild(actions);
    root.appendChild(stonesWrap);

    const order = shuffle(STONES);
    order.forEach((fact, i) => {
      const body: Body = i % 2 === 0 ? 'moon' : 'mars';
      const seed = 1000 + i * 37 + Math.floor(Math.random() * 30);
      const el = document.createElement('div');
      el.className = 'stone';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${tr('Rock', 'Piedra')}: ${fact.text}`);
      el.innerHTML = `${stoneSVG(body, seed)}<span class="stone__text">${esc(fact.text)}</span><span class="stone__answer" hidden></span>`;
      Object.assign(el.style, { touchAction: 'none', userSelect: 'none' });
      tray.appendChild(el);
      const st: StoneState = { fact, el, placedIn: null };
      stones.push(st);
      attachDrag(st, tray);
      attachKeyboard(st);
    });
    const intro = gsap.from(Array.from(tray.children), {
      y: 40,
      opacity: 0,
      duration: dur(0.5),
      stagger: dur(0.07),
      ease: 'back.out(1.5)',
      clearProps: 'transform,opacity',
    });
    window.setTimeout(() => intro.progress(1), 2500);
    actions.querySelector('[data-verify]')!.addEventListener('click', verify);
  };

  const colAt = (x: number, y: number): number => {
    const h = window.innerHeight * COMPACT_REGION;
    if (y > h || y < 0) return -1;
    return Math.max(0, Math.min(ROBOT_ORDER.length - 1, Math.floor((x / window.innerWidth) * ROBOT_ORDER.length)));
  };

  const updateVerify = () => {
    const btn = root.querySelector<HTMLButtonElement>('[data-verify]');
    if (btn) btn.disabled = stones.some((s) => !s.placedIn) || verified;
  };

  const placeStone = (st: StoneState, col: number | null, home: HTMLElement) => {
    if (col === null || col < 0) {
      st.placedIn = null;
      st.el.classList.remove('stone--placed');
      st.el.style.width = '';
      home.appendChild(st.el);
    } else {
      st.placedIn = ROBOT_ORDER[col];
      st.el.classList.add('stone--placed');
      st.el.style.width = 'min(112px, 11vw)';
      cols[col].querySelector('.podium__stones')!.appendChild(st.el);
    }
    updateVerify();
  };

  const attachKeyboard = (st: StoneState) => {
    st.el.addEventListener('keydown', (e) => {
      if (verified || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      const cur = st.placedIn ? ROBOT_ORDER.indexOf(st.placedIn) : -1;
      const next = cur + 1 > 3 ? null : cur + 1;
      placeStone(st, next, root.querySelector<HTMLElement>('.stones__tray')!);
      st.el.focus();
    });
  };

  const attachDrag = (st: StoneState, home: HTMLElement) => {
    const el = st.el;
    let start: { x: number; y: number } | null = null;
    let over = -1;
    const down = (e: PointerEvent) => {
      if (verified) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      el.classList.add('stone--dragging');
      if (stonesWrap) stonesWrap.style.overflowY = 'visible';
      el.style.zIndex = '50';
      el.style.position = 'relative';
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      el.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) scale(1.05)`;
      const c = colAt(e.clientX, e.clientY);
      if (c !== over) {
        if (over >= 0) cols[over].classList.remove('dropzone--over');
        if (c >= 0) cols[c].classList.add('dropzone--over');
        over = c;
      }
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
      start = null;
      el.classList.remove('stone--dragging');
      if (stonesWrap) stonesWrap.style.overflowY = 'auto';
      el.style.transform = '';
      el.style.zIndex = '';
      if (over >= 0) cols[over].classList.remove('dropzone--over');
      const c = colAt(e.clientX, e.clientY);
      over = -1;
      if (!moved) return;
      placeStone(st, c >= 0 ? c : null, home);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const verify = () => {
    if (verified || stones.some((s) => !s.placedIn)) return;
    verified = true;
    let correct = 0;
    stones.forEach((s, i) => {
      const ok = s.placedIn === s.fact.robot;
      if (ok) correct++;
      window.setTimeout(() => {
        s.el.classList.add(ok ? 'stone--correct' : 'stone--wrong');
        if (!ok) {
          const ans = s.el.querySelector<HTMLElement>('.stone__answer')!;
          ans.hidden = false;
          ans.textContent = `${tr('Correct', 'Correcto')}: ${ROBOTS[s.fact.robot].name}`;
        }
      }, dur(0.12) * 1000 * i);
    });
    setFinalResult(correct);
    if (stonesWrap) stonesWrap.style.top = `${(COMPACT_REGION + 0.06) * 100}%`;
    const actions = root.querySelector<HTMLElement>('.stones__actions')!;
    window.setTimeout(() => {
      actions.innerHTML = `
        <p class="hud-hint" style="position:static;transform:none;width:fit-content;animation:none">${tr(`You got ${correct} of ${stones.length} rocks right.`, `Acertaste ${correct} de ${stones.length} piedras.`)}</p>
        <button class="btn btn--primary" type="button" data-cert>${tr('View certificate', 'Ver certificado')}</button>`;
      actions.style.flexWrap = 'wrap';
      actions.querySelector('[data-cert]')!.addEventListener('click', () => go('certificate'));
    }, dur(0.12) * 1000 * stones.length + 300);
    updateVerify();
  };

  return {
    unmount() {
      timeline.forEach((t) => t.kill());
      offs.forEach((o) => o());
      document.querySelectorAll('.modal-backdrop').forEach((m) => m.remove());
    },
  };
};

export default finalScreen;
