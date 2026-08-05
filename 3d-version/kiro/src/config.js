/**
 * Central tuning table. All units are three.js world units / seconds.
 * The playfield is a 2D slice at z = 0; everything else is decoration.
 */
export const CFG = {
  // --- Physics -------------------------------------------------------------
  gravity: -26,
  flapVelocity: 8.6,
  terminalVelocity: -19,

  // --- Scroll speed & difficulty ramp -------------------------------------
  baseSpeed: 4.4,
  speedPerPoint: 0.05,
  maxSpeed: 8.2,

  // --- Playfield bounds ----------------------------------------------------
  ceiling: 5.8,
  groundY: -4.7,

  // --- Pipes ---------------------------------------------------------------
  pipe: {
    radius: 0.95,
    capRadius: 1.16,
    capHeight: 0.5,
    spacing: 6.0,
    poolSize: 9,
    gapStart: 3.3,
    gapMin: 2.45,
    gapShrinkPerPoint: 0.022,
    /** Keeps a gap from hugging the ceiling or the grass. */
    edgeMargin: 1.2,
    /** Max vertical travel between two consecutive gaps (playability). */
    maxCenterDelta: 2.7,
  },

  // --- Bird ----------------------------------------------------------------
  bird: {
    x: -1.9,
    startY: 0.5,
    radius: 0.42,
    maxPitchUp: 0.5,
    maxPitchDown: -1.15,
  },

  // --- Camera --------------------------------------------------------------
  camera: {
    fov: 52,
    baseDistance: 14,
    /** Minimum horizontal span we try to keep visible (keeps portrait fair). */
    minVisibleWidth: 16,
    /**
     * Hard cap on the pull-back. Without it, tall phone viewports would shove
     * the camera so far away that the bird becomes a speck.
     */
    maxDistance: 20.5,
    lookAheadX: 2.4,
    followFactor: 0.28,
  },

  // --- Misc ----------------------------------------------------------------
  storageKey: 'flappy-three.best',
  medals: [
    { score: 40, tier: 'platinum', label: 'Plat' },
    { score: 25, tier: 'gold', label: 'Gold' },
    { score: 15, tier: 'silver', label: 'Silver' },
    { score: 7, tier: 'bronze', label: 'Bronze' },
  ],
};

/** Palettes cycle every `paletteEvery` points to keep long runs interesting. */
export const PALETTES = [
  {
    name: 'day',
    skyTop: 0x3f95dd,
    skyMid: 0x74c7e0,
    skyBottom: 0xd8f2f0,
    fog: 0xcdeef0,
    sun: 0xfff6d0,
    light: 0xfff3d6,
    hemiGround: 0x6a8f4a,
    grass: 0x74c043,
    dirt: 0xdcb35c,
    mountainNear: 0x3f7a63,
    bush: 0x3f8f2a,
    mountainFar: 0x6f9fb0,
    cloud: 0xffffff,
  },
  {
    name: 'sunset',
    skyTop: 0x53508f,
    skyMid: 0xf59d72,
    skyBottom: 0xffd9a0,
    fog: 0xffcf9c,
    sun: 0xffd166,
    light: 0xffc48a,
    hemiGround: 0x6b4a3a,
    grass: 0x5f9e46,
    dirt: 0xc9945a,
    mountainNear: 0x50406a,
    bush: 0x3f6b2e,
    mountainFar: 0x8a6b8c,
    cloud: 0xffe3cf,
  },
  {
    name: 'night',
    skyTop: 0x080d2a,
    skyMid: 0x1b2a5c,
    skyBottom: 0x3d5a8a,
    fog: 0x2c4470,
    sun: 0xe8f0ff,
    light: 0xa8c4ff,
    hemiGround: 0x1b2430,
    grass: 0x2f6b45,
    dirt: 0x6b5a44,
    mountainNear: 0x141d3a,
    bush: 0x16342a,
    mountainFar: 0x27345c,
    cloud: 0x6a7fae,
  },
  {
    name: 'dawn',
    skyTop: 0x4a9ec4,
    skyMid: 0x89c2d9,
    skyBottom: 0xffe8d6,
    fog: 0xf6ded0,
    sun: 0xfff0c9,
    light: 0xffe8cc,
    hemiGround: 0x5c7a4a,
    grass: 0x6fb84a,
    dirt: 0xd9ab63,
    mountainNear: 0x466f7a,
    bush: 0x3d8f33,
    mountainFar: 0x86a6b8,
    cloud: 0xfff4ea,
  },
];

export const PALETTE_EVERY = 12;

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
