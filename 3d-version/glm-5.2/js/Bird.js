import * as THREE from "three";

const GRAVITY = -34.0;
const FLAP_VELOCITY = 11.0;
const MAX_FALL = -22.0;

export class Bird {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.radius = 0.62;
    this.x = 0;
    this.y = 4.2;
    this.vy = 0;
    this.pitch = 0;
    this.roll = 0;
    this.alive = true;

    this._flapAnim = 0;
    this._wingPhase = 0;
    this._spin = 0;

    this._build();
    this.reset();
    scene.add(this.group);
  }

  _build() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffce4d, roughness: 0.55, metalness: 0.04, flatShading: true });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfff6df, roughness: 0.6, metalness: 0.03, flatShading: true });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.45, metalness: 0.05, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.5, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf2a02a, roughness: 0.55, metalness: 0.04, flatShading: true });
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff7a8a, roughness: 0.7, flatShading: true });

    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), bodyMat);
    body.scale.set(1.0, 0.92, 1.05);
    body.castShadow = true;
    this.group.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), bellyMat);
    belly.position.set(0.08, -0.16, 0);
    belly.scale.set(1.0, 0.8, 0.92);
    this.group.add(belly);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 4), wingMat);
    tail.position.set(-0.62, 0.06, 0);
    tail.rotation.z = Math.PI * 0.52;
    tail.castShadow = true;
    this.group.add(tail);

    this.head = new THREE.Group();
    this.head.position.set(0.5, 0.34, 0);
    this.group.add(this.head);

    const headMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), bodyMat);
    headMesh.scale.set(1.05, 1.0, 1.0);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 6), beakMat);
    beakUpper.position.set(0.42, -0.04, 0);
    beakUpper.rotation.z = -Math.PI / 2;
    this.head.add(beakUpper);

    const beakLower = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 6), beakMat);
    beakLower.position.set(0.4, -0.13, 0);
    beakLower.rotation.z = -Math.PI / 2;
    this.head.add(beakLower);

    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const eyeGeo = new THREE.SphereGeometry(0.13, 14, 12);
    const eyeL = new THREE.Mesh(eyeGeo, eyeWhite);
    eyeL.position.set(0.28, 0.16, 0.24);
    this.head.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.24;
    this.head.add(eyeR);

    const pupilGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const pupilL = new THREE.Mesh(pupilGeo, darkMat);
    pupilL.position.set(0.36, 0.16, 0.3);
    this.head.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.z = -0.3;
    this.head.add(pupilR);

    const cheekGeo = new THREE.CircleGeometry(0.08, 12);
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(0.22, 0.02, 0.34);
    this.head.add(cheekL);
    const cheekR = cheekL.clone();
    cheekR.position.z = -0.34;
    this.head.add(cheekR);

    this.wingL = this._makeWing(wingMat);
    this.wingL.position.set(-0.04, 0.04, 0.52);
    this.group.add(this.wingL);

    this.wingR = this._makeWing(wingMat);
    this.wingR.position.set(-0.04, 0.04, -0.52);
    this.wingR.scale.z = -1;
    this.group.add(this.wingR);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), wingMat);
    crest.position.set(0.18, 0.5, 0);
    this.head.add(crest);
  }

  _makeWing(mat) {
    const wing = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.5, 0.28, 0.86, 0.06);
    shape.quadraticCurveTo(0.66, -0.06, 0.42, -0.2);
    shape.quadraticCurveTo(0.18, -0.18, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
    geo.translate(-0.1, 0, -0.04);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    wing.add(mesh);
    return wing;
  }

  reset() {
    this.x = 0;
    this.y = 4.2;
    this.vy = 0;
    this.pitch = 0;
    this.roll = 0;
    this.alive = true;
    this._flapAnim = 0;
    this._spin = 0;
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.set(0, 0, 0);
  }

  flap() {
    if (!this.alive) return;
    this.vy = FLAP_VELOCITY;
    this._flapAnim = 1.0;
  }

  hover(dt, t) {
    this.alive = true;
    this.vy = Math.cos(t * 2.2) * 1.7;
    this.y = 4.2 + Math.sin(t * 2.2) * 0.38;
    this._wingPhase += dt * 18;
    this._flapAnim = Math.max(0, this._flapAnim - dt * 4);
    const wingAngle = Math.sin(this._wingPhase) * 0.55 - 0.2;
    if (this.wingL) this.wingL.rotation.x = wingAngle;
    if (this.wingR) this.wingR.rotation.x = wingAngle;
    const targetPitch = this.vy * 0.06;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 8);
    this.roll *= 1 - Math.min(1, dt * 6);
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.pitch;
    this.group.rotation.x = this.roll;
    this.group.rotation.y = Math.sin(this._wingPhase * 0.25) * 0.05;
  }

  update(dt) {
    if (this.alive) {
      this.vy += GRAVITY * dt;
      if (this.vy < MAX_FALL) this.vy = MAX_FALL;
      this.y += this.vy * dt;
    } else {
      this.vy += GRAVITY * 1.4 * dt;
      this.y += this.vy * dt;
      this._spin += dt * 6.0;
    }

    this._flapAnim = Math.max(0, this._flapAnim - dt * 4.0);
    this._wingPhase += dt * (this.alive ? 16 : 26);

    const flapBoost = this._flapAnim;
    const wingAngle = Math.sin(this._wingPhase) * 0.5 - 0.2 - flapBoost * 0.9;
    if (this.wingL) this.wingL.rotation.x = wingAngle;
    if (this.wingR) this.wingR.rotation.x = wingAngle;

    const targetPitch = THREE.MathUtils.clamp(this.vy * 0.05, -0.55, 0.7);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 9);
    const targetRoll = THREE.MathUtils.clamp(-this.vy * 0.012, -0.25, 0.25);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 8);

    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.pitch;
    this.group.rotation.x = this.roll + (this.alive ? 0 : this._spin);
    this.group.rotation.y = this.alive ? Math.sin(this._wingPhase * 0.25) * 0.05 : this._spin * 0.5;
  }

  kill() {
    this.alive = false;
    this.vy = 6.0;
  }
}
