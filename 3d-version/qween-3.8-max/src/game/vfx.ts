import * as THREE from 'three';
import { CFG } from './config';
import { makeSoftCircle, makeSparkle } from './textures';

interface Puff {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  grow: number;
}

interface Feather {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

export class Vfx {
  readonly group = new THREE.Group();
  shake = 0;
  private puffs: Puff[] = [];
  private sparkles: Puff[] = [];
  private feathers: Feather[] = [];
  private streaks: THREE.Sprite[] = [];
  private softTex = makeSoftCircle();
  private sparkTex = makeSparkle();
  private rng = Math.random;

  constructor() {
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.softTex, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false;
      this.group.add(s);
      this.puffs.push({ sprite: s, vel: new THREE.Vector3(), life: 0, maxLife: 1, grow: 1 });
    }
    for (let i = 0; i < 36; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, transparent: true, opacity: 0, depthWrite: false, color: 0xffe066, blending: THREE.AdditiveBlending }));
      s.visible = false;
      this.group.add(s);
      this.sparkles.push({ sprite: s, vel: new THREE.Vector3(), life: 0, maxLife: 1, grow: 0 });
    }
    const featherGeo = new THREE.PlaneGeometry(0.16, 0.1);
    const featherMats = [
      new THREE.MeshBasicMaterial({ color: 0xffd32a, side: THREE.DoubleSide, transparent: true }),
      new THREE.MeshBasicMaterial({ color: 0xfff1b8, side: THREE.DoubleSide, transparent: true })
    ];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(featherGeo, featherMats[i % 2].clone());
      m.visible = false;
      this.group.add(m);
      this.feathers.push({ mesh: m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 });
    }
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.softTex, transparent: true, opacity: 0, color: 0xffffff, depthWrite: false }));
      s.scale.set(2.2, 0.12, 1);
      s.visible = false;
      this.group.add(s);
      this.streaks.push(s);
    }
  }

  flapBurst(x: number, y: number): void {
    let spawned = 0;
    for (const p of this.puffs) {
      if (p.life > 0 || spawned >= 5) continue;
      p.sprite.visible = true;
      p.sprite.position.set(x - 0.3 + this.rng() * 0.2, y - 0.25 + this.rng() * 0.2, (this.rng() - 0.5) * 0.5);
      p.sprite.scale.setScalar(0.16);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.55;
      p.vel.set(-1.6 - this.rng() * 1.2, -0.7 - this.rng() * 0.8, (this.rng() - 0.5) * 0.6);
      p.maxLife = p.life = 0.34 + this.rng() * 0.15;
      p.grow = 1.9;
      spawned++;
    }
  }

  scoreBurst(x: number, y: number): void {
    let spawned = 0;
    for (const p of this.sparkles) {
      if (p.life > 0 || spawned >= 12) continue;
      p.sprite.visible = true;
      p.sprite.position.set(x, y, (this.rng() - 0.5) * 0.8);
      p.sprite.scale.setScalar(0.22 + this.rng() * 0.2);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 1;
      const a = this.rng() * Math.PI * 2;
      const sp = 2 + this.rng() * 3.4;
      p.vel.set(Math.cos(a) * sp, Math.sin(a) * sp + 1.2, (this.rng() - 0.5) * 1.2);
      p.maxLife = p.life = 0.5 + this.rng() * 0.3;
      spawned++;
    }
  }

  featherBurst(x: number, y: number): void {
    for (const f of this.feathers) {
      f.mesh.visible = true;
      f.mesh.position.set(x, y, (this.rng() - 0.5) * 0.4);
      f.mesh.rotation.set(this.rng() * 3, this.rng() * 3, this.rng() * 3);
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      const a = this.rng() * Math.PI * 2;
      const sp = 1.5 + this.rng() * 4;
      f.vel.set(Math.cos(a) * sp, Math.sin(a) * sp * 0.8 + 2.2, (this.rng() - 0.5) * 2);
      f.spin.set(this.rng() * 8 - 4, this.rng() * 8 - 4, this.rng() * 8 - 4);
      f.life = 1.1 + this.rng() * 0.5;
    }
  }

  addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt: number, speed: number): void {
    this.shake = Math.max(0, this.shake - dt * 2.6);

    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.addScalar(p.grow * dt);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.55 * (p.life / p.maxLife);
    }

    for (const p of this.sparkles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.vel.y -= 6 * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const m = p.sprite.material as THREE.SpriteMaterial;
      m.opacity = p.life / p.maxLife;
      m.rotation += dt * 6;
    }

    for (const f of this.feathers) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0 || f.mesh.position.y < CFG.groundY + 0.06) {
        if (f.mesh.position.y < CFG.groundY + 0.06 && f.life > 0) {
          f.vel.set(0, 0, 0);
          f.spin.multiplyScalar(0.5);
          f.mesh.position.y = CFG.groundY + 0.06;
        } else if (f.life <= 0) {
          f.mesh.visible = false;
          continue;
        }
      }
      f.vel.y -= 7.5 * dt;
      f.vel.multiplyScalar(Math.exp(-0.9 * dt));
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.rotation.x += f.spin.x * dt;
      f.mesh.rotation.y += f.spin.y * dt;
      f.mesh.rotation.z += f.spin.z * dt;
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, f.life);
    }

    const streakAlpha = THREE.MathUtils.clamp((speed - 6.2) / 2.4, 0, 0.5);
    for (const s of this.streaks) {
      const m = s.material as THREE.SpriteMaterial;
      if (streakAlpha <= 0.02) {
        if (s.visible) {
          m.opacity = Math.max(0, m.opacity - dt * 2);
          if (m.opacity <= 0) s.visible = false;
        }
        continue;
      }
      if (!s.visible) {
        s.visible = true;
        s.position.set(14 + this.rng() * 6, CFG.groundY + 1 + this.rng() * 8, (this.rng() - 0.5) * 4);
        m.opacity = 0;
      }
      s.position.x -= (speed * 2.6 + 6) * dt;
      m.opacity = Math.min(streakAlpha, m.opacity + dt * 3);
      if (s.position.x < -16) {
        s.position.x = 14 + this.rng() * 6;
        s.position.y = CFG.groundY + 1 + this.rng() * 8;
      }
    }
  }
}
