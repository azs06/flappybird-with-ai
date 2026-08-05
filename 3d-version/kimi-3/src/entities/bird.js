import * as THREE from 'three';

// ---------------------------------------------------------------------------
// The hero: "Sunny", an authored stylized bird (no primitives-by-default —
// body is sculpted spheres, wings/tail are custom extruded feather shapes).
// Faces -Z (flight direction). Exposes flap impulse visuals + velocity tilt.
// ---------------------------------------------------------------------------

function wingShape() {
  // Rounded wing with two feather scallops at the trailing edge.
  const s = new THREE.Shape();
  s.moveTo(0, 0.02);
  s.bezierCurveTo(0.18, 0.22, 0.55, 0.3, 0.86, 0.16);   // leading edge sweep
  s.bezierCurveTo(0.98, 0.1, 1.0, 0.0, 0.92, -0.06);    // tip
  s.bezierCurveTo(0.78, -0.02, 0.72, -0.02, 0.62, -0.08); // scallop 1
  s.bezierCurveTo(0.52, -0.01, 0.44, -0.02, 0.34, -0.09); // scallop 2
  s.bezierCurveTo(0.2, -0.03, 0.08, -0.02, 0, 0.02);    // trailing edge root
  return s;
}

function tailShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0);
  s.lineTo(0.16, 0);
  s.bezierCurveTo(0.24, 0.22, 0.2, 0.4, 0.1, 0.46);
  s.bezierCurveTo(0.05, 0.4, -0.05, 0.4, -0.1, 0.46);
  s.bezierCurveTo(-0.2, 0.4, -0.24, 0.22, -0.16, 0);
  return s;
}

