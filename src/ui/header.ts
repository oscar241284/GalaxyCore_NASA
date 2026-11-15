import { currentParams, currentScreen, go } from '../router';
import { lang, setLang, tr } from '../i18n';
import { getState, progressPercent, levelsDone, resetState, saveState, subscribe, TOTAL_LEVELS, allLevelsDone } from '../store';
import { confirmModal, toast } from './modal';
import { isMusicMuted, onMusicMuteChange, setMusicMuted } from '../audio/music';

const ICON_ON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
const ICON_OFF =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';

export function mountHeader(host: HTMLElement): void {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <a class="header__logo" href="./" aria-label="${tr('NASA Space Apps – home', 'NASA Space Apps – inicio')}" data-home>
      <img src="${import.meta.env.BASE_URL}assets/space-apps-logo.svg" alt="NASA Space Apps" width="48" height="48" />
    </a>
    <div style="display:flex;align-items:center;gap:12px;margin-left:auto">
      <span class="header__team">GalaxyCore</span>
      <button class="header__sound" type="button" data-music></button>
      <button class="header__lang" type="button" data-lang
        aria-label="${tr('Cambiar idioma a español', 'Switch language to English')}"
        title="${tr('Cambiar a español', 'Switch to English')}">
        <span class="header__lang-opt${lang === 'en' ? ' is-active' : ''}">EN</span>
        <span class="header__lang-opt${lang === 'es' ? ' is-active' : ''}">ES</span>
      </button>
      <button class="header__menu-btn" type="button" aria-label="${tr('Open menu', 'Abrir menú')}" aria-expanded="false" aria-controls="main-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <nav class="menu" id="main-menu" aria-label="${tr('Mission menu', 'Menú de la misión')}" hidden>
      <div class="menu__progress">
        <div class="menu__progress-label">${tr('Mission complete', 'Misión completada')}: <strong data-pct>0%</strong></div>
        <div class="menu__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>
        <div class="menu__progress-detail" data-detail></div>
      </div>
      <button class="menu__item" type="button" data-action="save">${tr('Save', 'Guardar')}</button>
      <button class="menu__item" type="button" data-action="reset">${tr('Restart', 'Reiniciar')}</button>
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
    btn.setAttribute('aria-label', open ? tr('Close menu', 'Cerrar menú') : tr('Open menu', 'Abrir menú'));
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

  const musicBtn = header.querySelector<HTMLButtonElement>('[data-music]')!;
  const paintMusic = (m: boolean) => {
    musicBtn.innerHTML = m ? ICON_OFF : ICON_ON;
    musicBtn.classList.toggle('is-off', m);
    musicBtn.setAttribute('aria-pressed', String(!m));
    const label = m ? tr('Turn music on', 'Activar música') : tr('Mute music', 'Silenciar música');
    musicBtn.setAttribute('aria-label', label);
    musicBtn.title = label;
  };
  paintMusic(isMusicMuted());
  onMusicMuteChange(paintMusic);
  musicBtn.addEventListener('click', () => setMusicMuted(!isMusicMuted()));

  header.querySelector('[data-lang]')!.addEventListener('click', () => {
    saveState();
    const screen = currentScreen();
    setLang(lang === 'en' ? 'es' : 'en', screen ? { screen, params: { ...currentParams() } } : undefined);
  });

  header.querySelector('[data-home]')!.addEventListener('click', (e) => e.preventDefault());

  menu.addEventListener('click', async (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    setOpen(false);
    if (action === 'save') {
      toast(saveState() ? tr('Progress saved', 'Progreso guardado') : tr('Could not save (storage blocked)', 'No se pudo guardar (almacenamiento bloqueado)'));
    } else if (action === 'reset') {
      const ok = await confirmModal(
        tr('Restart the mission?', '¿Reiniciar la misión?'),
        tr(
          'All your progress (name, assembled robots and levels) will be erased. This cannot be undone.',
          'Se borrará todo tu progreso (nombre, robots armados y niveles). Esta acción no se puede deshacer.',
        ),
        tr('Restart', 'Reiniciar'),
        tr('Cancel', 'Cancelar'),
      );
      if (ok) {
        resetState();
        toast(tr('Mission restarted', 'Misión reiniciada'));
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
    const extra = s.finalDone ? tr('completed ✓', 'completado ✓') : allLevelsDone() ? tr('unlocked', 'desbloqueado') : tr('locked', 'bloqueado');
    detail.textContent = `${levelsDone()}/${TOTAL_LEVELS} ${tr('levels', 'niveles')} · ${tr('Bonus level', 'Nivel extra')}: ${extra}${s.name ? ` · ${s.name}` : ''}`;
  };
  subscribe(render);
  render();
}
