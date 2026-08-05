// obstacles.js — dark monolith gates with molten gold rims and pulsing score rings

import * as THREE from 'three';
import { GROUND_Y, CEILING_Y } from './world.js';

export const FIELD = {
  gap: 3.8,
  width: 2.4,
  depth: 1.6,
  spacing: 13.5,
  count: 6,
  minGapCenter: 5.0,
  maxGapCenter: 13.0,
  birdX: 0, // bird fixed at x=0, world scrolls on Z
};

function monoMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x121018,
    roughness: 0.72,
    metalness: 0.45,
    flatShading: true,
    envMapIntensity: 0.6,
  });
}

function rimMaterial(color = 0xffb020) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });
}

function createPillar(height) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(FIELD.width, height, FIELD.depth),
    monoMaterial(),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = height / 2;
  g.add(body);

  // Vertical edge lights
  const edgeGeo = new THREE.BoxGeometry(0.08, height, 0.08);
  const rim = rimMaterial();
  const offsets = [
    [FIELD.width / 2, FIELD.depth / 2],
    [FIELD.width / 2, -FIELD.depth / 2],
    [-FIELD.width / 2, FIELD.depth / 2],
    [-FIELD.width / 2, -FIELD.depth / 2],
  ];
  for (const [x, z] of offsets) {
    const e = new THREE.Mesh(edgeGeo, rim);
    e.position.set(x, height / 2, z);
    g.add(e);
  }

  // Cap plate
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(FIELD.width + 0.3, 0.25, FIELD.depth + 0.3),
    rimMaterial(0xff6a00),
  );
  cap.position.y = height;
  cap.castShadow = true;
  g.add(cap);

  // Side faceted fins
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x1a1520,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, height * 0.7, 0.12),
      finMat,
    );
    fin.position.set(side * (FIELD.width / 2 + 0.15), height * 0.45, 0);
    fin.rotation.z = side * 0.15;
    g.add(fin);
  }

  return g;
}

function createRing() {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(FIELD.gap * 0.55, 0.06, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffb020,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  ring.rotation.y = Math.PI / 2;
  return ring;
}

class Gate {
  constructor(scene) {
    this.group = new THREE.Group();
    this.passed = false;
    this.gapCenter = 9;
    this.scored = false;

    this.bottom = createPillar(8);
    this.top = createPillar(8);
    this.group.add(this.bottom, this.top);

    // Floating arch beams left/right for lateral walls feel
    this.ring = createRing();
    this.group.add(this.ring);

    // Side pylons (silhouette depth, no collision)
    this.leftPylon = createPillar(8);
    this.rightPylon = createPillar(8);
    this.group.add(this.leftPylon, this.rightPylon);

    scene.add(this.group);
    this.active = false;
    this.group.visible = false;
  }

  place(z, gapCenter) {
    this.gapCenter = gapCenter;
    this.group.position.set(0, 0, z);
    this.passed = false;
    this.scored = false;
    this.active = true;
    this.group.visible = true;

    const halfGap = FIELD.gap / 2;
    const gapLo = gapCenter - halfGap;
    const gapHi = gapCenter + halfGap;
    const bottomH = Math.max(1.2, gapLo - GROUND_Y);
    const topH = Math.max(1.2, CEILING_Y + 5 - gapHi);

    // Pillar group origin is at its base; children built for height 8
    this.bottom.scale.set(1, bottomH / 8, 1);
    this.bottom.position.set(0, GROUND_Y, 0);
    this.bottom.rotation.set(0, 0, 0);

    this.top.scale.set(1, topH / 8, 1);
    this.top.position.set(0, gapHi, 0);
    this.top.rotation.set(0, 0, 0);

    this.ring.position.y = gapCenter;
    this.ring.material.opacity = 0;
    this.ring.scale.setScalar(1);

    const sideH = 4 + Math.random() * 5;
    this.leftPylon.scale.set(0.55, sideH / 8, 0.55);
    this.rightPylon.scale.set(0.55, sideH / 8, 0.55);
    this.leftPylon.position.set(-6.5 - Math.random() * 2, GROUND_Y, 0);
    this.rightPylon.position.set(6.5 + Math.random() * 2, GROUND_Y, 0);
  }

  get z() { return this.group.position.z; }
  set z(v) { this.group.position.z = v; }

  // Axis-aligned collision against top/bottom pillars at bird X≈0
  hits(birdPos, radius) {
    if (!this.active) return false;
    const halfW = FIELD.width / 2 + 0.05;
    const halfD = FIELD.depth / 2 + 0.05;
    const bx = birdPos.x;
    const by = birdPos.y;
    const bz = birdPos.z;

    // Only collide when near the gate in Z
    if (Math.abs(bz - this.z) > halfD + radius) return false;
    if (Math.abs(bx) > halfW + radius) return false;

    const halfGap = FIELD.gap / 2;
    const gapLo = this.gapCenter - halfGap;
    const gapHi = this.gapCenter + halfGap;

    // Bird sphere vs gap: collide if outside gap vertically
    if (by - radius < gapLo || by + radius > gapHi) {
      // Ensure we're actually overlapping the pillar slab in Z/X
      return true;
    }
    return false;
  }

  update(dt) {
    if (!this.active) return;
    // Ring flash after score
    if (this.ring.material.opacity > 0) {
      this.ring.material.opacity = Math.max(0, this.ring.material.opacity - dt * 1.8);
      this.ring.scale.multiplyScalar(1 + dt * 1.2);
    }
  }

  flash() {
    this.ring.material.opacity = 0.9;
    this.ring.scale.setScalar(1);
    this.ring.material.color.setHex(0xfff5e0);
  }

  deactivate() {
    this.active = false;
    this.group.visible = false;
  }
}

export class ObstacleField {
  constructor(scene) {
    this.scene = scene;
    this.gates = [];
    for (let i = 0; i < FIELD.count; i++) {
      this.gates.push(new Gate(scene));
    }
    this.nextZ = -18;
    this.reset();
  }

  reset() {
    this.nextZ = -18;
    let z = -18;
    for (let i = 0; i < this.gates.length; i++) {
      const center = this._randomCenter(i === 0 ? 9 : null);
      this.gates[i].place(z, center);
      z -= FIELD.spacing;
    }
    this.nextZ = z;
  }

  _randomCenter(prefer) {
    if (prefer != null) return prefer;
    return FIELD.minGapCenter + Math.random() * (FIELD.maxGapCenter - FIELD.minGapCenter);
  }

  update(dt, speed, birdZ) {
    let scored = 0;
    for (const g of this.gates) {
      if (!g.active) continue;
      g.z += speed * dt;
      g.update(dt);

      // Score when gate passes behind bird
      if (!g.scored && g.z > birdZ + 0.5) {
        g.scored = true;
        g.flash();
        scored += 1;
      }
    }

    // Recycle gates that have scrolled past the camera back to the far end
    for (const g of this.gates) {
      if (!g.active) continue;
      if (g.z > birdZ + 16) {
        const farthest = Math.min(...this.gates.map((x) => x.z));
        const placeZ = Math.min(this.nextZ, farthest - FIELD.spacing);
        g.place(placeZ, this._randomCenter());
        this.nextZ = placeZ - FIELD.spacing;
      }
    }

    return scored;
  }

  collides(birdPos, radius) {
    for (const g of this.gates) {
      if (g.hits(birdPos, radius)) return true;
    }
    return false;
  }
}
