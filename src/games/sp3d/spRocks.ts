import { AdditiveBlending, BufferAttribute, CanvasTexture, CircleGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, SRGBColorSpace, Sprite, Vector3 } from 'three';
import type { GameContext } from '../index';
import { brief, MER_SVG, sfx, stopSpeak } from '../lkKit';
import { createControls, createWorld, followCam } from '../op3d/world';
import { mountOp, noWebGL } from '../op3d/opUi';
import { createBurst, glowSprite, glowTexture, injectSpCss, spiritRover, SP_ACCENT, SP_SOFT, textSprite } from './spKit';
import { rng } from '../../ui/moonTexture';
import { tr } from '../../i18n';

type Kind = 'vesicles' | 'dark' | 'crumbly' | 'white' | 'patches' | 'nodules';
interface Rock {
  name: string;
  x: number;
  z: number;
  size: number;
  water: boolean;
  kind: Kind;
  look: string;
  inside: string;
  mineral: string;
  why: string;
}

const ROCKS: Rock[] = [
  { name: 'Adirondack', x: -7, z: -44, size: 1.1, water: false, kind: 'vesicles', look: tr('Dark rock with little round holes: gas bubbles that got trapped when the lava cooled.', 'Roca oscura con agujeritos redondos: burbujas de gas que quedaron atrapadas cuando la lava se enfrió.'), inside: '#3f4a3c', mineral: tr('Olivine (a lava mineral)', 'Olivino (mineral de lava)'), why: tr('The gas holes and the olivine show it was born from volcanic lava.', 'Los agujeritos de gas y el olivino muestran que nació de lava volcánica.') },
  { name: 'Humphrey', x: 12, z: -22, size: 1.2, water: false, kind: 'dark', look: tr('Hard, dark rock with tiny shiny crystals.', 'Roca dura y oscura, con cristalitos que brillan.'), inside: '#4b4b4f', mineral: tr('Basalt with olivine', 'Basalto con olivino'), why: tr('It is basalt: lava that cooled. Many rocks on the Gusev plain are like this.', 'Es basalto: lava que se enfrió. Muchas rocas de la llanura de Gusev son así.') },
  { name: 'Clovis', x: -16, z: 6, size: 1.0, water: true, kind: 'crumbly', look: tr('Soft, crumbly rock, yellowish and brown in color.', 'Roca blanda que se desmorona, de color amarillento y café.'), inside: '#b7793a', mineral: tr('Goethite', 'Goetita'), why: tr('Goethite only forms when there is water. A water clue!', 'La goetita solo se forma cuando hay agua. ¡Pista de agua!') },
  { name: 'Pot of Gold', x: 14, z: 22, size: 0.7, water: true, kind: 'nodules', look: tr('Small rock full of bumps sticking out, like popcorn.', 'Roca pequeña llena de bolitas que sobresalen, como palomitas.'), inside: '#8a4a3a', mineral: tr('Hematite', 'Hematita'), why: tr('The hematite in these little balls usually forms with water.', 'La hematita de estas bolitas se suele formar con agua.') },
  { name: 'Comanche', x: -20, z: 40, size: 1.9, water: true, kind: 'patches', look: tr('Big rock with light patches inside.', 'Roca grande con manchas claras dentro.'), inside: '#c9b48e', mineral: tr('Carbonates', 'Carbonatos'), why: tr('Carbonates form with water that is not very acidic: a friendlier place for life!', 'Los carbonatos se forman con agua, y no muy ácida: ¡un lugar más amigable para la vida!') },
  { name: 'Gertrude Weise', x: 8, z: 54, size: 1.4, water: true, kind: 'white', look: tr('It is not a rock: it is very white soil, like talc, that Spirit\'s wheel uncovered.', 'No es roca: es suelo blanquísimo, como talco, que la rueda de Spirit dejó al descubierto.'), inside: '#f5f5f0', mineral: tr('Almost pure silica', 'Sílice casi pura'), why: tr('That much silica forms with hot water, like in geysers or hot springs.', 'Tanta sílice se forma con agua caliente, como la de los géiseres o fuentes termales.') },
];
const BASE: Record<Kind, string> = { vesicles: '#4a4a50', dark: '#36363b', crumbly: '#b07a45', nodules: '#6e3d2e', patches: '#776e5f', white: '#e9e8e1' };

