export const CFG = {
  gravity: 19.4,
  flapImpulse: 7.1,
  maxFall: -13.5,
  maxRise: 8.4,
  startSpeed: 4.35,
  speedPerScore: 0.042,
  maxSpeed: 7.4,
  gapStart: 2.92,
  gapMin: 1.98,
  gapShrink: 0.016,
  pillarSpacing: 5.65,
  pillarWidth: 1.28,
  firstPillar: 9.4,
  groundY: -3.85,
  ceilingY: 5.15,
  birdRadius: 0.26,
  birdVisual: 0.34,
  poolSize: 6,
  moveGapsAfter: 18,
  nightStart: 16,
  nightFull: 34,
  medalBronze: 10,
  medalSilver: 25,
  medalGold: 50,
  medalAurelion: 80,
  hitstop: 0.09,
  deathHold: 0.95,
  timestep: 1 / 60,
  maxSteps: 8,
} as const;

export const Phase = {
  Boot: "boot",
  Title: "title",
  Playing: "playing",
  Dying: "dying",
  Dead: "dead",
  Paused: "paused",
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export function medalFor(score: number): string {
  if (score >= CFG.medalAurelion) return "aurelion";
  if (score >= CFG.medalGold) return "gold";
  if (score >= CFG.medalSilver) return "silver";
  if (score >= CFG.medalBronze) return "bronze";
  return "none";
}

export function nightBlend(score: number): number {
  const t = (score - CFG.nightStart) / (CFG.nightFull - CFG.nightStart);
  return Math.max(0, Math.min(1, t));
}

export function currentSpeed(score: number): number {
  return Math.min(CFG.maxSpeed, CFG.startSpeed + score * CFG.speedPerScore);
}

export function currentGap(score: number): number {
  return Math.max(CFG.gapMin, CFG.gapStart - score * CFG.gapShrink);
}
