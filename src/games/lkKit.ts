import { lang, locale, tr } from '../i18n';

export interface Guess {
  q: string;
  options: string[];
  correct: number;
  why: string;
}

const CSS = `
.lk { position: absolute; inset: 0; overflow-y: auto; color: var(--fg);
  background: radial-gradient(ellipse 90% 70% at 70% 0%, #1a1238 0%, #07060f 70%); }
.lk__wrap { width: min(1100px, 100%); margin: 0 auto; padding: 18px clamp(12px, 3vw, 28px) 28px; }

.lk-brief { display: grid; place-items: center; min-height: 100%; padding: 20px; }
.lk-brief__card { width: min(620px, 100%); padding: 26px clamp(18px, 4vw, 32px); border: 2px solid var(--lk-accent, #ef4444); border-radius: 24px;
  background: linear-gradient(180deg, rgba(40,14,24,.92), rgba(16,10,30,.95)); box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 0 0 6px rgba(239,68,68,.12); }
.lk-brief__kicker { margin: 0; font-family: var(--font-ui); font-size: 12px; letter-spacing: .2em; color: var(--lk-soft, #fca5a5); }
.lk-brief__title { margin: 6px 0 12px; font-family: var(--font-ui); font-size: clamp(22px, 3vw, 30px); line-height: 1.15; }
.lk-brief__art { display: grid; place-items: center; margin: 4px 0 14px; }
.lk-brief__art svg { width: min(240px, 60%); height: auto; }
.lk-brief__text { margin: 0 0 6px; font-size: 17px; line-height: 1.5; }
.lk-brief__goal { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0 0; padding: 12px 14px; border-radius: 14px; font-size: 16px; font-weight: 700; background: rgba(103,232,249,.1); border: 1px solid rgba(103,232,249,.35); color: #a5f3fc; }
.lk-brief__row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 16px; }

.lk-guess { margin-top: 18px; padding: 16px; border-radius: 18px; background: #fbf7ff; color: #1a0b33; }
.lk-guess__q { margin: 0 0 10px; font-size: 17px; font-weight: 800; }
.lk-guess__q small { display: block; margin-bottom: 2px; font-family: var(--font-ui); font-size: 11px; letter-spacing: .16em; color: #7c3aed; }
.lk-guess__opts { display: flex; flex-wrap: wrap; gap: 8px; }
.lk-guess__opts button { flex: 1 1 180px; padding: 12px; border: 2px solid #7c3aed; border-radius: 14px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 800; color: #4c1d95; background: #ede9fe; box-shadow: 0 3px 0 #7c3aed; }
.lk-guess__opts button:hover:not(:disabled), .lk-guess__opts button:focus-visible { outline: none; background: #ddd6fe; transform: translateY(-1px); }
.lk-guess__opts button.ok { color: #14532d; border-color: #16a34a; background: #bbf7d0; box-shadow: 0 3px 0 #16a34a; }
.lk-guess__opts button.ok::before { content: '✓ '; }
.lk-guess__opts button.no { opacity: .5; }
.lk-guess__opts button:disabled { cursor: default; }
.lk-guess__why { margin: 12px 0 0; font-size: 15px; line-height: 1.5; }
.lk-guess__why b { color: #6d28d9; }

.lk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 10px 18px; border: 2px solid rgba(255,255,255,.18); border-radius: 16px; cursor: pointer;
  font: inherit; font-size: 15px; font-weight: 800; color: var(--fg); background: rgba(30,22,60,.85); box-shadow: 0 4px 0 rgba(0,0,0,.45); transition: transform .1s, border-color .2s, background .2s; user-select: none; -webkit-user-select: none; touch-action: manipulation; }
.lk-btn:hover:not(:disabled), .lk-btn:focus-visible { outline: none; border-color: #c084fc; background: rgba(50,32,96,.95); }
.lk-btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,.45); }
.lk-btn:disabled { opacity: .4; cursor: not-allowed; }
.lk-btn svg { width: 22px; height: 22px; flex: none; }
.lk-btn--go { border-color: #16a34a; color: #fff; background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 5px 0 #0f6b32; }
.lk-btn--go:hover:not(:disabled), .lk-btn--go:focus-visible { background: linear-gradient(135deg, #2fdc6c, #18b350); border-color: #86efac; }
.lk-btn--red { border-color: #ef4444; background: rgba(127,29,29,.75); }
.lk-btn--on { border-color: #67e8f9; background: rgba(14,116,144,.6); }
.lk-btn--small { min-height: 38px; padding: 6px 12px; font-size: 13px; border-radius: 12px; }

.lk-top { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lk-task { display: flex; gap: 10px; align-items: center; font-size: 16px; font-weight: 700; }
.lk-task i { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; font-style: normal; font-weight: 900; color: #1a0b33; background: var(--lk-soft, #fca5a5); }
.lk-dots { display: flex; gap: 6px; align-items: center; font-family: var(--font-ui); font-size: 12px; letter-spacing: .1em; color: var(--muted); }
.lk-dots span { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); }
.lk-dots span.done { background: #34d399; border-color: #34d399; }
.lk-dots span.now { border-color: var(--lk-soft, #fca5a5); box-shadow: 0 0 0 3px rgba(252,165,165,.25); }

.lk-say { display: flex; gap: 10px; align-items: flex-start; min-height: 52px; margin: 12px 0 0; padding: 12px 14px; border-left: 4px solid #67e8f9; border-radius: 12px; font-size: 15px; line-height: 1.45; background: rgba(103,232,249,.08); }
.lk-say b { flex: none; font-family: var(--font-ui); font-size: 11px; letter-spacing: .14em; color: #67e8f9; padding-top: 3px; }
.lk-say.ok { border-color: #34d399; background: rgba(52,211,153,.1); }
.lk-say.ok b { color: #34d399; }
.lk-say.warn { border-color: #fbbf24; background: rgba(251,191,36,.1); }
.lk-say.warn b { color: #fbbf24; }

.lk-learn { margin-top: 14px; padding: 16px; border-radius: 16px; background: rgba(52,211,153,.1); border: 1px solid rgba(52,211,153,.4); font-size: 16px; line-height: 1.5; }
.lk-learn h4 { margin: 0 0 6px; font-family: var(--font-ui); font-size: 14px; letter-spacing: .1em; color: #34d399; }

@media (prefers-reduced-motion: reduce) { .lk * { animation: none !important; transition: none !important; } }
`;

