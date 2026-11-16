/**
 * Interfaz propia de los minijuegos 3D del LRV. Se apoya en los estilos comunes `op-`
 * (src/games/shared/ui.ts) y solo añade lo que cambia: HUD verde como el de la computadora
 * del Apolo (igual que en el alunizaje), mensajes de radio bilingües y cuadro de tareas.
 */
const CSS = `
.op.lrv { background: #000; }
.op.lrv .op-hud { border-color: rgba(57,255,138,.25); color: var(--retro-green); background: linear-gradient(180deg, rgba(4,16,10,.88), rgba(2,8,5,.82)); box-shadow: inset 0 0 24px rgba(57,255,138,.06), 0 8px 30px rgba(0,0,0,.5); }
.op.lrv .op-hud__top { color: var(--retro-amber); }
.op.lrv .op-hud__cell span { color: rgba(57,255,138,.6); }
.op.lrv .op-hud__cell b { text-shadow: 0 0 8px rgba(57,255,138,.55); }
.op.lrv .op-bar { background: rgba(57,255,138,.12); }
.op.lrv .op-bar s { background: linear-gradient(90deg, #1f9e57, #39ff8a); box-shadow: 0 0 10px rgba(57,255,138,.7); }
.op.lrv .op-bar s.warn { background: linear-gradient(90deg, #b91c1c, #ff6b6b); box-shadow: 0 0 10px rgba(255,80,80,.7); }
/* barra de oxígeno con la marca del límite de regreso (30 %) */
.lrv-o2 { position: relative; overflow: visible; }
.lrv-o2 s { border-radius: 4px; }
.lrv-o2 u { position: absolute; left: 30%; top: -3px; bottom: -3px; width: 2px; background: #ff6b6b; box-shadow: 0 0 6px #ff6b6b; }
.op-capcom .lrv-en { font-style: italic; }
.op-capcom small { display: block; margin-top: 2px; font-size: 12px; color: var(--muted); }
.lrv-pad { align-items: center; }
.lrv-pad__col { display: flex; flex-direction: column; gap: 8px; }
.lrv-task { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 3; width: min(560px, calc(100% - 24px)); padding: 14px 16px; border: 1px solid rgba(103,232,249,.4); border-radius: 14px; text-align: center; background: rgba(5,8,16,.9); backdrop-filter: blur(6px); box-shadow: 0 16px 40px rgba(0,0,0,.6); animation: op-in .35s var(--ease-out); }
.lrv-task[hidden] { display: none; }
.lrv-task p { margin: 0 0 8px; }
.lrv-task__kicker { font-family: var(--font-ui); font-size: 10px; letter-spacing: .2em; color: var(--holo); }
.lrv-task__en { font-size: clamp(16px, 2.2vw, 20px); font-style: italic; line-height: 1.35; color: #fff; }
.lrv-task__es { font-size: 14px; color: var(--muted); }
.lrv-task__verdict { padding: 8px 10px; border-radius: 8px; font-size: 14px; line-height: 1.4; color: var(--fg); background: rgba(255,255,255,.07); }
.lrv-task__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 8px; }
.lrv-task__actions .op-alt { padding: 8px 16px; font-size: 14px; }
.lrv-task__hint { margin: 0 !important; font-size: 12px; color: var(--dim); }
@media (max-width: 720px) {
  .lrv-pad__col { gap: 6px; }
  .lrv-task { bottom: 8px; padding: 10px 12px; }
}
`;

export function injectLrvStyles(): void {
  if (document.getElementById('lrv-styles')) return;
  const s = document.createElement('style');
  s.id = 'lrv-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Mensaje de radio en inglés con su traducción debajo (para practicar el idioma). */
export function radioHtml(en: string, es: string): string {
  return `<span class="lrv-en" lang="en">${en}</span><small>${es}</small>`;
}
