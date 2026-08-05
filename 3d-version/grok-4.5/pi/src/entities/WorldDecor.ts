import * as THREE from "three";
import { GROUND, WORLD } from "../game/constants";
import type { MaterialKit } from "../systems/materials";
import type { RNG } from "../core/rng";

export class WorldDecor {
  readonly root = new THREE.Group();
  private groundSegs: THREE.Group[] = [];
  private clouds: { mesh: THREE.Group; speed: number; baseX: number }[] = [];
  private crystals: THREE.Mesh[] = [];
  private hills: THREE.Group[] = [];
  private scroll = 0;
  private mats: MaterialKit;
  private rng: RNG;

  constructor(mats: MaterialKit, rng: RNG) {
    this.mats = mats;
    this.rng = rng;
    this.buildSkyIslands();
    this.buildGround();
    this.buildClouds();
    this.buildBackgroundHills();
    this.buildCeiling();
  }

  private buildSkyIslands(): void {
    // Distant floating ruins / islands for parallax depth
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2 + i * 0.15, 1.8 + i * 0.2, 0.7, 7),
        this.mats.rock,
      );
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);

      const top = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 1.4, 6),
        i % 2 === 0 ? this.mats.dirt : this.mats.groundDark,
      );
      top.position.y = 0.85;
      g.add(top);

      if (i % 2 === 0) {
        const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), this.mats.crystal);
        spire.position.y = 1.7;
        g.add(spire);
        this.crystals.push(spire);
      }

      g.position.set(-8 + i * 10, 3.5 + (i % 3) * 0.8, -14 - (i % 2) * 4);
      g.scale.setScalar(1.2 + (i % 3) * 0.25);
      this.root.add(g);
      this.hills.push(g);
    }
  }

  private buildGround(): void {
    for (let i = 0; i < GROUND.segmentCount; i++) {
      const seg = new THREE.Group();
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(GROUND.segmentLength, 0.8, 10),
        i % 2 === 0 ? this.mats.ground : this.mats.groundDark,
      );
      slab.receiveShadow = true;
      slab.castShadow = true;
      slab.position.y = 0;
      seg.add(slab);

      // Dirt underside lip
      const dirt = new THREE.Mesh(
        new THREE.BoxGeometry(GROUND.segmentLength, 1.6, 9.5),
        this.mats.dirt,
      );
      dirt.position.y = -1.1;
      dirt.receiveShadow = true;
      seg.add(dirt);

      // Grass tufts / rocks
      for (let t = 0; t < 7; t++) {
        const tuft = new THREE.Mesh(
          new THREE.ConeGeometry(0.12 + this.rng.range(0, 0.08), 0.35, 5),
          this.mats.ground,
        );
        tuft.position.set(
          -GROUND.segmentLength / 2 + 1 + t * 2.1 + this.rng.range(-0.3, 0.3),
          0.55,
          this.rng.range(-3.5, 3.5),
        );
        tuft.castShadow = true;
        seg.add(tuft);
      }

      for (let r = 0; r < 3; r++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18 + this.rng.range(0, 0.15), 0),
          this.mats.rock,
        );
        rock.position.set(
          this.rng.range(-GROUND.segmentLength / 2 + 0.5, GROUND.segmentLength / 2 - 0.5),
          0.5,
          this.rng.range(-4, 4),
        );
        rock.rotation.set(this.rng.range(0, 1), this.rng.range(0, 2), 0);
        rock.castShadow = true;
        seg.add(rock);
      }

      // Path stripe for motion read
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(GROUND.segmentLength * 0.9, 0.04, 1.2),
        this.mats.dirt,
      );
      stripe.position.set(0, 0.42, 0);
      seg.add(stripe);

      seg.position.set(i * GROUND.segmentLength, GROUND.y, 0);
      this.root.add(seg);
      this.groundSegs.push(seg);
    }
  }

  private buildClouds(): void {
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.55 + this.rng.range(0, 0.45), 10, 8),
          this.mats.cloud,
        );
        m.position.set(p * 0.55, this.rng.range(-0.15, 0.25), this.rng.range(-0.2, 0.2));
        m.scale.y = 0.65;
        cloud.add(m);
      }
      const x = this.rng.range(-20, 40);
      cloud.position.set(x, this.rng.range(3.5, 8.5), this.rng.range(-18, -6));
      cloud.scale.setScalar(1.1 + this.rng.range(0, 1.2));
      this.root.add(cloud);
      this.clouds.push({ mesh: cloud, speed: 0.25 + this.rng.range(0, 0.45), baseX: x });
    }
  }

  private buildBackgroundHills(): void {
    const shape = new THREE.Shape();
    shape.moveTo(-40, -2);
    for (let x = -40; x <= 40; x += 4) {
      const y = Math.sin(x * 0.15) * 1.2 + Math.cos(x * 0.07) * 0.8;
      shape.lineTo(x, y);
    }
    shape.lineTo(40, -6);
    shape.lineTo(-40, -6);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a3a4a,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(10, WORLD.floorY + 1.5, -22);
    mesh.scale.set(1.4, 1.8, 1);
    this.root.add(mesh);

    const mesh2 = mesh.clone();
    (mesh2.material as THREE.MeshStandardMaterial) = mat.clone();
    (mesh2.material as THREE.MeshStandardMaterial).color.set(0x142836);
    mesh2.position.set(5, WORLD.floorY + 0.8, -28);
    mesh2.scale.set(1.8, 2.2, 1);
    this.root.add(mesh2);
  }

  private buildCeiling(): void {
    // Soft stalactite / sky crystals along top bound for ceiling read
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(
        new THREE.ConeGeometry(0.2 + (i % 3) * 0.08, 0.7 + (i % 4) * 0.2, 6),
        i % 3 === 0 ? this.mats.crystal : this.mats.rock,
      );
      s.position.set(-5 + i * 4.5, WORLD.ceilingY + 0.6, this.rng.range(-2, 2));
      s.rotation.x = Math.PI;
      s.castShadow = true;
      this.root.add(s);
      if (i % 3 === 0) this.crystals.push(s);
    }
  }

  update(dt: number, worldSpeed: number, playing: boolean): void {
    if (playing) this.scroll += worldSpeed * dt;

    // Scroll ground segments
    const totalLen = GROUND.segmentCount * GROUND.segmentLength;
    for (let i = 0; i < this.groundSegs.length; i++) {
      const seg = this.groundSegs[i]!;
      let x = i * GROUND.segmentLength - (this.scroll % totalLen);
      if (x < -GROUND.segmentLength) x += totalLen;
      seg.position.x = x;
    }

    // Parallax clouds
    for (const c of this.clouds) {
      c.mesh.position.x -= (playing ? worldSpeed * 0.22 : 0.4) * c.speed * dt;
      if (c.mesh.position.x < -30) {
        c.mesh.position.x = 35 + this.rng.range(0, 10);
        c.mesh.position.y = this.rng.range(3.5, 8.5);
      }
    }

    // Slow crystal spin
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i]!;
      c.rotation.y = t * 0.8 + i;
      c.position.y += Math.sin(t * 2 + i) * 0.002;
    }

    // Drift far islands gently
    for (let i = 0; i < this.hills.length; i++) {
      const h = this.hills[i]!;
      h.position.x -= (playing ? worldSpeed * 0.05 : 0.08) * dt;
      if (h.position.x < -25) h.position.x = 35;
    }
  }

  reset(): void {
    this.scroll = 0;
  }
}
