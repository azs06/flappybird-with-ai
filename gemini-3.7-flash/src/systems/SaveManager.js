// ============================================================================
// SaveManager.js - LocalStorage Persistence for Scores, Currency, Skins & Stats
// ============================================================================

export class SaveManager {
  constructor() {
    this.storageKey = 'flappy_masterpiece_save_v1';
    this.data = this.getDefaults();
    this.load();
  }

  getDefaults() {
    return {
      highScores: {
        classic: 0,
        boss: 0,
        gravity: 0,
        hyper: 0,
        zen: 0
      },
      gems: 50, // Starting bonus
      selectedSkin: 'classic',
      unlockedSkins: ['classic'],
      selectedTheme: 'sunset',
      unlockedThemes: ['sunset', 'cyber', 'storm', 'cosmic'],
      stats: {
        totalFlaps: 0,
        totalScore: 0,
        totalGems: 0,
        totalGrazes: 0,
        bossesDefeated: 0,
        totalDeaths: 0,
        gamesPlayed: 0,
        secondsPlayed: 0
      },
      settings: {
        masterVolume: 0.8,
        sfxVolume: 0.9,
        musicVolume: 0.5,
        musicEnabled: true,
        crtEnabled: false,
        screenshake: 1.0,
        particleDensity: 1.0,
        ghostEnabled: true
      },
      achievementsUnlocked: []
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = {
          ...this.getDefaults(),
          ...parsed,
          highScores: { ...this.getDefaults().highScores, ...(parsed.highScores || {}) },
          stats: { ...this.getDefaults().stats, ...(parsed.stats || {}) },
          settings: { ...this.getDefaults().settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to load save data from localStorage', e);
      this.data = this.getDefaults();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save data to localStorage', e);
    }
  }

  getHighScore(mode = 'classic') {
    return this.data.highScores[mode] || 0;
  }

  setHighScore(mode, score) {
    if (score > (this.data.highScores[mode] || 0)) {
      this.data.highScores[mode] = score;
      this.save();
      return true; // New record!
    }
    return false;
  }

  addGems(amount) {
    this.data.gems += amount;
    this.data.stats.totalGems += amount;
    this.save();
  }

  spendGems(amount) {
    if (this.data.gems >= amount) {
      this.data.gems -= amount;
      this.save();
      return true;
    }
    return false;
  }

  unlockSkin(skinId) {
    if (!this.data.unlockedSkins.includes(skinId)) {
      this.data.unlockedSkins.push(skinId);
      this.save();
    }
  }

  isSkinUnlocked(skinId) {
    return this.data.unlockedSkins.includes(skinId);
  }

  unlockTheme(themeId) {
    if (!this.data.unlockedThemes.includes(themeId)) {
      this.data.unlockedThemes.push(themeId);
      this.save();
    }
  }

  isThemeUnlocked(themeId) {
    return this.data.unlockedThemes.includes(themeId);
  }
}
