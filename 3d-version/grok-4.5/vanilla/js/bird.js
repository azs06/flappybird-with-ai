// bird.js — molten firebird: emissive core, metallic body, flame wings, trail light

import * as THREE from 'three';
import { GROUND_Y } from './world.js';

export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();
    this.radius = 0.55;
    this.velocity = 0;
    this.flapPhase = 0;
    this.dead = false;
    this.deathSpin = 0;
    this.time = 0;

    // Body — streamlined diamond of dark metal with molten seams
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1418,
      metalness: 0.85,
      roughness: 0.28,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      emissive: 0xff6a00,
      emissiveIntensity: 0.15,
      envMapIntensity: 1.2,
      flatShading: true,
    });

    this.body = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), this.bodyMat);
    this.body.scale.set(0.85, 0.7, 1.55);
    this.body.castShadow = true;
    this.group.add(this.body);

    // White-hot core
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 1),
      new THREE.MeshBasicMaterial({ color: 0xfff5e0, fog: false }),
    );
    this.group.add(this.core);

    // Outer glow shell
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff6a00,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.group.add(this.glow);

    // Beak / nose cone
    this.beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.48, 5),
      new THREE.MeshPhysicalMaterial({
        color: 0xffb020,
        metalness: 0.7,
        roughness: 0.25,
        emissive: 0xff6a00,
        emissiveIntensity: 0.4,
        flatShading: true,
      }),
    );
    this.beak.rotation.x = Math.PI / 2;
    this.beak.position.set(0, 0.02, 0.82);
    this.beak.castShadow = true;
    this.group.add(this.beak);

    // Wings
    this.wingPivotL = new THREE.Group();
    this.wingPivotR = new THREE.Group();
    this.wingPivotL.position.set(-0.22, 0.05, 0.05);
    this.wingPivotR.position.set(0.22, 0.05, 0.05);
    this.group.add(this.wingPivotL, this.wingPivotR);

    const wingGeo = this._wingGeometry();
    this.wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xff8a20,
      metalness: 0.4,
      roughness: 0.35,
      emissive: 0xff4a00,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    this.wingL = new THREE.Mesh(wingGeo, this.wingMat);
    this.wingR = new THREE.Mesh(wingGeo.clone(), this.wingMat);
    this.wingL.position.x = -0.55;
    this.wingR.position.x = 0.55;
    this.wingR.scale.x = -1;
    this.wingL.castShadow = true;
    this.wingR.castShadow = true;
    this.wingPivotL.add(this.wingL);
    this.wingPivotR.add(this.wingR);

    // Tail flame shards
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0, -0.7);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 3), tailMat.clone());
      shard.rotation.x = Math.PI;
      shard.position.set((i - 1) * 0.12, 0, -0.2 - i * 0.05);
      shard.scale.set(1 - i * 0.15, 1 + i * 0.2, 1);
      this.tail.add(shard);
    }
    this.group.add(this.tail);

    // Point light that rides with the bird
    this.light = new THREE.PointLight(0xff8a20, 2.2, 14, 2);
    this.light.position.set(0, 0.2, 0);
    this.group.add(this.light);

    scene.add(this.group);
    this.reset();
  }

  _wingGeometry() {
    // Elongated flat diamond — reads as a blade of flame when emissive
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0.15,
      -0.95, 0.05, 0,
      -1.2, 0, -0.05,
      -0.9, -0.12, 0,
      0, 0, -0.12,
    ]);
    const idx = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1];
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  reset() {
    this.group.position.set(0, 9, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity = 0;
    this.flapPhase = 0;
    this.dead = false;
    this.deathSpin = 0;
    this.bodyMat.emissiveIntensity = 0.15;
    this.wingMat.emissiveIntensity = 0.55;
    this.core.visible = true;
    this.glow.visible = true;
  }

  get y() { return this.group.position.y; }
  set y(v) { this.group.position.y = v; }
  get position() { return this.group.position; }

  flap(impulse) {
    this.velocity = impulse;
    this.flapPhase = 1;
  }

  die() {
    this.dead = true;
  }

  /** Visual-only idle hover on the title screen */
  idle(dt, t) {
    this.time = t;
    this.y = 9 + Math.sin(t * 2.2) * 0.35;
    this.group.rotation.x = Math.sin(t * 1.5) * 0.08;
    this.group.rotation.z = Math.sin(t * 1.8) * 0.1;
    this.velocity = 0;
    this.flapPhase = 0.2 + 0.15 * Math.sin(t * 8);
    this._animateParts(dt);
    this.light.intensity = 2 + Math.sin(t * 3) * 0.3;
  }

  update(dt, gravity, maxFall) {
    this.time += dt;

    if (!this.dead) {
      this.velocity += gravity * dt;
      if (this.velocity < maxFall) this.velocity = maxFall;
      this.y += this.velocity * dt;

      const targetPitch = THREE.MathUtils.clamp(-this.velocity * 0.08, -0.9, 0.7);
      this.group.rotation.x = THREE.MathUtils.lerp(
        this.group.rotation.x,
        targetPitch,
        1 - Math.exp(-10 * dt),
      );
      this.group.rotation.z = Math.sin(this.time * 2.2) * 0.06;
    } else {
      this.deathSpin += dt * 8;
      this.velocity += gravity * 1.4 * dt;
      this.y += this.velocity * dt;
      this.group.rotation.x += dt * 4;
      this.group.rotation.z = this.deathSpin;
      this.bodyMat.emissiveIntensity = Math.max(0, 0.15 - this.deathSpin * 0.03);
      this.wingMat.emissiveIntensity = Math.max(0, 0.55 - this.deathSpin * 0.08);
      this.light.intensity = Math.max(0, 2.2 - this.deathSpin * 0.5);
    }

    this._animateParts(dt);

    if (!this.dead) {
      this.light.intensity = 1.8 + Math.abs(this.velocity) * 0.06 + this.flapPhase * 1.5;
    }

    if (this.y < GROUND_Y + this.radius) {
      this.y = GROUND_Y + this.radius;
    }
  }

  _animateParts(dt) {
    if (this.flapPhase > 0) {
      this.flapPhase = Math.max(0, this.flapPhase - dt * 4.5);
    }
    const idle = Math.sin(this.time * 14) * 0.12;
    const snap = Math.sin(this.flapPhase * Math.PI) * 0.95;
    const wingAngle = -0.25 + idle + snap;
    this.wingPivotL.rotation.z = wingAngle;
    this.wingPivotR.rotation.z = -wingAngle;
    this.wingPivotL.rotation.y = snap * 0.15;
    this.wingPivotR.rotation.y = -snap * 0.15;

    const pulse = 1 + 0.12 * Math.sin(this.time * 9) + this.flapPhase * 0.25;
    this.core.scale.setScalar(pulse);
    this.glow.scale.setScalar(1 + 0.15 * Math.sin(this.time * 6) + this.flapPhase * 0.4);
    this.glow.material.opacity = 0.14 + 0.1 * Math.sin(this.time * 5) + this.flapPhase * 0.2;

    this.tail.children.forEach((s, i) => {
      s.scale.y = 1 + i * 0.2 + Math.sin(this.time * 18 + i) * 0.25 + this.flapPhase * 0.5;
      s.material.opacity = 0.5 + 0.3 * Math.sin(this.time * 12 + i) + this.flapPhase * 0.3;
    });
  }
}
