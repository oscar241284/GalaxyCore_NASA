import type { ScreenFactory } from '../router';
import { ROBOTS, ROBOT_ORDER } from '../data/robots';
import { getState, levelsDone, MAX_SCORE, resetState, TOTAL_LEVELS, TOTAL_STONES } from '../store';
import { confirmModal, esc } from '../ui/modal';
import { createStarfield } from '../ui/starfield';
import { locale, tr } from '../i18n';

const certificate: ScreenFactory = ({ root, go }) => {
  const s = getState();
  const name = s.name || tr('Astronaut', 'Astronauta');
  const date = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const robots = ROBOT_ORDER.map((id) => `<li>${esc(ROBOTS[id].name)}</li>`).join('');

  root.innerHTML = `
    <div class="certificate-screen" style="position:relative;min-height:100%;overflow:hidden;padding:1px 0">
      <article class="certificate" style="z-index:1" aria-labelledby="cert-title">
        <p class="certificate__kicker">${tr('NASA Space Apps · Team GalaxyCore', 'NASA Space Apps · Equipo GalaxyCore')}</p>
        <h1 class="certificate__title" id="cert-title">${tr('Astronaut Certificate', 'Certificado de Astronauta')}</h1>
        <p class="certificate__text">${tr('This certifies that', 'Se certifica que')}</p>
        <p class="certificate__name">${esc(name)}</p>
        <p class="certificate__text">${tr(
            `is ready to be an astronaut. Completed ${levelsDone()}/${TOTAL_LEVELS} challenges
          and the bonus level, correctly classifying ${s.stonesCorrect} of ${TOTAL_STONES} samples.`,
            `está listo como astronauta. Completó ${levelsDone()}/${TOTAL_LEVELS} pruebas
          y el nivel extra, clasificando correctamente ${s.stonesCorrect} de ${TOTAL_STONES} muestras.`,
          )}</p>
        <ul class="certificate__robots">${robots}</ul>
        <div class="certificate__footer">
          <div class="certificate__date">${tr('Date', 'Fecha')}<br /><strong>${esc(date)}</strong></div>
          <div class="certificate__seal">${tr('SCORE', 'PUNTAJE')}<br />${s.score}<br />/ ${MAX_SCORE}</div>
          <div class="certificate__sign">${tr('Team', 'Equipo')}<br /><strong>GalaxyCore</strong></div>
        </div>
      </article>
      <div class="certificate-actions" style="position:relative;z-index:1">
        <button class="btn btn--primary" type="button" data-print>${tr('Print', 'Imprimir')}</button>
        <button class="btn btn--ghost" type="button" data-robots>${tr('Back to the robots', 'Volver a los robots')}</button>
        <button class="btn btn--ghost" type="button" data-restart>${tr('Start over', tr('Start over', 'Volver a empezar'))}</button>
      </div>
    </div>`;

  const stars = createStarfield(root.querySelector<HTMLElement>('.certificate-screen')!, 0.8);
  root.querySelector('[data-print]')!.addEventListener('click', () => window.print());
  root.querySelector('[data-robots]')!.addEventListener('click', () => go('podiums'));
  root.querySelector('[data-restart]')!.addEventListener('click', async () => {
    const ok = await confirmModal(
      tr('Start over?', '¿Volver a empezar?'),
      tr('Your progress will be erased to start a new mission from scratch.', 'Se borrará tu progreso para iniciar una nueva misión desde cero.'),
      tr('Start over', 'Volver a empezar'),
      tr('Cancel', 'Cancelar'),
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
