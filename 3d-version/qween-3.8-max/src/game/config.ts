import { mulberry32, type Rng } from '../core/rng';

export const CFG = {
  gravity: -26,
  flapVelocity: 8.6,
  maxFallSpeed: -17,
  birdX: -1.6,
  birdRadius: 0.42,
  groundY: -4.2,
  ceilingY: 5.4,
  worldScroll: 5.6,
  scrollGainPerScore: 0.055,
  scrollMax: 8.2,
  pipeRadius: 0.78,
  pipeSpacing: 6.4,
  firstPipeX: 9,
  gapStart: 4.0,
  gapMin: 3.3,
  gapShrinkPerScore: 0.018,
  gapCenterMin: -1.6,
  gapCenterMax: 2.6,
  pipePoolSize: 7,
  fixedDt: 1 / 120,
  maxSubSteps: 6
} as const;

export function gapSizeFor(score: number): number {
  return Math.max(CFG.gapMin, CFG.gapStart - score * CFG.gapShrinkPerScore);
}

export function scrollSpeedFor(score: number): number {
  return Math.min(CFG.scrollMax, CFG.worldScroll + score * CFG.scrollGainPerScore);
}

export function makeRng(seed: number): Rng {
  return mulberry32(seed);
}
