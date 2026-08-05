/** Tunable gameplay constants — single source of truth. */
export const CONFIG = {
  // Physics — tuned for readable arcade flap cadence
  gravity: -18,
  flapImpulse: 7.6,
  maxFallSpeed: -14,
  maxRiseSpeed: 9,

  // World bounds (bird Y)
  ceilingY: 7.0,
  floorY: -3.35,

  // Scroll / difficulty
  baseScrollSpeed: 6.6,
  maxScrollSpeed: 13.5,
  speedRampPerScore: 0.15,

  // Pillars
  firstPillarZ: -18,
  pillarSpacing: 10.5,
  baseGap: 3.2,
  minGap: 2.0,
  gapShrinkPerScore: 0.028,
  gapYMin: -0.4,
  gapYMax: 3.2,
  gapYWander: 1.35,

  // Camera — 3/4 side chase
  camOffset: { x: 5.2, y: 1.8, z: 7.8 },
  camLookAhead: 3.0,
  camLerp: 5.5,

  // Feel
  hitstop: 0.07,
  scorePopShake: 0.12,
  crashShake: 0.85,
} as const;
