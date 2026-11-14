/** CERTIFICADO: nombre, fecha, puntaje, equipo GalaxyCore; imprimir / volver a empezar. */
import type { ScreenFactory } from '../router';
import { ROBOTS, ROBOT_ORDER } from '../data/robots';
import { getState, levelsDone, resetState, TOTAL_LEVELS } from '../store';
import { confirmModal, esc } from '../ui/modal';
import { createStarfield } from '../ui/starfield';

const certificate: ScreenFactory = ({ root, go }) => {
  const s = getState();
  const name = s.name || 'Astronauta';
  const date = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  const robots = ROBOT_ORDER.map((id) => `<li>${esc(ROBOTS[id].name)}</li>`).join('');

  root.innerHTML = `
    <div class="certificate-screen" style="position:relative;min-height:100%;overflow:hidden;padding:1px 0">
      <article class="certificate" style="z-index:1" aria-labelledby="cert-title">
        <p class="certificate__kicker">NASA Space Apps · Equipo GalaxyCore</p>
        <h1 class="certificate__title" id="cert-title">Certificado de Astronauta</h1>
        <p class="certificate__text">Se certifica que</p>
        <p class="certificate__name">${esc(name)}</p>
        <p class="certificate__text">está listo como astronauta. Completó ${levelsDone()}/${TOTAL_LEVELS} pruebas
          y el nivel extra, clasificando correctamente ${s.stonesCorrect} de 8 muestras.</p>
        <ul class="certificate__robots">${robots}</ul>
        <div class="certificate__footer">
          <div class="certificate__date">Fecha<br /><strong>${esc(date)}</strong></div>
          <div class="certificate__seal">PUNTAJE<br />${s.score}<br />/ 1000</div>
          <div class="certificate__sign">Equipo<br /><strong>GalaxyCore</strong></div>
        </div>
      </article>
      <div class="certificate-actions" style="position:relative;z-index:1">
        <button class="btn btn--primary" type="button" data-print>Imprimir</button>
        <button class="btn btn--ghost" type="button" data-robots>Volver a los robots</button>
        <button class="btn btn--ghost" type="button" data-restart>Volver a empezar</button>
      </div>
    </div>`;

  const stars = createStarfield(root.querySelector<HTMLElement>('.certificate-screen')!, 0.8);
  root.querySelector('[data-print]')!.addEventListener('click', () => window.print());
  root.querySelector('[data-robots]')!.addEventListener('click', () => go('podiums'));
  root.querySelector('[data-restart]')!.addEventListener('click', async () => {
    const ok = await confirmModal(
      '¿Volver a empezar?',
      'Se borrará tu progreso para iniciar una nueva misión desde cero.',
      'Volver a empezar',
      'Cancelar',
    );
    if (ok) {
      resetState();
      go('home');
    }
  });

  return {
    unmount() {
      stars.destroy();
    },
  };
};

export default certificate;