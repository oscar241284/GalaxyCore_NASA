/**
 * Carga diferida de un minijuego: su código (y three.js) solo se descarga al abrirlo.
 * Devuelve un `MiniGame` normal, así que el sistema `GAMES` / `openGame()` no cambia.
 */
import type { GameContext, MiniGame } from '../index';
import { injectOpStyles } from './ui';

export function lazyGame(load: () => Promise<{ default: MiniGame }>): MiniGame {
  return (ctx: GameContext) => {
    injectOpStyles();
    let closed = false;
    let cleanup: (() => void) | void;
    ctx.root.innerHTML = '<p class="op-loading">CARGANDO MISIÓN…</p>';
    load()
      .then((mod) => {
        if (closed) return; // el jugador salió antes de que terminara la descarga
        ctx.root.innerHTML = '';
        cleanup = mod.default(ctx);
      })
      .catch(() => {
        if (!closed) ctx.root.innerHTML = '<p class="op-loading">No se pudo cargar la misión. Revisa tu conexión y vuelve a intentarlo.</p>';
      });
    return () => {
      closed = true;
      if (typeof cleanup === 'function') cleanup();
    };
  };
}
