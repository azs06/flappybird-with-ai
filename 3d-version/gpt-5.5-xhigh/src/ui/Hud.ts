import type { GamePhase, SimulationSnapshot } from "../simulation/types";

interface HudElements {
  score: HTMLElement;
  best: HTMLElement;
  actionButton: HTMLButtonElement;
  stateBanner: HTMLElement;
}

const PHASE_LABEL: Record<GamePhase, string> = {
  ready: "Ready",
  playing: "",
  gameOver: "Game Over"
};

export class Hud {
  private lastPhase: GamePhase | null = null;
  private lastScore = -1;
  private lastBest = -1;

  constructor(private readonly elements: HudElements) {}

  update(snapshot: SimulationSnapshot): void {
    if (snapshot.score !== this.lastScore) {
      this.elements.score.textContent = String(snapshot.score);
      this.lastScore = snapshot.score;
    }

    if (snapshot.best !== this.lastBest) {
      this.elements.best.textContent = String(snapshot.best);
      this.lastBest = snapshot.best;
    }

    if (snapshot.phase === this.lastPhase) {
      return;
    }

    this.lastPhase = snapshot.phase;
    this.elements.stateBanner.textContent = PHASE_LABEL[snapshot.phase];
    this.elements.stateBanner.classList.toggle("hidden", snapshot.phase === "playing");
    this.elements.actionButton.classList.toggle("hidden", snapshot.phase === "playing");
    this.elements.actionButton.classList.toggle("again", snapshot.phase === "gameOver");
    this.elements.actionButton.setAttribute(
      "aria-label",
      snapshot.phase === "gameOver" ? "Restart game" : "Start game"
    );
  }
}
