/**
 * HOME: portada 3D de GalaxyCore con Bip, el robot guía.
 *
 * Decisiones basadas en evidencia (detalle en docs/fundamentacion-diseno.md):
 * - UN FOCO (Talalay 2024, P01 / UI02): el botón JUGAR es la acción principal y dice cuál es
 *   la siguiente misión. Los "3 pasos" solo se muestran a quien empieza. "No soy…" pasó a Ajustes.
 * - ANIMACIÓN FUNCIONAL (UI03 / Hinten 2025, P11): nada se mueve en bucle infinito; los planetas
 *   solo se mueven cuando el niño los toca. Modo "Menos movimiento" en Ajustes.
 * - CURIOSIDAD (P02, P03, P04): al tocar un planeta, Bip primero pregunta ("¿Adivina?") y luego
 *   explica. El error se responde con "¡Casi!" + explicación (feedback D05, sin humillar).
 * - MODELO Y COMPARACIÓN (Cheng & Yeh 2026, P13; Jin 2025, P14): "Comparar tamaños" coloca la
 *   Tierra, Marte y la Luna a su tamaño real relativo en 3D, y abre gravedad y saltos.
 * - COLECCIÓN (RITEC 2024, G07): los 4 robots son un álbum. Los que faltan aparecen en silueta
 *   "Por armar" y se desbloquean aprendiendo, nunca al azar ni pagando (OCDE 2026, SAF01).
 * - PERSONALIZACIÓN OPCIONAL (RITEC 2024, D03/V04): el niño elige el color de Bip; no da ventajas.
 * - COLOR SEMÁNTICO (Zheng 2025, C03): Tierra = azul, Marte = naranja, Luna = plata en etiquetas,
 *   colección y comparador. El dorado (Baniani 2022, C02) se usa solo como acento de logros.
 *   El progreso nunca depende solo del color: estrellas + "2/4".
 * - VOZ (CONCORTV 2024, F01): todo mensaje se puede escuchar; opción de voz automática.
 * - EDAD (base §5.7, hipótesis): textos cortos por defecto; "Más datos (9–12 años)" añade detalle.
 * - SEGURIDAD (OCDE 2026, CyberSafeKids 2026): sin compras, chat ni anuncios; panel para adultos.
 */
import gsap from 'gsap';
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { ScreenFactory } from '../router';
import { reducedMotion } from '../router';
import type { RobotId } from '../types';
import { ALL_ROBOTS, getState, levelsDone, TOTAL_LEVELS } from '../store';
import { ROBOTS } from '../data/robots';
import { esc, openModal } from '../ui/modal';
import { createMoonMaps, fbm, makeNoise, rng } from '../ui/moonTexture';

type Planet = 'moon' | 'mars' | 'earth';

/** Colores semánticos: el mismo color significa lo mismo en toda la portada. */
const PLANET_COLOR: Record<Planet, string> = { earth: '#3b82f6', mars: '#f97316', moon: '#cbd5e1' };

interface Guess {
  q: string;
  options: string[];
  correct: number;
  why: string;
  /** Detalle extra solo en modo "Más datos (9–12 años)". */
  more?: string;
}

const PLANET_INFO: Record<Planet, { label: string; km: string; guess: Guess }> = {
  moon: {
    label: 'La Luna',
    km: '3.474 km',
    guess: {
      q: '¿Hay viento en la Luna?',
      options: ['Sí, mucho', 'No, nada'],
      correct: 1,
      why: 'No hay aire ni viento. Por eso las huellas de los astronautas siguen ahí. Aquí trabajaron el LRV y el Lunojod 2.',
      more: 'Está a unos 384.000 km de la Tierra y su gravedad es 6 veces más débil.',
    },
  },
  mars: {
    label: 'Marte',
    km: '6.779 km',
    guess: {
      q: '¿Por qué Marte se ve rojo?',
      options: ['Por su suelo oxidado', 'Porque es muy caliente'],
      correct: 0,
      why: 'Su suelo tiene óxido de hierro, como un clavo oxidado. ¡Y es muy frío! Aquí exploraron Spirit y Opportunity.',
      more: 'Un día en Marte dura casi 24 horas y 40 minutos, y se llama "sol".',
    },
  },
  earth: {
    label: 'La Tierra',
    km: '12.742 km',
    guess: {
      q: '¿Qué es más grande: la Tierra o Marte?',
      options: ['La Tierra', 'Marte'],
      correct: 0,
      why: 'La Tierra mide casi el doble que Marte. Toca «Comparar tamaños» para verlo.',
      more: 'Desde la Tierra, los equipos de la misión enviaban órdenes a los robots.',
    },
  },
};

/** Preguntas de predicción generales (botón ¿Adivina?). */
const GUESSES: Guess[] = [
  {
    q: '¿Dónde saltarías más alto?',
    options: ['En la Tierra', 'En la Luna'],
    correct: 1,
    why: 'En la Luna la gravedad es 6 veces más débil. ¡Darías saltos gigantes!',
    more: 'Si saltas 1 metro en la Tierra, en la Luna saltarías unos 6 metros.',
  },
  {
    q: '¿Cómo se cargaban Spirit y Opportunity?',
    options: ['Con gasolina', 'Con la luz del Sol'],
    correct: 1,
    why: 'Usaban paneles solares. ¡A veces el viento de Marte les limpiaba el polvo!',
  },
  {
    q: '¿Las huellas en la Luna siguen ahí?',
    options: ['Sí, siguen', 'No, se borraron'],
    correct: 0,
    why: 'En la Luna no hay viento ni lluvia, así que las huellas duran muchísimo tiempo.',
  },
  {
    q: '¿Quién manejaba el Lunojod 2?',
    options: ['Un equipo desde la Tierra', 'Un astronauta sentado'],
    correct: 0,
    why: 'Lo manejaban a control remoto desde la Tierra. ¡Las órdenes tardaban en llegar!',
    more: 'La señal de radio tarda más de 1 segundo en ir de la Tierra a la Luna.',
  },
  {
    q: '¿Cuánto iba a durar Opportunity en Marte?',
    options: ['90 días', '15 años'],
    correct: 0,
    why: 'Lo planearon para unos 90 días… ¡y trabajó casi 15 años!',
  },
];

/** Ficha de colección de cada robot (texto corto). */
const ROBOT_FACT: Record<RobotId, string> = {
  lrv: 'El LRV fue el auto de los astronautas del Apolo 15, en 1971. ¡Lo manejaban sentados en la Luna!',
  lunokhod2: 'El Lunojod 2 era un robot manejado a distancia desde la Tierra. Recorrió unos 40 km en la Luna.',
  spirit: 'Spirit llegó a Marte en 2004 y buscó pistas de agua antigua en las rocas.',
  opportunity: 'Opportunity iba a durar 90 días… ¡y exploró Marte durante casi 15 años!',
};

/** Colores de Bip que el niño puede elegir (personalización opcional, sin ventajas). */
const BIP_COLORS: { id: string; label: string; a: string; b: string; c: string }[] = [
  { id: 'lila', label: 'Lila', a: '#f5f3ff', b: '#c4b5fd', c: '#7c3aed' },
  { id: 'celeste', label: 'Celeste', a: '#ecfeff', b: '#67e8f9', c: '#0e7490' },
  { id: 'verde', label: 'Verde', a: '#f0fdf4', b: '#86efac', c: '#15803d' },
  { id: 'naranja', label: 'Naranja', a: '#fff7ed', b: '#fdba74', c: '#c2410c' },
  { id: 'amarillo', label: 'Amarillo', a: '#fefce8', b: '#fde047', c: '#a16207' },
];

// ---------------------------------------------------------------- preferencias
const pref = (key: string, def: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === 'on';
  } catch {
    return def;
  }
};
const savePref = (key: string, v: boolean | string) => {
  try {
    localStorage.setItem(key, typeof v === 'string' ? v : v ? 'on' : 'off');
  } catch {
    /* sin almacenamiento */
  }
};
const readStr = (key: string, def: string): string => {
  try {
    return localStorage.getItem(key) ?? def;
  } catch {
    return def;
  }
};
let soundOn = pref('novacore:ui-sound', true);
let autoVoice = pref('novacore:auto-voice', false);
let calm = pref('novacore:calm', false);
let moreData = pref('novacore:more-data', false);
let bipColor = readStr('novacore:bip-color', 'lila');

