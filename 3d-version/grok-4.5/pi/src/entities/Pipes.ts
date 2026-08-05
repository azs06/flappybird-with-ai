import * as THREE from "three";
import { PIPES, WORLD } from "../game/constants";
import type { MaterialKit } from "../systems/materials";
import type { RNG } from "../core/rng";

export type PipePair = {
  group: THREE.Group;
  x: number;
  gapY: number;
  gapH: number;
  scored: boolean;
  active: boolean;
  ring: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  bottomTop: number;
  topBottom: number;
};

function makeTower(
  mats: MaterialKit,
  height: number,
  upward: boolean,
): THREE.Group {
  const g = new THREE.Group();
  const bodyH = Math.max(0.5, height - 0.45);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.86, bodyH, 12),
    mats.pipeBody,
  );
  body.position.y = upward ? bodyH / 2 : -bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Vertical panel grooves (readability / form)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, bodyH * 0.92, 0.12),
      mats.pipeAccent,
    );
    rib.position.set(Math.cos(a) * 0.82, body.position.y, Math.sin(a) * 0.82);
    g.add(rib);
  }

  // Cap / mouth
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 0.95, 0.42, 14),
    mats.pipeCap,
  );
  cap.position.y = upward ? bodyH + 0.12 : -(bodyH + 0.12);
  cap.castShadow = true;
  g.add(cap);

  // Lip ring
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 8, 20),
    mats.pipeAccent,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = cap.position.y + (upward ? 0.22 : -0.22);
  g.add(lip);

  // Band trim near mouth
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.14, 12),
    mats.pipeAccent,
  );
  band.position.y = upward ? bodyH - 0.35 : -(bodyH - 0.35);
  g.add(band);

  // Crystal lanterns on sides for silhouette interest
  for (const side of [-1, 1]) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      mats.crystal,
    );
    crystal.position.set(side * 0.95, cap.position.y, 0.2);
    g.add(crystal);
  }

  return g;
}

