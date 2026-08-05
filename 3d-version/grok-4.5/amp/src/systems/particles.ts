import * as THREE from 'three';

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
};

/**
 * Pooled burst particles for score pops and crash debris.
 */
export class ParticleSystem {
  readonly root = new THREE.Group();
  private readonly pool: Particle[] = [];
  private readonly geo: THREE.SphereGeometry;
  private readonly baseMat: THREE.MeshBasicMaterial;

  constructor(count = 64) {
    this.geo = new THREE.SphereGeometry(0.1, 6, 6);
    this.baseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < count; i++) {
      const mat = this.baseMat.clone();
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  burst(
    origin: THREE.Vector3,
    count: number,
    color: number,
    speed = 4,
    life = 0.55,
  ): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (p.active) continue;
      p.active = true;
      p.life = life * (0.7 + Math.random() * 0.5);
      p.maxLife = p.life;
      p.mesh.visible = true;
      p.mesh.position.copy(origin);
      p.mesh.scale.setScalar(0.5 + Math.random() * 1.2);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(color);
      mat.opacity = 1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const s = speed * (0.4 + Math.random());
      p.vel.set(
        Math.sin(phi) * Math.cos(theta) * s,
        Math.cos(phi) * s * 0.8 + 1.5,
        Math.sin(phi) * Math.sin(theta) * s,
      );
      spawned++;
      if (spawned >= count) break;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      p.vel.y -= 6 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = Math.max(0, p.life / p.maxLife);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = t;
      p.mesh.scale.multiplyScalar(1 - dt * 0.8);
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  dispose(): void {
    this.geo.dispose();
    this.baseMat.dispose();
    for (const p of this.pool) {
      (p.mesh.material as THREE.Material).dispose();
    }
  }
}
