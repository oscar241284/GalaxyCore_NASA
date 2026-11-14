/** NOMBRE: fondo de estrellas (canvas 2D) + input + EMPEZAR. */
import type { ScreenFactory } from '../router';
import { getState, setName } from '../store';
import { createStarfield } from '../ui/starfield';

const nameScreen: ScreenFactory = ({ root, go }) => {
  root.innerHTML = `
    <div class="name-screen">
      <form class="name-screen__form" novalidate style="position:relative;z-index:1">
        <label class="name-screen__title" for="astro-name">Ingresa tu nombre, astronauta</label>
        <input class="input" id="astro-name" name="astro-name" type="text" maxlength="40"
          autocomplete="nickname" spellcheck="false" placeholder="Tu nombre" />
        <button class="btn btn--primary" type="submit" disabled>EMPEZAR</button>
      </form>
    </div>`;

  const wrap = root.querySelector<HTMLElement>('.name-screen')!;
  const stars = createStarfield(wrap);
  const form = root.querySelector<HTMLFormElement>('form')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const btn = root.querySelector<HTMLButtonElement>('button[type=submit]')!;

  input.value = getState().name;
  const sync = () => {
    btn.disabled = input.value.trim().length === 0;
  };
  sync();
  input.addEventListener('input', sync);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    setName(v);
    go('podiums');
  });
  window.setTimeout(() => input.focus({ preventScroll: true }), 300);

  return {
    unmount() {
      stars.destroy();
    },
  };
};

export default nameScreen;