function makePairVisual(mats: MaterialKit): {
  group: THREE.Group;
  bottom: THREE.Group;
  top: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const bottom = makeTower(mats, 8, true);
  const top = makeTower(mats, 8, false);
  bottom.name = "bottom";
  top.name = "top";

  const ringMat = mats.pipeRing.clone();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PIPES.ringRadius, 0.07, 10, 28), ringMat);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = false;

  // Soft inner glow disc (score gate read)
  const gate = new THREE.Mesh(
    new THREE.RingGeometry(0.35, PIPES.ringRadius - 0.05, 28),
    new THREE.MeshBasicMaterial({
      color: 0x7cf0ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  gate.rotation.y = Math.PI / 2;

  group.add(bottom, top, ring, gate);
  return { group, bottom, top, ring, ringMat };
}

export class PipeManager {
  readonly root = new THREE.Group();
  readonly pairs: PipePair[] = [];
  private speed = PIPES.baseSpeed as number;
  private scoreRef = 0;
  private mats: MaterialKit;
  private rng: RNG;

  constructor(mats: MaterialKit, rng: RNG) {
    this.mats = mats;
    this.rng = rng;
    for (let i = 0; i < PIPES.poolSize; i++) {
      const vis = makePairVisual(mats);
      this.root.add(vis.group);
      this.pairs.push({
        group: vis.group,
        x: 0,
        gapY: 0,
        gapH: PIPES.baseGap,
        scored: false,
        active: false,
        ring: vis.ring,
        ringMat: vis.ringMat,
        bottomTop: 0,
        topBottom: 0,
      });
      vis.group.visible = false;
    }
  }

  reset(score = 0): void {
    this.scoreRef = score;
    this.speed = this.speedFor(score);
    for (let i = 0; i < this.pairs.length; i++) {
      const p = this.pairs[i]!;
      this.placePair(p, PIPES.firstOffset + i * PIPES.spacing, score + i);
    }
  }

  private speedFor(score: number): number {
    return Math.min(PIPES.maxSpeed, PIPES.baseSpeed + score * PIPES.speedPerScore);
  }

  private gapFor(score: number): number {
    return Math.max(PIPES.minGap, PIPES.baseGap - score * PIPES.gapShrinkPerScore);
  }

  private placePair(p: PipePair, x: number, difficultyIndex: number): void {
    const gapH = this.gapFor(difficultyIndex);
    // Bias gaps toward center early, widen range later.
    const range = Math.min(PIPES.gapCenterRange, 1.1 + difficultyIndex * 0.08);
    let gapY = this.rng.range(-range, range);
    // Keep full gap inside playable vertical band with margin.
    const margin = 0.55;
    const minY = WORLD.floorY + gapH / 2 + margin;
    const maxY = WORLD.ceilingY - gapH / 2 - margin;
    gapY = THREE.MathUtils.clamp(gapY, minY, maxY);

    p.x = x;
    p.gapY = gapY;
    p.gapH = gapH;
    p.scored = false;
    p.active = true;
    p.bottomTop = gapY - gapH / 2;
    p.topBottom = gapY + gapH / 2;

    p.group.visible = true;
    p.group.position.set(x, 0, 0);

    const bottom = p.group.getObjectByName("bottom") as THREE.Group;
    const top = p.group.getObjectByName("top") as THREE.Group;

    // Towers are authored with mouth ~MOUTH_LOCAL from local origin.
    // Scale then place so the mouth sits exactly on the gap edge.
    const MOUTH_LOCAL = 8.0;
    const bottomSpan = Math.max(1.2, p.bottomTop - (WORLD.floorY - 2.2));
    const topSpan = Math.max(1.2, WORLD.ceilingY + 2.2 - p.topBottom);
    const bottomScale = bottomSpan / MOUTH_LOCAL;
    const topScale = topSpan / MOUTH_LOCAL;

    bottom.scale.set(1, bottomScale, 1);
    top.scale.set(1, topScale, 1);
    // Bottom grows +Y from origin → mouth at +MOUTH_LOCAL * scale
    bottom.position.y = p.bottomTop - MOUTH_LOCAL * bottomScale;
    // Top grows -Y from origin → mouth at -MOUTH_LOCAL * scale
    top.position.y = p.topBottom + MOUTH_LOCAL * topScale;

    p.ring.position.set(0, gapY, 0);
    // Fit ring roughly to gap opening for readable gates.
    const ringScale = THREE.MathUtils.clamp(gapH / (PIPES.ringRadius * 2.1), 0.75, 1.35);
    p.ring.scale.setScalar(ringScale);
    p.ringMat.copy(this.mats.pipeRing);
    p.ringMat.emissiveIntensity = 0.85;

    const gate = p.group.children.find(
      (c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry instanceof THREE.RingGeometry,
    ) as THREE.Mesh | undefined;
    if (gate) {
      gate.position.set(0, gapY, 0);
      gate.scale.setScalar(ringScale);
    }

    // Subtle Z jitter for depth composition
    p.group.position.z = this.rng.range(-0.15, 0.15);
  }

  update(dt: number, birdX: number, score: number): number {
    this.scoreRef = score;
    this.speed = this.speedFor(score);
    let scored = 0;

    // Find rightmost active x for recycling
    let maxX = -Infinity;
    for (const p of this.pairs) if (p.active) maxX = Math.max(maxX, p.x);

    for (const p of this.pairs) {
      if (!p.active) continue;
      p.x -= this.speed * dt;
      p.group.position.x = p.x;

      // Animate ring
      p.ring.rotation.x += dt * 0.9;
      p.ring.rotation.z += dt * 0.35;

      // Score when bird passes ring plane
      if (!p.scored && p.x < birdX - 0.15) {
        p.scored = true;
        scored += 1;
        p.ringMat.copy(this.mats.pipeRingDim);
      }

      if (p.x < birdX - PIPES.recycleBehind) {
        const newX = maxX + PIPES.spacing;
        maxX = newX;
        this.placePair(p, newX, this.scoreRef + 3);
      }
    }

    return scored;
  }

  getSpeed(): number {
    return this.speed;
  }

  /**
   * Circle vs pipe columns in X/Y.
   * Safe only when the bird circle is fully inside the gap opening.
   */
  collides(birdX: number, birdY: number, birdR: number): boolean {
    const hw = PIPES.halfWidth;
    for (const p of this.pairs) {
      if (!p.active) continue;
      const dx = Math.abs(birdX - p.x);
      if (dx > hw + birdR) continue;

      // Fully inside the gap opening → no hit.
      if (birdY - birdR >= p.bottomTop && birdY + birdR <= p.topBottom) {
        continue;
      }

      // Otherwise overlapping a tower body (or clipping a mouth edge).
      return true;
    }
    return false;
  }
}