export function injectKit(): void {
  if (document.getElementById('lk-styles')) return;
  const s = document.createElement('style');
  s.id = 'lk-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const synth: SpeechSynthesis | undefined = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined;
export const canSpeak = !!synth;
export function speak(text: string): void {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  const v = synth.getVoices().find((x) => x.lang.startsWith(lang));
  if (v) u.voice = v;
  synth.speak(u);
}
export function stopSpeak(): void {
  synth?.cancel();
}
const autoVoice = () => {
  try {
    return localStorage.getItem('novacore:auto-voice') === 'on';
  } catch {
    return false;
  }
};
const soundOn = () => {
  try {
    return localStorage.getItem('novacore:ui-sound') !== 'off';
  } catch {
    return true;
  }
};

let audio: AudioContext | null = null;
export function tone(f1: number, f2: number, d: number, type: OscillatorType = 'sine', vol = 0.05, delay = 0): void {
  if (!soundOn()) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime + delay;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  } catch {
  }
}
export const sfx = {
  click: () => tone(700, 900, 0.06, 'square', 0.02),
  ok: () => {
    tone(988, 988, 0.08, 'square', 0.03);
    tone(1319, 1319, 0.2, 'square', 0.03, 0.08);
  },
  soft: () => tone(330, 250, 0.2, 'triangle', 0.05),
  beep: () => tone(1200, 1200, 0.08, 'sine', 0.04),
  radio: () => tone(400, 1400, 0.25, 'sawtooth', 0.015),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.06, i * 0.1)),
};

export const ICON = {
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
};


interface BriefOpts {
  kicker: string;
  title: string;
  text: string;
  goal: string;
  art?: string;
  accent?: string;
  soft?: string;
  guess: Guess;
  onStart: () => void;
}

