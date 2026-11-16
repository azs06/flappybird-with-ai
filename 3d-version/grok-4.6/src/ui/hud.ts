import { medalFor } from "../game/config.ts";
import type { Phase } from "../game/config.ts";

export function bindHud() {
  const ui = document.getElementById("ui")!;
  const scoreEl = document.getElementById("score")!;
  const bestEl = document.getElementById("best-num")!;
  const title = document.getElementById("title")!;
  const dead = document.getElementById("dead")!;
  const paused = document.getElementById("paused")!;
  const boot = document.getElementById("boot")!;
  const bootLabel = document.getElementById("boot-label")!;
  const toast = document.getElementById("toast")!;
  const mute = document.getElementById("mute")!;
  const deadScore = document.getElementById("dead-score")!;
  const deadBest = document.getElementById("dead-best")!;
  const deadMedal = document.getElementById("dead-medal")!;
  const diag = document.getElementById("diag")!;
  const fpsEl = document.getElementById("fps")!;
  const hint = document.getElementById("hint")!;
  let toastTimer = 0;

  return {
    setPhase(p: Phase) {
      ui.dataset.phase = p;
      title.hidden = p !== "title";
      dead.hidden = p !== "dead";
      paused.hidden = p !== "paused";
      scoreEl.hidden = p === "title" || p === "boot" || p === "dead";
      hint.hidden = p !== "title";
    },
    setScore(n: number) {
      scoreEl.textContent = String(n);
    },
    setBest(n: number) {
      bestEl.textContent = String(n);
    },
    setMuted(v: boolean) {
      mute.textContent = v ? "sound off" : "sound on";
      mute.setAttribute("aria-pressed", String(v));
    },
    showToast(text: string) {
      toast.textContent = text;
      toast.dataset.show = "1";
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.dataset.show = "0";
      }, 1400);
    },
    setBoot(visible: boolean, label?: string) {
      boot.hidden = !visible;
      if (label) bootLabel.textContent = label;
    },
    setFps(n: number) {
      fpsEl.textContent = `${Math.round(n)} fps`;
    },
    setDiag(text: string, on: boolean) {
      diag.hidden = !on;
      if (on) diag.textContent = text;
    },
    writeDead(score: number, best: number) {
      deadScore.textContent = String(score);
      deadBest.textContent = String(best);
      const m = medalFor(score);
      deadMedal.textContent = m === "none" ? "no seal" : `${m} seal`;
      deadMedal.dataset.medal = m;
    },
  };
}

export type Hud = ReturnType<typeof bindHud>;
