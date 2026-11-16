/** Utilidades de three.js comunes a los minijuegos 3D. */

/** Lista de recursos de GPU propios (geometrías, materiales) para liberarlos juntos. */
export class Bin {
  private items: { dispose(): void }[] = [];
  add<T extends { dispose(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }
  empty(): void {
    this.items.forEach((i) => i.dispose());
    this.items = [];
  }
}

/** Pseudoaleatorio determinista en [0, 1) a partir de dos números (para repartir detalles). */
export const hash = (x: number, z: number): number => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
