import { Group, Mesh, MeshStandardMaterial, CylinderGeometry } from 'three';
import { CFG, clamp, rand } from './config.js';

const P = CFG.pipe;

const GEO = {
  // Unit-height cylinder, scaled per pipe on Y only.
  body: new CylinderGeometry(P.radius, P.radius, 1, 20, 1, false),
  cap: new CylinderGeometry(P.capRadius, P.capRadius, P.capHeight, 22, 1, false),
};

const MAT = {
  body: new MeshStandardMaterial({ color: 0x59c135, roughness: 0.6, metalness: 0.02 }),
  cap: new MeshStandardMaterial({ color: 0x4bb02b, roughness: 0.5, metalness: 0.03 }),
};

const TOP_OVERSHOOT = 9; // how far pipes extend past the visible bounds
const BOTTOM_OVERSHOOT = 3;

class Pipe {
  constructor() {
    this.group = new Group();
    this.group.visible = false;

    this.topBody = new Mesh(GEO.body, MAT.body);
    this.topCap = new Mesh(GEO.cap, MAT.cap);
    this.bottomBody = new Mesh(GEO.body, MAT.body);
    this.bottomCap = new Mesh(GEO.cap, MAT.cap);

    for (const m of [this.topBody, this.topCap, this.bottomBody, this.bottomCap]) {
      m.castShadow = true;
      this.group.add(m);
    }

    this.active = false;
    this.scored = false;
    this.gapTop = 0;
    this.gapBottom = 0;
  }

  place(x, gapCenter, gapSize) {
    this.group.position.x = x;
    this.group.visible = true;
    this.active = true;
    this.scored = false;

    this.gapTop = gapCenter + gapSize / 2;
    this.gapBottom = gapCenter - gapSize / 2;

    const topEnd = CFG.ceiling + TOP_OVERSHOOT;
    const topLen = Math.max(0.2, topEnd - this.gapTop);
    this.topBody.scale.y = topLen;
    this.topBody.position.y = this.gapTop + topLen / 2;
    this.topCap.position.y = this.gapTop + P.capHeight / 2;

    const bottomEnd = CFG.groundY - BOTTOM_OVERSHOOT;
    const bottomLen = Math.max(0.2, this.gapBottom - bottomEnd);
    this.bottomBody.scale.y = bottomLen;
    this.bottomBody.position.y = this.gapBottom - bottomLen / 2;
    this.bottomCap.position.y = this.gapBottom - P.capHeight / 2;
  }

  retire() {
    this.active = false;
    this.group.visible = false;
  }
}

/**
 * Owns the pipe pool: spawning, recycling, scoring and collision.
 * Pipes are the only gameplay obstacles; everything is pooled so a long run
 * never allocates.
 */
export class PipeField {
  constructor(scene) {
    this.root = new Group();
    scene.add(this.root);
    this.pipes = Array.from({ length: P.poolSize }, () => {
      const p = new Pipe();
      this.root.add(p.group);
      return p;
    });
    this.spawnX = 16;
    this.despawnX = -16;
    this.lastCenter = 0;
    this.reset();
  }

  /** Keeps spawn/despawn just outside the visible frustum on any aspect. */
  setBounds(centerX, halfWidth) {
    this.spawnX = centerX + halfWidth + P.radius + 1.5;
    this.despawnX = centerX - halfWidth - P.capRadius - 2;
  }

  reset() {
    for (const p of this.pipes) p.retire();
    this.lastCenter = rand(-0.8, 1.2);
    // First obstacle gets extra breathing room.
    this.pendingFirstX = this.spawnX + 4.5;
  }

  gapSizeFor(score) {
    return Math.max(P.gapMin, P.gapStart - score * P.gapShrinkPerPoint);
  }

  #nextGapCenter(gapSize) {
    const min = CFG.groundY + P.edgeMargin + gapSize / 2;
    const max = CFG.ceiling - P.edgeMargin - gapSize / 2;
    const lo = Math.max(min, this.lastCenter - P.maxCenterDelta);
    const hi = Math.min(max, this.lastCenter + P.maxCenterDelta);
    const center = clamp(rand(lo, hi), min, max);
    this.lastCenter = center;
    return center;
  }

  #spawn(x, score) {
    const pipe = this.pipes.find((p) => !p.active);
    if (!pipe) return;
    const gap = this.gapSizeFor(score);
    pipe.place(x, this.#nextGapCenter(gap), gap);
  }

  /**
   * Advances the field. Returns how many pipes were cleared this step and
   * whether the bird collided.
   */
  update(dt, speed, score, birdY, moving) {
    if (moving) {
      for (const p of this.pipes) {
        if (!p.active) continue;
        p.group.position.x -= speed * dt;
        if (p.group.position.x < this.despawnX) p.retire();
      }
    }

    // Spawn logic: maintain one pipe every `spacing` units.
    if (moving) {
      if (this.pendingFirstX !== null) {
        this.#spawn(this.pendingFirstX, score);
        this.pendingFirstX = null;
      } else {
        let rightmost = -Infinity;
        for (const p of this.pipes) if (p.active) rightmost = Math.max(rightmost, p.group.position.x);
        if (rightmost < this.spawnX - P.spacing) this.#spawn(this.spawnX, score);
      }
    }

    let scored = 0;
    let hit = false;
    const bx = CFG.bird.x;
    const r = CFG.bird.radius;

    for (const p of this.pipes) {
      if (!p.active) continue;
      const px = p.group.position.x;

      if (!p.scored && px < bx) {
        p.scored = true;
        scored += 1;
      }

      // Circle vs. two vertically semi-infinite rects (top pipe fills
      // everything above gapTop, bottom pipe everything below gapBottom).
      const dx = Math.max(0, Math.abs(px - bx) - P.radius);
      if (dx >= r) continue;
      const r2 = r * r;
      const dxSq = dx * dx;
      const dyTop = Math.max(0, p.gapTop - birdY); // 0 when already inside the top pipe
      const dyBottom = Math.max(0, birdY - p.gapBottom);
      if (dxSq + dyTop * dyTop < r2 || dxSq + dyBottom * dyBottom < r2) hit = true;
    }

    return { scored, hit };
  }

  /**
   * Nearest gap the bird has not yet cleared. A pipe stays "ahead" until the
   * bird is fully past its body, so anything steering by this value (camera
   * lead, autopilot) won't start climbing toward the next gap while it is
   * still between the current pipe's lips.
   */
  nearestGapAhead() {
    const clearedAt = -(P.radius + CFG.bird.radius);
    let best = null;
    for (const p of this.pipes) {
      if (!p.active) continue;
      const dx = p.group.position.x - CFG.bird.x;
      if (dx < clearedAt) continue;
      if (!best || dx < best.dx) best = { dx, y: (p.gapTop + p.gapBottom) / 2 };
    }
    return best;
  }
}
