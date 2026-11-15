/**
 * Interfaz común de los niveles 3D de Opportunity: estructura HTML sobre el canvas WebGL
 * (tarjetas de datos, mensaje del centro de control, joystick, botones, avisos y paneles).
 */
import { injectKit, say as kitSay } from '../lkKit';
import { injectOpCss } from './world';

export interface OpUi {
  wrap: HTMLElement;
  canvasHost: HTMLElement;
  hud: HTMLElement;
  joy: HTMLElement;
  btns: HTMLElement;
  say: (text: string, kind?: '' | 'ok' | 'warn') => void;
  toast: (text: string, ms?: number) => void;
  panel: (html: string) => HTMLElement;
  closePanel: () => void;
  card: (id: string, label: string, value: string) => void;
}

export function mountOp(root: HTMLElement, task: string, opts: { joystick?: boolean } = {}): OpUi {
  injectKit();
  injectOpCss();
  root.innerHTML = `
    <div class="op lk" style="--lk-accent:#f59e0b;--lk-soft:#fcd34d">
      <div class="op__canvas" data-canvas></div>
      <div class="op__hud" data-hud><div class="op__card op__task">${task}</div><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end" data-cards></div></div>
      <div class="op__center" data-center></div>
      ${opts.joystick === false ? '' : '<div class="opj" data-joy aria-label="Joystick: arrastra para manejar (o usa las flechas del teclado)"></div>'}
      <div class="op__btns" data-btns></div>
      <p class="lk-say op__say" data-say></p>
    </div>`;
  const wrap = root.querySelector<HTMLElement>('.op')!;
  const sayEl = root.querySelector<HTMLElement>('[data-say]')!;
  const center = root.querySelector<HTMLElement>('[data-center]')!;
  const cards = root.querySelector<HTMLElement>('[data-cards]')!;
  let toastTimer = 0;
  let panelEl: HTMLElement | null = null;
  return {
    wrap,
    canvasHost: root.querySelector<HTMLElement>('[data-canvas]')!,
    hud: root.querySelector<HTMLElement>('[data-hud]')!,
    joy: root.querySelector<HTMLElement>('[data-joy]') ?? document.createElement('div'),
    btns: root.querySelector<HTMLElement>('[data-btns]')!,
    say: (t, k = '') => kitSay(sayEl, t, k, 'CONTROL'),
    toast: (t, ms = 1800) => {
      window.clearTimeout(toastTimer);
      center.innerHTML = `<div class="op__toast">${t}</div>`;
      toastTimer = window.setTimeout(() => (center.innerHTML = ''), ms);
    },
    panel: (html) => {
      panelEl?.remove();
      panelEl = document.createElement('div');
      panelEl.className = 'op__panel';
      panelEl.innerHTML = `<div>${html}</div>`;
      wrap.appendChild(panelEl);
      return panelEl;
    },
    closePanel: () => {
      panelEl?.remove();
      panelEl = null;
    },
    card: (id, label, value) => {
      let el = cards.querySelector<HTMLElement>(`[data-card="${id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'op__card';
        el.dataset.card = id;
        el.innerHTML = '<small></small><b></b>';
        cards.appendChild(el);
      }
      el.querySelector('small')!.textContent = label;
      const b = el.querySelector('b')!;
      if (b.innerHTML !== value) b.innerHTML = value;
    },
  };
}

/** Mensaje si el equipo no tiene WebGL. */
export function noWebGL(root: HTMLElement, win: () => void): void {
  root.innerHTML = `<div class="op lk"><div class="op__panel"><div>
    <h3 style="margin:0 0 8px;font-family:var(--font-ui)">Este equipo no puede mostrar 3D</h3>
    <p style="margin:0 0 14px;line-height:1.5">Prueba en otro navegador (Chrome o Edge actualizados) o activa la aceleración por hardware.</p>
    <button type="button" class="lk-btn lk-btn--go" data-end>Continuar</button></div></div></div>`;
  root.querySelector('[data-end]')!.addEventListener('click', win);
}
