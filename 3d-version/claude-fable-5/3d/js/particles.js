// particles.js — little paper scraps. A few flutter loose on every flap;
// a crash tears off a whole confetti burst. One fixed pool, no allocation
// during play.

import * as THREE from 'three';

const SCRAP_COLORS = ['#fbf6ec', '#d1422f', '#e9b4a0', '#9cc5b8', '#e7cf9f'];
const SCRAP_GEO = new THREE.PlaneGeometry(0.16, 0.22);

export class Particles {
  constructor(scene, size = 70) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: SCRAP_COLORS[i % SCRAP_COLORS.length],
        side: THREE.DoubleSide,
        transparent: true,
      });
      const mesh = new THREE.Mesh(SCRAP_GEO, mat);
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

  spawn(origin, count, power) {
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (p.life > 0) continue;
      spawned++;
      p.mesh.visible = true;
      p.mesh.position.copy(origin);
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      p.vel.set(
        (Math.random() - 0.5) * power,
        Math.random() * power * 0.7,
        (Math.random() - 0.2) * power,
      );
      p.rotVel.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      );
      p.maxLife = p.life = 0.7 + Math.random() * 0.8;
    }
  }

  flap(origin) { this.spawn(origin, 3, 2.5); }
  burst(origin) { this.spawn(origin, 28, 8); }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= 6 * dt;                       // light gravity — paper falls slow
      p.vel.multiplyScalar(1 - dt * 1.5);      // air drag
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotVel.x * dt;
      p.mesh.rotation.y += p.rotVel.y * dt;
      p.mesh.rotation.z += p.rotVel.z * dt;
      p.mesh.material.opacity = Math.min(1, p.life / (p.maxLife * 0.4));
    }
  }
}