// ---------------------------------------------------------------- estilos
const CSS = `
.kid {
  position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden; isolation: isolate;
  background: radial-gradient(ellipse 80% 70% at 75% 45%, #1a1140 0%, #05040d 65%);
}
.kid__space { position: absolute; inset: 0; z-index: 0; }
.kid__space canvas { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 1.2s ease; touch-action: pan-y; }
.kid__space canvas.on { opacity: 1; }
.kid__shade { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, rgba(5,4,13,.9) 0%, rgba(5,4,13,.6) 40%, rgba(5,4,13,0) 60%); }
.kid__labels { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.kid__label {
  position: absolute; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 8px;
  border: 2px solid var(--pc); border-radius: 999px; transform: translate(-50%, -100%);
  font-family: var(--font-ui); font-size: 13px; font-weight: 700; letter-spacing: .05em; color: #fff;
  background: rgba(20,14,44,.88); box-shadow: 0 6px 20px rgba(0,0,0,.5); white-space: nowrap;
  transition: transform .2s var(--ease-spring), background .2s;
}
.kid__label i { width: 12px; height: 12px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 8px var(--pc); }
.kid__label small { font-family: var(--font-mono); font-size: 12px; font-weight: 400; opacity: .85; }
.kid__label.hover { transform: translate(-50%, -100%) scale(1.12); }
.kid__label svg { width: 18px; height: 18px; animation: kid-tap 1.4s ease-in-out 4; }
@keyframes kid-tap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px) scale(.92); } }

.kid__content {
  position: relative; z-index: 3; display: flex; flex-direction: column; justify-content: center;
  gap: clamp(12px, 2vh, 18px); width: min(660px, 100%); min-height: 100vh; min-height: 100dvh;
  padding: calc(var(--header-h) + 4px) var(--gutter) 22px clamp(20px, 5vw, 80px);
  pointer-events: none;
}
.kid__content > * { pointer-events: auto; }
.kid__title { margin: 0; font-family: var(--font-ui); line-height: 1; }
.kid__title-main {
  display: block; white-space: nowrap; font-size: clamp(32px, min(4.4vw, 8vh), 72px); font-weight: 900; letter-spacing: .01em;
  background: linear-gradient(180deg, #fff 0%, #e9d5ff 45%, #a855f7 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 24px rgba(168,85,247,.45));
}
.kid__title-main span { display: inline-block; background: inherit; -webkit-background-clip: text; background-clip: text; color: transparent; }
.kid__title-sub { display: inline-block; margin-top: 8px; padding: 6px 14px; border-radius: 999px; font-size: clamp(12px, 1.3vw, 15px); font-weight: 700; letter-spacing: .2em; color: #1a0b33; background: linear-gradient(90deg, #67e8f9, #c084fc); }

/* ---- Bip + globo ---- */
.kid__guide { display: flex; align-items: flex-end; gap: 14px; }
.bip { --bip-a: #f5f3ff; --bip-b: #c4b5fd; --bip-c: #7c3aed;
  position: relative; flex: none; width: clamp(92px, 10vw, 124px); cursor: pointer; border: 0; padding: 0; background: none; animation: bip-float 3.2s ease-in-out 3; }
.bip:focus-visible { outline: 3px solid var(--holo); outline-offset: 6px; border-radius: 20px; }
.bip svg { display: block; width: 100%; height: auto; overflow: visible; }
@keyframes bip-float { 50% { transform: translateY(-8px); } }
.bip__eye { transform-box: fill-box; transform-origin: center; animation: bip-blink 5s infinite; }
@keyframes bip-blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.1); } }
.bip__arm { transform-box: fill-box; transform-origin: 20% 90%; }
.bip.wave .bip__arm { animation: bip-wave .5s ease-in-out 3; }
@keyframes bip-wave { 50% { transform: rotate(-35deg); } }
.bip.jump { animation: bip-jump .5s var(--ease-spring); }
@keyframes bip-jump { 40% { transform: translateY(-22px) rotate(-6deg); } }

.bubble {
  position: relative; flex: 1; min-height: 96px; margin-bottom: 26px; padding: 14px 18px 30px;
  border: 2px solid #c084fc; border-radius: 22px 22px 22px 6px;
  font-size: clamp(15px, 1.35vw, 18px); line-height: 1.45; color: #1a0b33;
  background: #fbf7ff; box-shadow: 0 10px 30px rgba(0,0,0,.4), 0 0 0 6px rgba(192,132,252,.15);
}
.bubble::before { content: ''; position: absolute; left: -12px; bottom: 10px; border: 10px solid transparent; border-right: 14px solid #c084fc; border-left: 0; }
.bubble::after { content: ''; position: absolute; left: -8px; bottom: 12px; border: 8px solid transparent; border-right: 11px solid #fbf7ff; border-left: 0; }
.bubble__name { display: block; margin-bottom: 2px; font-family: var(--font-ui); font-size: 11px; letter-spacing: .14em; color: #7c3aed; }
.bubble__more { display: block; margin-top: 6px; font-size: .88em; color: #5b21b6; }
.bubble__tools { position: absolute; right: 10px; bottom: -18px; display: flex; gap: 6px; }
.bubble__btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 2px solid #c084fc; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 13px; font-weight: 700; color: #4c1d95; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.3);
  transition: transform .15s var(--ease-spring), background .2s;
}
.bubble__btn:hover, .bubble__btn:focus-visible { outline: none; transform: translateY(-2px) scale(1.04); background: #f3e8ff; }
.bubble__btn svg { width: 16px; height: 16px; }
.bubble__btn.speaking { background: #ede9fe; }

/* respuestas de "¿Adivina?" (icono + texto, no solo color) */
.guess { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.guess[hidden] { display: none; }
.bubble:has(.guess:not([hidden])) { padding-bottom: 36px; }
.guess button { flex: 1 1 130px; padding: 10px 12px; border: 2px solid #7c3aed; border-radius: 14px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 800; color: #4c1d95; background: #ede9fe; box-shadow: 0 3px 0 #7c3aed; transition: transform .12s; }
.guess button:hover, .guess button:focus-visible { outline: none; transform: translateY(-2px); background: #ddd6fe; }
.guess button.ok { color: #14532d; border-color: #16a34a; background: #bbf7d0; box-shadow: 0 3px 0 #16a34a; }
.guess button.ok::before { content: '✓ '; }
.guess button.no { opacity: .55; }
.guess button:disabled { cursor: default; transform: none; }

/* ---- acción principal ---- */
.kid__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.kid__play {
  position: relative; display: inline-flex; align-items: center; gap: 14px; overflow: hidden; cursor: pointer;
  padding: 16px 36px 16px 26px; border: 0; border-radius: 999px;
  font-family: var(--font-ui); font-size: clamp(20px, 2vw, 26px); font-weight: 900; letter-spacing: .12em; color: #fff;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 8px 0 #0f6b32, 0 14px 30px rgba(34,197,94,.45);
  transition: transform .12s, box-shadow .12s, filter .2s;
  animation: kid-pulse 2.2s ease-in-out 3;
}
.kid__play:hover, .kid__play:focus-visible { outline: none; filter: brightness(1.1); }
.kid__play:active { transform: translateY(6px); box-shadow: 0 2px 0 #0f6b32, 0 6px 14px rgba(34,197,94,.4); }
.kid__play svg { width: 28px; height: 28px; flex: none; }
@keyframes kid-pulse { 50% { box-shadow: 0 8px 0 #0f6b32, 0 14px 44px rgba(34,197,94,.8); } }
.kid__next { display: flex; flex-direction: column; gap: 2px; font-size: 14px; line-height: 1.3; color: var(--fg); }
.kid__next small { font-size: 11px; font-weight: 800; letter-spacing: .14em; color: #86efac; }
.kid__next b { font-size: 16px; }

/* ---- barra secundaria ---- */
.kid__tools { display: flex; flex-wrap: wrap; gap: 8px; }
.kid__tool {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 2px solid rgba(255,255,255,.14); border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 14px; font-weight: 700; color: var(--fg); background: rgba(20,14,44,.7); transition: border-color .2s, background .2s, transform .15s;
}
.kid__tool:hover, .kid__tool:focus-visible { outline: none; border-color: #c084fc; background: rgba(46,26,90,.9); transform: translateY(-2px); }
.kid__tool[aria-pressed="true"] { border-color: #67e8f9; background: rgba(14,116,144,.45); }
.kid__tool svg { width: 18px; height: 18px; flex: none; }
.kid__tool[hidden] { display: none; }

/* ---- cómo se juega (solo al empezar) ---- */
.kid__steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0; padding: 0; list-style: none; max-width: 580px; }
.kid__step { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; line-height: 1.25; color: var(--fg); background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
.kid__step i { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; font-style: normal; }
.kid__step i svg { width: 22px; height: 22px; }
.kid__step small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: var(--muted); }

/* ---- colección de robots ---- */
.kid__album h2 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 12px; font-weight: 700; letter-spacing: .16em; color: var(--muted); }
.kid__album h2 b { color: #fde68a; font-weight: 700; }
.kid__robots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; max-width: 600px; }
.kid__robot {
  position: relative; width: 100%; padding: 10px 8px 10px; border: 2px solid rgba(255,255,255,.1); border-radius: 18px; cursor: pointer;
  text-align: center; font: inherit; color: var(--fg); background: rgba(14,10,32,.78);
  transition: transform .25s var(--ease-spring), border-color .2s, background .2s;
}
.kid__robot:hover, .kid__robot:focus-visible { outline: none; transform: translateY(-5px); border-color: var(--b); background: rgba(30,20,64,.92); }
.kid__robot svg { width: 56px; height: 40px; margin: 0 auto 4px; display: block; }
.kid__robot--locked { border-style: dashed; }
.kid__robot--locked svg { filter: grayscale(1) brightness(.45); }
.kid__robot-name { display: block; font-family: var(--font-ui); font-size: 11px; font-weight: 700; line-height: 1.25; min-height: 2.5em; }
.kid__robot-place { display: inline-flex; align-items: center; gap: 4px; margin: 4px 0; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: .1em; color: #1a0b33; background: var(--b); }
.kid__robot-stars { display: block; font-size: 15px; letter-spacing: 1px; color: rgba(255,255,255,.18); }
.kid__robot-stars b { color: #ffd166; font-weight: 400; }
.kid__robot-stars small { margin-left: 4px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0; color: var(--muted); }
.kid__robot-badge { position: absolute; top: -9px; right: -6px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #04140b; background: var(--ok); transform: rotate(6deg); }
.kid__robot-badge--lock { color: #e2e8f0; background: #334155; transform: none; }

/* ---- ajustes ---- */
.kid__pop {
  position: absolute; z-index: 8; width: min(320px, calc(100vw - 28px)); padding: 14px; border: 2px solid #c084fc; border-radius: 20px;
  color: var(--fg); background: #140e2c; box-shadow: 0 18px 40px rgba(0,0,0,.6);
}
.kid__pop[hidden] { display: none; }
.kid__pop h3 { margin: 0 0 6px; font-family: var(--font-ui); font-size: 13px; letter-spacing: .14em; color: #c084fc; }
.kid__pop > button { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; margin-top: 8px; padding: 10px 12px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; cursor: pointer; font: inherit; font-size: 14px; font-weight: 700; text-align: left; color: var(--fg); background: rgba(255,255,255,.05); }
.kid__pop > button:hover, .kid__pop > button:focus-visible { outline: none; border-color: #c084fc; }
.kid__pop > button span { flex: none; min-width: 36px; padding: 2px 8px; border-radius: 999px; text-align: center; font-size: 12px; color: #1a0b33; background: #94a3b8; }
.kid__pop > button span.on { background: #86efac; }
.kid__pop .sw { display: flex; gap: 8px; margin-top: 8px; }
.kid__pop .sw button { width: 34px; height: 34px; border: 3px solid transparent; border-radius: 50%; cursor: pointer; background: var(--sw); }
.kid__pop .sw button[aria-pressed="true"] { border-color: #fff; box-shadow: 0 0 0 2px #c084fc; }
.kid__pop .lbl { display: block; margin-top: 12px; font-size: 13px; font-weight: 700; color: var(--muted); }

/* comparador (Museo) */
.kid-cmp { display: grid; gap: 16px; }
.kid-cmp h4 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 13px; letter-spacing: .08em; color: var(--accent-3); }
.kid-cmp__row { display: grid; grid-template-columns: 64px 1fr 116px; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 14px; }
.kid-cmp__bar { height: 16px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.kid-cmp__bar s { display: block; height: 100%; border-radius: 999px; transform-origin: left; animation: kid-grow .9s var(--ease-out) both; }
@keyframes kid-grow { from { transform: scaleX(0); } }
.kid-cmp__val { text-align: right; font-family: var(--font-mono); font-size: 17px; white-space: nowrap; }
.kid-cmp p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted); }
.kid-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.kid-list li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.kid-list b { flex: 1; }
.kid-list .st { color: rgba(255,255,255,.25); letter-spacing: 2px; }
.kid-list .st i { font-style: normal; color: #fde047; }
.kid-total { margin: 0 0 14px; padding: 12px; border-radius: 14px; text-align: center; font-family: var(--font-ui); font-size: 15px; background: rgba(253,224,71,.12); color: #fde68a; }

.kid__meteor { position: absolute; z-index: 1; width: 140px; height: 2px; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.9)); transform: rotate(-28deg); opacity: 0; animation: kid-meteor 1.1s ease-out forwards; }
@keyframes kid-meteor { 0% { opacity: 0; translate: 0 0; } 15% { opacity: 1; } 100% { opacity: 0; translate: -420px 220px; } }

/* menos movimiento */
.kid--calm .bip, .kid--calm .bip__arm, .kid--calm .kid__play, .kid--calm .kid__label svg, .kid--calm .kid-cmp__bar s { animation: none !important; }
.kid--calm .kid__robot:hover, .kid--calm .kid__tool:hover { transform: none; }

@media (max-width: 900px) {
  .kid__space { bottom: auto; height: 100vh; height: 100svh; }
  .kid__label.cmp { flex-direction: column; gap: 0; padding: 4px 10px; font-size: 11px; line-height: 1.15; }
  .kid__label.cmp i { display: none; }
  .kid__label.cmp small { font-size: 10px; }
  .kid__shade { background: linear-gradient(180deg, rgba(5,4,13,.1) 0%, rgba(5,4,13,.8) 40%, rgba(5,4,13,.96) 100%); }
  .kid__content { width: 100%; justify-content: flex-end; gap: 14px; padding-left: var(--gutter); padding-top: 32vh; }
  .kid__title-main { font-size: clamp(30px, 9vw, 44px); }
  .kid__robots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kid__steps { grid-template-columns: 1fr; }
  .bubble { font-size: 15px; }
  .bubble__btn { padding: 6px 10px; font-size: 12px; }
  .kid__tool { padding: 8px 12px; font-size: 13px; }
}
@media (max-height: 760px) and (min-width: 901px) {
  .kid__title-sub { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .bip, .bip__eye, .bip__arm, .kid__play, .kid__label svg, .kid__meteor, .kid-cmp__bar s { animation: none !important; }
}
`;