export function brief(root: HTMLElement, o: BriefOpts): void {
  root.innerHTML = `
    <div class="lk"${o.accent ? ` style="--lk-accent:${o.accent};--lk-soft:${o.soft ?? o.accent}"` : ''}><div class="lk-brief">
      <div class="lk-brief__card">
        <p class="lk-brief__kicker">${o.kicker}</p>
        <h3 class="lk-brief__title">${o.title}</h3>
        <div class="lk-brief__art">${o.art ?? MER_SVG}</div>
        <p class="lk-brief__text">${o.text}</p>
        <p class="lk-brief__goal">🎯 <span>${o.goal}</span></p>
        <div class="lk-guess">
          <p class="lk-guess__q"><small>${tr('GUESS!', '¿ADIVINA?')}</small>${o.guess.q}</p>
          <div class="lk-guess__opts">${o.guess.options.map((t, i) => `<button type="button" data-i="${i}">${t}</button>`).join('')}</div>
          <p class="lk-guess__why" data-why hidden></p>
        </div>
        <div class="lk-brief__row">
          <button type="button" class="lk-btn lk-btn--go" data-start disabled>${ICON.play}${tr('Start!', '¡Empezar!')}</button>
          ${canSpeak ? `<button type="button" class="lk-btn" data-listen>${ICON.speak}${tr('Listen', 'Escuchar')}</button>` : ''}
        </div>
      </div>
    </div></div>`;
  const startBtn = root.querySelector<HTMLButtonElement>('[data-start]')!;
  const why = root.querySelector<HTMLElement>('[data-why]')!;
  const read = `${o.title}. ${o.text} ${o.goal}. ${tr('Guess!', '¿Adivina?')} ${o.guess.q}`;
  root.querySelector('[data-listen]')?.addEventListener('click', () => speak(why.hidden ? read : why.textContent ?? read));
  if (autoVoice()) speak(read);
  root.querySelectorAll<HTMLButtonElement>('.lk-guess__opts button').forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      const ok = i === o.guess.correct;
      root.querySelectorAll<HTMLButtonElement>('.lk-guess__opts button').forEach((x, j) => {
        x.disabled = true;
        x.classList.add(j === o.guess.correct ? 'ok' : 'no');
      });
      (ok ? sfx.ok : sfx.soft)();
      why.hidden = false;
      why.innerHTML = `<b>${ok ? tr('Good thinking!', '¡Bien pensado!') : tr('Almost!', '¡Casi!')}</b> ${o.guess.why}`;
      if (autoVoice()) speak(why.textContent ?? '');
      startBtn.disabled = false;
      startBtn.focus();
    }),
  );
  startBtn.addEventListener('click', () => {
    stopSpeak();
    sfx.click();
    o.onStart();
  });
}

export const dots = (total: number, now: number, label = tr('STAGE', 'ETAPA')) =>
  `<span class="lk-dots">${label}&nbsp;${Array.from({ length: total }, (_, i) => `<span class="${i < now ? 'done' : i === now ? 'now' : ''}"></span>`).join('')}</span>`;

export function say(el: HTMLElement, text: string, kind: '' | 'ok' | 'warn' = '', who = 'CONTROL'): void {
  el.className = `lk-say${kind ? ` ${kind}` : ''}`;
  el.innerHTML = `<b>${who}</b><span>${text}</span>`;
  if (autoVoice()) speak(text);
}

export const theme = (accent: string, soft: string) => ` style="--lk-accent:${accent};--lk-soft:${soft}"`;

export const MER_SVG = `
<svg viewBox="0 0 220 140" aria-hidden="true">
  <ellipse cx="110" cy="132" rx="96" ry="6" fill="rgba(0,0,0,.4)"/>
  <rect x="104" y="20" width="6" height="50" fill="#9ca3af"/>
  <rect x="88" y="8" width="40" height="16" rx="4" fill="#d1d5db" stroke="#6b7280" stroke-width="2"/>
  <circle cx="100" cy="16" r="4" fill="#111827"/><circle cx="116" cy="16" r="4" fill="#111827"/>
  <path d="M20 66 h180 l-8 10 h-164 z" fill="#1e3a8a" stroke="#93c5fd" stroke-width="2"/>
  <rect x="58" y="76" width="104" height="26" rx="4" fill="#e5e7eb" stroke="#6b7280" stroke-width="2"/>
  <path d="M44 120 l26 -18 h80 l26 18" stroke="#9ca3af" stroke-width="5" fill="none"/>
  ${[44, 110, 176].map((x) => `<circle cx="${x}" cy="120" r="12" fill="#374151" stroke="#d1d5db" stroke-width="3"/>`).join('')}
</svg>`;
