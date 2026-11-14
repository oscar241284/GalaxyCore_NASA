/** Contenido del modal de quiz: tarjeta informativa + pregunta de opción múltiple. */
import type { QuizQuestion } from '../data/quizzes';
import type { LevelInfo } from '../types';
import { esc } from './modal';

/** Estilos del quiz (se insertan una sola vez en la página). */
const QUIZ_CSS = `
.quiz__card {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(103, 232, 249, 0.35);
  border-radius: var(--radius-sm);
  background: rgba(103, 232, 249, 0.06);
}
.quiz__card-title {
  margin: 0 0 6px;
  font-family: var(--font-ui);
  font-size: 15px;
  letter-spacing: 0.05em;
  color: var(--holo);
}
.quiz__card-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--fg);
}
.quiz__question {
  margin: 0 0 12px;
  font-weight: 700;
  color: var(--fg);
}
.quiz__options {
  display: grid;
  gap: 10px;
}
.quiz__option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--fg);
  font: inherit;
  text-align: left;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s var(--ease-out);
}
.quiz__option:hover:not(:disabled),
.quiz__option:focus-visible {
  border-color: var(--accent-2);
  background: rgba(168, 85, 247, 0.16);
  transform: translateX(4px);
  outline: none;
}
.quiz__option:disabled {
  cursor: default;
  opacity: 0.55;
}
.quiz__letter {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--accent-ink);
  background: var(--accent-2);
}
.quiz__option--correct,
.quiz__option--correct:disabled {
  opacity: 1;
  border-color: var(--ok);
  background: rgba(52, 211, 153, 0.18);
}
.quiz__option--correct .quiz__letter {
  background: var(--ok);
}
.quiz__option--wrong {
  border-color: var(--bad);
  background: rgba(248, 113, 113, 0.12);
  animation: quiz-shake 0.35s;
}
.quiz__option--wrong .quiz__letter {
  background: var(--bad);
}
.quiz__feedback {
  min-height: 1.4em;
  margin: 14px 0 0;
  font-weight: 600;
}
.quiz__feedback--ok {
  color: var(--ok);
}
.quiz__feedback--bad {
  color: var(--bad);
}
@keyframes quiz-shake {
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@media (prefers-reduced-motion: reduce) {
  .quiz__option,
  .quiz__option--wrong {
    transition: none;
    animation: none;
  }
}
`;

function injectStyles(): void {
  if (document.getElementById('quiz-styles')) return;
  const style = document.createElement('style');
  style.id = 'quiz-styles';
  style.textContent = QUIZ_CSS;
  document.head.appendChild(style);
}

export interface QuizResult {
  /** intentos fallidos antes de acertar */
  mistakes: number;
}

/** Baraja una copia del arreglo (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Crea el cuerpo del quiz. Llama a `onCorrect` cuando el jugador acierta
 * (tras una breve pausa para que vea el resultado).
 */
export function buildQuiz(level: LevelInfo, quiz: QuizQuestion, onCorrect: (r: QuizResult) => void): HTMLElement {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'quiz';
  root.innerHTML = `
    <div class="quiz__card">
      <h3 class="quiz__card-title">${esc(level.card.title)}</h3>
      <p class="quiz__card-text">${esc(level.card.text)}</p>
    </div>
    <p class="quiz__question">${esc(quiz.question)}</p>
    <div class="quiz__options" role="group" aria-label="Opciones de respuesta"></div>
    <p class="quiz__feedback" role="status" aria-live="polite"></p>`;

  const list = root.querySelector<HTMLElement>('.quiz__options')!;
  const feedback = root.querySelector<HTMLElement>('.quiz__feedback')!;
  let mistakes = 0;
  let solved = false;

  const options = shuffle(quiz.options.map((text, i) => ({ text, ok: i === quiz.correct })));
  options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz__option';
    b.innerHTML = `<span class="quiz__letter">${'ABCD'[i] ?? i + 1}</span>${esc(opt.text)}`;
    b.addEventListener('click', () => {
      if (solved || b.disabled) return;
      if (opt.ok) {
        solved = true;
        b.classList.add('quiz__option--correct');
        list.querySelectorAll('button').forEach((x) => (x.disabled = true));
        feedback.className = 'quiz__feedback quiz__feedback--ok';
        feedback.textContent = mistakes === 0 ? '¡Correcto a la primera!' : '¡Correcto!';
        window.setTimeout(() => onCorrect({ mistakes }), 900);
      } else {
        mistakes++;
        b.disabled = true;
        b.classList.add('quiz__option--wrong');
        feedback.className = 'quiz__feedback quiz__feedback--bad';
        feedback.textContent = `Incorrecto. Pista: ${quiz.hint}`;
      }
    });
    list.appendChild(b);
  });

  return root;
}