export class ScoreManager {
  constructor() {
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('flappy3d_highscore') || '0', 10);
    this.coins = parseInt(localStorage.getItem('flappy3d_coins') || '0', 10);
    this.unlockedSkins = JSON.parse(localStorage.getItem('flappy3d_unlocked_skins') || '["classic"]');
    this.unlockedHats = JSON.parse(localStorage.getItem('flappy3d_unlocked_hats') || '["none"]');
    this.unlockedTrails = JSON.parse(localStorage.getItem('flappy3d_unlocked_trails') || '["sparkles"]');

    // Run-time stats
    this.combo = 1;
    this.maxCombo = 1;
    this.nearMisses = 0;
    this.ringsPassed = 0;
    this.runCoins = 0;
    this.distance = 0;

    // Callbacks for UI
    this.onScoreChanged = null;
    this.onComboChanged = null;
    this.onCoinsChanged = null;
    this.onAchievementUnlocked = null;
  }

  resetRun() {
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.nearMisses = 0;
    this.ringsPassed = 0;
    this.runCoins = 0;
    this.distance = 0;

    if (this.onScoreChanged) this.onScoreChanged(this.score);
    if (this.onComboChanged) this.onComboChanged(this.combo);
  }

  addPipeScore() {
    this.score += 1 * this.combo;
    this.combo = Math.min(this.combo + 1, 8);
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    this.checkHighScore();
    if (this.onScoreChanged) this.onScoreChanged(this.score);
    if (this.onComboChanged) this.onComboChanged(this.combo);
    return this.score;
  }

  addRingBonus() {
    this.ringsPassed++;
    this.score += 3 * this.combo;
    this.combo = Math.min(this.combo + 2, 8);
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    this.checkHighScore();
    if (this.onScoreChanged) this.onScoreChanged(this.score);
    if (this.onComboChanged) this.onComboChanged(this.combo);
  }

  addNearMissBonus() {
    this.nearMisses++;
    this.score += 2;
    this.checkHighScore();
    if (this.onScoreChanged) this.onScoreChanged(this.score);
  }

  addCoin(amount = 1) {
    this.coins += amount;
    this.runCoins += amount;
    this.saveProgress();
    if (this.onCoinsChanged) this.onCoinsChanged(this.coins);
  }

  resetCombo() {
    this.combo = 1;
    if (this.onComboChanged) this.onComboChanged(this.combo);
  }

  checkHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('flappy3d_highscore', this.highScore.toString());
    }
  }

  saveProgress() {
    localStorage.setItem('flappy3d_coins', this.coins.toString());
    localStorage.setItem('flappy3d_unlocked_skins', JSON.stringify(this.unlockedSkins));
    localStorage.setItem('flappy3d_unlocked_hats', JSON.stringify(this.unlockedHats));
    localStorage.setItem('flappy3d_unlocked_trails', JSON.stringify(this.unlockedTrails));
  }

  unlockSkin(skinId, cost) {
    if (this.unlockedSkins.includes(skinId)) return true;
    if (this.coins >= cost) {
      this.coins -= cost;
      this.unlockedSkins.push(skinId);
      this.saveProgress();
      if (this.onCoinsChanged) this.onCoinsChanged(this.coins);
      return true;
    }
    return false;
  }

  unlockHat(hatId, cost) {
    if (this.unlockedHats.includes(hatId)) return true;
    if (this.coins >= cost) {
      this.coins -= cost;
      this.unlockedHats.push(hatId);
      this.saveProgress();
      if (this.onCoinsChanged) this.onCoinsChanged(this.coins);
      return true;
    }
    return false;
  }

  unlockTrail(trailId, cost) {
    if (this.unlockedTrails.includes(trailId)) return true;
    if (this.coins >= cost) {
      this.coins -= cost;
      this.unlockedTrails.push(trailId);
      this.saveProgress();
      if (this.onCoinsChanged) this.onCoinsChanged(this.coins);
      return true;
    }
    return false;
  }

  getRunSummary() {
    return {
      score: this.score,
      highScore: this.highScore,
      isNewRecord: this.score === this.highScore && this.score > 0,
      maxCombo: this.maxCombo,
      nearMisses: this.nearMisses,
      ringsPassed: this.ringsPassed,
      coinsEarned: this.runCoins,
      distance: Math.floor(this.distance)
    };
  }
}