export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();

    const featherYellow = new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.62, metalness: 0.02, emissive: 0x2a1800, emissiveIntensity: 0.4 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfff3d0, roughness: 0.75, emissive: 0x201405, emissiveIntensity: 0.35 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf0a828, roughness: 0.58, side: THREE.DoubleSide, emissive: 0x241500, emissiveIntensity: 0.4 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7f2a, roughness: 0.5 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const eyeDark = new THREE.MeshStandardMaterial({ color: 0x1d1420, roughness: 0.2 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Body — sculpted from a squashed sphere.
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 22), featherYellow);
    body.scale.set(0.94, 0.9, 1.22);
    body.position.y = -0.04;

    // Belly patch.
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), bellyMat);
    belly.scale.set(0.82, 0.72, 1.0);
    belly.position.set(0, -0.22, -0.1);

    // Head dome (merged silhouette with body via overlap).
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 26, 20), featherYellow);
    head.position.set(0, 0.3, -0.42);

    // Cheeks.
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff9d5c, roughness: 0.8 }));
    cheekL.position.set(0.3, 0.22, -0.62);
    const cheekR = cheekL.clone();
    cheekR.position.x = -0.3;

    // Eyes: white + iris + glint (life comes from the glint).
    const eyeGeo = new THREE.SphereGeometry(0.155, 18, 14);
    const irisGeo = new THREE.SphereGeometry(0.085, 14, 10);
    const glintGeo = new THREE.SphereGeometry(0.032, 8, 6);
    for (const side of [1, -1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeWhite);
      eye.position.set(0.21 * side, 0.42, -0.68);
      eye.scale.z = 0.72;
      const iris = new THREE.Mesh(irisGeo, eyeDark);
      iris.position.set(0.21 * side, 0.42, -0.79);
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0.21 * side + 0.03, 0.47, -0.845);
      this.group.add(eye, iris, glint);
    }

    // Beak — two cones, slightly open.
    const beakTop = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 14), orangeMat);
    beakTop.rotation.x = -Math.PI / 2;
    beakTop.scale.y = 1;
    beakTop.position.set(0, 0.26, -0.95);
    beakTop.rotation.z = 0;
    const beakBottom = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 12), orangeMat);
    beakBottom.rotation.x = -Math.PI / 2 - 0.18;
    beakBottom.position.set(0, 0.15, -0.88);

    // Crest feathers.
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xf0a828, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28 - i * 0.05, 8), crestMat);
      c.position.set(0, 0.68 - i * 0.015, -0.42 + i * 0.12);
      c.rotation.x = -0.5 + i * 0.28;
      this.group.add(c);
    }

    // Wings — custom extruded feather shapes on pivots.
    const wingGeo = new THREE.ExtrudeGeometry(wingShape(), {
      depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2,
    });
    wingGeo.translate(0, 0, -0.025);
    this.wingL = new THREE.Group();
    const wingMeshL = new THREE.Mesh(wingGeo, wingMat);
    this.wingL.add(wingMeshL);
    this.wingL.position.set(0.42, 0.14, -0.08);
    this.wingL.rotation.y = -0.28; // backward sweep

    this.wingR = new THREE.Group();
    const wingMeshR = new THREE.Mesh(wingGeo, wingMat);
    wingMeshR.scale.x = -1;
    this.wingR.add(wingMeshR);
    this.wingR.position.set(-0.42, 0.14, -0.08);
    this.wingR.rotation.y = 0.28;

    // Tail fan.
    const tailGeo = new THREE.ExtrudeGeometry(tailShape(), { depth: 0.04, bevelEnabled: false });
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(0, 0.05, 0.62);
    tail.rotation.x = 1.85; // fan upward behind

    this.group.add(body, belly, head, cheekL, cheekR, beakTop, beakBottom, this.wingL, this.wingR, tail);

    this.group.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
    });

    scene.add(this.group);

    // Animation state.
    this.flapT = 1;         // time since last flap (>= duration = gliding)
    this.idleT = 0;
    this.squash = 0;
    this.dead = false;
    this.deadSpin = 0;
  }

  flap() {
    this.flapT = 0;
    this.squash = 1;
  }

  reset() {
    this.dead = false;
    this.deadSpin = 0;
    this.flapT = 1;
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(1);
  }

  die() {
    this.dead = true;
  }

  // vy drives pitch; dt integrates wing animation. scrollSpeed adds wind
  // flutter so fast flight visibly ruffles the wings.
  update(dt, vy, { idle = false, scrollSpeed = 0 } = {}) {
    const g = this.group;
    this.flapT += dt;
    this.idleT += dt;

    if (this.dead) {
      // Tumble out of the sky.
      this.deadSpin += dt * 9;
      g.rotation.z = this.deadSpin;
      g.rotation.x = Math.min(1.2, this.deadSpin * 0.4);
      return;
    }

    // Wing angle: sharp downstroke then eased recovery, blended to glide.
    const DUR = 0.42;
    let wing;
    if (this.flapT < DUR) {
      const t = this.flapT / DUR;
      const down = Math.sin(Math.min(t / 0.32, 1) * Math.PI); // fast snap
      const recover = 1 - Math.max(0, (t - 0.32) / 0.68);
      wing = down * recover;
    } else {
      wing = 0;
    }
    const flutter = Math.sin(this.idleT * (idle ? 7 : 22)) * (idle ? 0.22 : 0.06) * (1 - wing);
    const glidePose = 0.12 + Math.min(0.25, scrollSpeed * 0.012);
    const angle = glidePose + wing * 1.15 + flutter;
    this.wingL.rotation.z = angle;
    this.wingR.rotation.z = -angle;

    // Pitch with vertical velocity: nose up on climb, dive on fall.
    const targetPitch = THREE.MathUtils.clamp(-vy * 0.055, -0.5, 0.62);
    g.rotation.x += (targetPitch - g.rotation.x) * Math.min(1, dt * 10);

    // Idle hover bob.
    if (idle) {
      g.position.y += Math.sin(this.idleT * 2.1) * 0.0035;
    }

    // Flap squash & stretch.
    if (this.squash > 0) {
      this.squash = Math.max(0, this.squash - dt * 6);
      const s = Math.sin(this.squash * Math.PI) * 0.09;
      g.scale.set(1 - s * 0.6, 1 + s, 1 - s * 0.6);
    } else {
      g.scale.setScalar(1);
    }
  }
}
