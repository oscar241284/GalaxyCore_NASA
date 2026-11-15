import type { GameContext } from './index';
import { tr } from '../i18n';

const FACT_EN =
  'Did you know? The Lunar Roving Vehicle traveled to the Moon folded up like a sandwich, ' +
  'tucked into the side of the lunar module. The astronauts pulled on some straps, and springs ' +
  'helped it unfold. Today, three of these moon buggies are still parked on the Moon, ' +
  'left there by the Apollo 15, 16 and 17 missions.';

const FACT_ES =
  '¿Sabías que el vehículo lunar viajó a la Luna plegado como un sándwich, guardado en un ' +
  'costado del módulo lunar? Los astronautas tiraban de unas cintas y unos resortes ayudaban ' +
  'a desplegarlo. Hoy, tres de estos "autos lunares" siguen estacionados en la Luna, dejados ' +
  'por las misiones Apolo 15, 16 y 17.';

interface Question {
  q: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Question[] = [
  {
    q: tr('How did the rover travel to the Moon?', '¿Cómo viajó el rover a la Luna?'),
    options: [tr('Folded on the side of the lunar module', 'Plegado en un costado del módulo lunar'), tr('Inside the rocket, already assembled', 'Dentro del cohete, ya armado'), tr('It was built on the Moon piece by piece', 'Lo armaron en la Luna pieza por pieza')],
    correct: 0,
  },
  {
    q: tr('How many lunar rovers are still parked on the Moon?', '¿Cuántos rovers lunares siguen estacionados en la Luna?'),
    options: [tr('One', 'Uno'), tr('Three', 'Tres'), tr('Five', 'Cinco')],
    correct: 1,
  },
];

export default function audioFact({ root, win }: GameContext): () => void {
  const synth: SpeechSynthesis | undefined = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
  let timer = 0;

  root.innerHTML = `
    <div class="audio-fact">
      <div class="audio-fact__player">
        <button type="button" class="audio-fact__play" data-play aria-label="${tr('Listen to the fact in English', 'Escuchar el dato en inglés')}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </button>
        <div class="audio-fact__info">
          <p class="audio-fact__label">Fun fact · English</p>
          <div class="audio-fact__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="audio-fact__btns">
            <button type="button" class="chip" data-slow>${tr('Slower', 'Más lento')}</button>
            <button type="button" class="chip" data-stop>${tr('Stop', 'Detener')}</button>
            <button type="button" class="chip" data-text>${tr('Show text', 'Ver texto')}</button>
          </div>
        </div>
      </div>
      <p class="audio-fact__note" data-note>${tr('Press ▶ to listen to the fun fact in English.', 'Pulsa ▶ para escuchar el dato curioso en inglés.')}</p>
      <div class="audio-fact__transcript" data-transcript hidden>
        <p lang="en"><b>EN</b> ${FACT_EN}</p>
        <p><b>ES</b> ${FACT_ES}</p>
      </div>
      <div class="audio-fact__questions"></div>
      <p class="order__feedback" data-feedback role="status" aria-live="polite"></p>
    </div>`;

  const wrap = root.querySelector<HTMLElement>('.audio-fact')!;
  const note = root.querySelector<HTMLElement>('[data-note]')!;
  const transcript = root.querySelector<HTMLElement>('[data-transcript]')!;
  const feedback = root.querySelector<HTMLElement>('[data-feedback]')!;
  const textBtn = root.querySelector<HTMLButtonElement>('[data-text]')!;

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = synth?.getVoices() ?? [];
    return (
      voices.find((v) => v.lang === 'en-US' && /female|zira|samantha|jenny|aria|google/i.test(v.name)) ??
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.startsWith('en'))
    );
  };

  const speak = (rate: number) => {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(FACT_EN);
    u.lang = 'en-US';
    u.rate = rate;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onstart = () => {
      wrap.classList.add('speaking');
      note.textContent = tr('Listening… pay attention to the details.', 'Escuchando… presta atención a los detalles.');
    };
    u.onend = u.onerror = () => {
      wrap.classList.remove('speaking');
      note.textContent = tr('Now answer the questions. You can listen to it again.', 'Ahora responde las preguntas. Puedes volver a escucharlo.');
    };
    synth.speak(u);
  };

  if (!synth) {
    note.textContent = tr('Your browser cannot play speech. Read the fact in English and answer.', 'Tu navegador no puede reproducir voz. Lee el dato en inglés y responde.');
    transcript.hidden = false;
    textBtn.textContent = tr('Hide text', 'Ocultar texto');
  }

  root.querySelector('[data-play]')!.addEventListener('click', () => speak(0.95));
  root.querySelector('[data-slow]')!.addEventListener('click', () => speak(0.7));
  root.querySelector('[data-stop]')!.addEventListener('click', () => {
    synth?.cancel();
    wrap.classList.remove('speaking');
  });
  textBtn.addEventListener('click', () => {
    transcript.hidden = !transcript.hidden;
    textBtn.textContent = transcript.hidden ? tr('Show text', 'Ver texto') : tr('Hide text', 'Ocultar texto');
  });

  const solved = QUESTIONS.map(() => false);
  const qWrap = root.querySelector<HTMLElement>('.audio-fact__questions')!;
  QUESTIONS.forEach((question, qi) => {
    const box = document.createElement('div');
    box.className = 'audio-fact__q';
    box.innerHTML = `<p class="quiz__question">${qi + 1}. ${question.q}</p><div class="quiz__options"></div>`;
    const list = box.querySelector<HTMLElement>('.quiz__options')!;
    question.options.forEach((opt, oi) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz__option';
      b.innerHTML = `<span class="quiz__letter">${'ABC'[oi]}</span>${opt}`;
      b.addEventListener('click', () => {
        if (solved[qi] || b.disabled) return;
        if (oi === question.correct) {
          solved[qi] = true;
          b.classList.add('quiz__option--correct');
          list.querySelectorAll('button').forEach((x) => (x.disabled = true));
          if (solved.every(Boolean)) {
            feedback.className = 'order__feedback ok';
            feedback.textContent = tr('Great job! You understood the fact in English!', 'Great job! ¡Entendiste el dato en inglés!');
            synth?.cancel();
            timer = window.setTimeout(win, 900);
          } else {
            feedback.className = 'order__feedback ok';
            feedback.textContent = tr('Correct! Go on to the next question.', '¡Correcto! Sigue con la otra pregunta.');
          }
        } else {
          b.disabled = true;
          b.classList.add('quiz__option--wrong');
          feedback.className = 'order__feedback bad';
          feedback.textContent = tr('Incorrect. Listen to the audio again or press "Slower".', 'Incorrecto. Vuelve a escuchar el audio o pulsa "Más lento".');
        }
      });
      list.appendChild(b);
    });
    qWrap.appendChild(box);
  });

  synth?.getVoices();

  return () => {
    window.clearTimeout(timer);
    synth?.cancel();
  };
}
