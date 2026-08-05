export interface HudRefs {
  root: HTMLElement;
  score: HTMLElement;
  ready: HTMLElement;
  over: HTMLElement;
  overScore: HTMLElement;
  overBest: HTMLElement;
  medal: HTMLElement;
  medalLabel: HTMLElement;
  newBest: HTMLElement;
  restart: HTMLElement;
  flash: HTMLElement;
  mute: HTMLElement;
}

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export function medalFor(score: number): MedalTier {
  if (score >= 40) return 'platinum';
  if (score >= 30) return 'gold';
  if (score >= 20) return 'silver';
  if (score >= 10) return 'bronze';
  return 'none';
}

export class Hud {
  private refs: HudRefs;

  constructor(refs: HudRefs) {
    this.refs = refs;
  }

  showReady(): void {
    this.refs.ready.classList.remove('hidden');
    this.refs.over.classList.add('hidden');
    this.refs.score.classList.add('hidden');
  }

  showPlaying(): void {
    this.refs.ready.classList.add('hidden');
    this.refs.over.classList.add('hidden');
    this.refs.score.classList.remove('hidden');
  }

  setScore(n: number): void {
    this.refs.score.textContent = String(n);
    this.refs.score.classList.remove('pop');
    void this.refs.score.offsetWidth;
    this.refs.score.classList.add('pop');
  }

  showGameOver(score: number, best: number, isNewBest: boolean): void {
    this.refs.overScore.textContent = String(score);
    this.refs.overBest.textContent = String(best);
    const tier = medalFor(score);
    this.refs.medal.dataset.tier = tier;
    this.refs.medalLabel.textContent = tier === 'none' ? '—' : tier.toUpperCase();
    this.refs.newBest.classList.toggle('hidden', !isNewBest);
    this.refs.score.classList.add('hidden');
    this.refs.over.classList.remove('hidden');
    this.refs.over.classList.remove('slam');
    void this.refs.over.offsetWidth;
    this.refs.over.classList.add('slam');
  }

  flashHit(): void {
    const f = this.refs.flash;
    f.style.transition = 'none';
    f.style.opacity = '0.85';
    void f.offsetWidth;
    f.style.transition = 'opacity 380ms ease-out';
    f.style.opacity = '0';
  }

  setMuted(m: boolean): void {
    this.refs.mute.dataset.muted = m ? '1' : '0';
    this.refs.mute.setAttribute('aria-pressed', m ? 'true' : 'false');
  }
}
