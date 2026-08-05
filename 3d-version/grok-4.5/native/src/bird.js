import * as THREE from "three";

/**
 * Stylized low-poly bird with wing flaps, trail, and squash/stretch.
 */
export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(-1.2, 0.5, 0);
    scene.add(this.group);

    this.velocityY = 0;
    this.alive = true;
    this.flapBoost = 0;
    this.wingPhase = 0;
    this.squash = 1;

    this._buildMesh();
    this._buildTrail(scene);
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff9f43,
      roughness: 0.45,
      metalness: 0.08,
      emissive: 0x3a1800,
      emissiveIntensity: 0.15,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffe0a8,
      roughness: 0.55,
      metalness: 0.02,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.DoubleSide,
      emissive: 0x2a0a00,
      emissiveIntensity: 0.1,
    });
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.35,
      metalness: 0.15,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.3,
      metalness: 0.2,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfff6e8,
      roughness: 0.4,
    });
    const crestMat = new THREE.MeshStandardMaterial({
      color: 0xff5d6c,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), bodyMat);
    body.scale.set(1.15, 0.9, 0.85);
    body.castShadow = true;
    this.group.add(body);
    this.body = body;

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bellyMat);
    belly.position.set(0.02, -0.1, 0.12);
    belly.scale.set(1.1, 0.7, 0.8);
    this.group.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), bodyMat);
    head.position.set(0.26, 0.1, 0.02);
    head.castShadow = true;
    this.group.add(head);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.42, 0.08, 0.02);
    this.group.add(beak);

    // Eyes
    const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeWhiteMat);
    eyeWhiteL.position.set(0.34, 0.15, 0.1);
    this.group.add(eyeWhiteL);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
    eyeL.position.set(0.36, 0.155, 0.125);
    this.group.add(eyeL);

    const eyeWhiteR = eyeWhiteL.clone();
    eyeWhiteR.position.z = -0.06;
    this.group.add(eyeWhiteR);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.085;
    this.group.add(eyeR);

    // Crest
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 5), crestMat);
    crest.position.set(0.22, 0.28, 0);
    crest.rotation.z = 0.35;
    this.group.add(crest);

    // Tail feathers
    const tailGeo = new THREE.ConeGeometry(0.1, 0.28, 4);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(-0.32, 0.02, 0);
    tail.rotation.z = Math.PI / 2 + 0.2;
    this.group.add(tail);

    // Wings (pivoted)
    this.leftWingPivot = new THREE.Group();
    this.rightWingPivot = new THREE.Group();
    this.leftWingPivot.position.set(0.02, 0.06, 0.18);
    this.rightWingPivot.position.set(0.02, 0.06, -0.18);
    this.group.add(this.leftWingPivot, this.rightWingPivot);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.15, 0.25, 0.45, 0.08);
    wingShape.quadraticCurveTo(0.28, -0.05, 0, -0.02);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.translate(0, 0, 0);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = 0.15;
    leftWing.castShadow = true;
    this.leftWingPivot.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.rotation.y = -0.15;
    rightWing.scale.z = -1;
    this.rightWingPivot.add(rightWing);

    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  _buildTrail(scene) {
    this.trailCount = 24;
    this.trailPositions = [];
    for (let i = 0; i < this.trailCount; i++) {
      this.trailPositions.push(new THREE.Vector3(this.group.position.x, this.group.position.y, 0));
    }

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trailCount * 3);
    const colors = new Float32Array(this.trailCount * 3);
    const sizes = new Float32Array(this.trailCount);

    for (let i = 0; i < this.trailCount; i++) {
      const t = i / this.trailCount;
      positions[i * 3] = this.group.position.x;
      positions[i * 3 + 1] = this.group.position.y;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.65 + t * 0.2;
      colors[i * 3 + 2] = 0.3;
      sizes[i] = (1 - t) * 0.18;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.trail = new THREE.Points(geo, mat);
    scene.add(this.trail);
  }

  reset() {
    this.group.position.set(-1.2, 0.5, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);
    this.velocityY = 0;
    this.alive = true;
    this.flapBoost = 0;
    this.wingPhase = 0;
    this.squash = 1;
    for (const p of this.trailPositions) {
      p.copy(this.group.position);
    }
  }

  flap() {
    if (!this.alive) return;
    this.velocityY = 5.4;
    this.flapBoost = 1;
    this.squash = 1.25;
  }

  update(dt, { gravity, ceiling, floor, playing }) {
    if (playing && this.alive) {
      this.velocityY -= gravity * dt;
      this.group.position.y += this.velocityY * dt;

      if (this.group.position.y > ceiling) {
        this.group.position.y = ceiling;
        this.velocityY = Math.min(0, this.velocityY);
      }
      if (this.group.position.y < floor) {
        this.group.position.y = floor;
        this.velocityY = 0;
        this.alive = false;
      }
    } else if (!playing && this.alive) {
      // Idle hover on menu
      this.group.position.y = 0.5 + Math.sin(performance.now() * 0.0025) * 0.18;
      this.velocityY = 0;
    }

    // Pitch from velocity
    const targetPitch = THREE.MathUtils.clamp(-this.velocityY * 0.08, -0.9, 0.7);
    if (playing) {
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetPitch, 1 - Math.pow(0.001, dt));
    } else {
      this.group.rotation.z = Math.sin(performance.now() * 0.002) * 0.12;
    }

    // Wing flap
    this.wingPhase += dt * (this.flapBoost > 0.1 ? 28 : playing ? 10 : 6);
    this.flapBoost = Math.max(0, this.flapBoost - dt * 3.5);
    const flapAmp = 0.55 + this.flapBoost * 0.6;
    const wingAngle = Math.sin(this.wingPhase) * flapAmp;
    this.leftWingPivot.rotation.x = wingAngle;
    this.rightWingPivot.rotation.x = -wingAngle;

    // Squash / stretch recover
    this.squash = THREE.MathUtils.lerp(this.squash, 1, 1 - Math.pow(0.0008, dt));
    const sy = this.squash;
    const sx = 1 / Math.sqrt(sy);
    this.group.scale.set(sx, sy, sx);

    // Subtle bank bob
    this.group.position.z = Math.sin(performance.now() * 0.0015) * 0.04;

    this._updateTrail(dt);
  }

  _updateTrail(dt) {
    // Shift trail toward bird
    const head = this.trailPositions[0];
    head.lerp(this.group.position, 1 - Math.pow(0.00001, dt));
    for (let i = 1; i < this.trailCount; i++) {
      this.trailPositions[i].lerp(this.trailPositions[i - 1], 1 - Math.pow(0.00005, dt));
    }

    const pos = this.trail.geometry.attributes.position;
    for (let i = 0; i < this.trailCount; i++) {
      const p = this.trailPositions[i];
      pos.setXYZ(i, p.x - 0.15, p.y, p.z);
    }
    pos.needsUpdate = true;
  }

  /** Axis-aligned bounds for collision (generous vs mesh). */
  getBounds() {
    const p = this.group.position;
    return {
      minX: p.x - 0.16,
      maxX: p.x + 0.24,
      minY: p.y - 0.14,
      maxY: p.y + 0.16,
    };
  }
}
