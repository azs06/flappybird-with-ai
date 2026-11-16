import * as THREE from "three";
import { CFG, currentGap } from "../game/config.ts";
import { rng } from "../core/rng.ts";
import { createGate, type GateView } from "../assets/pillarMesh.ts";
import type { MatKit } from "../assets/materials.ts";
import type { TexKit } from "../assets/textures.ts";

export type Pillar = {
  worldX: number;
  gapY: number;
  baseY: number;
  gapH: number;
  scored: boolean;
  phase: number;
  moving: boolean;
};

export class Course {
  readonly root = new THREE.Group();
  readonly pillars: Pillar[] = [];
  private views: GateView[] = [];
  private nextX = CFG.firstPillar;
  private birdX = 0;

  constructor(mats: MatKit, tex: TexKit) {
    for (let i = 0; i < CFG.poolSize; i++) {
      const view = createGate(mats, tex);
      view.root.visible = false;
      this.views.push(view);
      this.root.add(view.root);
      this.pillars.push({
        worldX: -999,
        gapY: 0,
        baseY: 0,
        gapH: CFG.gapStart,
        scored: true,
        phase: 0,
        moving: false,
      });
    }
  }

  reset(): void {
    this.nextX = CFG.firstPillar;
    this.birdX = 0;
    for (const p of this.pillars) {
      p.worldX = -999;
      p.scored = true;
    }
    for (const v of this.views) v.root.visible = false;
  }

  advance(dx: number, score: number, time: number): void {
    this.birdX += dx;
    while (this.nextX < this.birdX + CFG.pillarSpacing * (CFG.poolSize - 1)) {
      this.spawn(score);
    }
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i]!;
      const v = this.views[i]!;
      if (p.worldX < -50) {
        v.root.visible = false;
        continue;
      }
      if (p.moving) {
        p.gapY = p.baseY + Math.sin(time * 0.85 + p.phase) * 0.42;
      }
      p.gapY = THREE.MathUtils.clamp(
        p.gapY,
        CFG.groundY + p.gapH * 0.5 + 0.35,
        CFG.ceilingY - p.gapH * 0.5 - 0.35,
      );
      const x = p.worldX - this.birdX;
      v.root.visible = true;
      v.root.position.set(x, 0, 0);
      const half = p.gapH * 0.5;
      const colH = 8.4;
      v.lower.position.y = p.gapY - half - colH * 0.5;
      v.upper.position.y = p.gapY + half + colH * 0.5;
      v.ring.position.y = p.gapY;
      v.ring.scale.setScalar(0.55 + p.gapH * 0.18);
      v.ring.rotation.z = time * 0.4 + p.phase;
      for (const l of v.lanterns) l.position.y = p.gapY + half + 0.15;
    }
  }

  private spawn(score: number): void {
    let slot = this.pillars.find((p) => p.worldX < this.birdX - 8);
    if (!slot) slot = this.pillars[0]!;
    const gapH = currentGap(score);
    const lo = CFG.groundY + gapH * 0.5 + 0.55;
    const hi = CFG.ceilingY - gapH * 0.5 - 0.55;
    slot.worldX = this.nextX;
    slot.gapH = gapH;
    slot.gapY = rng.range(lo, hi);
    slot.baseY = slot.gapY;
    slot.scored = false;
    slot.phase = rng.range(0, Math.PI * 2);
    slot.moving = score >= CFG.moveGapsAfter && rng.next() > 0.35;
    this.nextX += CFG.pillarSpacing + rng.range(-0.15, 0.35);
  }

  upcoming(): Pillar | null {
    let best: Pillar | null = null;
    let bestX = Infinity;
    for (const p of this.pillars) {
      const x = p.worldX - this.birdX;
      if (x > -0.4 && x < bestX) {
        best = p;
        bestX = x;
      }
    }
    return best;
  }

  hits(birdY: number, radius: number): boolean {
    if (birdY - radius < CFG.groundY || birdY + radius > CFG.ceilingY) return true;
    const hw = CFG.pillarWidth * 0.5;
    for (const p of this.pillars) {
      const x = p.worldX - this.birdX;
      if (Math.abs(x) > hw + radius) continue;
      const half = p.gapH * 0.5;
      if (birdY - radius < p.gapY - half) return true;
      if (birdY + radius > p.gapY + half) return true;
    }
    return false;
  }

  collectScore(birdY: number): { scored: boolean; perfect: boolean; near: boolean } {
    let scored = false;
    let perfect = false;
    let near = false;
    for (const p of this.pillars) {
      const x = p.worldX - this.birdX;
      if (!p.scored && x < -0.05) {
        p.scored = true;
        scored = true;
        perfect = Math.abs(birdY - p.gapY) < 0.22;
        const half = p.gapH * 0.5;
        const edge = Math.min(Math.abs(birdY - (p.gapY - half)), Math.abs(birdY - (p.gapY + half)));
        near = !perfect && edge < 0.28;
      }
    }
    return { scored, perfect, near };
  }
}
