/**
 * MISIÓN 2 · Historia del Apolo 11.
 * Fase 1: relato interactivo en 5 capítulos (con ilustración, fecha y navegación).
 * Fase 2: "Ordena la misión": el jugador toca los eventos en orden cronológico.
 */
import type { GameContext } from './index';

interface Chapter {
  date: string;
  title: string;
  text: string;
  event: string; // texto corto para la fase de ordenar
  art: string; // SVG interno (viewBox 0 0 200 140)
}

const CHAPTERS: Chapter[] = [
  {
    date: '16 de julio de 1969',
    title: 'Despegue',
    event: 'Despegue del cohete Saturno V',
    text: 'Desde el Centro Espacial Kennedy, en Florida, el gigantesco cohete Saturno V despegó llevando a tres astronautas: Neil Armstrong, Buzz Aldrin y Michael Collins.',
    art: `<rect x="92" y="20" width="16" height="78" rx="8" fill="#e5e7eb"/>
      <polygon points="92,32 100,6 108,32" fill="#e5e7eb"/>
      <rect x="92" y="54" width="16" height="6" fill="#1a0b33"/>
      <polygon points="92,86 80,104 92,98" fill="#c9ccd3"/><polygon points="108,86 120,104 108,98" fill="#c9ccd3"/>
      <polygon points="93,98 100,136 107,98" fill="#ffb547"/>
      <polygon points="96,98 100,122 104,98" fill="#fff7d6"/>`,
  },
  {
    date: '19 de julio de 1969',
    title: 'En órbita lunar',
    event: 'Llegada a la órbita de la Luna',
    text: 'Después de tres días de viaje, la nave entró en órbita alrededor de la Luna. Michael Collins se quedó pilotando el módulo de mando Columbia mientras sus compañeros bajaban.',
    art: `<circle cx="100" cy="76" r="42" fill="#c9ccd3"/>
      <circle cx="84" cy="64" r="8" fill="#6b6e76"/><circle cx="114" cy="92" r="6" fill="#6b6e76"/><circle cx="112" cy="58" r="4" fill="#6b6e76"/>
      <ellipse cx="100" cy="76" rx="80" ry="26" fill="none" stroke="#a855f7" stroke-dasharray="4 5" stroke-width="2"/>
      <rect x="168" y="66" width="16" height="9" rx="2" fill="#e5e7eb"/><polygon points="184,66 192,70.5 184,75" fill="#e5e7eb"/>`,
  },
  {
    date: '20 de julio de 1969',
    title: '"El Águila ha aterrizado"',
    event: 'Alunizaje del módulo Eagle',
    text: 'Armstrong y Aldrin descendieron en el módulo lunar Eagle. Con alarmas en la computadora y rocas en la zona elegida, Armstrong tomó el control manual y se posó en el Mar de la Tranquilidad.',
    art: `<rect x="0" y="108" width="200" height="32" fill="#6b6e76"/>
      <ellipse cx="40" cy="116" rx="14" ry="4" fill="#4b4e56"/><ellipse cx="160" cy="122" rx="18" ry="5" fill="#4b4e56"/>
      <rect x="84" y="78" width="32" height="16" fill="#d9a441"/>
      <polygon points="86,78 90,58 110,58 114,78" fill="#c9ccd3"/><rect x="94" y="63" width="12" height="6" fill="#1a0b33"/>
      <path d="M86 94 L76 110 M114 94 L124 110" stroke="#c9ccd3" stroke-width="3"/>
      <path d="M70 110 H82 M118 110 H130" stroke="#c9ccd3" stroke-width="3"/>`,
  },
  {
    date: '20-21 de julio de 1969',
    title: 'El primer paso',
    event: 'Primer paso de Neil Armstrong',
    text: 'Armstrong bajó la escalera y fue el primer ser humano en pisar la Luna: "Es un pequeño paso para el hombre, un gran salto para la humanidad". Con Aldrin caminaron unas 2 horas y media, recogieron 21,5 kg de rocas y dejaron instrumentos científicos.',
    art: `<rect x="0" y="96" width="200" height="44" fill="#6b6e76"/>
      <g transform="translate(70 62) rotate(-12)">
        <ellipse cx="22" cy="20" rx="16" ry="24" fill="#c9ccd3"/>
        <rect x="8" y="2" width="28" height="6" rx="3" fill="#4b4e56"/>
        <ellipse cx="13" cy="36" rx="5" ry="7" fill="#4b4e56"/><ellipse cx="30" cy="36" rx="5" ry="7" fill="#4b4e56"/>
        <path d="M8 14 H36 M8 24 H36" stroke="#4b4e56" stroke-width="3"/>
      </g>
      <rect x="150" y="40" width="3" height="58" fill="#e5e7eb"/><rect x="153" y="40" width="28" height="18" fill="#a855f7"/>`,
  },
  {
    date: '24 de julio de 1969',
    title: 'Regreso a casa',
    event: 'Amerizaje en el océano Pacífico',
    text: 'Los tres astronautas regresaron en el módulo Columbia y cayeron en el océano Pacífico con paracaídas. Por precaución pasaron unos días en cuarentena. ¡La misión fue un éxito!',
    art: `<rect x="0" y="100" width="200" height="40" fill="#1e3a8a"/>
      <path d="M0 104 Q25 96 50 104 T100 104 T150 104 T200 104" fill="none" stroke="#67e8f9" stroke-width="2"/>
      <polygon points="88,100 112,100 106,82 94,82" fill="#c9ccd3"/>
      <path d="M100 82 L70 36 M100 82 L100 30 M100 82 L130 36" stroke="#e5e7eb" stroke-width="1"/>
      <path d="M58 40 Q70 14 86 38 Q100 12 114 38 Q130 14 142 40 Z" fill="#f87171"/>`,
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function apollo11Story({ root, win }: GameContext): () => void {
  let page = 0;
  let timer = 0;

  // ---------- fase 1: relato ----------
  const renderStory = () => {
    const c = CHAPTERS[page];
    const last = page === CHAPTERS.length - 1;
    root.innerHTML = `
      <div class="story">
        <div class="story__progress">${CHAPTERS.map((_, i) => `<span class="${i <= page ? 'on' : ''}"></span>`).join('')}</div>
        <div class="story__panel">
          <svg class="story__art" viewBox="0 0 200 140" aria-hidden="true">${c.art}</svg>
          <div class="story__text">
            <p class="story__date">${c.date}</p>
            <h3 class="story__title">${c.title}</h3>
            <p>${c.text}</p>
          </div>
        </div>
        <div class="story__nav">
          <button type="button" class="btn btn--ghost" data-prev ${page === 0 ? 'disabled' : ''}>Anterior</button>
          <span class="story__count">${page + 1} / ${CHAPTERS.length}</span>
          <button type="button" class="btn btn--primary" data-next>${last ? 'Ir al reto' : 'Siguiente'}</button>
        </div>
      </div>`;
    root.querySelector('[data-prev]')!.addEventListener('click', () => {
      page = Math.max(0, page - 1);
      renderStory();
    });
    root.querySelector('[data-next]')!.addEventListener('click', () => {
      if (last) renderChallenge();
      else {
        page++;
        renderStory();
      }
    });
    root.querySelector<HTMLButtonElement>('[data-next]')!.focus();
  };

  // ---------- fase 2: ordenar ----------
  const renderChallenge = () => {
    let next = 0;
    const pool = shuffle(CHAPTERS.map((c, i) => ({ text: c.event, order: i })));
    root.innerHTML = `
      <div class="story">
        <h3 class="story__title" style="text-align:center">Ordena la misión</h3>
        <p class="story__hint">Toca los eventos del Apolo 11 en el orden en que ocurrieron.</p>
        <ol class="order__slots">${CHAPTERS.map((_, i) => `<li data-slot="${i}"><span>${i + 1}</span><em></em></li>`).join('')}</ol>
        <div class="order__pool"></div>
        <p class="order__feedback" role="status" aria-live="polite"></p>
        <div class="story__nav"><button type="button" class="btn btn--ghost" data-review>Repasar la historia</button></div>
      </div>`;
    const poolEl = root.querySelector<HTMLElement>('.order__pool')!;
    const feedback = root.querySelector<HTMLElement>('.order__feedback')!;
    root.querySelector('[data-review]')!.addEventListener('click', () => {
      page = 0;
      renderStory();
    });

    pool.forEach((ev) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'order__item';
      b.textContent = ev.text;
      b.addEventListener('click', () => {
        if (ev.order === next) {
          const slot = root.querySelector<HTMLElement>(`[data-slot="${next}"]`)!;
          slot.classList.add('filled');
          slot.querySelector('em')!.textContent = ev.text;
          b.remove();
          next++;
          feedback.className = 'order__feedback ok';
          feedback.textContent = next < CHAPTERS.length ? '¡Correcto! ¿Qué pasó después?' : '¡Línea de tiempo completa!';
          if (next === CHAPTERS.length) timer = window.setTimeout(win, 900);
        } else {
          b.classList.remove('shake');
          void b.offsetWidth;
          b.classList.add('shake');
          feedback.className = 'order__feedback bad';
          feedback.textContent = ev.order > next ? 'Eso ocurrió más tarde. Busca un evento anterior.' : 'Ese evento ya pasó.';
        }
      });
      poolEl.appendChild(b);
    });
  };

  renderStory();
  return () => window.clearTimeout(timer);
}