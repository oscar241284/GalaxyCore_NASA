const CSS = `
.game-overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  flex-direction: column;
  color: var(--fg);
  background: radial-gradient(ellipse at top, #1a1140 0%, var(--bg) 70%);
  animation: game-in 0.35s var(--ease-out);
}
.game-overlay__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px var(--gutter);
  border-bottom: 1px solid var(--line);
  background: rgba(5, 4, 13, 0.6);
}
.game-overlay__kicker {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-2);
}
.game-overlay__title {
  margin: 2px 0 0;
  font-family: var(--font-ui);
  font-size: clamp(16px, 2.2vw, 22px);
  letter-spacing: 0.04em;
}
.game-overlay__close {
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--fg);
  font-size: 26px;
  line-height: 1;
  background: var(--surface);
  cursor: pointer;
}
.game-overlay__close:hover { border-color: var(--accent-2); }
.game-overlay__body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.game-win {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(5, 4, 13, 0.72);
  backdrop-filter: blur(4px);
  animation: game-in 0.3s var(--ease-out);
}
.game-win__card {
  width: min(420px, 100%);
  padding: 32px 28px;
  border: 1px solid var(--ok);
  border-radius: var(--radius);
  text-align: center;
  background: var(--surface-strong);
  box-shadow: 0 0 40px rgba(52, 211, 153, 0.35);
}
.game-win__kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ok);
}
.game-win__title {
  margin: 8px 0 4px;
  font-family: var(--font-ui);
  font-size: 28px;
}
.game-win__pts {
  margin: 0 0 22px;
  font-family: var(--font-ui);
  font-size: 22px;
  color: var(--retro-amber);
}

.lander {
  position: absolute;
  inset: 0;
}
.lander__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.lander__hud {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, auto));
  gap: 8px 18px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: rgba(5, 4, 13, 0.7);
}
.lander__hud span {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.lander__hud b {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 400;
  color: var(--retro-green);
}
.lander__hud b.warn { color: var(--bad); }
.lander__fuel i {
  display: block;
  width: 120px;
  height: 10px;
  margin-top: 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.lander__fuel s {
  display: block;
  height: 100%;
  background: var(--retro-green);
  transition: width 0.1s linear;
}
.lander__fuel s.warn { background: var(--bad); }
.lander__msg {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(460px, calc(100% - 32px));
  padding: 26px 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  text-align: center;
  background: var(--surface-strong);
  box-shadow: var(--shadow);
  transform: translate(-50%, -50%);
}
.lander__msg[hidden] { display: none; }
.lander__msg h3 {
  margin: 0 0 10px;
  font-family: var(--font-ui);
  font-size: 20px;
}
.lander__msg h3.ok { color: var(--ok); }
.lander__msg h3.bad { color: var(--bad); }
.lander__msg p {
  margin: 0 0 14px;
  color: var(--muted);
  line-height: 1.5;
}
.lander__keys kbd {
  display: inline-block;
  min-width: 26px;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-body);
  color: var(--fg);
  background: var(--bg-3);
}
.lander__controls {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  gap: 10px;
}
.lander__controls button {
  width: 64px;
  height: 64px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--fg);
  font-size: 22px;
  background: rgba(20, 14, 44, 0.8);
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.lander__controls button:active {
  border-color: var(--accent-2);
  background: rgba(168, 85, 247, 0.35);
}
@media (hover: hover) and (pointer: fine) {
  .lander__controls { opacity: 0.55; }
}

.story {
  width: min(880px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 4vh, 40px) var(--gutter);
}
.story__progress {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}
.story__progress span {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
}
.story__progress span.on { background: var(--accent); box-shadow: var(--glow-soft); }
.story__panel {
  display: grid;
  grid-template-columns: minmax(180px, 300px) 1fr;
  gap: 28px;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  animation: game-in 0.35s var(--ease-out);
}
.story__art {
  width: 100%;
  border-radius: var(--radius-sm);
  background: #0c0920;
}
.story__date {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--retro-amber);
}
.story__title {
  margin: 4px 0 12px;
  font-family: var(--font-ui);
  font-size: clamp(20px, 2.6vw, 28px);
}
.story__text p:last-child {
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
}
.story__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
}
.story__count { color: var(--muted); }
.story__hint {
  margin: 0 0 18px;
  text-align: center;
  color: var(--muted);
}
.order__slots {
  display: grid;
  gap: 8px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}
.order__slots li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 8px 14px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
}
.order__slots li span {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-family: var(--font-ui);
  font-size: 13px;
  background: var(--bg-3);
}
.order__slots li.filled {
  border-style: solid;
  border-color: var(--ok);
  background: rgba(52, 211, 153, 0.12);
  animation: game-in 0.3s var(--ease-out);
}
.order__slots li.filled span { color: var(--accent-ink); background: var(--ok); }
.order__slots li em { font-style: normal; }
.order__pool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.order__item {
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--fg);
  font: inherit;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.order__item:hover,
.order__item:focus-visible {
  border-color: var(--accent-2);
  background: rgba(168, 85, 247, 0.16);
  outline: none;
}
.order__item.shake {
  border-color: var(--bad);
  animation: game-shake 0.35s;
}
.order__feedback {
  min-height: 1.4em;
  margin: 16px 0 0;
  text-align: center;
  font-weight: 600;
}
.order__feedback.ok { color: var(--ok); }
.order__feedback.bad { color: var(--bad); }

.audio-fact {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 4vh, 40px) var(--gutter);
}
.audio-fact__player {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}
.audio-fact__play {
  display: grid;
  place-items: center;
  flex: none;
  width: 84px;
  height: 84px;
  border: 0;
  border-radius: 50%;
  color: var(--accent-ink);
  background: var(--accent-2);
  box-shadow: var(--glow);
  cursor: pointer;
  transition: transform 0.2s var(--ease-spring);
}
.audio-fact__play:hover { transform: scale(1.06); }
.audio-fact__play svg { width: 38px; height: 38px; margin-left: 4px; }
.audio-fact__info { flex: 1; min-width: 0; }
.audio-fact__label {
  margin: 0 0 8px;
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--holo);
}
.audio-fact__bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 30px;
  margin-bottom: 12px;
}
.audio-fact__bars i {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: var(--accent-2);
}
.speaking .audio-fact__bars i { animation: game-bar 0.8s ease-in-out infinite; }
.speaking .audio-fact__bars i:nth-child(2) { animation-delay: 0.1s; }
.speaking .audio-fact__bars i:nth-child(3) { animation-delay: 0.25s; }
.speaking .audio-fact__bars i:nth-child(4) { animation-delay: 0.05s; }
.speaking .audio-fact__bars i:nth-child(5) { animation-delay: 0.3s; }
.speaking .audio-fact__bars i:nth-child(6) { animation-delay: 0.15s; }
.speaking .audio-fact__bars i:nth-child(7) { animation-delay: 0.2s; }
.audio-fact__btns { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--fg);
  font: inherit;
  font-size: 14px;
  background: transparent;
  cursor: pointer;
}
.chip:hover { border-color: var(--accent-2); }
.audio-fact__note {
  margin: 14px 0;
  text-align: center;
  color: var(--muted);
}
.audio-fact__transcript {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(103, 232, 249, 0.35);
  border-radius: var(--radius-sm);
  line-height: 1.55;
  background: rgba(103, 232, 249, 0.06);
}
.audio-fact__transcript[hidden] { display: none; }
.audio-fact__transcript p { margin: 0 0 10px; }
.audio-fact__transcript p:last-child { margin: 0; color: var(--muted); }
.audio-fact__transcript b {
  margin-right: 6px;
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--holo);
}
.audio-fact__q { margin-top: 18px; }

.game-overlay .quiz__question { margin: 0 0 12px; font-weight: 700; }
.game-overlay .quiz__options { display: grid; gap: 10px; }
.game-overlay .quiz__option {
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
}
.game-overlay .quiz__option:hover:not(:disabled) { border-color: var(--accent-2); background: rgba(168, 85, 247, 0.16); }
.game-overlay .quiz__option:disabled { cursor: default; opacity: 0.55; }
.game-overlay .quiz__letter {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--accent-ink);
  background: var(--accent-2);
}
.game-overlay .quiz__option--correct { opacity: 1 !important; border-color: var(--ok); background: rgba(52, 211, 153, 0.18); }
.game-overlay .quiz__option--correct .quiz__letter { background: var(--ok); }
.game-overlay .quiz__option--wrong { border-color: var(--bad); background: rgba(248, 113, 113, 0.12); animation: game-shake 0.35s; }
.game-overlay .quiz__option--wrong .quiz__letter { background: var(--bad); }

@keyframes game-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@keyframes game-shake {
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@keyframes game-bar {
  0%, 100% { height: 6px; }
  50% { height: 30px; }
}
@media (max-width: 700px) {
  .story__panel { grid-template-columns: 1fr; }
  .lander__hud { grid-template-columns: 1fr 1fr; font-size: 12px; }
  .audio-fact__player { flex-direction: column; text-align: center; }
  .audio-fact__bars, .audio-fact__btns { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .game-overlay, .game-win, .story__panel, .order__slots li.filled { animation: none; }
}
`;

export function injectGameStyles(): void {
  if (document.getElementById('game-styles')) return;
  const style = document.createElement('style');
  style.id = 'game-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
