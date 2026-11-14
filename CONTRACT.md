# Contrato entre Diseñador y Desarrollador

Stack: Vite 8 + TypeScript (vanilla) + three@0.186 + gsap@3.15. Node portátil: `.tools/node-v24.22.0-win-x64` (añadir al PATH).
Tipos compartidos: `src/types.ts` (NO modificar sin avisar al orquestador).

## Propiedad de archivos
**Diseñador**
- `src/styles/*.css` (importados desde `src/styles/index.css`)
- `src/three/robots/{lrv,lunokhod2,spirit,opportunity}.ts` + `src/three/robots/index.ts` → `export function buildRobot(id: RobotId): RobotModel`
- `src/ui/mapArt.ts` → `export function mapBackgroundSVG(body: Body, robot: RobotId): string` (markup interno de SVG para viewBox `0 0 1000 600`: terreno, cráteres, relieve; SIN ruta ni niveles)
- `src/ui/stoneArt.ts` → `export function stoneSVG(body: Body, seed: number): string` (SVG completo de una piedra ~140x110)
- `src/data/robots.ts` → `export const ROBOTS: Record<RobotId, RobotData>`, `export const ROBOT_ORDER: RobotId[]`, `export const STONES: StoneFact[]` (8, 2 por robot; texto basado en las tarjetas)
- `public/assets/space-apps-logo.svg` (placeholder genérico circular con texto "NASA Space Apps"; el equipo lo reemplazará por el oficial)

**Desarrollador**
- `index.html`, `src/main.ts`, `src/router.ts`, `src/store.ts`
- `src/ui/header.ts`, `src/ui/modal.ts`, `src/ui/starfield.ts`
- `src/three/stage.ts`, `src/three/effects.ts` (llamas, partículas)
- `src/screens/*.ts`

## Convenciones de modelos 3D
- Origen en la base (y=0), mira hacia +Z, cabe en una caja ~2 x 1.4 x 2 unidades.
- Low-poly, `MeshStandardMaterial` con `flatShading: true`, sin texturas. < 3k triángulos por robot.
- 4 o 5 `pieces` (ej. chasis, ruedas izq, ruedas der, mástil/cámara, panel solar/antena). Cada piece es un `Group` hijo directo de `group`.
- `thrusters`: 2–4 `Object3D` vacíos bajo el chasis.

## Clases CSS que el diseñador debe estilizar (el desarrollador las usa)
- Layout: `.app`, `.screen`, `.screen--enter`, `.screen--leave`, `.bg-stars` (fondo de estrellas CSS para pantallas 2D)
- Header: `.header`, `.header__logo`, `.header__team`, `.header__menu-btn` (3 líneas), `.menu`, `.menu--open`, `.menu__item`, `.menu__progress` (+ `.menu__bar` > `span` con width %)
- Home: `.home`, `.terminal`, `.terminal__line`, `.terminal__cursor`, `.crt` (scanlines + glow)
- Botones: `.btn`, `.btn--primary`, `.btn:disabled`, `.btn--ghost`, `.btn--back`
- Nombre: `.name-screen`, `.name-screen__title`, `.input`
- Podios: `.podiums`, `.podium`, `.podium--hover`, `.podium--done`, `.podium__label`, `.podium__name`, `.podium__discover`, `.podium--celebrate` (parpadeo blanco), `.podiums--compact` (80% pegados arriba)
- Mapa: `.map-screen`, `.map`, `.map__route`, `.map__route--moon` (negra punteada), `.map__route--mars` (blanca punteada), `.level-node`, `.level-node--done`, `.map__title`
- Modal/tarjetas: `.modal-backdrop`, `.modal`, `.modal__title`, `.modal__actions`, `.info-card`
- Final: `.stones`, `.stone`, `.stone--dragging`, `.stone--placed`, `.stone--correct`, `.stone--wrong`, `.dropzone--over`, `.certificate`
- Utilidad: `.toast`, `.hud-hint`
- Tokens en `:root`: `--bg`, `--fg`, `--accent` (violeta NovaCore), `--retro-green`, `--moon`, `--mars`, `--glow`. Fuentes Google: VT323 (terminal) y Orbitron/Space Grotesk (UI).
