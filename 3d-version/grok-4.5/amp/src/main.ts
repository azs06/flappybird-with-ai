import { Game } from './game/game';

const canvas = document.getElementById('game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game-canvas');
}

const game = new Game(canvas);
game.start();

// HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
  });
}

// Expose for debugging / bot playtests
declare global {
  interface Window {
    __AETHER_FLAP__?: Game;
  }
}
window.__AETHER_FLAP__ = game;
