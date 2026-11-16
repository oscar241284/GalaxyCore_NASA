/**
 * Interfaz común de los minijuegos 3D (Opportunity y LRV): estilos (prefijo `op-`), mensajes del
 * centro de control, botón de sonido, botones que se mantienen pulsados y trozos de panel.
 *
 * Sigue el mismo lenguaje visual que los juegos del LRV (HUD de computadora, paneles
 * violeta GalaxyCore, botones físicos), con el ámbar de Opportunity como color de datos.
 */
import type { Sfx } from './audio';

const CSS = `
.op { position: absolute; inset: 0; overflow: hidden; background: #2a1710; user-select: none; -webkit-user-select: none; }
.op canvas.op-view { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; }
.op-loading { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; padding: 24px; text-align: center; font-family: var(--font-ui); letter-spacing: .14em; color: var(--muted); }

.op-hud {
  position: absolute; top: 12px; left: 12px; width: 250px; padding: 12px 14px 10px;
  border: 1px solid rgba(255,181,71,.28); border-radius: 10px;
  background: linear-gradient(180deg, rgba(22,12,4,.88), rgba(10,5,2,.82));
  box-shadow: inset 0 0 24px rgba(255,181,71,.06), 0 8px 30px rgba(0,0,0,.5);
  font-family: var(--font-mono); color: var(--retro-amber);
}
.op-hud[hidden] { display: none; }
.op-hud__top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 15px; letter-spacing: .08em; color: var(--holo); }
.op-hud__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.op-hud__cell span { display: block; font-size: 13px; letter-spacing: .1em; color: rgba(255,181,71,.65); }
.op-hud__cell b { display: block; font-weight: 400; font-size: 30px; line-height: 1; text-shadow: 0 0 8px rgba(255,181,71,.5); transition: color .2s; }
.op-hud__cell b.warn { color: #ff6b6b; text-shadow: 0 0 8px rgba(255,80,80,.7); }
.op-hud__cell b.ok { color: #7dffb4; text-shadow: 0 0 8px rgba(57,255,138,.6); }
.op-hud__wide { grid-column: 1 / -1; }
.op-bar { display: block; height: 8px; margin-top: 4px; border-radius: 4px; background: rgba(255,181,71,.14); overflow: hidden; }
.op-bar s { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #b45309, #ffb547); box-shadow: 0 0 10px rgba(255,181,71,.7); }
.op-bar s.warn { background: linear-gradient(90deg, #b91c1c, #ff6b6b); box-shadow: 0 0 10px rgba(255,80,80,.7); }
.op-hud__note { grid-column: 1 / -1; margin-top: 4px; font-size: 17px; color: var(--holo); }

.op-tools { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; }
.op-tool { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--fg); background: rgba(14,10,32,.8); cursor: pointer; transition: border-color .2s, transform .2s; }
.op-tool:hover, .op-tool:focus-visible { outline: none; border-color: var(--accent-2); transform: scale(1.06); }
.op-tool svg { width: 20px; height: 20px; }

.op-capcom { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); width: min(460px, calc(100% - 640px)); display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.op-capcom p { margin: 0; padding: 8px 12px; border-left: 3px solid var(--holo); border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.35; color: var(--fg); background: rgba(5,4,13,.72); backdrop-filter: blur(4px); animation: op-in .35s var(--ease-out); transition: opacity .6s; }
.op-capcom p b { margin-right: 6px; font-family: var(--font-ui); font-size: 10px; letter-spacing: .14em; color: var(--holo); }
.op-capcom p.op-from-craft { border-left-color: var(--retro-amber); }
.op-capcom p.op-from-craft b { color: var(--retro-amber); }
.op-capcom p.old { opacity: .45; }
.op-capcom p:not(:nth-last-child(-n+2)) { display: none; }
@keyframes op-in { from { opacity: 0; transform: translateY(-8px); } }

.op-pad { position: absolute; right: 16px; bottom: 16px; display: flex; align-items: flex-end; gap: 10px; transition: opacity .3s; }
.op-pad.disabled { opacity: .3; pointer-events: none; }
.op-key {
  position: relative; display: grid; place-items: center; align-content: center; gap: 2px; width: 74px; height: 74px; padding: 0;
  border: 1px solid rgba(255,255,255,.14); border-radius: 18px; cursor: pointer; touch-action: none;
  color: #cfd3dc; font-family: var(--font-ui); font-size: 10px; letter-spacing: .12em;
  background: linear-gradient(180deg, #2a2f3a 0%, #151821 100%);
  box-shadow: 0 6px 0 #07080c, 0 10px 20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12);
  transition: transform .08s, box-shadow .08s, color .15s, border-color .15s;
}
.op-key__icon { font-size: 24px; line-height: 1; }
.op-key::after { content: ''; position: absolute; top: 8px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: #3a3f4a; transition: all .12s; }
.op-key.is-on { transform: translateY(5px); color: #fff; border-color: rgba(103,232,249,.7); box-shadow: 0 1px 0 #07080c, 0 3px 8px rgba(0,0,0,.6), inset 0 0 18px rgba(103,232,249,.35); }
.op-key.is-on::after { background: #67e8f9; box-shadow: 0 0 10px #67e8f9; }
.op-key--main { width: 108px; height: 96px; border-radius: 24px; font-size: 11px; line-height: 1.25; border-color: rgba(255,181,71,.45); }
.op-key--main .op-key__icon { font-size: 30px; }
.op-key--main.is-on { border-color: rgba(255,181,71,.9); box-shadow: 0 1px 0 #07080c, 0 3px 8px rgba(0,0,0,.6), inset 0 0 22px rgba(255,181,71,.45); }
.op-key--main.is-on::after { background: #ffb547; box-shadow: 0 0 10px #ffb547; }

.op-panel {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5;
  width: min(720px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow-y: auto;
  padding: 26px; border: 1px solid rgba(192,132,252,.35); border-radius: 18px;
  background: linear-gradient(180deg, rgba(20,14,44,.95), rgba(8,6,20,.96));
  box-shadow: 0 30px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset;
  animation: op-pop .4s var(--ease-out);
}
.op-panel[hidden] { display: none; }
@keyframes op-pop { from { opacity: 0; transform: translate(-50%, -46%) scale(.97); } }
.op-panel__kicker { margin: 0; font-family: var(--font-ui); font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--accent-2); }
.op-panel__title { margin: 6px 0 16px; font-family: var(--font-ui); font-size: clamp(20px, 2.6vw, 28px); line-height: 1.2; }
.op-panel__title.ok { color: var(--ok); }
.op-panel__title.bad { color: var(--bad); }
.op-panel .center { text-align: center; }
.op-brief { display: grid; grid-template-columns: 200px 1fr; gap: 22px; align-items: center; }
.op-brief__art { aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: linear-gradient(180deg, #b98a63 0%, #d9a877 55%, #8a4a2c 55%, #5c2c18 100%); }
.op-brief__art svg { display: block; width: 100%; height: 100%; }
.op-rules { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.op-rules li { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--muted); }
.op-rules li b { color: var(--fg); }
.op-rules li i { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; font-style: normal; font-size: 13px; color: var(--accent-ink); background: var(--accent-2); }
.op-diff { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 18px 0 14px; }
.op-diff button { padding: 10px 8px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; text-align: center; font: inherit; color: var(--muted); background: rgba(255,255,255,.03); transition: all .2s; }
.op-diff button b { display: block; font-family: var(--font-ui); font-size: 13px; letter-spacing: .06em; color: var(--fg); }
.op-diff button small { font-size: 12px; }
.op-diff button:hover { border-color: var(--accent-2); }
.op-diff button[aria-pressed="true"] { border-color: var(--accent); background: rgba(168,85,247,.2); box-shadow: var(--glow-soft); }
.op-keys { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; margin: 0 0 18px; font-size: 13px; color: var(--muted); }
.op-cap { min-width: 40px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; text-align: center; font-family: var(--font-ui); font-size: 12px; color: var(--fg); background: linear-gradient(180deg, #2a2f3a, #151821); box-shadow: 0 3px 0 #07080c; transition: all .1s; }
.op-cap.is-on { transform: translateY(3px); box-shadow: 0 0 0 #07080c, 0 0 14px rgba(103,232,249,.7); border-color: #67e8f9; color: #67e8f9; }
.op-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.op-go {
  padding: 16px 30px; border: 0; border-radius: 999px; cursor: pointer;
  font-family: var(--font-ui); font-size: 15px; font-weight: 800; letter-spacing: .14em; color: #fff;
  background: linear-gradient(135deg, #7c3aed, #a855f7 55%, #c084fc); box-shadow: var(--glow); transition: transform .15s, filter .2s;
}
.op-go:hover, .op-go:focus-visible { outline: none; filter: brightness(1.15); transform: translateY(-2px); }
.op-go:active { transform: translateY(1px); }
.op-alt { padding: 14px 22px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; font: inherit; color: var(--fg); background: transparent; }
.op-alt:hover, .op-alt:focus-visible { outline: none; border-color: var(--accent-2); }
.op-stars { display: flex; justify-content: center; gap: 8px; margin: -4px 0 14px; font-size: 40px; }
.op-stars span { color: rgba(255,255,255,.15); }
.op-stars span.on { color: #ffd166; text-shadow: 0 0 18px rgba(255,209,102,.8); animation: op-star .5s var(--ease-spring) both; }
.op-stars span:nth-child(2).on { animation-delay: .15s; }
.op-stars span:nth-child(3).on { animation-delay: .3s; }
@keyframes op-star { from { transform: scale(0) rotate(-40deg); } }
.op-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
.op-stats div { padding: 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; text-align: center; background: rgba(255,255,255,.03); }
.op-stats span { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.op-stats b { display: block; margin-top: 4px; font-family: var(--font-mono); font-size: 26px; font-weight: 400; color: var(--fg); }
.op-text { margin: 0 0 16px; text-align: center; color: var(--muted); line-height: 1.55; }
.op-text--small { margin-top: -8px; font-size: 13px; }
.op-count { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; font-family: var(--font-ui); font-size: clamp(80px, 16vw, 180px); font-weight: 900; color: #fff; text-shadow: 0 0 40px rgba(168,85,247,.9); }
.op-count span { animation: op-count 1s ease-out both; }
@keyframes op-count { from { opacity: 0; transform: scale(1.8); } 30% { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.7); } }

@media (max-width: 900px) {
  .op-capcom { top: auto; bottom: 126px; left: 12px; transform: none; width: min(430px, calc(100% - 24px)); }
  .op-capcom p:not(:last-child) { display: none; }
}
@media (max-width: 720px) {
  .op-hud { top: 8px; left: 8px; width: 172px; padding: 7px 9px; }
  .op-hud__top { font-size: 12px; margin-bottom: 2px; }
  .op-hud__cell span { font-size: 10px; }
  .op-hud__cell b { font-size: 20px; }
  .op-hud__note { font-size: 14px; }
  .op-tools { top: 8px; right: 8px; }
  .op-capcom p { font-size: 12px; padding: 6px 10px; }
  .op-pad { right: 8px; bottom: 10px; gap: 6px; }
  .op-key { width: 60px; height: 60px; }
  .op-key--main { width: 92px; height: 78px; }
  .op-panel { padding: 18px; }
  .op-brief { grid-template-columns: 1fr; }
  .op-brief__art { display: none; }
  .op-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .op-panel, .op-capcom p, .op-stars span.on { animation: none; }
}
`;

