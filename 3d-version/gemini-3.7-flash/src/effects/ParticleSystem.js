import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shockwaves = [];
    this.ambientParticles = null;
    this.trailPoints = [];
    this.maxTrailPoints = 30;

    this.initTrail();
    this.initAmbientParticles();
    this.initShockwavePool();
  }

  initTrail() {
    this.trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    const colors = new Float32Array(this.maxTrailPoints * 3);

    for (let i = 0; i < this.maxTrailPoints * 3; i++) {
      positions[i] = 0;
      colors[i] = 1;
    }

    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 3
    });

    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.scene.add(this.trailLine);
  }

  initAmbientParticles() {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      velocities.push({
        x: (Math.random() - 0.5) * 0.5,
        y: 0.2 + Math.random() * 0.8,
        z: (Math.random() - 0.5) * 0.5
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.ambientMat = new THREE.PointsMaterial({
      size: 0.35,
      color: 0xffd700,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.ambientPoints = new THREE.Points(geo, this.ambientMat);
    this.ambientVelocities = velocities;
    this.scene.add(this.ambientPoints);
  }

  initShockwavePool() {
    this.shockwaveGeo = new THREE.RingGeometry(0.2, 0.4, 24);
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(this.shockwaveGeo, this.shockwaveMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({ mesh, life: 0, maxLife: 0.45, active: false });
    }
  }

  setTheme(theme) {
    if (this.ambientMat) {
      this.ambientMat.color.setHex(theme.particleColor);
    }
  }

  emitFlapPuff(pos) {
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.1, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.y -= 0.3;
      mesh.position.z -= 0.4;
      mesh.position.x += (Math.random() - 0.5) * 0.4;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          -1.5 - Math.random() * 1.5,
          -2.0 - Math.random() * 2.0
        ),
        rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  emitSparkles(pos, color = 0xffd700, count = 16) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.TetrahedronGeometry(0.15 + Math.random() * 0.1, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 6.0;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * speed
        ),
        rot: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0.55,
        maxLife: 0.55
      });
    }
  }

  emitRingShockwave(pos) {
    const sw = this.shockwaves.find(s => !s.active);
    if (sw) {
      sw.mesh.position.copy(pos);
      sw.mesh.scale.set(1, 1, 1);
      sw.mesh.material.opacity = 1.0;
      sw.mesh.visible = true;
      sw.active = true;
      sw.life = sw.maxLife;
    }
  }

  emitCrashExplosion(pos, skinColor = 0xffcb05) {
    // 35 flying feather and debris shards
    for (let i = 0; i < 35; i++) {
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.35);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? skinColor : 0xffffff,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 6.0 + Math.random() * 10.0;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        rot: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life: 0.8,
        maxLife: 0.8
      });
    }
  }

  updateTrail(birdPosition, trailColor = 0xffd700) {
    this.trailPoints.unshift(birdPosition.clone().add(new THREE.Vector3(0, 0, -0.6)));
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.pop();
    }

    const posAttr = this.trailGeo.attributes.position;
    const colAttr = this.trailGeo.attributes.color;
    const baseColor = new THREE.Color(trailColor);

    for (let i = 0; i < this.maxTrailPoints; i++) {
      if (i < this.trailPoints.length) {
        const pt = this.trailPoints[i];
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
        const alpha = 1.0 - (i / this.maxTrailPoints);
        colAttr.setXYZ(i, baseColor.r * alpha, baseColor.g * alpha, baseColor.b * alpha);
      } else {
        posAttr.setXYZ(i, birdPosition.x, birdPosition.y, birdPosition.z);
        colAttr.setXYZ(i, 0, 0, 0);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  clearTrail() {
    this.trailPoints = [];
  }

  update(delta, birdPosition) {
    // 1. Update active transient particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 9.8 * delta; // Gravity on debris
      p.mesh.rotation.x += p.rot.x * delta;
      p.mesh.rotation.y += p.rot.y * delta;
      p.mesh.rotation.z += p.rot.z * delta;

      p.mesh.material.opacity = p.life / p.maxLife;
      const s = p.life / p.maxLife;
      p.mesh.scale.set(s, s, s);
    }

    // 2. Update shockwaves
    for (let sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life -= delta;
      if (sw.life <= 0) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }
      const progress = 1.0 - (sw.life / sw.maxLife);
      const scale = 1.0 + progress * 5.5;
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = (1.0 - progress);
    }

    // 3. Update ambient particles centered around bird
    if (this.ambientPoints) {
      this.ambientPoints.position.z = birdPosition.z;
      this.ambientPoints.position.x = birdPosition.x * 0.3;
      this.ambientPoints.position.y = birdPosition.y * 0.3;

      const pos = this.ambientPoints.geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        let y = pos.getY(j) + this.ambientVelocities[j].y * delta;
        if (y > 15) y = -15;
        pos.setY(j, y);
      }
      pos.needsUpdate = true;
    }
  }
}
