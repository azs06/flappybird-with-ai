export type UiState = "title" | "ready" | "playing" | "gameover";

export class Hud {
  private scoreEl = document.getElementById("score-value")!;
  private bestEl = document.getElementById("best-value")!;
  private bestChip = document.getElementById("best-value")!;
  private hud = document.getElementById("hud")!;
  private title = document.getElementById("title-screen")!;
  private gameover = document.getElementById("gameover-screen")!;
  private ready = document.getElementById("ready-banner")!;
  private finalScore = document.getElementById("final-score")!;
  private finalBest = document.getElementById("final-best")!;
  private newBest = document.getElementById("new-best-badge")!;
  private flash = document.getElementById("flash")!;
  private startBtn = document.getElementById("start-btn") as HTMLButtonElement;
  private retryBtn = document.getElementById("retry-btn") as HTMLButtonElement;

  private score = 0;
  private state: UiState = "title";
  private onStart: () => void;
  private onRetry: () => void;

  constructor(onStart: () => void, onRetry: () => void) {
    this.onStart = onStart;
    this.onRetry = onRetry;
    this.startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onStart();
    });
    this.retryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onRetry();
    });
  }

  setBest(n: number): void {
    this.bestEl.textContent = String(n);
    this.bestChip.textContent = String(n);
  }

  setScore(n: number): void {
    if (n === this.score) return;
    this.score = n;
    this.scoreEl.textContent = String(n);
    this.scoreEl.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.18)" },
        { transform: "scale(1)" },
      ],
      { duration: 180, easing: "ease-out" },
    );
  }

  showState(state: UiState, opts?: { score?: number; best?: number; isNewBest?: boolean }): void {
    this.state = state;
    this.title.classList.toggle("hidden", state !== "title");
    this.gameover.classList.toggle("hidden", state !== "gameover");
    this.ready.classList.toggle("hidden", state !== "ready");
    this.hud.classList.toggle("hidden", state === "title");

    if (opts?.score != null) this.finalScore.textContent = String(opts.score);
    if (opts?.best != null) {
      this.finalBest.textContent = String(opts.best);
      this.setBest(opts.best);
    }
    this.newBest.classList.toggle("hidden", !opts?.isNewBest);

    if (state === "playing" || state === "ready") {
      this.setScore(opts?.score ?? this.score);
    }
  }

  getState(): UiState {
    return this.state;
  }

  flashScreen(): void {
    this.flash.classList.add("on");
    window.setTimeout(() => this.flash.classList.remove("on"), 90);
  }
}
