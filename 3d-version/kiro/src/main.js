import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// --- Input ------------------------------------------------------------------
const FLAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter', 'NumpadEnter']);

const isInteractive = (target) =>
  target instanceof Element && target.closest('button, a, [role="button"]');

window.addEventListener(
  'keydown',
  (e) => {
    if (e.repeat) return;

    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      game.setPaused(!game.paused);
      return;
    }
    if (e.code === 'KeyM') {
      e.preventDefault();
      game.toggleMute();
      return;
    }
    if (!FLAP_KEYS.has(e.code)) return;

    // Let the keyboard activate a focused button instead of double-firing.
    if (isInteractive(document.activeElement) && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
      return;
    }
    if (e.code === 'Space' && isInteractive(document.activeElement)) {
      document.activeElement.blur();
    }
    e.preventDefault();
    game.sound.resume();
    game.input();
  },
  { passive: false },
);

window.addEventListener('pointerdown', (e) => {
  if (isInteractive(e.target)) return;
  game.sound.resume();
  game.input();
});

// Stop iOS double-tap zoom / rubber banding on the canvas.
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => {
  if (e.target === canvas) e.preventDefault();
});

// --- Lifecycle --------------------------------------------------------------
let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    game.resize();
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.setPaused(true);
});
window.addEventListener('blur', () => game.setPaused(true));

// --- Loop -------------------------------------------------------------------
function loop() {
  game.frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Handy for tweaking from the console.
window.game = game;
