/**
 * DOM overlay.
 *
 * The score is deliberately HTML rather than an in-scene sprite: crisp text at
 * any DPI for free, and no font atlas to ship. The 3D canvas stays purely 3D.
 */
const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.el = {
      score: $('score'),
      best: $('best'),
      ready: $('ready'),
      over: $('over'),
      paused: $('paused'),
      finalScore: $('final-score'),
      finalBest: $('final-best'),
      finalPipes: $('final-pipes'),
      finalGems: $('final-gems'),
      newBest: $('new-best'),
      muteBtn: $('mute'),
      flash: $('flash'),
      toast: $('toast'),
    };
    this._shown = null;
  }

  setScore(n) {
    if (this.el.score.textContent !== String(n)) this.el.score.textContent = n;
  }

  setBest(n) {
    this.el.best.textContent = `BEST ${n}`;
  }

  /** Screen state: 'ready' | 'playing' | 'over' | 'paused'. */
  show(state) {
    if (this._shown === state) return;
    this._shown = state;
    this.el.ready.classList.toggle('visible', state === 'ready');
    this.el.over.classList.toggle('visible', state === 'over');
    this.el.paused.classList.toggle('visible', state === 'paused');
    this.el.score.classList.toggle('dim', state !== 'playing' && state !== 'paused');
  }

  showGameOver({ score, best, pipes, gems, isBest }) {
    this.el.finalScore.textContent = score;
    this.el.finalBest.textContent = best;
    this.el.finalPipes.textContent = pipes;
    this.el.finalGems.textContent = gems;
    this.el.newBest.classList.toggle('visible', isBest);
    this.show('over');
  }

  /** Restart the CSS keyframe by forcing a reflow between class toggles. */
  pop() {
    const s = this.el.score;
    s.classList.remove('pop');
    void s.offsetWidth;
    s.classList.add('pop');
  }

  flash(color = 'rgba(255,60,60,0.55)') {
    const f = this.el.flash;
    f.style.background = color;
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  }

  toast(text) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.remove('go');
    void t.offsetWidth;
    t.classList.add('go');
  }

  setMuted(m) {
    this.el.muteBtn.textContent = m ? '🔇' : '🔊';
    this.el.muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  }
}
