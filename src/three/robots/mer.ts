import { Group, Mesh, Shape, ShapeGeometry, DoubleSide, MeshStandardMaterial } from 'three';
import type { RobotModel } from '../../types';
import { M, box, cyl, mat, mesh, piece, rod, strut, thruster, wheel } from './shared';

/**
 * Mars Exploration Rover (Spirit / Opportunity): cuerpo caja (WEB), cubierta solar en
 * forma de alas, mástil Pancam, 6 ruedas con rocker-bogie, antena de alta ganancia y brazo IDD.
 * Los gemelos se diferencian por el color de acento.
 */
export function buildMER(name: string, accentColor: string): RobotModel {
  const group = new Group();
  group.name = name;

  const accent = mat(accentColor, { metalness: 0.4, roughness: 0.5, emissive: accentColor, emissiveIntensity: 0.15 });
  const white = M.white();
  const gold = M.gold();
  const alu = M.aluminum();
  const darkAlu = M.darkAlu();
  const black = M.black();
  const wheelMat = mat('#b9bcc2', { metalness: 0.65, roughness: 0.45 });
  const solarMat = M.solar();

  const WR = 0.13;
  const WX = 0.6;
  const Z_FRONT = 0.55;
  const Z_MID = 0.02;
  const Z_REAR = -0.5;
  const BODY_Y = 0.52;
  const DECK_Y = 0.72;

  /* ---------- Cuerpo (Warm Electronics Box) + brazo IDD ---------- */
  const body = piece('body');
  body.add(box(0.62, 0.32, 0.92, white, 0, BODY_Y, 0));
  body.add(box(0.64, 0.04, 0.94, gold, 0, BODY_Y - 0.17, 0));
  body.add(box(0.5, 0.12, 0.02, gold, 0, BODY_Y, 0.47));
  // cámaras Hazcam delanteras
  for (const x of [-0.08, 0.08]) {
    const c = cyl(0.025, 0.04, M.lens(), x, BODY_Y - 0.08, 0.475, 8);
    c.rotation.x = Math.PI / 2;
    body.add(c);
  }
  // brazo robótico IDD (plegado bajo el frente)
  const sh: [number, number, number] = [0.18, BODY_Y - 0.1, 0.47];
  const el: [number, number, number] = [0.05, BODY_Y - 0.16, 0.7];
  const wr: [number, number, number] = [-0.18, BODY_Y - 0.18, 0.62];
  body.add(strut(sh, el, 0.035, alu));
  body.add(strut(el, wr, 0.03, alu));
  const turret = new Group();
  turret.position.set(...wr);
  turret.add(cyl(0.06, 0.05, darkAlu, 0, 0, 0, 8));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const tool = cyl(0.02, 0.06, i === 0 ? accent : black, Math.cos(a) * 0.06, -0.04, Math.sin(a) * 0.06, 6);
    turret.add(tool);
  }
  body.add(turret);
  group.add(body);

  /* ---------- Suspensión rocker-bogie + ruedas ---------- */
  const side = (s: 1 | -1, nm: string) => {
    const p = piece(nm);
    const pivot: [number, number, number] = [s * 0.42, BODY_Y - 0.02, 0.1];
    const bogie: [number, number, number] = [s * WX, 0.3, -0.24];
    const fHub: [number, number, number] = [s * WX, WR + 0.08, Z_FRONT];
    const mHub: [number, number, number] = [s * WX, WR + 0.08, Z_MID];
    const rHub: [number, number, number] = [s * WX, WR + 0.08, Z_REAR];
    // rocker
    p.add(strut(pivot, [s * WX, 0.42, 0.18], 0.04, darkAlu));
    p.add(strut([s * WX, 0.42, 0.18], fHub, 0.04, darkAlu));
    p.add(strut([s * WX, 0.42, 0.18], bogie, 0.04, darkAlu));
    // bogie
    p.add(strut(bogie, mHub, 0.035, darkAlu));
    p.add(strut(bogie, rHub, 0.035, darkAlu));
    p.add(cyl(0.03, 0.06, accent, bogie[0], bogie[1], bogie[2], 8).rotateZ(Math.PI / 2));
    for (const hub of [fHub, mHub, rHub]) {
      p.add(rod(hub, [hub[0], WR, hub[2]], 0.02, darkAlu));
      const w = wheel(WR, 0.16, wheelMat, black, undefined, 12);
      w.position.set(hub[0], WR, hub[2]);
      // tacos (grousers)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const g = box(0.16, 0.012, 0.03, darkAlu, 0, Math.cos(a) * WR, Math.sin(a) * WR);
        g.rotation.x = a;
        w.add(g);
      }
      p.add(w);
    }
    return p;
  };
  const wheelsLeft = side(-1, 'wheelsLeft');
  const wheelsRight = side(1, 'wheelsRight');
  group.add(wheelsLeft, wheelsRight);

  /* ---------- Cubierta de paneles solares en forma de alas ---------- */
  const deck = piece('solarDeck');
  deck.position.y = DECK_Y;
  const panelMat = solarMat as MeshStandardMaterial;
  const backMat = mat('#8f949c', { metalness: 0.5, roughness: 0.6 });
  // panel central sobre el cuerpo
  deck.add(box(0.72, 0.03, 1.0, backMat, 0, 0, 0));
  deck.add(box(0.68, 0.012, 0.96, panelMat, 0, 0.02, 0));
  // alas: forma de plumas (shape plano en XZ)
  const WING: [number, number][] = [
    [0, 0.42],
    [0.5, 0.3],
    [0.56, -0.02],
    [0.42, -0.44],
    [0, -0.5],
  ];
  // ShapeGeometry corrige el sentido de giro, así que espejar en X es seguro
  const wingGeo = (s: 1 | -1) => {
    const sh = new Shape();
    WING.forEach(([x, y], i) => (i ? sh.lineTo(s * x, y) : sh.moveTo(s * x, y)));
    sh.closePath();
    const g = new ShapeGeometry(sh);
    g.rotateX(-Math.PI / 2); // al plano XZ (cara hacia +Y)
    return g;
  };
  const dbl = mat('#8f949c', { metalness: 0.5, roughness: 0.6 }).clone();
  dbl.side = DoubleSide;
  for (const s of [-1, 1] as const) {
    const w = new Group();
    w.position.set(s * 0.36, 0.0, 0.02);
    w.rotation.z = s * 0.06;
    const geo = wingGeo(s);
    const cells = new Mesh(geo, panelMat);
    cells.position.y = 0.018;
    const back = new Mesh(geo, dbl);
    w.add(back, cells);
    // marcos de las celdas
    w.add(box(0.5, 0.02, 0.015, alu, s * 0.26, 0.022, 0.0));
    w.add(box(0.015, 0.02, 0.8, alu, s * 0.26, 0.022, -0.03));
    deck.add(w);
  }
  // panel trasero
  deck.add(box(0.62, 0.025, 0.32, backMat, 0, -0.01, -0.66));
  deck.add(box(0.58, 0.012, 0.28, panelMat, 0, 0.008, -0.66));
  // acento: banda de calibración/identificación en la cubierta
  deck.add(box(0.2, 0.015, 0.06, accent, 0.18, 0.03, 0.42));
  // reloj solar (calibración Pancam)
  deck.add(cyl(0.05, 0.02, white, -0.2, 0.04, -0.38, 10));
  deck.add(rod([-0.2, 0.04, -0.38], [-0.2, 0.12, -0.38], 0.006, black));
  group.add(deck);

  /* ---------- Mástil Pancam + antenas ---------- */
  const mast = piece('mast');
  const mastBase: [number, number, number] = [-0.2, DECK_Y + 0.02, 0.42];
  const mastTop: [number, number, number] = [-0.2, 1.24, 0.42];
  mast.add(rod(mastBase, mastTop, 0.03, white));
  mast.add(cyl(0.05, 0.06, accent, -0.2, DECK_Y + 0.38, 0.42, 8));
  // cabeza de cámara
  const head = new Group();
  head.position.set(-0.2, 1.3, 0.44);
  head.add(box(0.3, 0.09, 0.1, white, 0, 0, 0));
  head.add(box(0.31, 0.02, 0.11, accent, 0, 0.055, 0));
  for (const x of [-0.11, -0.05, 0.05, 0.11]) {
    const l = cyl(0.018, 0.04, M.lens(), x, 0, 0.06, 8);
    l.rotation.x = Math.PI / 2;
    head.add(l);
  }
  mast.add(head);
  // antena de alta ganancia (disco) sobre un pequeño mástil
  const hgaBase: [number, number, number] = [0.22, DECK_Y + 0.02, -0.12];
  mast.add(rod(hgaBase, [0.22, DECK_Y + 0.2, -0.12], 0.02, alu));
  const dish = new Group();
  dish.position.set(0.22, DECK_Y + 0.24, -0.12);
  dish.rotation.set(0.9, 0.3, 0);
  dish.add(cyl(0.14, 0.025, white, 0, 0, 0, 14));
  dish.add(cyl(0.145, 0.012, accent, 0, -0.016, 0, 14));
  dish.add(cyl(0.03, 0.05, gold, 0, 0.03, 0, 8));
  mast.add(dish);
  // antena de baja ganancia (varilla)
  mast.add(rod([0.3, DECK_Y + 0.02, -0.32], [0.3, DECK_Y + 0.42, -0.32], 0.01, black));
  mast.add(cyl(0.018, 0.05, alu, 0.3, DECK_Y + 0.44, -0.32, 6));
  group.add(mast);

  const thrusters = [
    thruster(-0.25, 0.3, 0.32),
    thruster(0.25, 0.3, 0.32),
    thruster(-0.25, 0.3, -0.32),
    thruster(0.25, 0.3, -0.32),
  ];
  for (const t of thrusters) body.add(t);

  return { group, pieces: [body, wheelsLeft, wheelsRight, deck, mast], thrusters };
}
