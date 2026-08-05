import { CONFIG } from '../game/config.js';

// Analytic collision: the bird is a sphere; pipes are gap-slabs (handled in
// PipeField.checkCollision); the floor is a flat lethal plane along the
// flattened corridor; the ceiling is a soft, non-lethal clamp (applied
// inline in Game._integrateBird).
export function checkWorldCollision(birdY, radius) {
  if (birdY - radius <= CONFIG.world.groundY) return 'ground';
  return null;
}
