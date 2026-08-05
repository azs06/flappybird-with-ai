// particles.js — flap embers, score sparks, death explosion, motion trail

import * as THREE from 'three';

function softDisc() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class ParticlePool {
  constructor(scene, max, options = {}) {
    this.max = max;
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.active = 0;

    const pos = new Float32Array(max * 3);
    const col = new Float32Array(max * 3);
    const size = new Float32Array(max);

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(size, 1));

    this.points = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({
        map: softDisc(),
        size: options.size || 0.35,
        vertexColors: true,
        transparent: true,
        opacity: options.opacity ?? 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    // Hide unused by setting draw range
    this.geo.setDrawRange(0, 0);
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, life, r, g, b, size) {
    // Find free slot or overwrite oldest
    let i = -1;
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) { i = k; break; }
    }
    if (i < 0) i = Math.floor(Math.random() * this.max);

    this.life[i] = life;
    this.maxLife[i] = life;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;

    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    const sz = this.geo.attributes.size.array;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    col[i * 3] = r;
    col[i * 3 + 1] = g;
    col[i * 3 + 2] = b;
    sz[i] = size;
  }

  update(dt, drag = 0.98, gravity = 0) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    const sz = this.geo.attributes.size.array;
    let alive = 0;

    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        pos[i * 3 + 1] = -999;
        continue;
      }
      alive++;
      const t = this.life[i] / this.maxLife[i];
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag + gravity * dt;
      this.vel[i * 3 + 2] *= drag;
      pos[i * 3] += this.vel[i * 3] * dt;
      pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      // Fade via size and slight color dim
      sz[i] *= 0.99;
      col[i * 3] *= 0.995 + t * 0.005;
      col[i * 3 + 1] *= 0.99;
      col[i * 3 + 2] *= 0.985;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.setDrawRange(0, this.max);
    this.active = alive;
  }
}

export class Particles {
  constructor(scene) {
    this.embers = new ParticlePool(scene, 220, { size: 0.4 });
    this.sparks = new ParticlePool(scene, 120, { size: 0.5 });
    this.trail = new ParticlePool(scene, 80, { size: 0.28 });
    this._trailAcc = 0;
  }

  flap(pos) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      this.embers.spawn(
        pos.x + (Math.random() - 0.5) * 0.3,
        pos.y + (Math.random() - 0.5) * 0.3,
        pos.z + (Math.random() - 0.5) * 0.3,
        Math.cos(a) * s * 0.4,
        -1 - Math.random() * 2,
        Math.sin(a) * s * 0.4 - 1,
        0.35 + Math.random() * 0.35,
        1,
        0.5 + Math.random() * 0.4,
        0.1 + Math.random() * 0.15,
        0.25 + Math.random() * 0.35,
      );
    }
  }

  score(pos) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const s = 3 + Math.random() * 4;
      this.sparks.spawn(
        pos.x,
        pos.y,
        pos.z,
        Math.cos(a) * s,
        Math.sin(a) * s * 0.6,
        (Math.random() - 0.5) * 2,
        0.45 + Math.random() * 0.3,
        1,
        0.85 + Math.random() * 0.15,
        0.5 + Math.random() * 0.3,
        0.3 + Math.random() * 0.4,
      );
    }
  }

  burst(pos) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      const s = 4 + Math.random() * 10;
      this.embers.spawn(
        pos.x, pos.y, pos.z,
        Math.sin(b) * Math.cos(a) * s,
        Math.cos(b) * s,
        Math.sin(b) * Math.sin(a) * s,
        0.6 + Math.random() * 0.7,
        1,
        0.3 + Math.random() * 0.5,
        Math.random() * 0.2,
        0.35 + Math.random() * 0.55,
      );
    }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 6 + Math.random() * 8;
      this.sparks.spawn(
        pos.x, pos.y, pos.z,
        Math.cos(a) * s,
        (Math.random() - 0.3) * s,
        Math.sin(a) * s,
        0.5 + Math.random() * 0.5,
        1, 0.95, 0.7,
        0.4 + Math.random() * 0.3,
      );
    }
  }

  update(dt, birdPos, flying) {
    this.embers.update(dt, 0.97, -4);
    this.sparks.update(dt, 0.96, -2);

    // Continuous motion trail while playing
    this._trailAcc += dt;
    if (flying && birdPos && this._trailAcc > 0.03) {
      this._trailAcc = 0;
      this.trail.spawn(
        birdPos.x + (Math.random() - 0.5) * 0.15,
        birdPos.y + (Math.random() - 0.5) * 0.15,
        birdPos.z - 0.4,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        -1 - Math.random(),
        0.25 + Math.random() * 0.2,
        1,
        0.55 + Math.random() * 0.3,
        0.1,
        0.15 + Math.random() * 0.2,
      );
    }
    this.trail.update(dt, 0.95, 0);
  }
}
