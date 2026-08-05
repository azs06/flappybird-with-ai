// ui.js — screens, score, leaderboard persistence

const STORAGE_KEY = 'spark_leaderboard_v1';
const BEST_KEY = 'spark_best_v1';

export class UI {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      score: document.getElementById('score'),
      best: document.getElementById('best'),
      start: document.getElementById('screen-start'),
      over: document.getElementById('screen-over'),
      pause: document.getElementById('screen-pause'),
      finalScore: document.getElementById('final-score'),
      finalBest: document.getElementById('final-best'),
      newBest: document.getElementById('new-best-tag'),
      nameForm: document.getElementById('name-form'),
      initials: document.getElementById('initials'),
      leaderboard: document.getElementById('leaderboard'),
      startBoard: document.getElementById('start-board'),
      btnPause: document.getElementById('btn-pause'),
      btnMute: document.getElementById('btn-mute'),
    };

    this.score = 0;
    this.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this.pendingScore = null;
    this.el.best.textContent = String(this.best);
    this.renderBoard(this.el.startBoard);
  }

  setMuted(muted) {
    this.el.btnMute.classList.toggle('muted', muted);
    this.el.btnMute.textContent = muted ? '🔇' : '♪';
    this.el.btnMute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  setScore(n) {
    this.score = n;
    this.el.score.textContent = String(n);
    this.el.score.classList.remove('pop');
    // force reflow for pop animation
    void this.el.score.offsetWidth;
    this.el.score.classList.add('pop');
  }

  showPlaying() {
    this.el.start.classList.add('hidden');
    this.el.over.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.setScore(0);
  }

  showPause(on) {
    this.el.pause.classList.toggle('hidden', !on);
  }

  showGameOver(score) {
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.over.classList.remove('hidden');

    this.el.finalScore.textContent = String(score);
    const isBest = score > this.best;
    if (isBest) {
      this.best = score;
      localStorage.setItem(BEST_KEY, String(this.best));
      this.el.best.textContent = String(this.best);
    }
    this.el.finalBest.textContent = String(this.best);
    this.el.newBest.classList.toggle('hidden', !isBest);

    this.pendingScore = score;
    const qualifies = score > 0 && this._qualifies(score);
    this.el.nameForm.classList.toggle('hidden', !qualifies);
    if (qualifies) {
      this.el.initials.value = '';
      setTimeout(() => this.el.initials.focus(), 80);
    }

    this.renderBoard(this.el.leaderboard);
  }

  submitName() {
    if (this.pendingScore == null) return;
    const name = (this.el.initials.value || '???').trim().toUpperCase().slice(0, 3) || '???';
    this._addEntry(name, this.pendingScore);
    this.pendingScore = null;
    this.el.nameForm.classList.add('hidden');
    this.renderBoard(this.el.leaderboard);
    this.renderBoard(this.el.startBoard);
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  _save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
  }

  _qualifies(score) {
    const list = this._load();
    return list.length < 10 || score > (list[list.length - 1]?.score ?? 0);
  }

  _addEntry(name, score) {
    const list = this._load();
    list.push({ name, score, at: Date.now() });
    list.sort((a, b) => b.score - a.score || a.at - b.at);
    this._save(list);
  }

  renderBoard(root) {
    if (!root) return;
    const list = this._load();
    if (!list.length) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = list
      .slice(0, 10)
      .map(
        (e, i) =>
          `<div class="board-row"><span class="rank">${String(i + 1).padStart(2, '0')}</span>` +
          `<span class="name">${escapeHtml(e.name)}</span>` +
          `<span class="pts">${e.score}</span></div>`,
      )
      .join('');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
