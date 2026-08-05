const BEST_KEY = 'aether-flap-best';
const MUTE_KEY = 'aether-flap-mute';

export function loadBest(): number {
  try {
    const v = localStorage.getItem(BEST_KEY);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(score))));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMute(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}