export function injectOpStyles(): void {
  if (document.getElementById('op-styles')) return;
  const s = document.createElement('style');
  s.id = 'op-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** ¿El usuario pidió menos movimiento? */
export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Speaker = 'control' | 'craft';

/**
 * Mensajes de radio. `control` es el centro de control (`controlName`: JPL, Houston…) y
 * `craft` es la propia nave o tripulación; `craftName` es la etiqueta que se muestra para ella.
 */
export function createCapcom(el: HTMLElement, sfx: Sfx, craftName: string, controlName = 'JPL') {
  return {
    say(text: string, from: Speaker = 'control'): void {
      if (from === 'control') sfx.radio();
      el.querySelectorAll('p').forEach((p) => p.classList.add('old'));
      const p = document.createElement('p');
      if (from === 'craft') p.className = 'op-from-craft';
      p.innerHTML = `<b>${from === 'control' ? controlName : craftName}</b>${text}`;
      el.appendChild(p);
      while (el.children.length > 3) el.firstElementChild!.remove();
    },
    clear(): void {
      el.innerHTML = '';
    },
  };
}

const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';

/** Convierte un botón en el interruptor de sonido. */
export function bindMuteButton(btn: HTMLButtonElement, sfx: Sfx): void {
  const paint = () => {
    btn.innerHTML = sfx.muted ? ICON_OFF : ICON_ON;
    btn.setAttribute('aria-label', sfx.muted ? 'Activar sonido' : 'Silenciar sonido');
  };
  btn.addEventListener('click', () => {
    sfx.init();
    sfx.toggle();
    paint();
  });
  paint();
}

/** Botón táctil que cuenta como pulsado mientras se mantiene el dedo o el ratón. */
export function bindHoldButton(btn: HTMLElement, onChange: (down: boolean) => void): void {
  const down = (e: PointerEvent) => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    navigator.vibrate?.(12);
    onChange(true);
  };
  const up = () => onChange(false);
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function starsHtml(stars: number): string {
  return `<div class="op-stars" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map((n) => `<span class="${n <= stars ? 'on' : ''}">★</span>`).join('')}</div>`;
}

export function statsHtml(stats: [label: string, value: string][]): string {
  return `<div class="op-stats">${stats.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
}

export function difficultyHtml<T extends string>(levels: Record<T, { label: string; desc: string }>, current: T): string {
  const buttons = (Object.keys(levels) as T[])
    .map((d) => `<button type="button" data-diff="${d}" aria-pressed="${d === current}"><b>${levels[d].label}</b><small>${levels[d].desc}</small></button>`)
    .join('');
  return `<div class="op-diff" role="group" aria-label="Dificultad">${buttons}</div>`;
}
