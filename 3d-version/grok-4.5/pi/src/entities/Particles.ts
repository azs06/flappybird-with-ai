import * as THREE from "three";
import type { MaterialKit } from "../systems/materials";

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  spin: number;
};

export class ParticleSystem {
  readonly root = new THREE.Group();
  private pool: Particle[] = [];
  private geo = new THREE.SphereGeometry(0.1, 6, 6);
  private mats: MaterialKit;

  constructor(mats: MaterialKit) {
    this.mats = mats;
    for (let i = 0; i < 64; i++) {
      const mat = this.mats.particleFlap.clone();
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
        spin: 0,
      });
    }
  }

  private spawn(
    x: number,
    y: number,
    z: number,
    count: number,
    colorMat: THREE.MeshBasicMaterial,
    speed: number,
    life: number,
    spread = 1,
  ): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (p.active) continue;
      p.active = true;
      p.life = life * (0.7 + Math.random() * 0.3);
      p.maxLife = p.life;
      p.spin = (Math.random() - 0.5) * 8;
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(0.6 + Math.random() * 1.1);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(colorMat.color);
      mat.opacity = colorMat.opacity;
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.35) * Math.PI * spread;
      const s = speed * (0.4 + Math.random());
      p.vel.set(
        Math.cos(a) * Math.cos(elev) * s,
        Math.sin(elev) * s + speed * 0.25,
        Math.sin(a) * Math.cos(elev) * s * 0.6,
      );
      spawned++;
      if (spawned >= count) break;
    }
  }

  flap(x: number, y: number): void {
    this.spawn(x - 0.2, y - 0.1, 0, 8, this.mats.particleFlap, 3.5, 0.35, 0.8);
  }

  score(x: number, y: number): void {
    this.spawn(x, y, 0, 14, this.mats.particleScore, 4.5, 0.55, 1.2);
  }

  hit(x: number, y: number): void {
    this.spawn(x, y, 0, 22, this.mats.particleHit, 6, 0.55, 1.4);
    this.spawn(x, y, 0, 10, this.mats.particleDust, 3, 0.7, 1);
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 6 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.z += p.spin * dt;
      const t = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = t * 0.9;
      p.mesh.scale.multiplyScalar(1 - dt * 0.6);
    }
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }
}
