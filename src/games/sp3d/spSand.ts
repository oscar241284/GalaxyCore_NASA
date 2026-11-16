import { AdditiveBlending, BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Raycaster, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector2, Vector3 } from 'three';
import type { GameContext } from '../index';
import { brief, dots, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createWorld } from '../op3d/world';
import { mountOp, noWebGL } from '../op3d/opUi';
import { createBurst, injectSpCss, spiritRover, SP_ACCENT, SP_SOFT, textSprite } from './spKit';
import { rng } from '../../ui/moonTexture';
import { tr } from '../../i18n';

const STAGES: { name: string; map: string[] }[] = [
  { name: tr('Test 1 · Sandbox', 'Prueba 1 · Caja de arena'), map: ['sssssfE', 'srrsffs', 'sfffsrs', 'sfrssss', 'Sfsssrs', 'ssssrss'] },
  { name: tr('Test 2 · Just like Troy', 'Prueba 2 · Igual que en Troy'), map: ['Essrsss', 'fsrffss', 'fsssfrs', 'rrfssfs', 'sffsrfs', 'sssssfS'] },
];
const MAX_SINK = 10;
const START_SINK = 5;
const SCANS = 2;
const T = 2.3;

function tileTex(kind: 'sand' | 'firm' | 'fog'): CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(kind.length * 17);
  if (kind === 'sand') {
    g.fillStyle = '#e3a86e';
    g.fillRect(0, 0, S, S);
    for (let y = 4; y < S; y += 10) {
      g.strokeStyle = 'rgba(150,90,40,.35)';
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin(x * 0.12 + y) * 2.5);
      g.stroke();
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,230,190,${r() * 0.3})`;
      g.fillRect(r() * S, r() * S, 1.5, 1.5);
    }
  } else if (kind === 'firm') {
    g.fillStyle = '#7c5036';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = r() < 0.5 ? '#5e3a26' : '#9a6a4a';
      g.beginPath();
      g.ellipse(r() * S, r() * S, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.fillStyle = '#1d2a44';
    g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(147,197,253,.35)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, S - 8, S - 8);
    g.fillStyle = 'rgba(147,197,253,.55)';
    g.font = '900 64px system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', S / 2, S / 2 + 4);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

export default function spSand({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    injectSpCss();
    const ui = mountOp(root, '', { joystick: false, blue: true });
    const taskEl = ui.hud.querySelector<HTMLElement>('.op__task')!;
    const world = createWorld(ui.canvasHost, { size: 200, seg: 160, seed: 63, hills: 0.7, rocks: 260, clear: [{ x: 0, z: 0, r: 13 }] });
    if (!world) return noWebGL(root, win);
    world.setTime(0.4);
    let base = -Infinity;
    for (let x = -10; x <= 10; x += 1) for (let z = -9; z <= 9; z += 1) base = Math.max(base, world.heightAt(x, z));
    base += 0.35;

    const texSand = tileTex('sand');
    const texFirm = tileTex('firm');
    const texFog = tileTex('fog');
    const tileGeo = new BoxGeometry(T * 0.96, 0.5, T * 0.96);
    const fogGeo = new BoxGeometry(T * 0.98, 0.3, T * 0.98);
    const matSand = new MeshStandardMaterial({ map: texSand, roughness: 1 });
    const matFirm = new MeshStandardMaterial({ map: texFirm, roughness: 0.95 });
    const matExit = new MeshStandardMaterial({ color: '#16a34a', emissive: '#22c55e', emissiveIntensity: 0.6, roughness: 0.6 });
    const matFog = new MeshStandardMaterial({ map: texFog, roughness: 0.7, transparent: true });
    const rockGeo = new SphereGeometry(1, 7, 5);
    const rockMat = new MeshStandardMaterial({ color: '#4a2f20', roughness: 0.9, flatShading: true });
    const canMat = new MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const canGeo = new PlaneGeometry(T * 0.9, T * 0.9);
    const frameMat = new MeshStandardMaterial({ color: '#60a5fa', emissive: '#3b82f6', emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.4 });
    const burst = createBurst(world, '#e8b47e', 0.5, 700);

    const rover = spiritRover(world, 0, 0, 0);
    rover.group.scale.setScalar(1.25);
    const stage = new Group();
    world.scene.add(stage);

    // Medidor y leyenda
    const sinkCard = document.createElement('div');
    sinkCard.className = 'op__card';
    const legend = document.createElement('div');
    legend.className = 'op__card sp3-legend';
    legend.innerHTML = `
      <span><i style="background:#e3a86e"></i>${tr('Soft sand: sinks more', 'Arena blanda: se hunde más')}</span>
      <span><i style="background:#7c5036"></i>${tr('Firm ground: helps you get out', 'Suelo firme: ayuda a salir')}</span>
      <span><i style="background:#4a2f20"></i>${tr('Rock: cannot pass', 'Roca: no se puede pasar')}</span>
      <span><i style="background:#22c55e"></i>${tr('Exit', 'Salida')}</span>`;
    const cardsEl = ui.hud.querySelector('[data-cards]')!;
    cardsEl.append(sinkCard, legend);
    const scanBtn = document.createElement('button');
    scanBtn.type = 'button';
    scanBtn.className = 'lk-btn op__btn';
    ui.btns.appendChild(scanBtn);

    // Cámara orbital simple
    let yaw = 0.35;
    let dragging = false;
    let moved = 0;
    let lx = 0;
    const host = ui.canvasHost;
    const ray = new Raycaster();
    const ndc = new Vector2();
    let pickables: Mesh[] = [];
    let onPick: ((m: Mesh) => void) | null = null;
    const pick = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, world.camera);
      return ray.intersectObjects(pickables, false)[0]?.object as Mesh | undefined;
    };
    const pd = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lx = e.clientX;
    };
    const pm = (e: PointerEvent) => {
      if (dragging) {
        yaw -= (e.clientX - lx) * 0.006;
        moved += Math.abs(e.clientX - lx);
        lx = e.clientX;
      } else host.style.cursor = pick(e) ? 'pointer' : '';
    };
    const pu = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        const m = pick(e);
        if (m) onPick?.(m);
      }
    };
    host.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);

    let alive = true;
    const timers: number[] = [];
    const later = (f: () => void, ms: number) => timers.push(window.setTimeout(() => alive && f(), ms));

    const anim = { from: new Vector3(), to: new Vector3(), k: 1, sink: 0, sinkTo: 0, spinSoft: false };
    const look = new Vector3(0, base, 0);
    let fogs: { mesh: Mesh; k: number; key: string }[] = [];

    const play = (si: number) => {
      const st = STAGES[si];
      const H = st.map.length;
      const W = st.map[0].length;
      const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : st.map[y][x]);
      const P = (x: number, y: number) => new Vector3((x - (W - 1) / 2) * T, base, (y - (H - 1) / 2) * T);
      let px = 0;
      let py = 0;
      st.map.forEach((row, y) => [...row].forEach((ch, x) => ch === 'S' && ([px, py] = [x, y])));
      let sink = START_SINK;
      let scans = SCANS;
      let moves = 0;
      let busy = false;
      const seen = new Set<string>();
      const reveal = (r: number) => {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) seen.add(`${px + dx},${py + dy}`);
      };
      reveal(1);
      taskEl.innerHTML = `🏜️ <b>${st.name}</b>: ${tr('get the twin rover to the green exit. Tap a highlighted square to move.', 'lleva al rover gemelo hasta la salida verde. Toca una casilla iluminada para moverte.')}<div style="margin-top:6px">${dots(STAGES.length, si, tr('TEST', 'PRUEBA'))}</div>`;

      stage.clear();
      fogs = [];
      const tiles: Mesh[] = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const ch = at(x, y);
          const p = P(x, y);
          const m = new Mesh(tileGeo, ch === 's' ? matSand : ch === 'E' ? matExit : matFirm);
          m.position.set(p.x, p.y - 0.25, p.z);
          m.receiveShadow = true;
          m.userData = { x, y };
          stage.add(m);
          tiles.push(m);
          if (ch === 'r') {
            const rk = new Mesh(rockGeo, rockMat);
            rk.scale.set(T * 0.42, T * 0.34, T * 0.38);
            rk.rotation.y = x + y;
            rk.position.set(p.x, p.y + 0.2, p.z);
            rk.castShadow = true;
            stage.add(rk);
          }
          if (ch === 'E') {
            const beam = new Mesh(new CylinderGeometry(T * 0.4, T * 0.4, 14, 20, 1, true), new MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
            beam.position.set(p.x, p.y + 7, p.z);
            stage.add(beam);
            const lbl = textSprite(tr('EXIT', 'SALIDA'), '#bbf7d0');
            lbl.position.set(p.x, p.y + 2.4, p.z);
            stage.add(lbl);
          }
          const key = `${x},${y}`;
          if (!seen.has(key)) {
            const f = new Mesh(fogGeo, matFog.clone());
            f.position.set(p.x, p.y + 0.15, p.z);
            stage.add(f);
            fogs.push({ mesh: f, k: 0, key });
          }
        }
      const fw = W * T + 0.6;
      const fh = H * T + 0.6;
      for (const [w, d, x, z] of [
        [fw, 0.3, 0, -fh / 2],
        [fw, 0.3, 0, fh / 2],
        [0.3, fh, -fw / 2, 0],
        [0.3, fh, fw / 2, 0],
      ]) {
        const b = new Mesh(new BoxGeometry(w, 0.7, d), frameMat);
        b.position.set(x, base - 0.15, z);
        b.castShadow = true;
        stage.add(b);
      }
      const title = textSprite(tr('🛰️ TROY SIMULATOR', '🛰️ SIMULADOR DE TROY'), '#bfdbfe');
      title.position.set(0, base + 2, -fh / 2 - 0.5);
      title.scale.multiplyScalar(1.6);
      stage.add(title);
      const highlights: Mesh[] = [];

      const adj = (x: number, y: number) => Math.abs(x - px) + Math.abs(y - py) === 1;
      const render = () => {
        highlights.forEach((h) => stage.remove(h));
        highlights.length = 0;
        pickables = [];
        for (const t of tiles) {
          const { x, y } = t.userData as { x: number; y: number };
          const can = !busy && seen.has(`${x},${y}`) && adj(x, y) && at(x, y) !== 'r';
          if (!can) continue;
          const h = new Mesh(canGeo, canMat);
          h.rotation.x = -Math.PI / 2;
          const p = P(x, y);
          h.position.set(p.x, p.y + 0.03, p.z);
          h.userData = { x, y };
          stage.add(h);
          highlights.push(h);
          pickables.push(h, t);
        }
        fogs.forEach((f) => seen.has(f.key) && f.k === 0 && (f.k = 0.001));
        sinkCard.innerHTML = `<small>${tr('SINKING', 'HUNDIMIENTO')}</small><div class="sp3-sink">${Array.from({ length: MAX_SINK }, (_, i) => `<i class="${i < sink ? (sink >= 8 ? 'on hot' : 'on') : ''}"></i>`).join('')}</div>`;
        scanBtn.disabled = busy || scans <= 0;
        scanBtn.textContent = `📡 ${tr('Scan around', 'Escanear alrededor')} (${scans})`;
        anim.sinkTo = sink;
      };

      const s0 = P(px, py);
      rover.x = s0.x;
      rover.z = s0.z;
      rover.heading = Math.PI;
      anim.from.copy(s0);
      anim.to.copy(s0);
      anim.k = 1;
      anim.sink = anim.sinkTo = sink;
      ui.say(si === 0 ? tr('You are an engineer. Tap a glowing neighbor square to move the twin rover. Look for firm ground! Drag to turn the view.', 'Eres ingeniero. Toca una casilla vecina iluminada para mover el rover gemelo. ¡Busca suelo firme! Arrastra para girar la vista.') : tr('This box copies the sand at Troy, where Spirit got stuck. Plan your route carefully!', 'Esta caja copia la arena de Troy, donde quedó Spirit. ¡Planea bien tu ruta!'));
      render();

      const move = (x: number, y: number) => {
        if (busy || !adj(x, y) || at(x, y) === 'r' || !seen.has(`${x},${y}`)) return;
        busy = true;
        const ch = at(x, y);
        const from = P(px, py);
        const to = P(x, y);
        anim.from.copy(from);
        anim.to.copy(to);
        anim.k = 0;
        anim.spinSoft = ch === 's';
        rover.heading = Math.atan2(to.x - from.x, to.z - from.z);
        px = x;
        py = y;
        moves++;
        reveal(1);
        if (ch === 's') {
          sink += 2;
          sfx.soft();
        } else {
          sink = Math.max(0, sink - 1);
          sfx.click();
        }
        render();
        later(() => {
          busy = false;
          if (ch === 's') burst.emit(new Vector3(to.x, base + 0.1, to.z), 60, 3.5, 3);
          if (ch === 'E') {
            sfx.ok();
            burst.emit(new Vector3(to.x, base + 0.3, to.z), 120, 5, 5);
            if (si + 1 < STAGES.length) {
              ui.toast(tr('✅ OUT OF THE SAND!', '✅ ¡FUERA DE LA ARENA!'), 1600);
              ui.say(tr(`It got out of the sand in ${moves} moves! Now, a harder test…`, `¡Salió de la arena en ${moves} movimientos! Ahora, una prueba más difícil…`), 'ok');
              later(() => play(si + 1), 2000);
            } else {
              ui.toast(tr('🏆 TESTS PASSED!', '🏆 ¡PRUEBAS SUPERADAS!'), 1800);
              later(finish, 1500);
            }
            render();
            pickables = [];
            return;
          }
          if (sink >= MAX_SINK) {
            sfx.soft();
            ui.toast(tr('😱 STUCK!', '😱 ¡ATASCADO!'), 1600);
            ui.say(tr('It sank up to its axles! That is what happened to Spirit. Let\'s reset the sandbox and try another route with more firm ground.', '¡Se hundió hasta los ejes! Así le pasó a Spirit. Reiniciemos la caja de arena e intenta otra ruta con más suelo firme.'), 'warn');
            pickables = [];
            later(() => play(si), 2600);
            return;
          }
          if (ch === 's') ui.say(sink >= 8 ? tr('Careful! It is sinking deep. Find firm ground now.', '¡Cuidado! Está muy hundido. Busca suelo firme ya.') : tr('Soft sand: the wheels slip and it sinks a little more.', 'Arena blanda: las ruedas patinan y se hunde un poco más.'), sink >= 8 ? 'warn' : '');
          else ui.say(tr('Firm ground: the wheels grip and the rover rises a little. Nice!', 'Suelo firme: las ruedas agarran y el rover sube un poco. ¡Bien!'), 'ok');
          render();
        }, 520);
      };
      onPick = (m) => {
        const { x, y } = m.userData as { x: number; y: number };
        move(x, y);
      };
      scanBtn.onclick = () => {
        if (busy || scans <= 0) return;
        scans--;
        reveal(2);
        sfx.radio();
        ui.toast('📡', 700);
        ui.say(tr('Scan complete: now you can see farther. Use it to plan the route.', 'Escaneo completo: ahora ves más lejos. Úsalo para planear la ruta.'));
        render();
      };
    };

    const finish = () => {
      sfx.win();
      ui.panel(`
        <p class="lk-brief__kicker">${tr('THE REAL STORY', 'LA HISTORIA REAL')}</p>
        <h3 style="margin:6px 0 10px;font-family:var(--font-ui);font-size:26px">${tr('🏜️ You beat the sandbox!', '🏜️ ¡Venciste a la caja de arena!')}</h3>
        <p style="margin:0 0 14px;line-height:1.55">${tr(
          'In 2009, Spirit got stuck in the sand at <b>Troy</b>. On Earth, engineers tested maneuvers with a twin rover, just like you did. On Mars it could not get out, and in 2010 the winter cold left it without power. But Spirit was supposed to work for 90 days… <b>and it explored for more than 6 years!</b> Its discoveries about water on Mars still help scientists.',
          'En 2009, Spirit quedó atrapado en la arena de <b>Troy</b>. En la Tierra, los ingenieros probaron maniobras con un rover gemelo, como hiciste tú. En Marte no logró salir, y en 2010 el frío del invierno lo dejó sin energía. Pero Spirit iba a trabajar 90 días… <b>¡y exploró más de 6 años!</b> Sus descubrimientos sobre el agua de Marte siguen ayudando a los científicos.',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`).querySelector('[data-end]')!.addEventListener('click', win);
    };

    world.onFrame((dt, t) => {
      if (anim.k < 1) anim.k = Math.min(1, anim.k + dt / 0.5);
      const e = anim.k < 0.5 ? 2 * anim.k * anim.k : 1 - Math.pow(-2 * anim.k + 2, 2) / 2;
      const p = anim.from.clone().lerp(anim.to, e);
      anim.sink += (anim.sinkTo - anim.sink) * Math.min(1, dt * 4);
      rover.x = p.x;
      rover.z = p.z;
      rover.group.position.set(p.x, base - anim.sink * 0.05 + (anim.sinkTo >= MAX_SINK ? -0.15 : 0), p.z);
      rover.group.rotation.set(anim.spinSoft && anim.k < 1 ? Math.sin(t * 30) * 0.03 : 0, rover.heading, 0);
      if (anim.k < 1) {
        rover.wheels.forEach((w) => (w.rotation.x += dt * (anim.spinSoft ? 22 : 9)));
        if (anim.spinSoft && Math.random() < 0.6) burst.emit(new Vector3(p.x, base, p.z), 3, 1.8, 2.2);
      }
      fogs.forEach((f) => {
        if (f.k <= 0 || f.k >= 1) return;
        f.k = Math.min(1, f.k + dt * 2.5);
        f.mesh.position.y = base + 0.15 + f.k * 1.5;
        (f.mesh.material as MeshStandardMaterial).opacity = 1 - f.k;
        if (f.k >= 1) f.mesh.visible = false;
      });
      canMat.opacity = 0.3 + 0.25 * Math.sin(t * 5);
      burst.update(dt);
      look.lerp(new Vector3(p.x * 0.45, base, p.z * 0.45), Math.min(1, dt * 2));
      const dist = 17;
      world.camera.position.set(look.x + Math.sin(yaw) * dist * 0.62, look.y + dist * 0.78, look.z + Math.cos(yaw) * dist * 0.62);
      world.camera.lookAt(look);
      world.dust.update(dt, look);
    });

    play(0);
    world.start();
    cleanup = () => {
      alive = false;
      timers.forEach((x) => window.clearTimeout(x));
      host.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      [texSand, texFirm, texFog].forEach((x) => x.dispose());
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 4', 'SPIRIT · MISIÓN 4'),
    title: tr('Stuck in the sand', 'Atrapado en la arena'),
    text: tr('In 2009, Spirit\'s wheels sank into soft sand. A way out had to be found!', 'En 2009, las ruedas de Spirit se hundieron en arena blanda. ¡Había que encontrar una salida!'),
    goal: tr('As an engineer, get the twin rover out of 2 sandboxes without it sinking all the way.', 'Como ingeniero, saca al rover gemelo de 2 cajas de arena sin que se hunda del todo.'),
    art: MER_SVG,
    accent: SP_ACCENT,
    soft: SP_SOFT,
    guess: {
      q: tr('How did the engineers look for a way to get Spirit out of the sand?', '¿Cómo buscaron los ingenieros la forma de sacar a Spirit de la arena?'),
      options: [tr('By testing with a twin rover in a sandbox', 'Probando con un rover gemelo en una caja de arena'), tr('By sending an astronaut to push it', 'Enviando un astronauta a empujarlo')],
      correct: 0,
      why: tr('They built a sandbox on Earth similar to the one on Mars and tested maneuvers with a twin rover.', 'Armaron en la Tierra una caja de arena parecida a la de Marte y probaron maniobras con un rover gemelo.'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
