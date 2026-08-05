// particles.js — loose light motes. A few spark off on every flap, a
// shower of facet sparks marks each gate cleared, and a full shatter burst
// scatters the bird's own light on death. One fixed pool, additive-blended
// so bloom catches every spark — no allocation during play.

import * as THREE from 'three';

const SHARD_COLORS = ['#63e8ff', '#a78bff', '#ff7ae0', '#ffd166', '#eef0ff'];
const SHARD_GEO = new THREE.OctahedronGeometry(0.07, 0);

export class Particles {
  constructor(scene, size = 110) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: SHARD_COLORS[i % SHARD_COLORS.length],
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(SHARD_GEO, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
      });
    }
  }

  spawn(origin, count, power, scale = 1) {
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (p.life > 0) continue;
      spawned++;
      p.mesh.visible = true;
      p.mesh.scale.setScalar(scale * (0.6 + Math.random() * 0.8));
      p.mesh.position.copy(origin);
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      p.vel.set(
        (Math.random() - 0.5) * power,
        Math.random() * power * 0.7,
        (Math.random() - 0.3) * power,
      );
      p.rotVel.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );
      p.maxLife = p.life = 0.5 + Math.random() * 0.6;
    }
  }

  flap(origin) { this.spawn(origin, 3, 2.2, 0.8); }
  score(origin) { this.spawn(origin, 14, 4, 1.3); }
  burst(origin) { this.spawn(origin, 38, 9, 1.6); }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= 4 * dt;                  // light gravity — these are barely matter
      p.vel.multiplyScalar(1 - dt * 1.2); // drag
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotVel.x * dt;
      p.mesh.rotation.y += p.rotVel.y * dt;
      p.mesh.rotation.z += p.rotVel.z * dt;
      p.mesh.material.opacity = Math.min(1, p.life / (p.maxLife * 0.4));
    }
  }
}
