import { CFG } from './config.js';

const $ = (id) => document.getElementById(id);

const show = (el, visible) => {
  if (!el) return;
  if (visible) el.removeAttribute('data-hidden');
  else el.setAttribute('data-hidden', '');
};

/** Thin wrapper over the DOM overlay so game logic never touches elements. */
export class UI {
  constructor() {
    this.el = {
      hud: $('hud'),
      score: $('score'),
      readyHint: $('readyHint'),
      title: $('titleScreen'),
      over: $('overScreen'),
      pause: $('pauseScreen'),
      finalScore: $('finalScore'),
      bestScore: $('bestScore'),
      newBest: $('newBest'),
      medal: $('medal'),
      medalLabel: $('medalLabel'),
      startBtn: $('startBtn'),
      retryBtn: $('retryBtn'),
      resumeBtn: $('resumeBtn'),
      muteBtn: $('muteBtn'),
      pauseBtn: $('pauseBtn'),
      flash: $('flash'),
    };
    this._lastScore = -1;
  }

  setScore(score) {
    if (score === this._lastScore) return;
    this._lastScore = score;
    this.el.score.textContent = String(score);
    if (score > 0) {
      this.el.score.removeAttribute('data-pop');
      // Force a reflow so the animation restarts on consecutive points.
      void this.el.score.offsetWidth;
      this.el.score.setAttribute('data-pop', '');
    }
  }

  showTitle() {
    show(this.el.title, true);
    show(this.el.over, false);
    show(this.el.pause, false);
    show(this.el.hud, false);
    show(this.el.readyHint, false);
  }

  /** Between-runs idle state: score board visible, waiting for a flap. */
  showReady() {
    show(this.el.title, false);
    show(this.el.over, false);
    show(this.el.pause, false);
    show(this.el.hud, true);
    show(this.el.readyHint, true);
  }

  showPlaying() {
    show(this.el.title, false);
    show(this.el.over, false);
    show(this.el.pause, false);
    show(this.el.hud, true);
    show(this.el.readyHint, false);
  }

  showPaused(paused) {
    show(this.el.pause, paused);
  }

  showGameOver({ score, best, isNewBest }) {
    show(this.el.title, false);
    show(this.el.hud, false);
    show(this.el.over, true);
    this.el.finalScore.textContent = String(score);
    this.el.bestScore.textContent = String(best);
    show(this.el.newBest, isNewBest);

    const medal = CFG.medals.find((m) => score >= m.score);
    this.el.medal.dataset.tier = medal ? medal.tier : 'none';
    this.el.medalLabel.textContent = medal ? medal.label : '—';
    // Move focus so keyboard users land on the primary action.
    this.el.retryBtn.focus({ preventScroll: true });
  }

  setMuted(muted) {
    this.el.muteBtn.setAttribute('aria-pressed', String(muted));
    this.el.muteBtn.title = muted ? 'Unmute sound (M)' : 'Mute sound (M)';
  }

  flash() {
    const f = this.el.flash;
    f.setAttribute('data-on', '');
    requestAnimationFrame(() => requestAnimationFrame(() => f.removeAttribute('data-on')));
  }
}
