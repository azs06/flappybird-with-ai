const STORAGE_KEY = "flappy3d_glm_leaderboard";
const MAX_ENTRIES = 10;

class Leaderboard {
  constructor() {
    this.entries = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (e) {}
  }

  all() {
    return this.entries.slice();
  }

  best() {
    return this.entries.length ? this.entries[0].score : 0;
  }

  qualifies(score) {
    if (score <= 0) return false;
    if (this.entries.length < MAX_ENTRIES) return true;
    return score > this.entries[this.entries.length - 1].score;
  }

  add(name, score) {
    const clean = (name || "ACE").trim().toUpperCase().slice(0, 12) || "ACE";
    const entry = { name: clean, score, when: Date.now() };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score || a.when - b.when);
    const trimmed = this.entries.slice(0, MAX_ENTRIES);
    const rankIndex = trimmed.indexOf(entry);
    this.entries = trimmed;
    this._save();
    return rankIndex;
  }

  reset() {
    this.entries = [];
    this._save();
  }
}

export const leaderboard = new Leaderboard();
export const LEADERBOARD_MAX = MAX_ENTRIES;
