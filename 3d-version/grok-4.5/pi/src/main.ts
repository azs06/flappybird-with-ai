import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("Missing #game-canvas");
}

// Prevent iOS rubber-band scroll.
document.body.addEventListener(
  "touchmove",
  (e) => {
    if (e.cancelable) e.preventDefault();
  },
  { passive: false },
);

const game = new Game(canvas);

// HMR safety
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
  });
}
