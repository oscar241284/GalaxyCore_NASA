/**
 * INTRO EN VIDEO antes de un minijuego.
 *
 * Uso (en src/games/index.ts):
 *   play: withIntro('videos/moon_1.mp4', lunarLanding)
 *
 * El archivo va en la carpeta `public/` del proyecto (por ejemplo public/videos/moon_1.mp4).
 * Vite copia esa carpeta tal cual al compilar, así que la ruta funciona en local y publicada.
 *
 * Flujo: se reproduce el video → al terminar (o al tocar "Saltar") aparece el botón ¡JUGAR!
 * → se monta el juego en el mismo contenedor.
 */
import type { GameContext, MiniGame } from './index';

const CSS = `
.iv { position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden; background: #000; }
.iv video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.iv__tools { position: absolute; top: 14px; right: 14px; display: flex; gap: 8px; }
.iv__btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 15px; font-weight: 700; color: #fff; background: rgba(10,8,24,.7); backdrop-filter: blur(6px); transition: border-color .2s, background .2s;
}
.iv__btn:hover, .iv__btn:focus-visible { outline: none; border-color: #c084fc; background: rgba(46,26,90,.85); }
.iv__btn[hidden] { display: none; }
.iv__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255,255,255,.12); }
.iv__bar s { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #67e8f9, #c084fc); }
.iv__end {
  position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 16px; padding: 20px; text-align: center;
  background: radial-gradient(ellipse at center, rgba(5,4,13,.55) 0%, rgba(5,4,13,.88) 70%); animation: iv-in .4s ease-out;
}
.iv__end[hidden] { display: none; }
@keyframes iv-in { from { opacity: 0; } }
.iv__end p { margin: 0; font-family: var(--font-ui); font-size: clamp(14px, 1.6vw, 18px); letter-spacing: .14em; color: #c4b5fd; }
.iv__end h3 { margin: 0; font-family: var(--font-ui); font-size: clamp(22px, 3vw, 34px); color: #fff; }
.iv__play {
  display: inline-flex; align-items: center; gap: 14px; padding: 18px 44px 18px 32px; border: 0; border-radius: 999px; cursor: pointer;
  font-family: var(--font-ui); font-size: clamp(22px, 2.4vw, 30px); font-weight: 900; letter-spacing: .12em; color: #fff;
  background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 8px 0 #0f6b32, 0 14px 34px rgba(34,197,94,.5); transition: transform .12s, filter .2s;
}
.iv__play:hover, .iv__play:focus-visible { outline: none; filter: brightness(1.1); }
.iv__play:active { transform: translateY(6px); box-shadow: 0 2px 0 #0f6b32; }
.iv__play svg { width: 30px; height: 30px; }
`;

function injectStyles(): void {
  if (document.getElementById('iv-styles')) return;
  const s = document.createElement('style');
  s.id = 'iv-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';

/**
 * Envuelve un minijuego para mostrar antes un video.
 * @param file ruta del video dentro de `public/` (sin barra inicial), p. ej. 'videos/moon_1.mp4'
 */
export function withIntro(file: string, game: MiniGame, texts = { kicker: 'MISIÓN 1', title: '¿Listo para alunizar?' }): MiniGame {
  return ({ root, win }: GameContext) => {
    injectStyles();
    const src = `${import.meta.env.BASE_URL}${file}`;
    root.innerHTML = `
      <div class="iv">
        <video playsinline preload="auto" src="${src}" aria-label="Video de introducción"></video>
        <div class="iv__tools">
          <button type="button" class="iv__btn" data-unmute hidden>🔊 Activar sonido</button>
          <button type="button" class="iv__btn" data-skip>Saltar video ⏭</button>
        </div>
        <div class="iv__bar" aria-hidden="true"><s></s></div>
        <div class="iv__end" hidden>
          <p>${texts.kicker}</p>
          <h3>${texts.title}</h3>
          <button type="button" class="iv__play" data-play>${PLAY}¡JUGAR!</button>
          <button type="button" class="iv__btn" data-replay>↺ Ver el video otra vez</button>
        </div>
      </div>`;

    const video = root.querySelector<HTMLVideoElement>('video')!;
    const end = root.querySelector<HTMLElement>('.iv__end')!;
    const tools = root.querySelector<HTMLElement>('.iv__tools')!;
    const unmute = root.querySelector<HTMLButtonElement>('[data-unmute]')!;
    const bar = root.querySelector<HTMLElement>('.iv__bar s')!;
    let gameCleanup: (() => void) | void;
    let started = false;

    const showEnd = () => {
      video.pause();
      end.hidden = false;
      tools.hidden = true;
      root.querySelector<HTMLButtonElement>('[data-play]')!.focus();
    };

    const play = () => {
      end.hidden = true;
      tools.hidden = false;
      video.currentTime = 0;
      // el clic en el nivel cuenta como interacción, así que casi siempre suena;
      // si el navegador lo bloquea, se reproduce en silencio y se ofrece activar el sonido
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        unmute.hidden = false;
        video.play().catch(showEnd);
      });
    };

    const startGame = () => {
      if (started) return;
      started = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      root.innerHTML = '';
      gameCleanup = game({ root, win });
    };

    video.addEventListener('ended', showEnd);
    video.addEventListener('error', showEnd); // si falta el archivo, se pasa directo al botón JUGAR
    video.addEventListener('timeupdate', () => {
      if (video.duration) bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
    });
    unmute.addEventListener('click', () => {
      video.muted = false;
      unmute.hidden = true;
    });
    root.querySelector('[data-skip]')!.addEventListener('click', showEnd);
    root.querySelector('[data-replay]')!.addEventListener('click', play);
    root.querySelector('[data-play]')!.addEventListener('click', startGame);
    play();

    return () => {
      if (!started) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (typeof gameCleanup === 'function') gameCleanup();
    };
  };
}