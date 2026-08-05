/**
 * Central tuning table.
 *
 * Everything that defines "game feel" lives here so it can be tweaked without
 * hunting through systems. Units are metres / seconds; the bird is ~1.2 units
 * long, so a gravity of -34 u/s^2 is roughly 3.5x real-world gravity — arcade
 * games always over-crank gravity to make the arc readable.
 */
export const CFG = {
  physics: {
    fixedStep: 1 / 120, // deterministic integration step
    maxStepsPerFrame: 8, // spiral-of-death guard after tab switches

    gravity: -34,
    flapImpulse: 11.4,
    terminalVelocity: -27, // clamps fall speed so death dives stay readable

    forwardSpeed: 11.5,
    ceilingY: 12, // soft ceiling, bird bounces back down
    deathY: -8.2, // bird centre Y at which we hit the ground
  },

  bird: {
    // Collision sphere. The rendered bird is ~0.69 units in half-height (the
    // mesh is scaled 1.12x), so the hitbox is deliberately ~10% smaller than
    // what you see — near-misses read as skill, not as a cheating game.
    radius: 0.62,
    pitchUp: 0.052, // radians per unit of upward velocity
    pitchDown: 0.06,
    maxPitchUp: 0.55,
    maxPitchDown: -1.05,
    pitchLerp: 9,
  },

  pipes: {
    count: 12, // pooled pipe pairs
    radius: 1.3,
    capRadius: 1.52,
    capHeight: 0.9,
    bodyHeight: 44,
    firstX: 26, // x of the first pipe in a run
    gemChance: 0.55,
  },

  world: {
    groundY: -9,
    fogNear: 55,
    fogFar: 170,
  },

  camera: {
    fov: 62,
    offset: [-4.2, 1.9, 13.6], // relative to the bird
    lookAhead: 5.4,

    // A portrait phone crops the view horizontally, which is exactly the axis
    // the player needs in order to see the next gap coming.
    //
    // These aren't guesses. At a 9:19.5 aspect with fov 78 the horizontal FOV
    // is only ~44 deg (vs ~91 in landscape), so `lookAhead` has to come DOWN,
    // not up: aiming further ahead swings the bird past the frustum edge and it
    // literally leaves the screen. Distance goes up instead to buy back the
    // world width. Net result: bird sits ~25% from the left with ~12 units of
    // corridor visible ahead, roughly one pipe spacing of warning.
    portrait: {
      offset: [-2.8, 1.9, 20.0],
      lookAhead: 4.2,
      fovBoost: 16,
    },

    heightFollow: 0.55, // how much of the bird's Y the camera tracks
    lag: 7, // higher = snappier
  },

  scoring: {
    pipe: 1,
    gem: 2,
  },
};
