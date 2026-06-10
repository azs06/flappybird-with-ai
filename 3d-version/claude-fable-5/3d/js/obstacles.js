// obstacles.js — gates of stacked paper towers with a gap to thread.
// Each gate owns two towers (floor-up and sky-down) built from pooled box
// segments: recycling a gate just re-stacks the segments, so steady-state
// play allocates nothing.

import * as THREE from 'three';

const TOWER_COLORS = ['#e9b4a0', '#9cc5b8', '#e7cf9f', '#c9b8d8', '#a8c8d8', '#e8a386'];
const SEGMENT_GEO = new THREE.BoxGeometry(1, 1, 1);
const LID_GEO = new THREE.BoxGeometry(1, 1, 1);
const MAX_SEGMENTS = 14;
const SKY_TOP = 22;          // top towers hang down from here

export const FIELD = {
  width: 3.2,                // tower footprint (x and z)
  spacing: 26,               // distance between gates
  spawnZ: -130,              // gates are recycled to here
  killZ: 14,                 // ...once they pass here
  ceiling: 15,               // bird's hard ceiling
};

class Tower {
  constructor(parent) {
    this.group = new THREE.Group();
    this.segments = [];
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: TOWER_COLORS[Math.floor(Math.random() * TOWER_COLORS.length)],
        flatShading: true,
      });
      const seg = new THREE.Mesh(SEGMENT_GEO, mat);
      seg.castShadow = true;
      seg.receiveShadow = true;
      seg.visible = false;
      this.group.add(seg);
      this.segments.push(seg);
    }
    // a slightly wider "lid" segment caps the gap edge, like a box rim
    this.lid = new THREE.Mesh(
      LID_GEO,
      new THREE.MeshStandardMaterial({ color: '#fbf6ec', flatShading: true }),
    );
    this.lid.castShadow = true;
    this.group.add(this.lid);
    parent.add(this.group);
  }

  // Stack segments from yStart toward yEnd (up or down), with papery jitter.
  // Each segment is grown by a small overlap so no two boxes ever share a
  // coplanar face — coplanar faces z-fight (visible striping artifacts).
  build(yStart, yEnd) {
    const OVERLAP = 0.05;
    const dir = Math.sign(yEnd - yStart) || 1;
    const total = Math.abs(yEnd - yStart);
    let used = 0;
    for (const seg of this.segments) {
      if (used >= total - 0.01) { seg.visible = false; continue; }
      const h = Math.min(1.1 + Math.random() * 1.1, total - used);
      const w = FIELD.width * (0.92 + Math.random() * 0.16);
      seg.visible = true;
      seg.scale.set(w, h + OVERLAP * 2, FIELD.width * (0.92 + Math.random() * 0.16));
      seg.position.set(
        (Math.random() - 0.5) * 0.22,
        yStart + dir * (used + h / 2),
        (Math.random() - 0.5) * 0.22,
      );
      seg.rotation.y = (Math.random() - 0.5) * 0.16;
      used += h;
    }
    // lid sits at the gap edge (the dangerous lip the player grazes),
    // nudged outward so its faces clear the segment planes entirely
    this.lid.scale.set(FIELD.width * 1.18, 0.5, FIELD.width * 1.18);
    this.lid.position.set(0, yStart + dir * 0.21, 0);

    // collision bounds for this tower (a simple AABB in local space),
    // padded just past the lid's protruding lip
    this.lowY = Math.min(yStart, yEnd) - 0.05;
    this.highY = Math.max(yStart, yEnd) + 0.05;
  }
}

class Gate {
  constructor(scene) {
    this.root = new THREE.Group();
    this.bottom = new Tower(this.root);
    this.top = new Tower(this.root);
    this.scored = false;
    scene.add(this.root);
  }

  place(z, gapCenter, gapSize) {
    this.root.position.set(0, 0, z);
    // both towers build *away* from the gap, so each lid caps the gap lip
    this.bottom.build(gapCenter - gapSize / 2, 0);
    this.top.build(gapCenter + gapSize / 2, SKY_TOP);
    this.scored = false;
  }

  get z() { return this.root.position.z; }
  set z(v) { this.root.position.z = v; }

  // Sphere-vs-AABB test against both towers. The bird lives at x=0, z=0.
  hits(birdY, radius) {
    const halfDepth = FIELD.width / 2 + 0.2;       // generous lip from jitter
    if (Math.abs(this.z) > halfDepth + radius) return false;
    // within the gate's depth — only the gap is safe
    return (
      birdY - radius < this.bottom.highY ||
      birdY + radius > this.top.lowY
    );
  }
}

export class ObstacleField {
  constructor(scene) {
    this.scene = scene;
    this.gates = [];
    const count = Math.ceil((FIELD.killZ - FIELD.spawnZ) / FIELD.spacing) + 1;
    for (let i = 0; i < count; i++) this.gates.push(new Gate(scene));
    this.reset();
  }

  // Difficulty curve: the gap narrows and drifts over a wider band as the
  // score climbs, so early play is forgiving and late play is knife-edge.
  gapFor(score) {
    const size = Math.max(3.4, 5.4 - score * 0.05);
    const range = Math.min(4.5, 2 + score * 0.08);
    const center = 6 + (Math.random() - 0.5) * 2 * range;
    return { size, center: THREE.MathUtils.clamp(center, size / 2 + 1.2, 13 - size / 2) };
  }

  reset() {
    this.score = 0;
    // first gate well ahead of the bird, the rest trailing back into the fog
    this.gates.forEach((gate, i) => {
      const { size, center } = this.gapFor(0);
      gate.place(-42 - i * FIELD.spacing, center, size);
    });
  }

  furthestZ() {
    return Math.min(...this.gates.map((g) => g.z));
  }

  // Returns { scored, hit } for this frame.
  update(dt, speed, bird) {
    let scored = false;
    let hit = false;
    for (const gate of this.gates) {
      gate.z += speed * dt;
      if (gate.z > FIELD.killZ) {
        const { size, center } = this.gapFor(this.score);
        gate.place(this.furthestZ() - FIELD.spacing, center, size);
      }
      if (!gate.scored && gate.z > FIELD.width / 2 + bird.radius) {
        gate.scored = true;
        this.score++;
        scored = true;
      }
      if (gate.hits(bird.y, bird.radius)) hit = true;
    }
    return { scored, hit };
  }
}
