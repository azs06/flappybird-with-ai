// HUD + screens: DOM overlay driven entirely by game events. The UI never
// owns game rules — it only reflects state the Game pushes to it.
export class UI {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      score: document.getElementById('score'),
      bestGhost: document.getElementById('best-ghost'),
      milestone: document.getElementById('milestone'),
      muteBtn: document.getElementById('mute-btn'),
      iconOn: document.getElementById('icon-sound-on'),
      iconOff: document.getElementById('icon-sound-off'),
      menu: document.getElementById('screen-menu'),
      menuBest: document.getElementById('menu-best-score'),
      menuBestMedal: document.getElementById('menu-best-medal'),
      gameover: document.getElementById('screen-gameover'),
      paused: document.getElementById('screen-paused'),
      loading: document.getElementById('screen-loading'),
      finalScore: document.getElementById('final-score'),
      finalBest: document.getElementById('final-best'),
      newBestRibbon: document.getElementById('new-best-ribbon'),
      earnedMedal: document.getElementById('earned-medal'),
      medalName: document.getElementById('medal-name'),
      nextMedalHint: document.getElementById('next-medal-hint'),
      retryBtn: document.getElementById('retry-btn'),
      debugHud: document.getElementById('debug-hud'),
    };
    this._scorePopT = null;
    this._milestoneT = null;
  }

  onMuteToggle(fn) {
    this.el.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
  }

  onRetry(fn) {
    this.el.retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
  }

  setMuted(m) {
    this.el.iconOn.classList.toggle('hidden', m);
    this.el.iconOff.classList.toggle('hidden', !m);
  }

  setScore(v) {
    this.el.score.textContent = String(v);
    this.el.score.classList.remove('pop');
    void this.el.score.offsetWidth; // restart animation
    this.el.score.classList.add('pop');
  }

  setBest(v) {
    this.el.bestGhost.textContent = `BEST ${v}`;
    this.el.menuBest.textContent = String(v);
  }

  flashMilestone(n) {
    const el = this.el.milestone;
    el.textContent = `${n}!`;
    el.classList.remove('flash');
    void el.offsetWidth; // restart animation
    el.classList.add('flash');
  }

  showScreen(name) {
    const { menu, gameover, paused, loading, hud } = this.el;
    menu.classList.toggle('hidden', name !== 'menu');
    gameover.classList.toggle('hidden', name !== 'gameover');
    paused.classList.toggle('hidden', name !== 'paused');
    loading.classList.toggle('hidden', name !== 'loading');
    hud.classList.toggle('hidden', name === 'menu' || name === 'loading');
  }

  showGameOver({ score, best, newBest, medal, nextMedal }) {
    this.el.finalScore.textContent = String(score);
    this.el.finalBest.textContent = String(best);
    this.el.newBestRibbon.classList.toggle('hidden', !newBest);

    const medalEl = this.el.earnedMedal;
    medalEl.className = 'medal medal-big ' + (medal ? `medal-${medal.key}` : 'medal-none');
    this.el.medalName.textContent = medal ? medal.label : 'NO MEDAL';

    if (nextMedal) {
      const away = nextMedal.score - score;
      this.el.nextMedalHint.innerHTML = `<strong>${away}</strong> more for ${nextMedal.label.toLowerCase()}`;
    } else {
      this.el.nextMedalHint.innerHTML = 'top medal earned — legendary';
    }

    this.setBest(best);
    this.showScreen('gameover');
  }

  setMenuBestMedal(medalKey) {
    const el = this.el.menuBestMedal;
    el.className = 'medal ' + (medalKey ? `medal-${medalKey}` : 'medal-none');
  }

  setDebug(text) {
    if (text == null) {
      this.el.debugHud.classList.add('hidden');
      return;
    }
    this.el.debugHud.classList.remove('hidden');
    this.el.debugHud.textContent = text;
  }
}
