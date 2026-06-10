// bird.js — an origami crane assembled from low-poly primitives.
// The crane faces -Z (into the oncoming towers); it only ever moves on Y,
// exactly like classic 2D Flappy Bird. Wings are separate pivots so a
// flap can drive a crisp paper downstroke.

import * as THREE from 'three';

const PAPER = new THREE.MeshStandardMaterial({
  color: '#fbf6ec',
  flatShading: true,
  side: THREE.DoubleSide,
});
const ACCENT = new THREE.MeshStandardMaterial({
  color: '#d1422f',
  flatShading: true,
  side: THREE.DoubleSide,
});

// One folded-paper wing: a flat triangle fan in the XZ plane,
// root at origin so the pivot fold happens at the body.
function makeWing(mirror) {
  const m = mirror ? -1 : 1;
  const geo = new THREE.BufferGeometry();
  // two triangles sharing the leading edge — gives the wing a visible crease
  const verts = new Float32Array([
    0, 0, 0.1,   m * 1.7, 0.12, -0.25,   m * 0.9, 0.05, 0.15,
    0, 0, 0.1,   m * 0.9, 0.05, 0.15,    m * 1.2, 0.0, 0.75,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const wing = new THREE.Mesh(geo, PAPER);
  wing.castShadow = true;
  return wing;
}

export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();

    // body — a stretched octahedron reads as the folded diamond core
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), PAPER);
    body.scale.set(0.85, 0.62, 1.5);
    body.castShadow = true;
    this.group.add(body);

    // neck + head, kinked upward like a crane's fold
    const neck = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.0, 4), PAPER);
    neck.position.set(0, 0.42, -0.78);
    neck.rotation.x = -Math.PI / 3.2;
    neck.castShadow = true;
    this.group.add(neck);

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), PAPER);
    head.position.set(0, 0.78, -1.06);
    this.group.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), ACCENT);
    beak.position.set(0, 0.78, -1.26);
    beak.rotation.x = -Math.PI / 2;
    this.group.add(beak);

    // tail fold, swept up and back
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.95, 4), PAPER);
    tail.position.set(0, 0.32, 0.82);
    tail.rotation.x = Math.PI / 2.8;
    tail.castShadow = true;
    this.group.add(tail);

    // wings on pivots at the shoulders
    this.leftPivot = new THREE.Group();
    this.leftPivot.position.set(0.18, 0.18, -0.05);
    this.leftPivot.add(makeWing(false));
    this.group.add(this.leftPivot);

    this.rightPivot = new THREE.Group();
    this.rightPivot.position.set(-0.18, 0.18, -0.05);
    this.rightPivot.add(makeWing(true));
    this.group.add(this.rightPivot);

    this.group.position.set(0, 6, 0);
    scene.add(this.group);

    this.radius = 0.55;          // collision sphere
    this.velocity = 0;
    this.flapPulse = 0;          // drives the wing downstroke
    this.idleTime = Math.random() * 10;
    this.dead = false;
    this.spin = 0;
  }

  get y() { return this.group.position.y; }
  set y(v) { this.group.position.y = v; }

  reset() {
    this.group.position.set(0, 6, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity = 0;
    this.flapPulse = 0;
    this.dead = false;
    this.spin = 0;
  }

  flap(impulse) {
    this.velocity = impulse;
    this.flapPulse = 1;
  }

  die() {
    this.dead = true;
    this.spin = 4 + Math.random() * 3;
  }

  // Ready-screen hover: gentle bob + slow wingbeats, no physics.
  hover(dt, t) {
    this.group.position.y = 6 + Math.sin(t * 2.2) * 0.35;
    const beat = Math.sin(t * 6) * 0.45;
    this.leftPivot.rotation.z = beat;
    this.rightPivot.rotation.z = -beat;
    this.group.rotation.x = Math.sin(t * 2.2 + 1) * 0.06;
  }

  update(dt, gravity, maxFall, groundY) {
    this.velocity = Math.max(this.velocity + gravity * dt, maxFall);
    this.group.position.y += this.velocity * dt;

    if (this.dead) {
      // tumble forward as it falls — paper crumpling out of the sky
      this.group.rotation.x -= this.spin * dt;
      this.group.rotation.z += this.spin * 0.3 * dt;
      this.leftPivot.rotation.z = 1.2;
      this.rightPivot.rotation.z = -1.2;
      if (this.group.position.y < groundY) {
        this.group.position.y = groundY;
        this.velocity = 0;
        this.spin *= 0.9;
      }
      return;
    }

    // pitch follows vertical velocity: nose up on flap, dive when falling
    const targetPitch = THREE.MathUtils.clamp(this.velocity * 0.055, -0.65, 0.4);
    this.group.rotation.x += (targetPitch - this.group.rotation.x) * Math.min(1, dt * 10);

    // wings: a sharp downstroke on flap that relaxes back to an idle beat
    this.idleTime += dt;
    this.flapPulse = Math.max(0, this.flapPulse - dt * 3.2);
    const idle = Math.sin(this.idleTime * 7) * 0.18;
    const stroke = Math.sin(this.flapPulse * Math.PI) * -1.15; // down then back
    const angle = idle + stroke;
    this.leftPivot.rotation.z = angle;
    this.rightPivot.rotation.z = -angle;
  }
}