function injectStyles(): void {
  if (document.getElementById('kid-styles')) return;
  const s = document.createElement('style');
  s.id = 'kid-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- sonidos
let audio: AudioContext | null = null;
function tone(f1: number, f2: number, d: number, type: OscillatorType = 'sine', vol = 0.06, delay = 0): void {
  if (!soundOn) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audio ??= new AC();
    const t = audio.currentTime + delay;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  } catch {
    /* sin audio */
  }
}
const sfx = {
  pop: () => tone(600, 1000, 0.1, 'sine', 0.05),
  bip: () => {
    tone(880, 1320, 0.08, 'square', 0.025);
    tone(1320, 990, 0.1, 'square', 0.025, 0.09);
  },
  ok: () => {
    tone(988, 988, 0.08, 'square', 0.03);
    tone(1319, 1319, 0.22, 'square', 0.03, 0.08);
  },
  soft: () => tone(330, 260, 0.18, 'triangle', 0.05),
  whoosh: () => tone(300, 900, 0.35, 'triangle', 0.05),
  go: () => [523, 659, 784].forEach((f, i) => tone(f, f * 1.01, 0.2, 'triangle', 0.07, i * 0.08)),
};

// ---------------------------------------------------------------- texturas
function createEarthTexture(): HTMLCanvasElement {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const noise = makeNoise(3);
  const warp = makeNoise(17);
  const clouds = makeNoise(9);
  const detail = makeNoise(29);
  for (let y = 0; y < h; y++) {
    const lat = Math.abs(y / h - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 4;
      const v = (y / h) * 2;
      const wu = u + (fbm(warp, u * 0.8, v * 0.8, 3, 3.2) - 0.5) * 1.2;
      const land = fbm(noise, wu, v, 6, 4);
      const det = fbm(detail, u * 6, v * 6, 3, 24);
      const cl = fbm(clouds, u * 2.2 + 5, v * 2.6, 6, 8.8);
      let r: number;
      let g: number;
      let b: number;
      if (land > 0.52) {
        const hgt = Math.min(1, (land - 0.52) * 6);
        const dry = Math.max(0, Math.min(1, (0.35 - Math.abs(lat - 0.35)) * 3 + (det - 0.5)));
        r = 38 + hgt * 60 + dry * 120 + (det - 0.5) * 30;
        g = 92 + hgt * 30 + dry * 60 + (det - 0.5) * 30;
        b = 42 + hgt * 20 + dry * 30;
      } else {
        const depth = Math.min(1, (0.52 - land) * 6);
        r = 18 + (1 - depth) * 30;
        g = 58 + (1 - depth) * 70;
        b = 120 + (1 - depth) * 60;
      }
      if (lat > 0.82 + (det - 0.5) * 0.08) [r, g, b] = [236, 242, 248];
      const cw = Math.max(0, Math.min(1, (cl - 0.54) * 4.5)) * 0.9;
      const i = (y * w + x) * 4;
      img.data[i] = r + (250 - r) * cw;
      img.data[i + 1] = g + (252 - g) * cw;
      img.data[i + 2] = b + (255 - b) * cw;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function createMarsMaps(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const m = createMoonMaps(1024, 23);
  const ctx = m.color.getContext('2d')!;
  const { width: w, height: h } = m.color;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#e0703a';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(200,80,30,0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  for (const [y0, y1] of [
    [0, h * 0.09],
    [h, h * 0.93],
  ]) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(250,245,240,0.95)');
    g.addColorStop(1, 'rgba(250,245,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
  }
  return m;
}

function glowTexture(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

// ---------------------------------------------------------------- escena 3D tocable
interface Space {
  /** Coloca los 3 cuerpos a su tamaño real relativo (modelo) o vuelve a la vista normal. */
  compare(on: boolean): void;
  destroy(): void;
}

/** Diámetros relativos a la Tierra (datos reales). */
const REAL_SIZE: Record<Planet, number> = { earth: 1, mars: 6779 / 12742, moon: 3474 / 12742 };

function createSpace(host: HTMLElement, labelsHost: HTMLElement, onPick: (p: Planet) => void): Space | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0, 7);
  const sun = new DirectionalLight(0xfff4e6, 3.2);
  sun.position.set(-6, 1.8, 2.4);
  scene.add(sun);
  scene.add(new AmbientLight(0x8a96ff, 0.07));

  // estrellas (menos que antes: fondo tranquilo)
  const rand = rng(42);
  const N = 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = rand() * Math.PI * 2;
    const p = Math.acos(2 * rand() - 1);
    const r = 60 + rand() * 40;
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = -Math.abs(r * Math.cos(p));
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(pos, 3));
  const starMat = new PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0.75 });
  const stars = new Points(starGeo, starMat);
  scene.add(stars);

  const textures: CanvasTexture[] = [];
  const geos: BufferGeometry[] = [];
  const mats: { dispose(): void }[] = [starMat];

  const makePlanet = (maps: { color: HTMLCanvasElement; bump?: HTMLCanvasElement }, bumpScale: number, glow: string, glowSize: number) => {
    const map = new CanvasTexture(maps.color);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.push(map);
    let bumpMap: CanvasTexture | null = null;
    if (maps.bump) {
      bumpMap = new CanvasTexture(maps.bump);
      textures.push(bumpMap);
    }
    const geo = new SphereGeometry(1, 96, 72);
    geos.push(geo);
    const mat = new MeshStandardMaterial({ map, bumpMap, bumpScale, roughness: 1, metalness: 0 });
    mats.push(mat);
    const mesh = new Mesh(geo, mat);
    const group = new Group();
    group.add(mesh);
    const gt = new CanvasTexture(glowTexture(glow));
    textures.push(gt);
    const sm = new SpriteMaterial({ map: gt, blending: AdditiveBlending, depthWrite: false, transparent: true });
    mats.push(sm);
    const halo = new Sprite(sm);
    halo.scale.set(glowSize, glowSize, 1);
    halo.position.z = -0.5;
    group.add(halo);
    scene.add(group);
    return { group, mesh, mat, halo };
  };

  const moon = makePlanet(createMoonMaps(1024), 2.4, 'rgba(190,170,255,0.35)', 3.1);
  moon.mesh.rotation.set(0.12, -0.6, 0.08);
  const mars = makePlanet(createMarsMaps(), 2, 'rgba(255,140,90,0.45)', 3.1);
  const earth = makePlanet({ color: createEarthTexture() }, 0, 'rgba(96,165,250,0.6)', 2.6);
  earth.mat.roughness = 0.75;

  const planets: { id: Planet; p: typeof moon; base: number; spin: number }[] = [
    { id: 'moon', p: moon, base: 1, spin: 0.035 },
    { id: 'mars', p: mars, base: 1, spin: 0.06 },
    { id: 'earth', p: earth, base: 1, spin: 0.08 },
  ];

  // etiquetas tocables con el color de cada cuerpo (color semántico)
  const HAND = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v8.5c0 4-2.6 7.5-7 7.5-3 0-4.6-1.4-6-3.6L3 13.3a1.6 1.6 0 0 1 2.6-1.8L9 15z"/></svg>';
  const labels = new Map<Planet, HTMLElement>();
  let comparing = false;
  const paintLabel = (id: Planet) => {
    const el = labels.get(id)!;
    el.classList.toggle('cmp', comparing);
    el.innerHTML = comparing
      ? `<i></i>${PLANET_INFO[id].label} <small>${PLANET_INFO[id].km}</small>`
      : `${HAND}<i></i>${PLANET_INFO[id].label}`;
  };
  planets.forEach(({ id }) => {
    const el = document.createElement('div');
    el.className = 'kid__label';
    el.style.setProperty('--pc', PLANET_COLOR[id]);
    labelsHost.appendChild(el);
    labels.set(id, el);
    paintLabel(id);
  });

  // 3 lugares: 0 = grande (protagonista), 1 = mediano, 2 = pequeño
  const slotOf: Record<Planet, number> = { moon: 0, mars: 1, earth: 2 };
  let slots: { pos: Vector3; scale: number }[] = [];
  let cmpSlots: Record<Planet, { pos: Vector3; scale: number }> | null = null;
  const halfW = () => Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
  const isWide = () => (host.clientWidth || window.innerWidth) / (host.clientHeight || window.innerHeight) > 1.05;

  const computeSlots = () => {
    const hw = halfW();
    slots = isWide()
      ? [
          { pos: new Vector3(hw * 0.52, -0.15, 0), scale: 1.6 },
          { pos: new Vector3(hw * 0.1, -1.35, -1.2), scale: 0.42 },
          { pos: new Vector3(hw * 0.06, 1.45, -3), scale: 0.3 },
        ]
      : [
          { pos: new Vector3(hw * 0.4, 1.05, 0), scale: 0.6 },
          { pos: new Vector3(-hw * 0.5, 0.75, -1.2), scale: 0.32 },
          { pos: new Vector3(-hw * 0.6, 2.0, -3), scale: 0.24 },
        ];
    // vista "comparar": los tres en fila, de mayor a menor, a escala real entre ellos
    const order: Planet[] = ['earth', 'mars', 'moon'];
    const sum = order.reduce((a, id) => a + REAL_SIZE[id], 0) * 2;
    const gap = isWide() ? 0.35 : 0.14;
    const [x0, x1, y] = isWide() ? [hw * 0.12, hw * 0.86, -0.1] : [-hw * 0.92, hw * 0.92, 1.15];
    const s = Math.min(isWide() ? 1.25 : 0.62, (x1 - x0 - gap * 2) / sum);
    let x = x0;
    cmpSlots = {} as Record<Planet, { pos: Vector3; scale: number }>;
    for (const id of order) {
      const r = REAL_SIZE[id] * s;
      cmpSlots[id] = { pos: new Vector3(x + r, y, 0), scale: r };
      x += r * 2 + gap;
    }
  };

  const target = (id: Planet) => (comparing && cmpSlots ? cmpSlots[id] : slots[slotOf[id]]);

  const layout = () => {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeSlots();
    planets.forEach((pl) => {
      const sl = target(pl.id);
      gsap.killTweensOf([pl.p.group.position, pl.p.group.scale]);
      pl.p.group.position.copy(sl.pos);
      pl.base = sl.scale;
      pl.p.group.scale.setScalar(pl.base);
    });
  };

  const moveTo = (pl: (typeof planets)[number], lift: number) => {
    const sl = target(pl.id);
    pl.base = sl.scale;
    const g = pl.p.group;
    const d = reducedMotion || calm ? 0.35 : 1.3;
    gsap.killTweensOf([g.position, g.scale]);
    const mid = g.position.clone().lerp(sl.pos, 0.5);
    mid.y += lift;
    gsap.timeline()
      .to(g.position, { x: mid.x, y: mid.y, z: Math.max(g.position.z, sl.pos.z) + 0.5, duration: d / 2, ease: 'power2.in' })
      .to(g.position, { x: sl.pos.x, y: sl.pos.y, z: sl.pos.z, duration: d / 2, ease: 'power2.out' });
    gsap.to(g.scale, { x: sl.scale, y: sl.scale, z: sl.scale, duration: d, ease: 'power3.inOut' });
  };

  /** Lleva el planeta tocado al lugar grande; el que estaba allí ocupa su lugar. */
  const feature = (id: Planet) => {
    const from = slotOf[id];
    if (from === 0) return;
    const other = planets.find((pl) => slotOf[pl.id] === 0)!;
    slotOf[other.id] = from;
    slotOf[id] = 0;
    moveTo(planets.find((p) => p.id === id)!, 0.6);
    moveTo(other, -0.4);
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  // interacción: hover y toque
  const ray = new Raycaster();
  const ndc = new Vector2();
  let hovered: Planet | null = null;
  const pickAt = (cx: number, cy: number): Planet | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(planets.map((p) => p.p.mesh), false);
    if (!hits.length) return null;
    return planets.find((p) => p.p.mesh === hits[0].object)?.id ?? null;
  };
  let mx = 0;
  let my = 0;
  const setHover = (id: Planet | null) => {
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = id ? 'pointer' : 'default';
    planets.forEach((pl) => {
      const on = pl.id === id;
      if (!gsap.isTweening(pl.p.group.position)) {
        const s = pl.base * (on ? 1.06 : 1);
        gsap.to(pl.p.group.scale, { x: s, y: s, z: s, duration: 0.35, ease: 'back.out(2)' });
      }
      labels.get(pl.id)!.classList.toggle('hover', on);
    });
    if (id) sfx.pop();
  };
  const onMove = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
    if (e.target !== canvas) {
      if (hovered) setHover(null);
      return;
    }
    setHover(pickAt(e.clientX, e.clientY));
  };
  const onClick = (e: MouseEvent) => {
    const id = pickAt(e.clientX, e.clientY);
    if (!id) return;
    const pl = planets.find((p) => p.id === id)!;
    gsap.to(pl.p.mesh.rotation, { y: pl.p.mesh.rotation.y + Math.PI * 2, duration: reducedMotion || calm ? 0.3 : 1.6, ease: 'power3.inOut' });
    if (comparing || slotOf[id] === 0) {
      const s = pl.base;
      gsap.fromTo(pl.p.group.scale, { x: s * 1.08, y: s * 1.08, z: s * 1.08 }, { x: s, y: s, z: s, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    } else {
      feature(id);
    }
    sfx.whoosh();
    onPick(id);
  };
  window.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);

  // bucle
  let raf = 0;
  let last = performance.now();
  const v = new Vector3();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reducedMotion && !calm) {
      // giro lento: solo la rotación propia, sin parpadeos ni brillos que compitan
      planets.forEach((pl) => (pl.p.mesh.rotation.y += dt * pl.spin));
      camera.position.x += (mx * 0.4 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.28 - camera.position.y) * 0.04;
    } else {
      camera.position.x += (0 - camera.position.x) * 0.1;
      camera.position.y += (0 - camera.position.y) * 0.1;
    }
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    const rect = canvas.getBoundingClientRect();
    planets.forEach((pl) => {
      v.copy(pl.p.group.position);
      v.y += pl.p.group.scale.y * 1.08;
      v.project(camera);
      const el = labels.get(pl.id)!;
      const x = (v.x * 0.5 + 0.5) * rect.width;
      const y = (-v.y * 0.5 + 0.5) * rect.height;
      const visible = v.z < 1 && x > 0 && x < rect.width && y > 96 && y < rect.height - 10;
      el.style.display = visible ? '' : 'none';
      const half = el.offsetWidth / 2 + 8;
      el.style.left = `${Math.max(half, Math.min(rect.width - half, x))}px`;
      el.style.top = `${y}px`;
    });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => canvas.classList.add('on'));

  return {
    compare(on: boolean) {
      if (on === comparing) return;
      comparing = on;
      planets.forEach((pl, i) => {
        moveTo(pl, i % 2 ? 0.5 : -0.5);
        paintLabel(pl.id);
      });
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      planets.forEach((pl) => gsap.killTweensOf([pl.p.mesh.rotation, pl.p.group.scale, pl.p.group.position]));
      geos.forEach((g) => g.dispose());
      starGeo.dispose();
      mats.forEach((m) => m.dispose());
      textures.forEach((tx) => tx.dispose());
      labels.forEach((el) => el.remove());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

// ---------------------------------------------------------------- Bip (robot guía original)
// Los colores salen de variables CSS para que el niño pueda pintar a Bip.
const BIP_SVG = `
<svg viewBox="0 0 140 170" aria-hidden="true">
  <defs>
    <linearGradient id="bipBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--bip-a)"/><stop offset="1" style="stop-color:var(--bip-b)"/></linearGradient>
    <linearGradient id="bipVisor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#0b0820"/></linearGradient>
  </defs>
  <ellipse cx="70" cy="164" rx="34" ry="5" fill="rgba(0,0,0,.35)"/>
  <line x1="70" y1="22" x2="70" y2="8" style="stroke:var(--bip-b)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="70" cy="7" r="6" fill="#f472b6"/>
  <g><path d="M26 104 Q10 112 14 130" style="stroke:var(--bip-b)" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="14" cy="132" r="7" style="fill:var(--bip-a)"/></g>
  <g class="bip__arm"><path d="M114 104 Q132 92 130 74" style="stroke:var(--bip-b)" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="130" cy="70" r="8" style="fill:var(--bip-a)"/></g>
  <rect x="34" y="92" width="72" height="58" rx="22" fill="url(#bipBody)" style="stroke:var(--bip-c)" stroke-width="3"/>
  <circle cx="70" cy="120" r="11" fill="#67e8f9" stroke="#0e7490" stroke-width="3"/>
  <circle cx="66" cy="116" r="3" fill="#fff"/>
  <rect x="18" y="22" width="104" height="76" rx="34" fill="url(#bipBody)" style="stroke:var(--bip-c)" stroke-width="3"/>
  <rect x="30" y="36" width="80" height="48" rx="22" fill="url(#bipVisor)"/>
  <g class="bip__eyes">
    <ellipse class="bip__eye" cx="54" cy="60" rx="8" ry="10" fill="#67e8f9"/>
    <ellipse class="bip__eye" cx="86" cy="60" rx="8" ry="10" fill="#67e8f9"/>
    <circle cx="57" cy="56" r="3" fill="#fff"/><circle cx="89" cy="56" r="3" fill="#fff"/>
  </g>
  <path d="M60 74 Q70 81 80 74" stroke="#67e8f9" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="36" cy="70" rx="6" ry="4" fill="#f472b6" opacity=".55"/>
  <ellipse cx="104" cy="70" rx="6" ry="4" fill="#f472b6" opacity=".55"/>
</svg>`;

/** Icono de rover genérico (original), coloreado con el acento del robot. */
const roverIcon = (color: string) => `
<svg viewBox="0 0 56 40" aria-hidden="true">
  <rect x="12" y="10" width="32" height="14" rx="4" fill="${color}" opacity=".9"/>
  <rect x="18" y="4" width="3" height="8" fill="#c9ccd3"/><circle cx="19.5" cy="4" r="3.5" fill="#c9ccd3"/>
  <rect x="8" y="22" width="40" height="3" rx="1.5" fill="#8b8fa3"/>
  <circle cx="13" cy="31" r="6" fill="#2b2d33" stroke="#c9ccd3" stroke-width="2"/>
  <circle cx="28" cy="31" r="6" fill="#2b2d33" stroke="#c9ccd3" stroke-width="2"/>
  <circle cx="43" cy="31" r="6" fill="#2b2d33" stroke="#c9ccd3" stroke-width="2"/>
</svg>`;

const ICONS = {
  build: '<svg viewBox="0 0 24 24" fill="none" stroke="#1a0b33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="#1a0b33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
  medal: '<svg viewBox="0 0 24 24" fill="none" stroke="#1a0b33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M8.5 9.5 6 2h4l2 4 2-4h4l-2.5 7.5"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="14" r="4"/><circle cx="15" cy="15" r="2.6"/><circle cx="20.5" cy="16" r="1.4"/><path d="M2 21h20"/></svg>',
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M12 16V4M8 8l4-4 4 4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

/** Siguiente misión concreta (una meta clara, base §5.6 "Misiones"). */
function nextMission(): { title: string; hint: string } {
  const s = getState();
  for (const id of ALL_ROBOTS) {
    const r = ROBOTS[id];
    if (!s.assembled[id]) return { title: `Arma el ${r.name.split(' ·')[0]}`, hint: 'Une sus piezas como un rompecabezas' };
    const lvl = s.levels[id].findIndex((x) => !x);
    if (lvl >= 0) return { title: `Nivel ${lvl + 1} del ${r.name.split(' ·')[0]}`, hint: `Te faltan ${4 - s.levels[id].filter(Boolean).length} niveles en su mapa` };
  }
  return { title: '¡Gana tu certificado!', hint: 'Completaste todos los robots' };
}

// ---------------------------------------------------------------- pantalla
const home: ScreenFactory = ({ root, go }) => {
  injectStyles();
  const state = getState();
  const name = state.name;
  const done = levelsDone();
  const builtCount = ALL_ROBOTS.filter((id) => state.assembled[id]).length;
  const isNew = done === 0 && builtCount === 0;
  const mission = nextMission();

  const robotCards = ALL_ROBOTS.map((id) => {
    const r = ROBOTS[id];
    const n = state.levels[id].filter(Boolean).length;
    const moonBody = r.body === 'moon';
    const built = state.assembled[id];
    const place = moonBody ? 'LUNA' : 'MARTE';
    const placeColor = moonBody ? PLANET_COLOR.moon : '#fdba74';
    const badge = n === 4 ? '<span class="kid__robot-badge">¡Completo!</span>' : built ? '' : '<span class="kid__robot-badge kid__robot-badge--lock">Por armar</span>';
    return `
      <li>
        <button type="button" class="kid__robot${built ? '' : ' kid__robot--locked'}" data-robot="${id}" style="--b:${placeColor}"
          aria-label="${esc(r.name)}, ${place.toLowerCase()}, ${built ? `${n} de 4 niveles` : 'por armar'}">
          ${badge}${roverIcon(r.accent)}
          <span class="kid__robot-name">${esc(r.name)}</span>
          <span class="kid__robot-place">${place}</span>
          <span class="kid__robot-stars" aria-hidden="true">${'<b>★</b>'.repeat(n)}${'★'.repeat(4 - n)}<small>${n}/4</small></span>
        </button>
      </li>`;
  }).join('');

  root.innerHTML = `
    <section class="kid">
      <div class="kid__space"></div>
      <div class="kid__shade" aria-hidden="true"></div>
      <div class="kid__labels" aria-hidden="true"></div>
      <div class="kid__content">
        <h1 class="kid__title">
          <span class="kid__title-main" aria-label="GalaxyCore">${'GalaxyCore'.split('').map((c) => `<span>${c}</span>`).join('')}</span>
          <span class="kid__title-sub">MISIÓN ROBOTS</span>
        </h1>
        <div class="kid__guide">
          <button type="button" class="bip wave" data-bip aria-label="Bip, tu robot guía. Tócalo para una pregunta">${BIP_SVG}</button>
          <div class="bubble" role="status" aria-live="polite">
            <span class="bubble__name">BIP · TU ROBOT GUÍA</span>
            <span data-say></span>
            <span class="bubble__more" data-more hidden></span>
            <div class="guess" data-guess hidden></div>
            <div class="bubble__tools">
              <button type="button" class="bubble__btn" data-voice>${ICONS.speak}Escuchar</button>
              <button type="button" class="bubble__btn" data-ask>${ICONS.bulb}¿Adivina?</button>
            </div>
          </div>
        </div>
        <div class="kid__actions">
          <button type="button" class="kid__play" data-start>${ICONS.play}¡JUGAR!</button>
          <span class="kid__next"><small>${isNew ? 'TU PRIMERA MISIÓN' : 'SIGUIENTE MISIÓN'}</small><b>${esc(mission.title)}</b>${esc(mission.hint)}</span>
        </div>
        <div class="kid__tools">
          <button type="button" class="kid__tool" data-compare aria-pressed="false">${ICONS.ruler}<span>Comparar tamaños</span></button>
          <button type="button" class="kid__tool" data-gravity hidden>${ICONS.jump}Gravedad y saltos</button>
          <button type="button" class="kid__tool" data-awards>${ICONS.trophy}Mis logros</button>
          <button type="button" class="kid__tool" data-settings aria-expanded="false">${ICONS.gear}Ajustes</button>
        </div>
        ${
          isNew
            ? `<ol class="kid__steps" aria-label="Cómo se juega">
          <li class="kid__step"><i style="background:#67e8f9">${ICONS.build}</i><span><small>PASO 1</small>Arma el robot</span></li>
          <li class="kid__step"><i style="background:#fcd34d">${ICONS.map}</i><span><small>PASO 2</small>Viaja por su mapa</span></li>
          <li class="kid__step"><i style="background:#86efac">${ICONS.medal}</i><span><small>PASO 3</small>Gana tu certificado</span></li>
        </ol>`
            : ''
        }
        <div class="kid__album">
          <h2>TU COLECCIÓN DE ROBOTS · <b>${builtCount}/4</b></h2>
          <ul class="kid__robots">${robotCards}</ul>
        </div>
      </div>
      <div class="kid__pop" data-pop hidden role="dialog" aria-label="Ajustes">
        <h3>AJUSTES</h3>
        <button type="button" data-opt="sound">Sonidos <span></span></button>
        <button type="button" data-opt="voice">Bip habla en voz alta <span></span></button>
        <button type="button" data-opt="calm">Menos movimiento <span></span></button>
        <button type="button" data-opt="more">Más datos (9–12 años) <span></span></button>
        <span class="lbl">Color de Bip</span>
        <div class="sw">${BIP_COLORS.map((c) => `<button type="button" data-color="${c.id}" style="--sw:${c.b}" aria-label="Bip ${c.label}"></button>`).join('')}</div>
        <button type="button" data-rename>${name ? `No soy ${esc(name)}` : 'Escribir mi nombre'} <span>›</span></button>
        <button type="button" data-adults>Para padres y docentes <span>›</span></button>
      </div>
    </section>`;

  const section = root.querySelector<HTMLElement>('.kid')!;
  const spaceHost = root.querySelector<HTMLElement>('.kid__space')!;
  const labelsHost = root.querySelector<HTMLElement>('.kid__labels')!;
  const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
  const moreEl = root.querySelector<HTMLElement>('[data-more]')!;
  const guessEl = root.querySelector<HTMLElement>('[data-guess]')!;
  const bip = root.querySelector<HTMLButtonElement>('[data-bip]')!;
  const voiceBtn = root.querySelector<HTMLButtonElement>('[data-voice]')!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-start]')!;
  const compareBtn = root.querySelector<HTMLButtonElement>('[data-compare]')!;
  const gravityBtn = root.querySelector<HTMLButtonElement>('[data-gravity]')!;
  const settingsBtn = root.querySelector<HTMLButtonElement>('[data-settings]')!;
  const pop = root.querySelector<HTMLElement>('[data-pop]')!;
  let alive = true;

  const applyCalm = () => section.classList.toggle('kid--calm', calm);
  const applyColor = () => {
    const c = BIP_COLORS.find((x) => x.id === bipColor) ?? BIP_COLORS[0];
    bip.style.setProperty('--bip-a', c.a);
    bip.style.setProperty('--bip-b', c.b);
    bip.style.setProperty('--bip-c', c.c);
    pop.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === c.id)));
  };
  applyCalm();
  applyColor();

  // ---------- Bip habla ----------
  let typeTimer = 0;
  let current = '';
  const synth: SpeechSynthesis | undefined = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
  if (!synth) voiceBtn.hidden = true;
  synth?.getVoices();
  let interacted = false;
  const markInteracted = () => (interacted = true);
  window.addEventListener('pointerdown', markInteracted, { once: true });
  window.addEventListener('keydown', markInteracted, { once: true });

  const speak = () => {
    if (!synth || !current) return;
    synth.cancel();
    const text = moreEl.hidden ? current : `${current} ${moreEl.textContent}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const voices = synth.getVoices();
    const v = voices.find((x) => x.lang.startsWith('es') && /mx|us|419|pe/i.test(x.lang)) ?? voices.find((x) => x.lang.startsWith('es'));
    if (v) u.voice = v;
    u.pitch = 1.3;
    u.onstart = () => voiceBtn.classList.add('speaking');
    u.onend = u.onerror = () => voiceBtn.classList.remove('speaking');
    synth.speak(u);
  };

  /** Bip dice un texto. `extra` solo se muestra en modo "Más datos". */
  const say = (text: string, opts: { keepGuess?: boolean; extra?: string } = {}) => {
    current = text;
    if (!opts.keepGuess) guessEl.hidden = true;
    moreEl.hidden = !(moreData && opts.extra);
    moreEl.textContent = moreData && opts.extra ? opts.extra : '';
    window.clearTimeout(typeTimer);
    synth?.cancel();
    voiceBtn.classList.remove('speaking');
    if (autoVoice && interacted) window.setTimeout(() => current === text && speak(), 60);
    if (reducedMotion || calm) {
      sayEl.textContent = text;
      return;
    }
    let i = 0;
    const step = () => {
      if (!alive) return;
      sayEl.textContent = text.slice(0, ++i);
      if (i % 4 === 0) tone(700 + Math.random() * 300, 600, 0.03, 'square', 0.01);
      if (i < text.length) typeTimer = window.setTimeout(step, 18);
    };
    step();
  };

  const jump = () => {
    if (calm) return;
    bip.classList.remove('jump', 'wave');
    void bip.offsetWidth;
    bip.classList.add('jump');
  };
  bip.addEventListener('animationend', (e) => {
    if ((e as AnimationEvent).animationName === 'bip-jump') bip.classList.remove('jump');
  });

  /** Pregunta de predicción: primero el niño elige, luego Bip explica. */
  const ask = (g: Guess, after?: () => void) => {
    say(`¿Adivina? ${g.q}`, { keepGuess: true });
    guessEl.innerHTML = '';
    guessEl.hidden = false;
    g.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt;
      b.addEventListener('click', () => {
        const ok = i === g.correct;
        guessEl.querySelectorAll('button').forEach((x, j) => {
          x.disabled = true;
          x.classList.add(j === g.correct ? 'ok' : 'no');
        });
        if (ok) {
          sfx.ok();
          jump();
        } else sfx.soft();
        say(`${ok ? '¡Bien pensado!' : '¡Casi! Era la otra.'} ${g.why}`, { keepGuess: true, extra: g.more });
        after?.();
      });
      guessEl.appendChild(b);
    });
  };

  let guessIdx = Math.floor(Math.random() * GUESSES.length);
  const askNext = () => ask(GUESSES[guessIdx++ % GUESSES.length]);

  const greeting = name
    ? `¡Hola, ${name}! Toca ¡JUGAR! para tu siguiente misión, o toca un planeta para adivinar algo.`
    : '¡Hola! Soy Bip. Vamos a armar robots que exploraron la Luna y Marte. ¡Toca JUGAR!';
  const greetTimer = window.setTimeout(() => say(greeting), reducedMotion || calm ? 0 : 900);

  bip.addEventListener('click', () => {
    jump();
    sfx.bip();
    askNext();
  });
  root.querySelector('[data-ask]')!.addEventListener('click', () => {
    sfx.pop();
    askNext();
  });
  voiceBtn.addEventListener('click', () => {
    sfx.pop();
    speak();
  });

  // ojos que siguen el puntero
  const eyes = bip.querySelector<SVGGElement>('.bip__eyes')!;
  const onEyes = (e: PointerEvent) => {
    const r = bip.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height * 0.35);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 300);
    eyes.setAttribute('transform', `translate(${((dx / d) * 6 * k).toFixed(1)} ${((dy / d) * 4 * k).toFixed(1)})`);
  };
  window.addEventListener('pointermove', onEyes);

  // ---------- escena 3D ----------
  let space: Space | null = null;
  const asked = new Set<Planet>();
  const spaceTimer = window.setTimeout(() => {
    if (!alive) return;
    space = createSpace(spaceHost, labelsHost, (p) => {
      jump();
      const info = PLANET_INFO[p];
      // la primera vez que toca un planeta: pregunta; después: la explicación directa
      if (!asked.has(p)) {
        asked.add(p);
        ask(info.guess);
      } else {
        say(`${info.label}: ${info.guess.why}`, { extra: info.guess.more });
      }
    });
    if (!space) compareBtn.hidden = true;
  }, 60);

  // ---------- comparar tamaños (modelo a escala) ----------
  let comparing = false;
  const openGravity = () => {
    const wrap = document.createElement('div');
    wrap.className = 'kid-cmp';
    const bar = (label: string, value: number, max: number, color: string, txt: string) =>
      `<div class="kid-cmp__row"><span>${label}</span><span class="kid-cmp__bar"><s style="width:${(value / max) * 100}%;background:${color}"></s></span><span class="kid-cmp__val">${txt}</span></div>`;
    const { earth: E, mars: M, moon: L } = PLANET_COLOR;
    wrap.innerHTML = `
      <div><h4>FUERZA DE GRAVEDAD</h4>
        ${bar('Tierra', 9.8, 9.8, E, '9,8 m/s²')}${bar('Marte', 3.7, 9.8, M, '3,7 m/s²')}${bar('Luna', 1.6, 9.8, L, '1,6 m/s²')}</div>
      <div><h4>SI SALTAS 1 METRO EN LA TIERRA…</h4>
        ${bar('Tierra', 1, 6, E, '1 m')}${bar('Marte', 2.6, 6, M, '≈ 2,6 m')}${bar('Luna', 6, 6, L, '≈ 6 m')}</div>
      <p>¿Ves la relación? Menos gravedad, saltos más altos. ¿En cuál pesaría menos tu mochila?</p>`;
    openModal({ title: 'Gravedad y saltos', body: wrap, actions: [{ label: 'Cerrar', variant: 'ghost' }] });
  };
  compareBtn.addEventListener('click', () => {
    comparing = !comparing;
    compareBtn.setAttribute('aria-pressed', String(comparing));
    compareBtn.querySelector('span')!.textContent = comparing ? 'Volver' : 'Comparar tamaños';
    gravityBtn.hidden = !comparing;
    space?.compare(comparing);
    sfx.whoosh();
    if (comparing) {
      ask(
        {
          q: 'Así de grandes son de verdad. ¿Cuántas Lunas cabrían a lo ancho de la Tierra?',
          options: ['Casi 4', 'Casi 20'],
          correct: 0,
          why: 'La Tierra es unas 3,7 veces más ancha que la Luna. Y Marte es casi la mitad de la Tierra.',
          more: 'Diámetros: Tierra 12.742 km, Marte 6.779 km y Luna 3.474 km.',
        },
      );
    } else say('¡Listo! Toca un planeta para traerlo al frente.');
  });
  gravityBtn.addEventListener('click', () => {
    sfx.pop();
    openGravity();
  });

  // ---------- logros ----------
  root.querySelector('[data-awards]')!.addEventListener('click', () => {
    sfx.ok();
    const s = getState();
    const total = levelsDone();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="kid-total">${total} de ${TOTAL_LEVELS} estrellas · ${s.score} puntos</p>
      <ul class="kid-list">${ALL_ROBOTS.map((id) => {
        const n = s.levels[id].filter(Boolean).length;
        const tag = n === 4 ? ' · ¡Completo!' : s.assembled[id] ? '' : ' · Por armar';
        return `<li><b>${esc(ROBOTS[id].name)}${tag}</b><span class="st">${'<i>★</i>'.repeat(n)}${'★'.repeat(4 - n)}</span></li>`;
      }).join('')}</ul>
      <p style="margin:14px 0 0;color:var(--muted);text-align:center">${
        total === TOTAL_LEVELS ? '¡Ya puedes ganar tu certificado de astronauta!' : `Te faltan ${TOTAL_LEVELS - total} estrellas para tu certificado. ¡Sin apuro!`
      }</p>`;
    openModal({ title: 'Mis logros', body: wrap, actions: [{ label: 'Cerrar', variant: 'ghost' }] });
  });

  // ---------- ajustes ----------
  const OPTS: Record<string, { get: () => boolean; set: (v: boolean) => void }> = {
    sound: { get: () => soundOn, set: (v) => ((soundOn = v), savePref('novacore:ui-sound', v)) },
    voice: { get: () => autoVoice, set: (v) => ((autoVoice = v), savePref('novacore:auto-voice', v), v && speak()) },
    calm: { get: () => calm, set: (v) => ((calm = v), savePref('novacore:calm', v), applyCalm()) },
    more: { get: () => moreData, set: (v) => ((moreData = v), savePref('novacore:more-data', v)) },
  };
  const paintOpts = () =>
    pop.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) => {
      const on = OPTS[b.dataset.opt!].get();
      const tag = b.querySelector('span')!;
      tag.textContent = on ? 'SÍ' : 'NO';
      tag.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  paintOpts();
  if (!synth) pop.querySelector<HTMLElement>('[data-opt="voice"]')!.hidden = true;
  pop.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) =>
    b.addEventListener('click', () => {
      const o = OPTS[b.dataset.opt!];
      o.set(!o.get());
      paintOpts();
      sfx.pop();
      if (b.dataset.opt === 'more') say(moreData ? '¡Modo científico! Ahora te daré más datos.' : 'Listo, mensajes cortos.');
    }),
  );
  pop.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((b) =>
    b.addEventListener('click', () => {
      bipColor = b.dataset.color!;
      savePref('novacore:bip-color', bipColor);
      applyColor();
      jump();
      sfx.bip();
      say(`¡Me encanta mi nuevo color ${BIP_COLORS.find((c) => c.id === bipColor)!.label.toLowerCase()}!`);
    }),
  );
  const placePop = () => {
    const r = settingsBtn.getBoundingClientRect();
    const sr = section.getBoundingClientRect();
    const w = pop.offsetWidth;
    pop.style.left = `${Math.max(14, Math.min(r.left - sr.left, sr.width - w - 14))}px`;
    const below = r.bottom - sr.top + 10;
    pop.style.top = below + pop.offsetHeight < sr.height - 10 ? `${below}px` : `${Math.max(10, r.top - sr.top - pop.offsetHeight - 10)}px`;
  };
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden = !pop.hidden;
    settingsBtn.setAttribute('aria-expanded', String(!pop.hidden));
    if (!pop.hidden) placePop();
    sfx.pop();
  });
  const onDocClick = (e: MouseEvent) => {
    if (!pop.hidden && !pop.contains(e.target as Node) && !settingsBtn.contains(e.target as Node)) {
      pop.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('click', onDocClick);
  pop.querySelector('[data-rename]')!.addEventListener('click', () => go('name'));
  pop.querySelector('[data-adults]')!.addEventListener('click', () => {
    pop.hidden = true;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p style="margin:0 0 10px">GalaxyCore está pensado para niños de 6 a 12 años:</p>
      <ul style="margin:0;padding-left:18px;line-height:1.6;color:var(--muted)">
        <li>Sin anuncios, compras, cajas sorpresa ni chat.</li>
        <li>No pide cuenta ni correo: solo guarda el nombre y el progreso en este dispositivo.</li>
        <li>No hay rachas ni cuentas regresivas: se puede pausar y volver cuando quieran.</li>
        <li>Todos los mensajes de Bip se pueden escuchar en voz alta.</li>
        <li>Ajustes: "Menos movimiento" y "Más datos (9–12 años)".</li>
        <li>Recomendamos jugar acompañados y conversar: ¿qué robot te gustó? ¿por qué saltarías más en la Luna?</li>
      </ul>`;
    openModal({ title: 'Para padres y docentes', body: wrap, actions: [{ label: 'Cerrar', variant: 'ghost' }] });
  });

  // ---------- entrada (una sola vez, sin bucles) ----------
  const tl = gsap.timeline();
  if (!reducedMotion && !calm) {
    tl.from('.kid__title-main span', { opacity: 0, y: 30, duration: 0.5, stagger: 0.03, ease: 'back.out(1.8)', clearProps: 'transform,opacity' })
      .from('.bip', { opacity: 0, x: -60, duration: 0.5, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }, '-=0.1')
      .from('.bubble', { opacity: 0, scale: 0.85, transformOrigin: '0% 100%', duration: 0.35, ease: 'back.out(2)', clearProps: 'transform,opacity' }, '-=0.3')
      .from(['.kid__actions', '.kid__tools', '.kid__step', '.kid__album'], { opacity: 0, y: 16, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.2');
  }

  // ---------- JUGAR ----------
  const start = () => {
    sfx.go();
    window.setTimeout(() => go(getState().name ? 'podiums' : 'name'), reducedMotion ? 0 : 280);
  };
  playBtn.addEventListener('click', start);
  playBtn.addEventListener('pointerenter', () => sfx.pop());
  root.querySelectorAll<HTMLButtonElement>('[data-robot]').forEach((b) => {
    b.addEventListener('pointerenter', () => sfx.pop());
    b.addEventListener('click', () => {
      const id = b.dataset.robot as RobotId;
      sfx.bip();
      jump();
      const built = getState().assembled[id];
      say(built ? ROBOT_FACT[id] : `${ROBOT_FACT[id]} Aún no lo armas: ¡toca JUGAR para sumarlo a tu colección!`);
    });
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !pop.hidden) {
      pop.hidden = true;
      settingsBtn.focus();
    } else if (e.key === 'Enter' && document.activeElement === document.body) {
      e.preventDefault();
      start();
    }
  };
  document.addEventListener('keydown', onKey);

  // ---------- estrellas fugaces (pocas, y nunca en "menos movimiento") ----------
  let meteorTimer = 0;
  const meteor = () => {
    if (!alive) return;
    if (!calm && !document.hidden) {
      const m = document.createElement('span');
      m.className = 'kid__meteor';
      m.style.left = `${45 + Math.random() * 50}%`;
      m.style.top = `${Math.random() * 30}%`;
      section.appendChild(m);
      window.setTimeout(() => m.remove(), 1300);
    }
    meteorTimer = window.setTimeout(meteor, 12000 + Math.random() * 8000);
  };
  if (!reducedMotion) meteorTimer = window.setTimeout(meteor, 8000);

  return {
    unmount() {
      alive = false;
      window.clearTimeout(typeTimer);
      window.clearTimeout(greetTimer);
      window.clearTimeout(spaceTimer);
      window.clearTimeout(meteorTimer);
      window.removeEventListener('pointermove', onEyes);
      window.removeEventListener('pointerdown', markInteracted);
      window.removeEventListener('keydown', markInteracted);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
      synth?.cancel();
      tl.kill();
      space?.destroy();
    },
  };
};

export default home;