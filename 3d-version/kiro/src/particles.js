import { Group, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry, DoubleSide } from 'three';
import { rand } from './config.js';

const FEATHER = new PlaneGeometry(0.22, 0.13);
const PUFF = new SphereGeometry(0.13, 8, 6);

/**
 * A tiny pooled particle system for flap puffs and death feathers.
 * Each particle owns its material so it can fade independently; the pool is
 * fixed-size so gameplay never allocates.
 */
export class Particles {
  constructor(scene, size = 56) {
    this.root = new Group();
    scene.add(this.root);
    this.pool = [];

    for (let i = 0; i < size; i++) {
      const isFeather = i % 2 === 0;
      const mat = new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        roughness: 0.8,
      });
      if (isFeather) mat.side = DoubleSide;
      const mesh = new Mesh(isFeather ? FEATHER : PUFF, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.pool.push({
        mesh,
        mat,
        isFeather,
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        gravity: 0,
        drag: 0,
      });
    }
  }

  #take(isFeather) {
    for (const p of this.pool) {
      if (p.life <= 0 && p.isFeather === isFeather) return p;
    }
    return null;
  }

  puff(x, y) {
    for (let i = 0; i < 5; i++) {
      const p = this.#take(false);
      if (!p) return;
      p.mesh.position.set(x + rand(-0.2, 0.1), y + rand(-0.35, -0.05), rand(-0.3, 0.3));
      p.mesh.scale.setScalar(rand(0.6, 1.25));
      p.mat.color.setHex(0xffffff);
      p.mat.opacity = 0.85;
      p.life = p.maxLife = rand(0.3, 0.55);
      p.vx = rand(-3.4, -1.2);
      p.vy = rand(-1.4, 0.4);
      p.vz = rand(-0.6, 0.6);
      p.gravity = -1.5;
      p.drag = 2.6;
      p.spin = 0;
      p.mesh.visible = true;
    }
  }

  burst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this.#take(i % 3 !== 2);
      if (!p) return;
      p.mesh.position.set(x + rand(-0.25, 0.25), y + rand(-0.25, 0.25), rand(-0.35, 0.35));
      p.mesh.scale.setScalar(rand(0.8, 1.5));
      p.mat.color.setHex(p.isFeather ? 0xffd23f : 0xfff6d0);
      p.mat.opacity = 1;
      p.life = p.maxLife = rand(0.7, 1.3);
      p.vx = rand(-2.5, 3.5);
      p.vy = rand(1.5, 5.5);
      p.vz = rand(-1.6, 1.6);
      p.gravity = -9;
      p.drag = 0.9;
      p.spin = rand(-9, 9);
      p.mesh.visible = true;
    }
  }

  update(dt, scrollSpeed = 0) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        p.mat.opacity = 0;
        continue;
      }
      const decay = Math.max(0, 1 - p.drag * dt);
      p.vx *= decay;
      p.vy = p.vy * decay + p.gravity * dt;
      p.vz *= decay;
      p.mesh.position.x += (p.vx - scrollSpeed) * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.z += p.spin * dt;
      p.mesh.rotation.x += p.spin * 0.4 * dt;
      p.mat.opacity = Math.min(1, (p.life / p.maxLife) * 1.6);
    }
  }

  clear() {
    for (const p of this.pool) {
      p.life = 0;
      p.mat.opacity = 0;
      p.mesh.visible = false;
    }
  }
}
