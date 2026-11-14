import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import type { RobotModel } from '../../types';
import { M, box, cyl, mat, mesh, piece, rod, strut, thruster, wheel } from './shared';

/** Lunojod 2 (URSS, 1973): "bañera" presurizada, tapa solar abatible y 8 ruedas. */
export function buildLunokhod2(): RobotModel {
  const group = new Group();
  group.name = 'lunokhod2';

  const tubMat = mat('#a7abb2', { metalness: 0.55, roughness: 0.45 });
  const tubDark = mat('#6d7178', { metalness: 0.5, roughness: 0.55 });
  const radiator = mat('#dcdde0', { metalness: 0.4, roughness: 0.3 });
  const gold = M.gold();
  const black = M.black();
  const alu = M.aluminum();
  const spokes = mat('#c3c6cc', { metalness: 0.6, roughness: 0.4, wireframe: true });
  const tire = mat('#7b7f86', { metalness: 0.5, roughness: 0.6 });

  const WR = 0.17;
  const WX = 0.66;
  const WZ = [-0.6, -0.2, 0.2, 0.6];
  const TUB_BOTTOM = 0.3;
  const TUB_H = 0.42;
  const TUB_TOP = TUB_BOTTOM + TUB_H;

  /* ---------- Bañera (cuerpo) ---------- */
  const body = piece('body');
  // chasis inferior (marco que une las ruedas)
  body.add(box(1.1, 0.06, 1.45, tubDark, 0, TUB_BOTTOM - 0.02, 0));
  // bañera: tronco de cono invertido, alargado en Z
  const tub = mesh(new CylinderGeometry(0.6, 0.46, TUB_H, 16), tubMat, 0, TUB_BOTTOM + TUB_H / 2, 0);
  tub.scale.z = 1.22;
  body.add(tub);
  // parte inferior abombada
  const belly = mesh(new SphereGeometry(0.46, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), tubDark, 0, TUB_BOTTOM + 0.02, 0);
  belly.scale.set(1, 0.25, 1.22);
  body.add(belly);
  // tapa superior = radiador
  const top = mesh(new CylinderGeometry(0.61, 0.61, 0.03, 16), radiator, 0, TUB_TOP + 0.015, 0);
  top.scale.z = 1.22;
  body.add(top);
  // aro/borde
  const rim = mesh(new CylinderGeometry(0.62, 0.62, 0.05, 16, 1, true), gold, 0, TUB_TOP - 0.02, 0);
  rim.scale.z = 1.22;
  body.add(rim);
  // "ojos": dos cámaras de TV delanteras de navegación
  for (const x of [-0.16, 0.16]) {
    const c = cyl(0.055, 0.12, black, x, TUB_TOP - 0.12, 0.66, 10);
    c.rotation.x = Math.PI / 2;
    body.add(c);
    const l = cyl(0.035, 0.02, M.lens(), x, TUB_TOP - 0.12, 0.73, 10);
    l.rotation.x = Math.PI / 2;
    body.add(l);
  }
  // cámara alta adicional (Lunojod 2 la añadió a la altura de los ojos de una persona)
  body.add(rod([0, TUB_TOP, 0.55], [0, TUB_TOP + 0.22, 0.6], 0.015, alu));
  body.add(box(0.1, 0.08, 0.12, black, 0, TUB_TOP + 0.26, 0.62));
  // retrorreflector láser (francés)
  const refl = box(0.22, 0.12, 0.04, gold, 0.38, TUB_TOP - 0.18, 0.56);
  refl.rotation.y = 0.5;
  body.add(refl);
  // novena rueda odométrica trasera
  body.add(rod([0, TUB_BOTTOM, -0.65], [0, 0.12, -0.82], 0.012, alu));
  const odo = wheel(0.08, 0.03, tire, alu, undefined, 10);
  odo.position.set(0, 0.08, -0.84);
  body.add(odo);
  group.add(body);

  /* ---------- Ruedas (4 por lado) ---------- */
  const sideWheels = (side: 1 | -1, name: string) => {
    const p = piece(name);
    for (const z of WZ) {
      const w = wheel(WR, 0.13, tire, tubDark, spokes, 12);
      w.position.set(side * WX, WR, z);
      p.add(w);
      // motor/caja de la rueda + brazo de suspensión
      p.add(strut([side * 0.5, TUB_BOTTOM - 0.04, z], [side * (WX - 0.07), WR, z], 0.045, tubDark));
    }
    // larguero lateral
    p.add(box(0.05, 0.05, 1.35, tubDark, side * 0.5, TUB_BOTTOM - 0.04, 0));
    return p;
  };
  const wheelsLeft = sideWheels(-1, 'wheelsLeft');
  const wheelsRight = sideWheels(1, 'wheelsRight');
  group.add(wheelsLeft, wheelsRight);

  /* ---------- Tapa-panel solar abatible (bisagra trasera) ---------- */
  const lid = piece('solarLid');
  lid.position.set(0, TUB_TOP + 0.04, -0.7);
  const lidInner = new Group();
  lidInner.rotation.x = -2.45; // abierta ~140°, inclinada hacia atrás con las células mirando al cielo
  // el disco cuelga desde la bisagra hacia +Z (cuando está cerrado cubre la bañera)
  const disc = mesh(new CylinderGeometry(0.62, 0.62, 0.04, 16), tubMat, 0, 0, 0.7);
  disc.scale.z = 1.0;
  lidInner.add(disc);
  const cells = mesh(new CylinderGeometry(0.57, 0.57, 0.012, 16), M.solar(), 0, -0.026, 0.7);

  lidInner.add(cells);
  const cellLines = mesh(new CylinderGeometry(0.575, 0.575, 0.014, 16, 1), mat('#6f8fd0', { wireframe: true }), 0, -0.036, 0.7);

  lidInner.add(cellLines);
  // bisagra
  const hinge = cyl(0.035, 0.5, alu, 0, 0, 0, 8);
  hinge.rotation.z = Math.PI / 2;
  lidInner.add(hinge);
  lid.add(lidInner);
  // puntal de apertura
  lid.add(rod([0.3, -0.04, 0.15], [0.3, 0.24, -0.3], 0.012, alu));
  lid.add(rod([-0.3, -0.04, 0.15], [-0.3, 0.24, -0.3], 0.012, alu));
  group.add(lid);

  /* ---------- Antenas: cónica, helicoidal y direccional ---------- */
  const antennas = piece('antennas');
  // antena cónica de baja ganancia (izquierda delantera)
  antennas.add(rod([-0.42, TUB_TOP, 0.42], [-0.48, TUB_TOP + 0.5, 0.46], 0.012, alu));
  const cone = new Mesh(new ConeGeometry(0.07, 0.2, 10), alu);
  cone.position.set(-0.48, TUB_TOP + 0.6, 0.46);
  antennas.add(cone);
  // antena helicoidal (derecha delantera)
  const helixPts: Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2 * 5;
    helixPts.push(new Vector3(Math.cos(t) * 0.04, (i / 40) * 0.32, Math.sin(t) * 0.04));
  }
  const helix = new Mesh(new TubeGeometry(new CatmullRomCurve3(helixPts), 60, 0.007, 3), alu);
  helix.position.set(0.46, TUB_TOP + 0.22, 0.4);
  antennas.add(helix);
  antennas.add(rod([0.44, TUB_TOP, 0.4], [0.46, TUB_TOP + 0.22, 0.4], 0.012, alu));
  // antena direccional de alta ganancia (mástil + bocina orientable)
  antennas.add(rod([0.3, TUB_TOP, -0.1], [0.32, TUB_TOP + 0.38, -0.1], 0.016, alu));
  const horn = new Mesh(new ConeGeometry(0.1, 0.32, 10, 1, true), radiator);
  horn.position.set(0.32, TUB_TOP + 0.45, -0.05);
  horn.rotation.set(-1.1, 0, -0.4);
  antennas.add(horn);
  antennas.add(strut([-0.3, TUB_TOP, 0.2], [-0.3, TUB_TOP + 0.08, 0.2], 0.04, gold));
  group.add(antennas);

  const thrusters = [
    thruster(-0.35, 0.22, 0.45),
    thruster(0.35, 0.22, 0.45),
    thruster(-0.35, 0.22, -0.45),
    thruster(0.35, 0.22, -0.45),
  ];
  for (const t of thrusters) body.add(t);

  const pieces = [body, wheelsLeft, wheelsRight, lid, antennas];
  // centra el conjunto en Z (la tapa abierta sobresale hacia atrás)
  for (const p of pieces) p.position.z += 0.48;

  return { group, pieces, thrusters };
}
