import * as THREE from 'three';
import type { MaterialKit } from '../assets/materials';

export const BIRD_RADIUS = 0.36;

/**
 * Stylized neon bird — multi-part mesh with wing flap animation.
 * Collision uses a simple sphere proxy at group origin.
 */
export class Bird {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  alive = true;

  private readonly body: THREE.Group;
  private readonly leftWing: THREE.Object3D;
  private readonly rightWing: THREE.Object3D;
  private readonly trail: THREE.Mesh[] = [];
  private flapPhase = 0;
  private tilt = 0;
  private trailTimer = 0;
  private readonly trailGeo: THREE.SphereGeometry;
  private readonly mats: MaterialKit;
  private hitFlash = 0;

  constructor(mats: MaterialKit) {
    this.mats = mats;
    this.body = new THREE.Group();
    this.group.add(this.body);

    // Main body — elongated sphere via scale
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), mats.birdBody);
    torso.scale.set(1.15, 0.95, 1.35);
    torso.castShadow = true;
    this.body.add(torso);

    // Belly accent
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mats.birdAccent);
    belly.position.set(0, -0.12, 0.05);
    belly.scale.set(0.9, 0.55, 1.0);
    this.body.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), mats.birdBody);
    head.position.set(0, 0.12, 0.38);
    head.castShadow = true;
    this.body.add(head);

    // Crest
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6), mats.birdAccent);
    crest.position.set(0, 0.34, 0.32);
    crest.rotation.x = -0.4;
    this.body.add(crest);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), mats.birdBeak);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.08, 0.62);
    this.body.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.055, 10, 8);
    const eyeL = new THREE.Mesh(eyeGeo, mats.birdEye);
    eyeL.position.set(0.12, 0.18, 0.52);
    const eyeR = eyeL.clone();
    eyeR.position.x = -0.12;
    this.body.add(eyeL, eyeR);

    // Eye glints
    const glintGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const gL = new THREE.Mesh(glintGeo, glintMat);
    gL.position.set(0.14, 0.2, 0.56);
    const gR = gL.clone();
    gR.position.x = -0.1;
    this.body.add(gL, gR);

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.35, 0.15, 0.7, 0.05);
    wingShape.quadraticCurveTo(0.5, -0.08, 0.15, -0.12);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 8);
    wingGeo.center();

    this.leftWing = new THREE.Mesh(wingGeo, mats.wing);
    this.leftWing.position.set(0.32, 0.05, 0);
    this.leftWing.rotation.y = 0.2;
    this.leftWing.scale.set(0.9, 0.9, 0.9);

    this.rightWing = new THREE.Mesh(wingGeo, mats.wing);
    this.rightWing.position.set(-0.32, 0.05, 0);
    this.rightWing.rotation.y = Math.PI - 0.2;
    this.rightWing.scale.set(0.9, 0.9, 0.9);

    this.body.add(this.leftWing, this.rightWing);

    // Tail feathers
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 5), mats.birdAccent);
    tail.rotation.x = -Math.PI / 2;
    tail.position.set(0, 0.02, -0.48);
    this.body.add(tail);

    // Soft body glow
    const glow = new THREE.PointLight(0xffaa44, 1.2, 6, 2);
    glow.position.set(0, 0, 0);
    this.group.add(glow);

    this.trailGeo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < 10; i++) {
      const m = mats.trail.clone();
      const mesh = new THREE.Mesh(this.trailGeo, m);
      mesh.visible = false;
      this.trail.push(mesh);
    }

    // Face into the oncoming world (−Z); camera sits on +Z looking down −Z.
    this.group.rotation.y = Math.PI;

    this.reset();
  }

  attachTrails(scene: THREE.Scene): void {
    for (const t of this.trail) scene.add(t);
  }

  reset(): void {
    this.alive = true;
    this.velocity.set(0, 0, 0);
    this.group.position.set(0, 1.2, 0);
    this.group.rotation.set(0, Math.PI, 0);
    this.body.rotation.set(0, 0, 0);
    this.tilt = 0;
    this.flapPhase = 0;
    this.hitFlash = 0;
    for (const t of this.trail) {
      t.visible = false;
    }
  }

  flap(impulse: number): void {
    if (!this.alive) return;
    this.velocity.y = impulse;
    this.flapPhase = 0;
  }

  update(dt: number, gravity: number, maxFall: number, maxRise: number): void {
    if (!this.alive) {
      this.velocity.y += gravity * dt * 1.4;
      this.group.position.y += this.velocity.y * dt;
      // Rest on the runway when crashing
      if (this.group.position.y < -3.2) {
        this.group.position.y = -3.2;
        this.velocity.y *= -0.25;
        if (Math.abs(this.velocity.y) < 0.4) this.velocity.y = 0;
      }
      this.group.rotation.z -= dt * 3.2;
      this.group.rotation.x += dt * 1.2;
      return;
    }

    this.velocity.y += gravity * dt;
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, maxFall, maxRise);
    this.group.position.y += this.velocity.y * dt;

    // Pitch from vertical velocity
    const targetTilt = THREE.MathUtils.clamp(this.velocity.y * 0.12, -0.9, 0.65);
    this.tilt = THREE.MathUtils.damp(this.tilt, targetTilt, 12, dt);
    this.body.rotation.x = this.tilt;

    // Wing flap — faster when rising
    const speed = this.velocity.y > 0 ? 22 : 10;
    this.flapPhase += dt * speed;
    const wingAngle = Math.sin(this.flapPhase) * 0.55 + (this.velocity.y > 0 ? -0.25 : 0.15);
    this.leftWing.rotation.z = wingAngle;
    this.rightWing.rotation.z = -wingAngle;

    // Subtle idle bob when near hover
    this.body.position.y = Math.sin(performance.now() * 0.006) * 0.02;

    // Trail
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.04;
      this.spawnTrail();
    }
    this.updateTrails(dt);

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const flash = this.hitFlash > 0;
      this.mats.birdBody.emissiveIntensity = flash ? 1.4 : 0.35;
    }
  }

  kill(): void {
    this.alive = false;
    this.hitFlash = 0.35;
    this.velocity.y = 2.5;
  }

  private spawnTrail(): void {
    const slot = this.trail.find((t) => !t.visible);
    if (!slot) return;
    slot.visible = true;
    slot.position.copy(this.group.position);
    slot.position.z += 0.35; // trail behind bird (toward +Z / camera)
    slot.position.y -= 0.05;
    slot.scale.setScalar(1);
    const mat = slot.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5;
  }

  private updateTrails(dt: number): void {
    for (const t of this.trail) {
      if (!t.visible) continue;
      t.scale.multiplyScalar(1 - dt * 3.5);
      const mat = t.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 2.2;
      if (mat.opacity <= 0.02 || t.scale.x < 0.15) {
        t.visible = false;
      }
    }
  }

  getCollider(): { x: number; y: number; z: number; r: number } {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      z: this.group.position.z,
      r: BIRD_RADIUS,
    };
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
      }
    });
    this.trailGeo.dispose();
    for (const t of this.trail) {
      (t.material as THREE.Material).dispose();
    }
  }
}
