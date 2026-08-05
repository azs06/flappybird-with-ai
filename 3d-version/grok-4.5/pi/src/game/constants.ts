/** Tunable gameplay + world constants. Units are world-meters-ish. */

export const WORLD = {
  /** Bird stays near this X; world scrolls past. */
  birdX: 0,
  /** Vertical play bounds (centerline at 0). */
  ceilingY: 7.2,
  floorY: -4.4,
  /** Camera */
  camOffset: { x: -4.2, y: 1.4, z: 9.2 },
  camLookAt: { x: 3.2, y: 0.5, z: 0 },
  fogNear: 18,
  fogFar: 72,
} as const;

export const BIRD = {
  radius: 0.42,
  /** Visual scale multiplier (collision uses radius). */
  scale: 1.2,
  gravity: -20,
  flapVelocity: 8.4,
  maxFallSpeed: -15,
  maxRiseSpeed: 10,
  tiltUp: 0.55,
  tiltDown: -1.05,
  tiltLerp: 10,
  wingFlapSpeed: 22,
  /** Soft bob while waiting on title/ready. */
  idleBobAmp: 0.18,
  idleBobSpeed: 2.4,
} as const;

export const PIPES = {
  /** Horizontal speed of world scroll (units/sec). */
  baseSpeed: 7.2,
  speedPerScore: 0.085,
  maxSpeed: 12.5,
  /** Distance between successive pipe pairs. */
  spacing: 7.8,
  /** Gap height between top and bottom towers. */
  baseGap: 3.6,
  minGap: 2.45,
  gapShrinkPerScore: 0.03,
  /** How far gap center can drift from 0. */
  gapCenterRange: 2.2,
  /** Pipe body half-width / depth. */
  halfWidth: 0.72,
  depth: 1.35,
  /** Spawn X ahead of bird. */
  spawnAhead: 22,
  /** Recycle when behind bird by this much. */
  recycleBehind: 8,
  /** Number of live pairs. */
  poolSize: 6,
  /** First pipe delay distance. */
  firstOffset: 16,
  /** Ring (score gate) thickness. */
  ringRadius: 1.55,
} as const;

export const GROUND = {
  scrollSpeedScale: 1,
  segmentLength: 16,
  segmentCount: 8,
  y: WORLD.floorY - 0.35,
} as const;

export const FEEL = {
  hitStopMs: 70,
  shakeAmp: 0.38,
  shakeDecay: 7.5,
  scorePunchScale: 1.18,
  deathFlashMs: 90,
} as const;

export const STORAGE_KEY = "aether-flap-best-v1";
