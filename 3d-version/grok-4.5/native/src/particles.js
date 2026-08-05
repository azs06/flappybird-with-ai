import * as THREE from "three";

/**
 * Burst particles for score pops and crash.
 */
export class ParticleSystem {
  constructor(scene, max = 80) {
    this.max = max;
    this.particles = [];

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(max * 3);
    const colors = new Float32Array(max * 3);
    const sizes = new Float32Array(max);

    for (let i = 0; i < max; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = 0;
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(origin, { count = 20, color = new THREE.Color(1, 0.7, 0.3), speed = 3, life = 0.7 } = {}) {
    let spawned = 0;
    for (let i = 0; i < this.max && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = life * (0.6 + Math.random() * 0.4);
      p.maxLife = p.life;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.sin(phi) * Math.cos(theta) * s;
      p.vy = Math.cos(phi) * s + 1;
      p.vz = Math.sin(phi) * Math.sin(theta) * s * 0.5;

      const pos = this.points.geometry.attributes.position;
      pos.setXYZ(i, origin.x, origin.y, origin.z);
      const col = this.points.geometry.attributes.color;
      const jitter = 0.85 + Math.random() * 0.15;
      col.setXYZ(i, color.r * jitter, color.g * jitter, color.b * jitter);
      this.points.geometry.attributes.size.array[i] = 0.08 + Math.random() * 0.12;
      spawned++;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position;
    const sizes = this.points.geometry.attributes.size;
    let any = false;

    for (let i = 0; i < this.max; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      any = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        sizes.array[i] = 0;
        continue;
      }
      const x = pos.getX(i) + p.vx * dt;
      const y = pos.getY(i) + p.vy * dt;
      const z = pos.getZ(i) + p.vz * dt;
      p.vy -= 6 * dt;
      pos.setXYZ(i, x, y, z);
      const t = p.life / p.maxLife;
      sizes.array[i] = (0.05 + t * 0.12) * t;
    }

    if (any) {
      pos.needsUpdate = true;
      sizes.needsUpdate = true;
    }
  }
}
