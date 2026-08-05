// Central tuning. Units are roughly meters; flight direction is -Z,
// the world scrolls toward +Z past the bird who sits near the origin.
export const CONFIG = {
  bird: {
    radius: 0.52,        // collision sphere radius
    gravity: -34,
    flapImpulse: 10.8,
    maxFallSpeed: -19,
    maxRiseSpeed: 13,
    startY: 1.4,
    x: 0,
    z: 0,
  },
  world: {
    groundY: -7.05,      // lethal floor along the flight corridor
    ceilingY: 11.5,      // soft ceiling (non-lethal)
    spawnZ: -115,
    despawnZ: 18,
    groundPeriod: 140,   // dune pattern period (z)
  },
  pipes: {
    radius: 1.62,
    lipRadius: 1.9,
    lipHeight: 1.1,
    collideDepth: 2.5,   // z thickness of the collision slab
    gapStart: 8.6,       // generous first gates
    gapEnd: 5.7,
    spacingStart: 22,
    spacingEnd: 17,
    centerStart: 2.4,    // max |gap center| offset early
    centerEnd: 5.4,
    maxPairs: 8,
    rampPoints: 42,      // score at which difficulty plateaus
  },
  speed: {
    start: 9.5,
    max: 16.4,
    perPoint: 0.165,
    menuFactor: 0.32,    // ambient scroll speed on the menu
  },
  camera: {
    fov: 62,
    fovKickMax: 7,
    offset: { x: 2.3, y: 3.05, z: 8.6 },
    look: { x: 0, y: 1.0, z: -8.5 },
    followY: 0.42,       // how much the camera tracks bird height
    lag: 6.5,            // follow smoothing (1/s)
  },
  medals: [
    { key: 'bronze', label: 'BRONZE', score: 10 },
    { key: 'silver', label: 'SILVER', score: 20 },
    { key: 'gold', label: 'GOLD', score: 30 },
    { key: 'platinum', label: 'PLATINUM', score: 40 },
  ],
  colors: {
    fog: 0xf7b98a,
    sky: { horizon: 0xffd9a3, mid: 0xff9e7d, zenith: 0x6d8fd0, night: 0x2a3a66 },
    sun: 0xfff2c8,
    jade: 0x14b08a,
    jadeDark: 0x0b7a5e,
    sand: 0xe8b077,
    sandShadow: 0xb97a4e,
  },
  storageKeys: { best: 'flappy3d.best', muted: 'flappy3d.muted' },
};

export function difficulty(score) {
  // 0 → 1 ramp across the first `rampPoints` gates.
  const t = Math.min(1, score / CONFIG.pipes.rampPoints);
  const e = t * t * (3 - 2 * t); // smoothstep
  return {
    t: e,
    gap: CONFIG.pipes.gapStart + (CONFIG.pipes.gapEnd - CONFIG.pipes.gapStart) * e,
    spacing: CONFIG.pipes.spacingStart + (CONFIG.pipes.spacingEnd - CONFIG.pipes.spacingStart) * e,
    center: CONFIG.pipes.centerStart + (CONFIG.pipes.centerEnd - CONFIG.pipes.centerStart) * e,
    speed: Math.min(CONFIG.speed.max, CONFIG.speed.start + score * CONFIG.speed.perPoint),
  };
}
