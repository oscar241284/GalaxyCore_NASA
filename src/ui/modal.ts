/** Modal accesible simple + confirmación + toast. */

export interface ModalAction {
  label: string;
  variant?: 'primary' | 'ghost';
  /** devolver `false` mantiene el modal abierto */
  onClick?: () => void | boolean;
}

export interface ModalOptions {
  title: string;
  body?: string | Node;
  actions?: ModalAction[];
  /** cerrar con Escape o click en el fondo (por defecto true) */
  dismissable?: boolean;
  onClose?: () => void;
}

export function openModal(opts: ModalOptions): () => void {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
  modal.setAttribute('aria-labelledby', titleId);

  const h = document.createElement('h2');
  h.className = 'modal__title';
  h.id = titleId;
  h.textContent = opts.title;
  modal.appendChild(h);

  if (opts.body) {
    const body = document.createElement('div');
    body.className = 'modal__body';
    if (typeof opts.body === 'string') {
      const p = document.createElement('p');
      p.textContent = opts.body;
      body.appendChild(p);
    } else body.appendChild(opts.body);
    modal.appendChild(body);
  }

  const actions = document.createElement('div');
  actions.className = 'modal__actions';
  const list = opts.actions ?? [{ label: 'Cerrar', variant: 'ghost' }];
  let closed = false;
  const prevFocus = document.activeElement as HTMLElement | null;

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    opts.onClose?.();
    prevFocus?.focus?.();
  };

  for (const a of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.variant === 'ghost' ? 'btn--ghost' : 'btn--primary'}`;
    b.textContent = a.label;
    b.addEventListener('click', () => {
      const r = a.onClick?.();
      if (r !== false) close();
    });
    actions.appendChild(b);
  }
  modal.appendChild(actions);
  backdrop.appendChild(modal);

  const dismissable = opts.dismissable !== false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dismissable) close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && dismissable) close();
  });

  (document.querySelector('.app') ?? document.body).appendChild(backdrop);
  (actions.querySelector('button') as HTMLButtonElement | null)?.focus();
  return close;
}

export function confirmModal(title: string, text: string, ok = 'Aceptar', cancel = 'Cancelar'): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title,
      body: text,
      actions: [
        { label: cancel, variant: 'ghost', onClick: () => void ((answered = true), resolve(false)) },
        { label: ok, variant: 'primary', onClick: () => void ((answered = true), resolve(true)) },
      ],
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
  });
}

let toastTimer = 0;
export function toast(message: string, ms = 2200): void {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    (document.querySelector('.app') ?? document.body).appendChild(el);
  }
  el.textContent = message;
  el.classList.remove('toast--show');
  void el.offsetWidth; // reiniciar animación
  el.classList.add('toast--show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el!.classList.remove('toast--show');
  }, ms);
}

/** Escapa texto para insertarlo en innerHTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
