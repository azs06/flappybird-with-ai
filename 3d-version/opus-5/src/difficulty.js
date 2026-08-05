/**
 * The difficulty curve.
 *
 * This single function decides how the game escalates. Every other system just
 * reads what it returns, so this is the one place to change to make the game
 * feel gentler, meaner, or paced differently.
 *
 *   gap      vertical opening between the two pipes (bird is 1.24 units tall)
 *   spacing  horizontal distance between consecutive pipe pairs
 *   yRange   how far the gap centre may drift from y = 0
 *   drift    max vertical jump between two consecutive gap centres
 *   speed    forward flight speed (also drives wind volume + camera FOV kick)
 */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// ───────────────────────────────── YOUR DIAL ─────────────────────────────────
// Baseline curve: ramps over the first ~30 points, then holds steady.
// `t` runs 0 -> 1 as the player scores. Swap the easing to reshape the ramp:
//   t              linear      steady, predictable grind
//   t * t          ease-in     forgiving early, sharp late  (feels generous)
//   Math.sqrt(t)   ease-out    bites immediately, plateaus  (feels brutal)
export function getDifficulty(score) {
  const t = clamp01(score / 30);
  const ramp = t * t; // ease-in: let newcomers find their rhythm first

  return {
    gap: lerp(6.4, 4.15, ramp),
    spacing: lerp(15.0, 11.0, ramp),
    yRange: lerp(2.4, 4.3, ramp),
    drift: lerp(2.6, 5.2, ramp),
    speed: lerp(11.5, 18.0, clamp01(score / 40)), // speed ramps slower than geometry
  };
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Choose the next gap centre as a bounded random walk from the previous one.
 *
 * A pure `random()` per pipe produces unfair whiplash (top gap immediately
 * followed by bottom gap). Walking from the previous centre keeps the corridor
 * legible while still feeling unpredictable.
 */
export function nextGapCenter(prevCenter, d, rand = Math.random) {
  const step = (rand() * 2 - 1) * d.drift;

  // Keep the opening reachable: never let the lower lip sink into the ground,
  // nor the upper lip poke through the ceiling.
  const lo = Math.max(-d.yRange, -8.2 + d.gap / 2 + 0.9);
  const hi = Math.min(d.yRange, 12 - d.gap / 2 - 0.9);

  const target = prevCenter + step;
  return Math.min(hi, Math.max(lo, target));
}
