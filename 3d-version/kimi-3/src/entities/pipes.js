import * as THREE from 'three';
import { CONFIG } from '../game/config.js';

// ---------------------------------------------------------------------------
// PipeField — jade canyon gates. Instanced bodies + lips (2 draw calls for
// every pipe in the world), a procedural stripe texture, per-instance tint
// variation, and a glowing target marker on the next gate to clear.
// ---------------------------------------------------------------------------

function jadeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 256);
  // Subtle vertical strata + noise speckle for carved-stone richness.
  for (let x = 0; x < 128; x += 8) {
    g.fillStyle = `rgba(10, 60, 45, ${0.05 + Math.random() * 0.06})`;
    g.fillRect(x, 0, 3 + Math.random() * 3, 256);
  }
  for (let i = 0; i < 340; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(0,40,28,${Math.random() * 0.1})`;
    g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.6, 2.6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BODY_LEN = 30;      // fixed pipe length — far ends live offscreen/buried
const SINK_START = 2;     // passed gates slide into the sand…
const SINK_END = 7;       // …fully sunk before they reach the camera
const SINK_DEPTH = 46;

export class PipeField {
  constructor(scene, rng) {
    this.rng = rng;
    this.pairs = [];
    this.scene = scene;

    const max = CONFIG.pipes.maxPairs;
    const tex = jadeTexture();

    // Bodies: fixed-length cylinders (no per-instance Y scale → no texture stretch).
    const bodyGeo = new THREE.CylinderGeometry(CONFIG.pipes.radius, CONFIG.pipes.radius, BODY_LEN, 22, 1, true);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.5, metalness: 0.08,
    });
    this.bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, max * 2);
    this.bodies.castShadow = true;
    this.bodies.receiveShadow = true;

    // Lips: flared caps at the gap edges (classic Flappy silhouette).
    const lipGeo = new THREE.CylinderGeometry(CONFIG.pipes.lipRadius, CONFIG.pipes.lipRadius * 0.96, CONFIG.pipes.lipHeight, 22);
    const lipMat = new THREE.MeshStandardMaterial({
      map: tex, color: 0xe8fff4, roughness: 0.42, metalness: 0.1,
      emissive: 0x0a4034, emissiveIntensity: 0.35,
    });
    this.lips = new THREE.InstancedMesh(lipGeo, lipMat, max * 2);
    this.lips.castShadow = true;

    // Per-instance tint variation (subtle, keeps jade family).
    const c = new THREE.Color();
    for (let i = 0; i < max * 2; i++) {
      c.setHSL(0.42 + this.rng.range(-0.02, 0.02), 0.55, this.rng.range(0.52, 0.62));
      this.bodies.setColorAt(i, c);
      this.lips.setColorAt(i, c.clone().offsetHSL(0, -0.05, 0.12));
    }

    scene.add(this.bodies, this.lips);

    // Target gate marker: two soft rings hovering at the next gap's edges.
    const ringGeo = new THREE.TorusGeometry(CONFIG.pipes.lipRadius + 0.06, 0.04, 10, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x35f0b8, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.ringTop = new THREE.Mesh(ringGeo, ringMat);
    this.ringBottom = new THREE.Mesh(ringGeo, ringMat.clone());
    this.ringTop.rotation.x = this.ringBottom.rotation.x = Math.PI / 2;
    this.ringTop.renderOrder = this.ringBottom.renderOrder = 15;
    scene.add(this.ringTop, this.ringBottom);
    this._ringT = 0;

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  reset(diff, { firstZ = -38, firstGapY = 1.4 } = {}) {
    this.pairs.length = 0;
    // Gentle opener: centered, then escalating placement handled by spawn().
    let z = firstZ;
    for (let i = 0; i < CONFIG.pipes.maxPairs; i++) {
      const gapY = i === 0 ? firstGapY : this._nextGapY(diff);
      this.pairs.push({ z, gapY, gap: diff.gap, passed: false, scored: false });
      z -= diff.spacing;
    }
  }

  _nextGapY(diff) {
    // Keep the next gap reachable: clamp relative jump from the last gap.
    const last = this.pairs[this.pairs.length - 1];
    const maxStep = 4.6;
    const range = diff.center;
    let y = this.rng.range(-range, range);
    if (last) y = THREE.MathUtils.clamp(y, last.gapY - maxStep, last.gapY + maxStep);
    return THREE.MathUtils.clamp(y, CONFIG.world.groundY + diff.gap / 2 + 1.2, CONFIG.world.ceilingY - diff.gap / 2 - 1.0);
  }

  // Advance the field; recycle gates that went past the camera.
  update(dt, speed, diff) {
    const dz = speed * dt;
    let farthest = -Infinity;
    for (const p of this.pairs) farthest = Math.max(farthest, p.z - 0); // p.z is negative ahead
    for (const p of this.pairs) p.z += dz;
    // Recycle: anything behind the despawn line jumps to the back.
    let back = -Infinity;
    for (const p of this.pairs) back = Math.max(back, -p.z);
    for (const p of this.pairs) {
      if (p.z > CONFIG.world.despawnZ) {
        p.z = -back - diff.spacing;
        p.gapY = this._nextGapY(diff);
        p.gap = diff.gap;
        p.passed = false;
        p.scored = false;
        back = -p.z;
      }
    }
    this._writeInstances();
    this._updateRings(dt);
  }

  _writeInstances() {
    let i = 0;
    for (const p of this.pairs) {
      // Passed gates sink into the sand before reaching the camera.
      const s = THREE.MathUtils.clamp((p.z - SINK_START) / (SINK_END - SINK_START), 0, 1);
      const sink = s * s * (3 - 2 * s) * SINK_DEPTH;
      const gapTop = p.gapY + p.gap / 2 - sink;
      const gapBot = p.gapY - p.gap / 2 - sink;
      // Top body hangs from above; bottom body rises from below.
      this._compose(0, gapTop + BODY_LEN / 2, p.z, 1, 1, 1);
      this.bodies.setMatrixAt(i, this._m);
      this._compose(0, gapTop + CONFIG.pipes.lipHeight / 2, p.z, 1, 1, 1);
      this.lips.setMatrixAt(i, this._m);
      i++;
      this._compose(0, gapBot - BODY_LEN / 2, p.z, 1, 1, 1);
      this.bodies.setMatrixAt(i, this._m);
      this._compose(0, gapBot - CONFIG.pipes.lipHeight / 2, p.z, 1, 1, 1);
      this.lips.setMatrixAt(i, this._m);
      i++;
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.lips.instanceMatrix.needsUpdate = true;
  }

  _compose(x, y, z, sx, sy, sz) {
    this._p.set(x, y, z);
    this._s.set(sx, sy, sz);
    this._m.compose(this._p, this._q, this._s);
  }

  _updateRings(dt) {
    this._ringT += dt;
    const next = this.nextGate();
    const pulse = 0.34 + Math.sin(this._ringT * 4) * 0.12;
    // Hide once the bird is at the threshold — the ring's job is done.
    if (next && next.z < CONFIG.bird.z - 0.2) {
      this.ringTop.visible = this.ringBottom.visible = true;
      this.ringTop.position.set(0, next.gapY + next.gap / 2, next.z);
      this.ringBottom.position.set(0, next.gapY - next.gap / 2, next.z);
      this.ringTop.material.opacity = pulse;
      this.ringBottom.material.opacity = pulse;
    } else {
      this.ringTop.visible = this.ringBottom.visible = false;
    }
  }

  // The gate the bird is currently attacking: nearest one whose z has not
  // fully passed the bird (stays "current" until the slab clears the bird,
  // so consumers don't jump targets mid-passage).
  nextGate() {
    const limit = CONFIG.bird.z + CONFIG.pipes.collideDepth / 2 + CONFIG.bird.radius + 0.4;
    let best = null;
    for (const p of this.pairs) {
      if (p.z < limit && (!best || p.z > best.z)) best = p;
    }
    return best;
  }

  // Sphere-vs-gap test against every gate overlapping the bird's z slab.
  checkCollision(birdY, r) {
    for (const p of this.pairs) {
      if (Math.abs(p.z - CONFIG.bird.z) < CONFIG.pipes.collideDepth / 2 + r * 0.55) {
        const gapTop = p.gapY + p.gap / 2;
        const gapBot = p.gapY - p.gap / 2;
        // Slight forgiveness: shrink the effective radius at the lip edges.
        const fr = r * 0.82;
        if (birdY + fr > gapTop || birdY - fr < gapBot) {
          return { pair: p, gapTop, gapBot };
        }
      }
    }
    return null;
  }

  // Detect fresh passes; returns array of cleared gates (usually 0 or 1).
  collectPasses() {
    const cleared = [];
    for (const p of this.pairs) {
      if (!p.scored && p.z - CONFIG.pipes.collideDepth / 2 > CONFIG.bird.z + CONFIG.bird.radius * 0.4) {
        p.scored = true;
        cleared.push(p);
      }
    }
    return cleared;
  }

  setShadows(v) {
    this.bodies.castShadow = v;
    this.lips.castShadow = v;
  }
}
