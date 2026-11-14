import { ConeGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { RobotModel } from '../../types';
import { M, box, cyl, mat, mesh, piece, rod, strut, thruster, wheel } from './shared';

/** Lunar Roving Vehicle (Apollo 15). ~2 (Z) x 1.5 (X) x 1.3 (Y). */
export function buildLRV(): RobotModel {
  const group = new Group();
  group.name = 'lrv';

  const alu = M.aluminum();
  const darkAlu = M.darkAlu();
  const gold = M.gold();
  const black = M.black();
  const wireMesh = mat('#d8dbe0', { metalness: 0.7, roughness: 0.4, wireframe: true });
  const tire = mat('#8a8e95', { metalness: 0.5, roughness: 0.6 });
  const fenderMat = mat('#c2b59b', { metalness: 0.2, roughness: 0.7 });
  const seatMat = mat('#5d6a52', { metalness: 0.05, roughness: 0.9 });

  const WR = 0.26;
  const WX = 0.66;
  const WZ = 0.66;
  const DECK_Y = 0.42;

  /* ---------- Chasis ---------- */
  const chassis = piece('chassis');
  chassis.add(box(1.0, 0.05, 1.72, alu, 0, DECK_Y, 0));
  // largueros laterales
  chassis.add(box(0.05, 0.08, 1.9, darkAlu, -0.5, DECK_Y - 0.02, 0));
  chassis.add(box(0.05, 0.08, 1.9, darkAlu, 0.5, DECK_Y - 0.02, 0));
  // travesaños de suspensión hacia las ruedas
  for (const z of [-WZ, WZ]) {
    chassis.add(box(1.2, 0.04, 0.06, darkAlu, 0, DECK_Y - 0.06, z));
  }
  // consola de mando y joystick
  chassis.add(rod([0, DECK_Y, 0.38], [0, DECK_Y + 0.42, 0.42], 0.025, darkAlu));
  const consola = box(0.34, 0.2, 0.06, black, 0, DECK_Y + 0.48, 0.44);
  consola.rotation.x = -0.35;
  chassis.add(consola);
  chassis.add(box(0.3, 0.06, 0.02, gold, 0, DECK_Y + 0.55, 0.47));
  chassis.add(rod([0, DECK_Y + 0.03, 0.18], [0, DECK_Y + 0.18, 0.2], 0.015, black));
  // palé de carga trasero (herramientas y muestras)
  chassis.add(box(0.78, 0.22, 0.32, gold, 0, DECK_Y + 0.13, -0.72));
  chassis.add(box(0.8, 0.03, 0.34, alu, 0, DECK_Y + 0.25, -0.72));
  chassis.add(rod([-0.3, DECK_Y + 0.25, -0.82], [-0.32, DECK_Y + 0.55, -0.86], 0.012, alu));
  chassis.add(rod([0.3, DECK_Y + 0.25, -0.82], [0.32, DECK_Y + 0.55, -0.86], 0.012, alu));
  // cajas electrónicas delanteras (con baterías de plata-zinc)
  chassis.add(box(0.7, 0.14, 0.26, gold, 0, DECK_Y + 0.09, 0.74));
  group.add(chassis);

  /* ---------- Ruedas de malla + guardabarros ---------- */
  const fenderGeo = new CylinderGeometry(WR + 0.05, WR + 0.05, 0.22, 10, 1, true, 0, Math.PI);
  const sideWheels = (side: 1 | -1, name: string) => {
    const p = piece(name);
    for (const z of [-WZ, WZ]) {
      const w = wheel(WR, 0.2, tire, darkAlu, wireMesh, 14);
      w.position.set(side * WX, WR, z);
      p.add(w);
      // chevrones de titanio (banda de rodadura)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const c = box(0.2, 0.025, 0.05, alu, side * WX, WR + Math.cos(a) * WR, z + Math.sin(a) * WR);
        c.rotation.x = a;
        p.add(c);
      }
      const fender = mesh(fenderGeo, fenderMat, side * WX, WR, z);
      fender.rotation.z = Math.PI / 2;
      p.add(fender);
      p.add(strut([side * 0.5, DECK_Y - 0.04, z], [side * (WX - 0.08), WR, z], 0.04, darkAlu));
    }
    return p;
  };
  const wheelsLeft = sideWheels(-1, 'wheelsLeft');
  const wheelsRight = sideWheels(1, 'wheelsRight');
  group.add(wheelsLeft, wheelsRight);

  /* ---------- Asientos ---------- */
  const seats = piece('seats');
  for (const x of [-0.24, 0.24]) {
    seats.add(box(0.36, 0.04, 0.34, seatMat, x, DECK_Y + 0.16, 0.0));
    const back = box(0.36, 0.34, 0.04, seatMat, x, DECK_Y + 0.32, -0.18);
    back.rotation.x = -0.18;
    seats.add(back);
    // estructura tubular
    seats.add(rod([x - 0.17, DECK_Y, 0.15], [x - 0.17, DECK_Y + 0.16, 0.15], 0.012, alu));
    seats.add(rod([x + 0.17, DECK_Y, 0.15], [x + 0.17, DECK_Y + 0.16, 0.15], 0.012, alu));
    seats.add(rod([x - 0.17, DECK_Y, -0.17], [x - 0.17, DECK_Y + 0.48, -0.22], 0.012, alu));
    seats.add(rod([x + 0.17, DECK_Y, -0.17], [x + 0.17, DECK_Y + 0.48, -0.22], 0.012, alu));
    // reposapiés
    seats.add(box(0.3, 0.02, 0.12, alu, x, DECK_Y + 0.03, 0.3));
  }
  group.add(seats);

  /* ---------- Comunicaciones: antena paraguas, antena de baja ganancia, cámara TV ---------- */
  const comms = piece('comms');
  // antena de alta ganancia (paraguas de malla dorada)
  const hgaBase: [number, number, number] = [-0.32, DECK_Y + 0.12, 0.66];
  const hgaTop: [number, number, number] = [-0.34, DECK_Y + 0.78, 0.72];
  comms.add(rod(hgaBase, hgaTop, 0.018, alu));
  const dishGroup = new Group();
  dishGroup.position.set(hgaTop[0], hgaTop[1], hgaTop[2]);
  dishGroup.rotation.set(-0.7, 0, 0.35);
  const umbrella = new Mesh(new ConeGeometry(0.28, 0.1, 12, 1, true), mat('#e4cf8f', { metalness: 0.6, roughness: 0.4 }));
  umbrella.rotation.x = Math.PI; // concavidad hacia arriba
  umbrella.position.y = 0.05;
  dishGroup.add(umbrella);
  const ribs = new Mesh(new ConeGeometry(0.285, 0.1, 12, 1, true), mat('#9b8e66', { wireframe: true }));
  ribs.rotation.x = Math.PI;
  ribs.position.y = 0.05;
  dishGroup.add(ribs);
  dishGroup.add(rod([0, 0, 0], [0, 0.16, 0], 0.01, alu));
  comms.add(dishGroup);
  // antena de baja ganancia (helicoidal, simplificada como varilla)
  comms.add(rod([0.32, DECK_Y + 0.12, 0.66], [0.34, DECK_Y + 0.85, 0.66], 0.01, alu));
  comms.add(cyl(0.025, 0.22, black, 0.34, DECK_Y + 0.8, 0.66, 6));
  // cámara de TV (GCTA) en la parte delantera
  comms.add(rod([0.08, DECK_Y + 0.12, 0.8], [0.1, DECK_Y + 0.45, 0.82], 0.015, alu));
  comms.add(box(0.12, 0.1, 0.18, M.white(), 0.1, DECK_Y + 0.5, 0.84));
  const lens = cyl(0.03, 0.05, M.lens(), 0.1, DECK_Y + 0.5, 0.95, 8);
  lens.rotation.x = Math.PI / 2;
  comms.add(lens);
  group.add(comms);

  const thrusters = [
    thruster(-0.4, 0.3, 0.55),
    thruster(0.4, 0.3, 0.55),
    thruster(-0.4, 0.3, -0.55),
    thruster(0.4, 0.3, -0.55),
  ];
  for (const t of thrusters) chassis.add(t);

  return { group, pieces: [chassis, wheelsLeft, wheelsRight, seats, comms], thrusters };
}
