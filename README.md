# GalaxyCore – Misión Robots

Experiencia web educativa del equipo **GalaxyCore** (NASA Space Apps): el astronauta conoce
3 robots que exploraron la Luna y Marte — **LRV (Apollo 15)**, **Spirit** y
**Opportunity (MER-B)** —, los reconstruye en 3D, recorre su ruta en un mapa y supera sus
pruebas hasta obtener su certificado.

Stack: **Vite 8 + TypeScript (vanilla) + three.js 0.186 + GSAP 3.15**.

> **¿No programas?** Lee [`GUIA-SERVIDOR-LOCAL.md`](GUIA-SERVIDOR-LOCAL.md) o simplemente haz
> doble clic en **`INICIAR.bat`** (requiere tener instalado Node.js LTS).

## Cómo correr

Requisito: **Node.js 20 o superior** (https://nodejs.org, versión LTS).

```bash
cd galaxycore-mision
npm install          # solo la primera vez (descarga node_modules)
npx vite --port 5173 # desarrollo → http://localhost:5173
npm run build        # tsc --noEmit + vite build → dist/
npx vite preview     # sirve dist/
```

**Ver sin instalar nada:** la carpeta `dist/` ya viene compilada. Súbela a cualquier hosting
estático (GitHub Pages, Netlify, Vercel) o sírvela con un servidor local; no funciona
abriendo `index.html` con doble clic (los navegadores bloquean módulos JS en `file://`).

## Flujo de pantallas (router)

`src/router.ts` es una máquina de estados simple. Estados: `home`, `name`, `podiums`,
`launch`, `puzzle`, `map`, `final`, `certificate`. La tabla `TRANSITIONS` (exportada) es la
fuente de verdad del diagrama:

| Origen | Destino | Disparador |
|---|---|---|
| (carga) | home | Carga normal |
| (carga) | puzzle | `?debug=robot=<id>` |
| home | name | INICIAR MISIÓN sin nombre guardado, o "Cambiar nombre" |
| home | podiums | INICIAR MISIÓN con nombre guardado |
| name | podiums | EMPEZAR / Enter (nombre no vacío) |
| podiums | launch | Click en un podio |
| podiums | final | Automático: 12/12 niveles y nivel extra pendiente |
| podiums | certificate | "Ver certificado" (nivel extra ya hecho) |
| launch | puzzle | Fin de la animación de despegue |
| puzzle | map | Robot ensamblado (o "Saltar") + aterrizaje |
| map | podiums | "Volver a los robots" |
| final | certificate | "Ver certificado" tras verificar |
| certificate | podiums | "Volver a los robots" |
| certificate | home | "Volver a empezar" (borra progreso) |
| cualquiera | home | Menú → Reiniciar (con confirmación) |

Cambio de pantalla: la anterior limpia su lógica (`unmount`) y sale con `.screen--leave`;
la nueva entra con `.screen--enter`. Las pantallas 3D se cargan con `import()` dinámico
(three.js solo se descarga al llegar a los podios).

## Estructura

```
index.html                 lang="es", carga /src/main.ts
src/
  main.ts                  arranque: CSS, header, store, flags de debug, router
  router.ts                estados, transiciones, fades, prefers-reduced-motion (MOTION/dur)
  store.ts                 estado + localStorage (clave "galaxycore-mision:v1")
  types.ts                 tipos compartidos (contrato)
  data/robots.ts           datos de robots, rutas, niveles y piedras        (diseñador)
  styles/*.css             estilos (index.css importa el resto)             (diseñador)
  three/
    stage.ts               ÚNICO WebGLRenderer; loop pausable; resize; disposers
    effects.ts             partículas (llamas, polvo), destellos, estrellas 3D
    robots/*.ts            modelos procedurales low-poly → buildRobot(id)    (diseñador)
  ui/
    header.ts              header persistente + menú (Guardar, Reiniciar, % misión)
    modal.ts               modal, confirmación, toast, esc()
    starfield.ts           fondo de estrellas 2D (parallax + titileo)
    mapArt.ts / stoneArt.ts arte SVG de mapas y piedras                    (diseñador)
  screens/
    home.ts                terminal retro con máquina de escribir
    name.ts                ingreso del nombre
    world.ts               mundo 3D compartido (4 podios, luces, robots, pose "héroe")
    podiums.ts             podios + capa DOM (hover, foco, giro)
    launch.ts              despegue en medio arco (CatmullRom + GSAP)
    puzzle.ts              minijuego de ensamblaje 3D + aterrizaje
    map.ts                 mapa SVG, ruta animada (máscara + dashoffset), niveles
    final.ts               nivel extra: clasificar 8 piedras
    certificate.ts         certificado imprimible
```

## Progreso, guardado y puntaje

- Se carga de `localStorage` al iniciar. **Guardar** (menú) guarda y muestra "Progreso
  guardado"; además hay **autoguardado** al poner el nombre, armar un robot, completar un
  nivel y terminar el nivel extra. **Reiniciar** pide confirmación, borra y vuelve a Home.
- **% de misión** = niveles completados / 16. El nivel extra no suma al %, se muestra aparte
  en el menú (bloqueado / desbloqueado / completado).
- **Puntaje** = 50 pts por nivel (máx. 800) + 25 pts por piedra bien clasificada (máx. 200)
  → máximo 1000.
- Con nombre guardado, INICIAR MISIÓN lleva directo a los podios (se ofrece "Cambiar nombre").
- Si un robot ya se armó antes, el puzzle muestra el botón **Saltar**.

## Nivel extra: aspecto de las piedras

Para no delatar la respuesta, el aspecto lunar/marciano de cada piedra **no** depende del
robot correcto: alterna según su posición en la bandeja barajada (siempre 4 y 4), con un
seed propio por piedra. El jugador debe razonar con el texto.

## Depuración

| URL | Efecto |
|---|---|
| `?debug=allcomplete` | Marca los 3 robots armados y los 12 niveles (en memoria). Al ir a los podios se abre el nivel extra. |
| `?debug=robot=lrv` | Arranca directo en el puzzle de ese robot (`lrv`, `spirit`, `opportunity`). |
| `?debug=allcomplete,robot=spirit` | Ambos a la vez. |

Nota: con `allcomplete` el estado no se guarda por sí solo, pero cualquier acción con
autoguardado posterior sí lo persistirá. Usa Menú → Reiniciar para limpiar.

## Rendimiento y accesibilidad

- Un solo `WebGLRenderer` (`setPixelRatio(min(dpr,2))`, antialias). El loop se pausa en
  pantallas sin 3D (home, nombre, mapa, certificado).
- Cada pantalla libera lo que crea (partículas, silueta fantasma, suelo, sprites); el mundo
  de podios se libera al volver a Home.
- `prefers-reduced-motion`: las duraciones se reducen al 25 % y el typewriter se muestra
  completo.
- Podios y niveles accesibles con teclado (Tab + Enter); piedras: Enter cicla entre podios.
