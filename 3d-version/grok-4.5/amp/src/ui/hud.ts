export type ScreenId = 'title' | 'playing' | 'paused' | 'gameover';

export class HUD {
  private readonly scoreEl: HTMLElement;
  private readonly bestEl: HTMLElement;
  private readonly finalScoreEl: HTMLElement;
  private readonly finalBestEl: HTMLElement;
  private readonly newRecordEl: HTMLElement;
  private readonly comboEl: HTMLElement;
  private readonly hudRoot: HTMLElement;
  private readonly title: HTMLElement;
  private readonly pause: HTMLElement;
  private readonly gameover: HTMLElement;
  private readonly touch: HTMLElement;
  private readonly toast: HTMLElement;
  private toastTimer = 0;
  private displayedScore = 0;
  private targetScore = 0;

  constructor() {
    this.scoreEl = el('score-value');
    this.bestEl = el('best-value');
    this.finalScoreEl = el('final-score');
    this.finalBestEl = el('final-best');
    this.newRecordEl = el('new-record');
    this.comboEl = el('combo-badge');
    this.hudRoot = el('hud');
    this.title = el('title-screen');
    this.pause = el('pause-screen');
    this.gameover = el('gameover-screen');
    this.touch = el('touch-flap');
    this.toast = el('toast');
  }

  setBest(n: number): void {
    this.bestEl.textContent = String(n);
  }

  setScore(n: number): void {
    this.targetScore = n;
  }

  showCombo(text: string | null): void {
    if (!text) {
      this.comboEl.classList.add('hidden');
      return;
    }
    this.comboEl.textContent = text;
    this.comboEl.classList.remove('hidden');
  }

  setScreen(id: ScreenId): void {
    this.title.classList.toggle('hidden', id !== 'title');
    this.pause.classList.toggle('hidden', id !== 'paused');
    this.gameover.classList.toggle('hidden', id !== 'gameover');
    this.hudRoot.classList.toggle('hidden', id === 'title');
    this.touch.classList.toggle('hidden', id !== 'playing');
  }

  showGameOver(score: number, best: number, isNew: boolean): void {
    this.finalScoreEl.textContent = String(score);
    this.finalBestEl.textContent = String(best);
    this.newRecordEl.classList.toggle('hidden', !isNew);
    this.setScreen('gameover');
  }

  showToast(msg: string, ms = 1400): void {
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    this.toastTimer = ms / 1000;
  }

  update(dt: number): void {
    if (this.displayedScore !== this.targetScore) {
      const diff = this.targetScore - this.displayedScore;
      const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * dt * 14));
      this.displayedScore =
        Math.abs(diff) <= Math.abs(step) ? this.targetScore : this.displayedScore + step;
      this.scoreEl.textContent = String(this.displayedScore);
      this.scoreEl.style.transform = 'scale(1.12)';
      requestAnimationFrame(() => {
        this.scoreEl.style.transform = 'scale(1)';
      });
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.add('hidden');
    }
  }

  bindButtons(handlers: {
    onStart: () => void;
    onResume: () => void;
    onQuit: () => void;
    onRetry: () => void;
    onMenu: () => void;
  }): void {
    el('btn-start').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onStart();
    });
    el('btn-resume').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onResume();
    });
    el('btn-quit').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onQuit();
    });
    el('btn-retry').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onRetry();
    });
    el('btn-menu').addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onMenu();
    });
  }
}

function el(id: string): HTMLElement {
  const n = document.getElementById(id);
  if (!n) throw new Error(`#${id} missing`);
  return n;
}