function drawLens(c: HTMLCanvasElement, r: Rock, drill: number) {
  const g = c.getContext('2d')!;
  const S = c.width;
  const rand = rng(r.name.length * 13);
  g.fillStyle = BASE[r.kind];
  g.fillRect(0, 0, S, S);
  const k = S / 240;
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.12})`;
    g.fillRect(rand() * S, rand() * S, 3 * k, 3 * k);
  }
  if (r.kind === 'vesicles')
    for (let i = 0; i < 22; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rr = (6 + rand() * 14) * k;
      g.fillStyle = '#18181b';
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.arc(x, y, rr, Math.PI * 1.1, Math.PI * 1.7);
      g.stroke();
    }
  if (r.kind === 'dark')
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rand() < 0.5 ? '#6b8f5a' : '#d4d4d8';
      g.save();
      g.translate(rand() * S, rand() * S);
      g.rotate(rand() * 3);
      g.fillRect(-5 * k, -2 * k, 10 * k, 4 * k);
      g.restore();
    }
  if (r.kind === 'crumbly')
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rand() < 0.5 ? '#d6a46a' : '#8a5a2b';
      g.beginPath();
      g.arc(rand() * S, rand() * S, (3 + rand() * 9) * k, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'nodules')
    for (let i = 0; i < 18; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const rr = (10 + rand() * 12) * k;
      const gr = g.createRadialGradient(x - rr / 3, y - rr / 3, 1, x, y, rr);
      gr.addColorStop(0, '#c07a5e');
      gr.addColorStop(1, '#5a2a1c');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'patches')
    for (let i = 0; i < 10; i++) {
      g.fillStyle = 'rgba(230,214,176,.85)';
      g.beginPath();
      g.ellipse(rand() * S, rand() * S, (14 + rand() * 26) * k, (8 + rand() * 12) * k, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
  if (r.kind === 'white')
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`;
      g.beginPath();
      g.arc(rand() * S, rand() * S, (1 + rand() * 3) * k, 0, Math.PI * 2);
      g.fill();
    }
  if (drill > 0) {
    const rr = S * 0.34 * drill;
    g.fillStyle = r.inside;
    g.beginPath();
    g.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 3;
    for (let q = 0.3; q < 1; q += 0.25) {
      g.beginPath();
      g.arc(S / 2, S / 2, rr * q, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function rockMesh(r: Rock, i: number): { mesh: Mesh; tex: CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  drawLens(c, r, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  if (r.kind === 'white') {
    const m = new Mesh(new CircleGeometry(r.size, 32), new MeshStandardMaterial({ map: tex, roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.12 }));
    m.rotation.x = -Math.PI / 2;
    return { mesh: m, tex };
  }
  const geo = new IcosahedronGeometry(1, 3);
  const p = geo.attributes.position as BufferAttribute;
  const rr = rng(i * 7 + 3);
  const bumps = Array.from({ length: 5 }, () => new Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize());
  const v = new Vector3();
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k);
    let s = 1;
    for (const b of bumps) s += Math.max(0, v.dot(b)) ** 3 * 0.22;
    if (r.kind === 'nodules') s += Math.max(0, Math.sin(v.x * 14) * Math.sin(v.y * 14) * Math.sin(v.z * 14)) * 0.18;
    if (r.kind === 'crumbly') s += (rr() - 0.5) * 0.12;
    v.multiplyScalar(s);
    v.y *= r.kind === 'patches' ? 0.8 : 0.65;
    p.setXYZ(k, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, new MeshStandardMaterial({ map: tex, roughness: r.kind === 'dark' ? 0.55 : 0.9, metalness: r.kind === 'dark' ? 0.25 : 0, flatShading: r.kind !== 'crumbly' }));
  mesh.scale.setScalar(r.size);
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, tex };
}

export default function spRocks({ root, win }: GameContext): () => void {
  let cleanup: (() => void) | null = null;

  const start = () => {
    injectSpCss();
    const ui = mountOp(root, tr('🔍 Drive to the <b>6 rocks</b> marked in blue, investigate them and decide: <b>water or lava?</b>', '🔍 Maneja hasta las <b>6 rocas</b> marcadas en azul, investígalas y decide: <b>¿agua o lava?</b>'), { blue: true });
    const world = createWorld(ui.canvasHost, {
      size: 220,
      seg: 240,
      seed: 31,
      hills: 1.2,
      craters: [
        { x: -5, z: 85, r: 48, depth: -11, rim: 0 },
        { x: 40, z: 70, r: 30, depth: -7, rim: 0 },
        { x: 30, z: -50, r: 12, depth: 2 },
        { x: -40, z: -10, r: 9, depth: 1.6 },
      ],
      rocks: 340,
      clear: [{ x: 0, z: -62, r: 5 }, ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.size + 3 }))],
    });
    if (!world) return noWebGL(root, win);
    world.setTime(0.38);
    const controls = createControls(ui.joy);
    const rover = spiritRover(world, 0, -62, 0);
    const cam = followCam(world, () => rover, ui.canvasHost);
    const glowTex = glowTexture('147,197,253');
    const burst = createBurst(world, '#93c5fd', 0.35, 400);

    const ringMat = new MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const texs: CanvasTexture[] = [];
    const items = ROCKS.map((r, i) => {
      const grp = new Group();
      const { mesh, tex } = rockMesh(r, i);
      texs.push(tex);
      const gy = world.heightAt(r.x, r.z);
      mesh.position.set(r.x, gy + (r.kind === 'white' ? 0.05 : r.size * 0.35), r.z);
      if (r.kind !== 'white') mesh.rotation.y = i * 1.7;
      const ring = new Mesh(new RingGeometry(r.size + 1.1, r.size + 1.4, 48), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(r.x, gy + 0.12, r.z);
      const glow = glowSprite(glowTex, '#93c5fd', 2.2);
      glow.position.set(r.x, gy + r.size * 1.6 + 1.6, r.z);
      let label: Sprite = textSprite(r.name);
      label.position.set(r.x, gy + r.size * 1.2 + 1.4, r.z);
      grp.add(mesh, ring, glow, label);
      world.scene.add(grp);
      return {
        r,
        ring,
        glow,
        setLabel: (text: string, color: string) => {
          grp.remove(label);
          label.material.map?.dispose();
          label.material.dispose();
          label = textSprite(text, color);
          label.position.set(r.x, gy + r.size * 1.2 + 1.4, r.z);
          grp.add(label);
        },
        done: false,
        first: false,
      };
    });
    const blocked = (x: number, z: number) => items.some((it) => it.r.kind !== 'white' && Math.hypot(it.r.x - x, it.r.z - z) < it.r.size + 0.9);

    // Radar y cuaderno
    const radar = document.createElement('canvas');
    radar.width = radar.height = 150;
    radar.style.cssText = 'width:110px;height:110px;border-radius:50%;display:block';
    const radarCard = document.createElement('div');
    radarCard.className = 'op__card';
    radarCard.style.cssText = 'padding:6px;border-radius:50%';
    radarCard.appendChild(radar);
    const bookCard = document.createElement('div');
    bookCard.className = 'op__card';
    bookCard.innerHTML = `<small>${tr('DETECTIVE NOTEBOOK', 'CUADERNO DEL DETECTIVE')}</small><div class="sp3-book" style="margin-top:6px">${ROCKS.map((_, i) => `<i data-slot="${i}">?</i>`).join('')}</div>`;
    const cardsEl = ui.hud.querySelector('[data-cards]')!;
    cardsEl.appendChild(bookCard);
    cardsEl.appendChild(radarCard);
    const rg = radar.getContext('2d')!;
    const RANGE = 70;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lk-btn lk-btn--go op__btn';
    btn.hidden = true;
    ui.btns.appendChild(btn);

    let near: (typeof items)[number] | null = null;
    let open = false;
    ui.say(tr('You are Spirit\'s detective. Drive with the joystick or arrows to the blue rings. The Columbia Hills are at the back!', 'Eres el detective de Spirit. Maneja con el joystick o las flechas hasta los anillos azules. ¡Al fondo están las colinas Columbia!'));

    const openLab = () => {
      if (!near || open) return;
      open = true;
      const it = near;
      const r = it.r;
      sfx.ok();
      let tries = 0;
      const used = { lens: false, drill: false };
      const panel = ui.panel(`
        <div class="sp3-lab">
          <div style="display:grid;justify-items:center;gap:6px"><canvas class="sp3-lens" width="240" height="240" data-lens></canvas><small data-lenslabel style="font-weight:800;letter-spacing:.12em;color:#93c5fd">${tr('CAMERA', 'CÁMARA')}</small></div>
          <div>
            <p class="lk-brief__kicker">${tr('INVESTIGATING', 'INVESTIGANDO')}</p>
            <h3>${r.name}</h3>
            <div class="sp3-row">
              <button type="button" class="lk-btn" data-tool="lens">🔍 ${tr('Microscope', 'Microscopio')}</button>
              <button type="button" class="lk-btn" data-tool="drill">⚙️ ${tr('Drill + spectrometer', 'Taladro + espectrómetro')}</button>
            </div>
            <p class="sp3-clue" data-c1 hidden></p>
            <p class="sp3-clue" data-c2 hidden></p>
            <div class="sp3-row">
              <button type="button" class="lk-btn" data-class="water" disabled>💧 ${tr('Formed with water', 'Se formó con agua')}</button>
              <button type="button" class="lk-btn" data-class="lava" disabled>🌋 ${tr('Formed with lava', 'Se formó con lava')}</button>
            </div>
            <p class="lk-say" data-msg style="margin-top:6px"><b>CONTROL</b><span>${tr('Use a tool to look for clues.', 'Usa una herramienta para buscar pistas.')}</span></p>
          </div>
        </div>`);
      const lens = panel.querySelector<HTMLCanvasElement>('[data-lens]')!;
      const lg = lens.getContext('2d')!;
      lg.fillStyle = '#111';
      lg.fillRect(0, 0, 240, 240);
      lg.fillStyle = '#93c5fd';
      lg.font = '700 16px system-ui';
      lg.textAlign = 'center';
      lg.fillText(tr('Use a tool', 'Usa una herramienta'), 120, 124);
      const msg = (t: string, k: '' | 'ok' | 'warn' = '') => {
        const el = panel.querySelector<HTMLElement>('[data-msg]')!;
        el.className = `lk-say${k ? ` ${k}` : ''}`;
        el.innerHTML = `<b>CONTROL</b><span>${t}</span>`;
      };
      const classBtns = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-class]'));
      panel.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) =>
        b.addEventListener('click', () => {
          sfx.beep();
          if (b.dataset.tool === 'lens') {
            used.lens = true;
            drawLens(lens, r, used.drill ? 1 : 0);
            panel.querySelector('[data-lenslabel]')!.textContent = tr('MICROSCOPE', 'MICROSCOPIO');
            const c1 = panel.querySelector<HTMLElement>('[data-c1]')!;
            c1.hidden = false;
            c1.innerHTML = `🔍 ${r.look}`;
          } else {
            used.drill = true;
            panel.querySelector('[data-lenslabel]')!.textContent = tr('DRILL', 'TALADRO');
            let k = 0;
            const grind = () => {
              if (!open) return;
              k = Math.min(1, k + 0.04);
              drawLens(lens, r, k);
              if (k < 1) {
                if (Math.random() < 0.4) sfx.click();
                requestAnimationFrame(grind);
              } else {
                const c2 = panel.querySelector<HTMLElement>('[data-c2]')!;
                c2.hidden = false;
                c2.innerHTML = `⚙️ ${tr('Inside ground smooth. The spectrometer detects', 'Interior pulido. El espectrómetro detecta')}: <b>${r.mineral}</b>.`;
              }
            };
            grind();
          }
          classBtns.forEach((x) => (x.disabled = false));
        }),
      );
      classBtns.forEach((b) =>
        b.addEventListener('click', () => {
          const saidWater = b.dataset.class === 'water';
          if (saidWater !== r.water) {
            tries++;
            sfx.soft();
            b.disabled = true;
            msg(tr(`Almost! Look at the clues again${used.lens && used.drill ? '' : ' (try the other tool)'}.`, `¡Casi! Mira otra vez las pistas${used.lens && used.drill ? '' : ' (prueba la otra herramienta)'}.`), 'warn');
            return;
          }
          sfx.ok();
          it.done = true;
          it.first = tries === 0;
          classBtns.forEach((x) => (x.disabled = true));
          msg(`${tr('Well done, detective!', '¡Bien, detective!')} ${r.why}`, 'ok');
          const slot = bookCard.querySelector<HTMLElement>(`[data-slot="${ROCKS.indexOf(r)}"]`)!;
          slot.className = r.water ? 'water' : 'lava';
          slot.textContent = r.water ? '💧' : '🌋';
          it.setLabel(`${r.water ? '💧' : '🌋'} ${r.name}`, r.water ? '#7dd3fc' : '#fdba74');
          it.ring.visible = false;
          it.glow.visible = false;
          burst.emit(new Vector3(r.x, world.heightAt(r.x, r.z) + r.size, r.z), 80, 4, 4);
          const doneN = items.filter((x) => x.done).length;
          const close = document.createElement('button');
          close.type = 'button';
          close.className = 'lk-btn lk-btn--go';
          close.style.marginTop = '10px';
          close.textContent = doneN === ROCKS.length ? tr('See results', 'Ver resultados') : tr('Keep exploring', 'Seguir explorando');
          panel.querySelector('.sp3-lab > div:last-child')!.appendChild(close);
          close.focus();
          close.addEventListener('click', () => {
            ui.closePanel();
            open = false;
            if (doneN === ROCKS.length) finish();
            else {
              ui.toast(`🔍 ${doneN} / ${ROCKS.length}`, 1200);
              ui.say(tr(`${ROCKS.length - doneN} rocks left. Follow the radar!`, `Faltan ${ROCKS.length - doneN} rocas. ¡Sigue el radar!`), 'ok');
            }
          });
        }),
      );
    };
    btn.addEventListener('click', openLab);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && near && !open) {
        e.preventDefault();
        openLab();
      }
    };
    document.addEventListener('keydown', onKey);

    world.onFrame((dt, t) => {
      rover.update(dt, open ? 0 : controls.throttle, open ? 0 : controls.steer, blocked);
      cam.update(dt);
      world.dust.update(dt, rover.group.position);
      burst.update(dt);
      let best: (typeof items)[number] | null = null;
      let bd = 1e9;
      for (const it of items) {
        if (it.done) continue;
        const d = Math.hypot(it.r.x - rover.x, it.r.z - rover.z) - it.r.size;
        if (d < bd) {
          bd = d;
          best = it;
        }
        const pulse = 1 + Math.sin(t * 3 + it.r.x) * 0.06;
        it.ring.scale.setScalar(pulse);
        it.glow.material.opacity = 0.5 + 0.5 * Math.sin(t * 2.4 + it.r.z);
        it.glow.position.y = world.heightAt(it.r.x, it.r.z) + it.r.size * 1.6 + 1.6 + Math.sin(t * 2) * 0.15;
      }
      const wasNear = near;
      near = best && bd < 2.6 ? best : null;
      btn.hidden = !near || open;
      if (near) btn.textContent = `🔬 ${tr('Investigate', 'Investigar')} ${near.r.name}`;
      if (near && near !== wasNear) {
        sfx.beep();
        ui.say(tr(`You reached ${near.r.name}! Press «Investigate».`, `¡Llegaste a ${near.r.name}! Pulsa «Investigar».`), 'ok');
      }
      const C = 75;
      rg.clearRect(0, 0, 150, 150);
      rg.fillStyle = 'rgba(8,16,36,.88)';
      rg.beginPath();
      rg.arc(C, C, 74, 0, Math.PI * 2);
      rg.fill();
      rg.strokeStyle = 'rgba(147,197,253,.3)';
      for (const k of [0.33, 0.66, 1]) {
        rg.beginPath();
        rg.arc(C, C, 72 * k, 0, Math.PI * 2);
        rg.stroke();
      }
      const sweep = (t * 2) % (Math.PI * 2);
      rg.strokeStyle = 'rgba(147,197,253,.65)';
      rg.beginPath();
      rg.moveTo(C, C);
      rg.lineTo(C + Math.cos(sweep) * 72, C + Math.sin(sweep) * 72);
      rg.stroke();
      for (const it of items) {
        const dx = it.r.x - rover.x;
        const dz = it.r.z - rover.z;
        const d = Math.min(RANGE, Math.hypot(dx, dz));
        const a = Math.atan2(dx, dz) - rover.heading;
        rg.fillStyle = it.done ? (it.r.water ? '#38bdf8' : '#f97316') : '#e0f2fe';
        rg.beginPath();
        rg.arc(C - Math.sin(a) * (d / RANGE) * 68, C - Math.cos(a) * (d / RANGE) * 68, it.done ? 4 : 6, 0, Math.PI * 2);
        rg.fill();
      }
      rg.fillStyle = '#fbbf24';
      rg.beginPath();
      rg.moveTo(C, C - 9);
      rg.lineTo(C - 6, C + 6);
      rg.lineTo(C + 6, C + 6);
      rg.closePath();
      rg.fill();
    });

    const finish = () => {
      sfx.win();
      const stars = items.filter((x) => x.first).length;
      ui.panel(`
        <p class="lk-brief__kicker">${tr('WHAT DID YOU LEARN?', '¿QUÉ APRENDISTE?')}</p>
        <h3 style="margin:6px 0 6px;font-family:var(--font-ui);font-size:26px">${tr('🔍 Case solved!', '🔍 ¡Caso resuelto!')}</h3>
        <p style="margin:0 0 8px;font-size:22px;color:#fde047">${'★'.repeat(stars)}<span style="opacity:.3">${'★'.repeat(ROCKS.length - stars)}</span> ${stars}/6 ${tr('on the first try', 'al primer intento')}</p>
        <p style="margin:0 0 14px;line-height:1.55">${tr(
          'Rocks are like a diary of the past. On the Gusev plain, Spirit found <b>lava</b> rocks; in the Columbia Hills it found <b>goethite, hematite, carbonates and silica</b>: clues that long ago there was <b>water</b> on Mars, even hot water!',
          'Las rocas son como un diario del pasado. En la llanura de Gusev, Spirit encontró rocas de <b>lava</b>; en las colinas Columbia encontró <b>goetita, hematita, carbonatos y sílice</b>: pistas de que hace mucho tiempo hubo <b>agua</b> en Marte, ¡incluso agua caliente!',
        )}</p>
        <button type="button" class="lk-btn lk-btn--go" data-end>${tr('Mission accomplished!', '¡Misión cumplida!')}</button>`).querySelector('[data-end]')!.addEventListener('click', win);
    };

    world.start();
    cleanup = () => {
      open = false;
      document.removeEventListener('keydown', onKey);
      controls.dispose();
      cam.dispose();
      glowTex.dispose();
      texs.forEach((x) => x.dispose());
      world.dispose();
    };
  };

  brief(root, {
    kicker: tr('SPIRIT · MISSION 2', 'SPIRIT · MISIÓN 2'),
    title: tr('Rock detective', 'Detective de rocas'),
    text: tr('Spirit had a microscope, a drill to grind rocks and instruments that read what they are made of.', 'Spirit tenía un microscopio, un taladro para pulir rocas y aparatos que leen de qué están hechas.'),
    goal: tr('Travel to 6 rocks, investigate them and decide: did they form with water or with lava?', 'Viaja a 6 rocas, investígalas y decide: ¿se formaron con agua o con lava?'),
    art: MER_SVG,
    accent: SP_ACCENT,
    soft: SP_SOFT,
    guess: {
      q: tr('How can we know if there was water on Mars millions of years ago?', '¿Cómo se puede saber si hubo agua en Marte hace millones de años?'),
      options: [tr('By studying its rocks and soil', 'Estudiando sus rocas y su suelo'), tr('By listening to the wind', 'Escuchando el viento')],
      correct: 0,
      why: tr('Some minerals only form with water. If you find them in a rock, it is a clue that there was water!', 'Algunos minerales solo se forman con agua. Si los encuentras en una roca, ¡es una pista de que hubo agua!'),
    },
    onStart: start,
  });

  return () => {
    cleanup?.();
    stopSpeak();
  };
}
