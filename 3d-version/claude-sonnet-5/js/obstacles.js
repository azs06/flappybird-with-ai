// obstacles.js — gates of paired crystal spires: a stalagmite rising from
// the void and a stalactite hanging from the dark, each tapering to a sharp
// glowing tip right at the edge of the gap. Pooled and reused — recycling a
// gate just re-scales/re-positions the same handful of unit meshes, so
// steady-state play allocates nothing.

import * as THREE from 'three';

const TOWER_COLORS = ['#63e8ff', '#a78bff', '#ff7ae0', '#ffd166', '#7cffb2', '#ff6b6b'];

// unit geometries, scaled per-instance — never reallocated during play
const SHAFT_GEO = new THREE.CylinderGeometry(1, 1.3, 1, 6, 1, true);
const TIP_GEO = new THREE.ConeGeometry(1, 1, 6);
const CAP_GEO = new THREE.IcosahedronGeometry(1, 0);

export const FIELD = {
  radius: 1.4,          // spire footprint at the base
  spacing: 26,           // distance between gates
  spawnZ: -150,           // gates are recycled to here
  killZ: 16,              // ...once they pass here
  ceiling: 14,            // bird's hard ceiling
  groundAnchor: -14,      // bottom spire's hidden base
  skyAnchor: 24,          // top spire's hidden base
};

class Tower {
  constructor(parent, colorIndex) {
    this.group = new THREE.Group();
    const color = TOWER_COLORS[colorIndex % TOWER_COLORS.length];
    this.mat = new THREE.MeshPhysicalMaterial({
      color,
      flatShading: true,
      metalness: 0.05,
      roughness: 0.1,
      transmission: 0.45,
      thickness: 1.4,
      ior: 1.4,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.1,
    });
    this.shaft = new THREE.Mesh(SHAFT_GEO, this.mat);
    this.shaft.castShadow = true;
    this.shaft.receiveShadow = true;
    this.tip = new THREE.Mesh(TIP_GEO, this.mat);
    this.tip.castShadow = true;
    this.cap = new THREE.Mesh(CAP_GEO, new THREE.MeshBasicMaterial({ color, fog: false }));
    this.group.add(this.shaft, this.tip, this.cap);
    parent.add(this.group);
  }

  // grow from the hidden anchor (yStart) to the sharp tip at the gap edge
  // (yEnd). dir tells which way is "outward" so the cone apex always points
  // back into the gap, the dangerous edge the player actually grazes.
  build(yStart, yEnd) {
    const dir = Math.sign(yEnd - yStart) || 1;
    const total = Math.abs(yEnd - yStart);
    const tipLen = Math.min(1.7, total * 0.3);
    const shaftLen = Math.max(0.4, total - tipLen);
    const radius = FIELD.radius * (0.8 + Math.random() * 0.3);

    this.shaft.scale.set(radius, shaftLen + 0.3, radius);
    this.shaft.position.set(0, yStart + dir * (shaftLen / 2 - 0.15), 0);
    this.shaft.rotation.y = Math.random() * Math.PI;

    this.tip.scale.set(radius * 0.92, tipLen, radius * 0.92);
    this.tip.rotation.x = dir > 0 ? 0 : Math.PI; // apex always faces the gap
    this.tip.position.set(0, yEnd - dir * tipLen / 2, 0);

    this.cap.position.set(0, yEnd, 0);
    this.cap.scale.setScalar(0.16 + Math.random() * 0.07);

    this.lowY = Math.min(yStart, yEnd) - 0.05;
    this.highY = Math.max(yStart, yEnd) + 0.05;
  }
}

class Gate {
  constructor(scene, index) {
    this.root = new THREE.Group();
    this.bottom = new Tower(this.root, index * 2);
    this.top = new Tower(this.root, index * 2 + 1);
    this.scored = false;
    scene.add(this.root);
  }

  place(z, gapCenter, gapSize) {
    this.root.position.set(0, 0, z);
    this.bottom.build(FIELD.groundAnchor, gapCenter - gapSize / 2);
    this.top.build(FIELD.skyAnchor, gapCenter + gapSize / 2);
    this.scored = false;
  }

  get z() { return this.root.position.z; }
  set z(v) { this.root.position.z = v; }

  // sphere-vs-AABB test against both spires; the bird lives at x=0, z=0
  hits(birdY, radius) {
    const halfDepth = FIELD.radius * 1.15 + 0.25;
    if (Math.abs(this.z) > halfDepth + radius) return false;
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
    for (let i = 0; i < count; i++) this.gates.push(new Gate(scene, i));
    this.reset();
  }

  // gap narrows and drifts over a wider band as the score climbs — forgiving
  // early, knife-edge late
  gapFor(score) {
    const size = Math.max(3.2, 5.0 - score * 0.045);
    const range = Math.min(4.2, 1.8 + score * 0.07);
    const center = 5.6 + (Math.random() - 0.5) * 2 * range;
    return { size, center: THREE.MathUtils.clamp(center, size / 2 + 1, FIELD.ceiling - size / 2 - 1) };
  }

  reset() {
    this.score = 0;
    this.gates.forEach((gate, i) => {
      const { size, center } = this.gapFor(0);
      gate.place(-46 - i * FIELD.spacing, center, size);
    });
  }

  furthestZ() {
    return Math.min(...this.gates.map((g) => g.z));
  }

  update(dt, speed, bird) {
    let scored = false;
    let hit = false;
    for (const gate of this.gates) {
      gate.z += speed * dt;
      if (gate.z > FIELD.killZ) {
        const { size, center } = this.gapFor(this.score);
        gate.place(this.furthestZ() - FIELD.spacing, center, size);
      }
      if (!gate.scored && gate.z > FIELD.radius + bird.radius) {
        gate.scored = true;
        this.score++;
        scored = true;
      }
      if (gate.hits(bird.y, bird.radius)) hit = true;
    }
    return { scored, hit };
  }
}
