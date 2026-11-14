/** Header persistente: logo NASA Space Apps, "GalaxyCore" y menú (Reiniciar, Guardar, % de misión). */
import { go } from '../router';
import { getState, progressPercent, levelsDone, resetState, saveState, subscribe, TOTAL_LEVELS, allLevelsDone } from '../store';
import { confirmModal, toast } from './modal';

export function mountHeader(host: HTMLElement): void {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <a class="header__logo" href="./" aria-label="NASA Space Apps – inicio" data-home>
      <img src="${import.meta.env.BASE_URL}assets/space-apps-logo.svg" alt="NASA Space Apps" width="48" height="48" />
    </a>
    <div style="display:flex;align-items:center;gap:12px;margin-left:auto">
      <span class="header__team">GalaxyCore</span>
      <button class="header__menu-btn" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="main-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <nav class="menu" id="main-menu" aria-label="Menú de la misión" hidden>
      <div class="menu__progress">
        <div class="menu__progress-label">Misión completada: <strong data-pct>0%</strong></div>
        <div class="menu__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>
        <div class="menu__progress-detail" data-detail></div>
      </div>
      <button class="menu__item" type="button" data-action="save">Guardar</button>
      <button class="menu__item" type="button" data-action="reset">Reiniciar</button>
    </nav>`;
  host.appendChild(header);

  const btn = header.querySelector<HTMLButtonElement>('.header__menu-btn')!;
  const menu = header.querySelector<HTMLElement>('.menu')!;
  const pct = header.querySelector<HTMLElement>('[data-pct]')!;
  const bar = header.querySelector<HTMLElement>('.menu__bar')!;
  const detail = header.querySelector<HTMLElement>('[data-detail]')!;

  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    menu.classList.toggle('menu--open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains('menu--open'));
  });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('menu--open') && !header.contains(e.target as Node)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('menu--open')) setOpen(false);
  });

  // el logo no recarga la página: solo cierra el menú
  header.querySelector('[data-home]')!.addEventListener('click', (e) => e.preventDefault());

  menu.addEventListener('click', async (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    setOpen(false);
    if (action === 'save') {
      toast(saveState() ? 'Progreso guardado' : 'No se pudo guardar (almacenamiento bloqueado)');
    } else if (action === 'reset') {
      const ok = await confirmModal(
        '¿Reiniciar la misión?',
        'Se borrará todo tu progreso (nombre, robots armados y niveles). Esta acción no se puede deshacer.',
        'Reiniciar',
        'Cancelar',
      );
      if (ok) {
        resetState();
        toast('Misión reiniciada');
        go('home');
      }
    }
  });

  const render = () => {
    const p = progressPercent();
    pct.textContent = `${p}%`;
    bar.setAttribute('aria-valuenow', String(p));
    (bar.firstElementChild as HTMLElement).style.width = `${p}%`;
    const s = getState();
    const extra = s.finalDone ? 'completado ✓' : allLevelsDone() ? 'desbloqueado' : 'bloqueado';
    detail.textContent = `${levelsDone()}/${TOTAL_LEVELS} niveles · Nivel extra: ${extra}${s.name ? ` · ${s.name}` : ''}`;
  };
  subscribe(render);
  render();
}