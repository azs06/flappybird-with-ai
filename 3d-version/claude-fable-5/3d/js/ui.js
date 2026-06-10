// ui.js — all DOM: HUD, screens, and the persistent top-ten leaderboard.

const BOARD_KEY = 'paperwing.board';
const BEST_KEY = 'paperwing.best';
const NAME_KEY = 'paperwing.lastName';
const BOARD_MAX = 10;

const $ = (id) => document.getElementById(id);

function loadBoard() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOARD_KEY)) || [];
    return raw.filter((e) => e && typeof e.score === 'number').slice(0, BOARD_MAX);
  } catch {
    return [];
  }
}

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'),
      score: $('score'),
      best: $('best'),
      start: $('screen-start'),
      over: $('screen-over'),
      pause: $('screen-pause'),
      finalScore: $('final-score'),
      finalBest: $('final-best'),
      newBest: $('new-best-tag'),
      nameForm: $('name-form'),
      initials: $('initials'),
      leaderboard: $('leaderboard'),
      startBoard: $('start-board'),
      btnPause: $('btn-pause'),
      btnMute: $('btn-mute'),
    };
    this.best = Number(localStorage.getItem(BEST_KEY)) || 0;
    this.board = loadBoard();
    this.el.best.textContent = this.best;
    this.renderBoard(this.el.startBoard, -1, 5);
  }

  setScore(n) {
    this.el.score.textContent = n;
    this.el.score.classList.remove('pop');
    void this.el.score.offsetWidth;       // restart the pop animation
    this.el.score.classList.add('pop');
  }

  showPlaying() {
    this.el.start.classList.add('hidden');
    this.el.over.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.score.textContent = '0';
  }

  showPause(on) {
    this.el.pause.classList.toggle('hidden', !on);
  }

  setMuted(muted) {
    this.el.btnMute.classList.toggle('off', muted);
    this.el.btnMute.textContent = muted ? '♪' : '♪';
  }

  qualifies(score) {
    if (score <= 0) return false;
    return this.board.length < BOARD_MAX || score > this.board[this.board.length - 1].score;
  }

  // Game-over flow: show numbers immediately; the initials form only appears
  // when the run actually makes the board.
  showGameOver(score) {
    this.el.hud.classList.add('hidden');
    this.el.over.classList.remove('hidden');
    this.el.finalScore.textContent = score;

    const isNewBest = score > this.best;
    if (isNewBest) {
      this.best = score;
      localStorage.setItem(BEST_KEY, String(score));
      this.el.best.textContent = score;
    }
    this.el.finalBest.textContent = this.best;
    this.el.newBest.classList.toggle('hidden', !isNewBest);

    this.pendingScore = score;
    if (this.qualifies(score)) {
      this.el.nameForm.classList.remove('hidden');
      this.el.initials.value = localStorage.getItem(NAME_KEY) || '';
      this.renderBoard(this.el.leaderboard, -1);
      setTimeout(() => this.el.initials.focus(), 60);
    } else {
      this.el.nameForm.classList.add('hidden');
      this.renderBoard(this.el.leaderboard, -1);
    }
  }

  submitName() {
    const name = (this.el.initials.value.trim().toUpperCase() || 'YOU').slice(0, 3);
    localStorage.setItem(NAME_KEY, name);
    this.board.push({ name, score: this.pendingScore });
    this.board.sort((a, b) => b.score - a.score);
    this.board = this.board.slice(0, BOARD_MAX);
    localStorage.setItem(BOARD_KEY, JSON.stringify(this.board));
    this.el.nameForm.classList.add('hidden');
    const idx = this.board.findIndex((e) => e.name === name && e.score === this.pendingScore);
    this.renderBoard(this.el.leaderboard, idx);
    this.renderBoard(this.el.startBoard, -1, 5);
  }

  renderBoard(container, highlightIdx, limit = BOARD_MAX) {
    if (this.board.length === 0) {
      container.innerHTML = '<div class="board-title">TOP TEN</div>' +
        '<p class="board-empty">no flights recorded yet</p>';
      return;
    }
    const rows = this.board.slice(0, limit).map((e, i) =>
      `<div class="board-row${i === highlightIdx ? ' me' : ''}">
        <span class="board-rank">${i + 1}</span>
        <span class="board-name">${e.name}</span>
        <span class="board-dots"></span>
        <span class="board-score">${e.score}</span>
      </div>`,
    ).join('');
    container.innerHTML = `<div class="board-title">TOP TEN</div>${rows}`;
  }
}
