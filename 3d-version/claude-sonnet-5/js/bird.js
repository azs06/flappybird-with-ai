// bird.js — a faceted gem bird: an octahedral crystal body with iridescent
// shard wings, lit from within by a small bloom-bright core. Its hue drifts
// continuously, like light slowly turning through a prism.

import * as THREE from 'three';

function shardGeometry() {
  // a flat 4-sided cone reads as a thin angular blade once squashed on Y
  const geo = new THREE.ConeGeometry(0.62, 1.5, 4, 1);
  geo.rotateZ(Math.PI / 2);
  geo.scale(1, 1, 0.18);
  return geo;
}

export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();
    this.radius = 0.62;

    this.hue = 0.54; // starts cyan-leaning, drifts over time
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      flatShading: true,
      metalness: 0,
      roughness: 0.06,
      transmission: 0.82,
      thickness: 0.9,
      ior: 1.45,
      iridescence: 1,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 420],
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.3,
    });

    this.body = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), this.bodyMat);
    this.body.scale.set(1, 0.85, 1.5);
    this.body.castShadow = true;
    this.group.add(this.body);

    // the heart of light: a small emissive core glowing through the
    // translucent body, the brightest thing on the bird for bloom to catch
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    );
    this.group.add(this.core);

    // a small gold crest/beak shard up front
    this.crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.5, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0xffd166, flatShading: true, metalness: 0.3, roughness: 0.25,
        clearcoat: 0.6, envMapIntensity: 1,
      }),
    );
    this.crest.rotation.x = Math.PI / 2;
    this.crest.position.set(0, 0.05, 0.85);
    this.crest.castShadow = true;
    this.group.add(this.crest);

    // wings: shard pairs that hinge at the body and snap on flap
    this.wingPivotL = new THREE.Group();
    this.wingPivotR = new THREE.Group();
    this.wingPivotL.position.set(-0.3, 0.05, -0.1);
    this.wingPivotR.position.set(0.3, 0.05, -0.1);
    this.group.add(this.wingPivotL, this.wingPivotR);

    const wingGeo = shardGeometry();
    this.wingL = new THREE.Mesh(wingGeo, this.bodyMat);
    this.wingR = new THREE.Mesh(wingGeo, this.bodyMat);
    this.wingL.position.x = -0.7;
    this.wingR.position.x = 0.7;
    this.wingR.scale.x = -1;
    this.wingL.castShadow = true;
    this.wingR.castShadow = true;
    this.wingPivotL.add(this.wingL);
    this.wingPivotR.add(this.wingR);

    // tail: a smaller fanned shard
    this.tail = new THREE.Mesh(wingGeo, this.bodyMat);
    this.tail.scale.set(0.55, 0.55, 1.2);
    this.tail.rotation.z = Math.PI / 2;
    this.tail.position.set(0, 0, -0.95);
    this.tail.castShadow = true;
    this.group.add(this.tail);

    scene.add(this.group);

    this.velocity = 0;
    this.flapPhase = 0;   // 0..1, decays after each flap, drives the wing snap
    this.deathSpin = 0;
    this.dead = false;
    this.reset();
  }

  reset() {
    this.group.position.set(0, 9, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity = 0;
    this.flapPhase = 0;
    this.deathSpin = 0;
    this.dead = false;
  }

  get y() { return this.group.position.y; }
  set y(v) { this.group.position.y = v; }

  flap(impulse) {
    this.velocity = impulse;
    this.flapPhase = 1;
  }

  die() {
    this.dead = true;
  }

  // gravity-driven flight physics + pitch-to-velocity + wing/core animation
  update(dt, gravity, maxFall, groundY) {
    this.velocity = Math.max(maxFall, this.velocity + gravity * dt);
    this.group.position.y += this.velocity * dt;
    if (this.group.position.y < groundY) this.group.position.y = groundY;

    const targetPitch = THREE.MathUtils.clamp(this.velocity * 0.05, -0.7, 0.55);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, targetPitch, Math.min(1, dt * 8));
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -targetPitch * 0.3, Math.min(1, dt * 8));

    this.animateWings(dt);
    this.animateCore(dt);

    if (this.dead) {
      this.deathSpin += dt * 10;
      this.group.rotation.z = this.deathSpin;
      this.group.rotation.x += dt * 4;
    }
  }

  // gentle bob + flutter while waiting on the start screen
  hover(dt, elapsed) {
    this.group.position.y = 9 + Math.sin(elapsed * 1.6) * 0.4;
    this.group.rotation.z = Math.sin(elapsed * 1.6) * 0.06;
    this.flapPhase = (Math.sin(elapsed * 3) * 0.5 + 0.5) * 0.6;
    this.animateWings(dt);
    this.animateCore(dt);
  }

  animateWings(dt) {
    this.flapPhase = Math.max(0, this.flapPhase - dt * 3.2);
    // snap up sharply on flap, settle into a relaxed glide angle
    const flapAngle = THREE.MathUtils.lerp(0.35, 1.1, this.flapPhase);
    this.wingPivotL.rotation.z = THREE.MathUtils.lerp(this.wingPivotL.rotation.z, flapAngle, Math.min(1, dt * 14));
    this.wingPivotR.rotation.z = THREE.MathUtils.lerp(this.wingPivotR.rotation.z, -flapAngle, Math.min(1, dt * 14));
  }

  animateCore(dt) {
    const pulse = 1 + this.flapPhase * 0.6;
    this.core.scale.setScalar(pulse);
    // the prism's hue drifts on its own clock, independent of game state
    this.hue = (this.hue + dt * 0.05) % 1;
    this.bodyMat.color.setHSL(this.hue, 0.55, 0.72);
    this.core.material.color.setHSL((this.hue + 0.5) % 1, 0.4, 0.85);
  }
}
