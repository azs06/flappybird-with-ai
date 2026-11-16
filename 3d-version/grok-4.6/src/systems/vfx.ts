import * as THREE from "three";
import type { MatKit } from "../assets/materials.ts";

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  max: number;
  spin: number;
  kind: "ember" | "feather";
};

export class Vfx {
  readonly root = new THREE.Group();
  private pool: Particle[] = [];
  private ring: THREE.Mesh;
  private ringLife = 0;
  private streaks: THREE.Mesh[] = [];

  constructor(mats: MatKit) {
    const emberGeo = new THREE.PlaneGeometry(0.18, 0.22);
    const featherGeo = new THREE.PlaneGeometry(0.22, 0.34);
    for (let i = 0; i < 48; i++) {
      const kind: Particle["kind"] = i < 32 ? "ember" : "feather";
      const mesh = new THREE.Mesh(kind === "ember" ? emberGeo : featherGeo, kind === "ember" ? mats.ember : mats.feather);
      mesh.visible = false;
      this.root.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        max: 1,
        spin: 0,
        kind,
      });
    }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.018, 8, 28), mats.gate);
    this.ring.rotation.y = Math.PI * 0.5;
    this.ring.visible = false;
    this.root.add(this.ring);

    const streakGeo = new THREE.PlaneGeometry(1.4, 0.03);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(
        streakGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffe6b0,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      s.visible = false;
      this.streaks.push(s);
      this.root.add(s);
    }
  }

  burst(origin: THREE.Vector3, mode: "flap" | "score" | "death" | "perfect"): void {
    const count = mode === "death" ? 28 : mode === "flap" ? 10 : 8;
    let spawned = 0;
    for (const p of this.pool) {
      if (p.life > 0) continue;
      const useFeather = mode === "death" ? spawned > 14 : mode === "flap" && spawned > 6;
      if (useFeather !== (p.kind === "feather")) continue;
      p.life = p.max = mode === "death" ? 1.1 : 0.55;
      p.mesh.visible = true;
      p.mesh.position.copy(origin);
      p.mesh.position.x += (Math.random() - 0.5) * 0.1;
      p.mesh.position.y += (Math.random() - 0.5) * 0.1;
      const spread = mode === "death" ? 3.4 : 1.6;
      p.vel.set((Math.random() - 0.85) * spread, (Math.random() - 0.2) * spread, (Math.random() - 0.5) * 1.4);
      if (mode === "flap") p.vel.y += 1.4;
      p.spin = (Math.random() - 0.5) * 8;
      p.mesh.scale.setScalar(mode === "death" ? 0.9 : 0.55);
      spawned++;
      if (spawned >= count) break;
    }
    if (mode === "score" || mode === "perfect") {
      this.ring.visible = true;
      this.ring.position.copy(origin);
      this.ring.scale.setScalar(0.6);
      this.ringLife = 0.55;
    }
  }

  nearMiss(origin: THREE.Vector3): void {
    for (const s of this.streaks) {
      s.visible = true;
      s.position.set(origin.x - 0.4, origin.y + (Math.random() - 0.5) * 0.7, origin.z);
      const mat = s.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 4.2 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.z += p.spin * dt;
      const k = p.life / p.max;
      p.mesh.scale.setScalar((p.kind === "feather" ? 0.7 : 0.45) * (0.4 + k));
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = k;
    }
    if (this.ringLife > 0) {
      this.ringLife -= dt;
      this.ring.scale.addScalar(dt * 3.2);
      const mat = this.ring.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = this.ringLife * 2;
      this.ring.visible = this.ringLife > 0;
    }
    for (const s of this.streaks) {
      if (!s.visible) continue;
      s.position.x -= dt * 8;
      const mat = s.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 1.8;
      if (mat.opacity <= 0) s.visible = false;
    }
  }
}
