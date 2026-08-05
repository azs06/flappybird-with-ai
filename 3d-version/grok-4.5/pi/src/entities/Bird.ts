import * as THREE from "three";
import { BIRD } from "../game/constants";
import type { MaterialKit } from "../systems/materials";

export class Bird {
  readonly group = new THREE.Group();
  readonly radius = BIRD.radius;

  velocityY = 0;
  alive = true;
  private mats: MaterialKit;
  private wingL!: THREE.Object3D;
  private wingR!: THREE.Object3D;
  private flapT = 0;
  private wingBoost = 0;
  private tilt = 0;
  private blinkT = 0;
  private eyeScale = 1;
  private leftEye!: THREE.Mesh;
  private rightEye!: THREE.Mesh;
  private trail: THREE.Mesh[] = [];
  private trailMats: THREE.MeshBasicMaterial[] = [];

  constructor(mats: MaterialKit) {
    this.mats = mats;
    this.build();
    this.group.scale.setScalar(BIRD.scale);
    this.reset(0);
  }

  private build(): void {
    // Author facing +Z, then yaw so the beak points down the course (+X).
    const bodyRoot = new THREE.Group();
    bodyRoot.rotation.y = Math.PI / 2;
    this.group.add(bodyRoot);

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), this.mats.birdBody);
    body.scale.set(1.05, 0.92, 1.15);
    body.castShadow = true;
    body.receiveShadow = true;
    bodyRoot.add(body);

    // Belly plate
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), this.mats.birdBelly);
    belly.position.set(0, -0.12, 0.08);
    belly.scale.set(0.85, 0.7, 0.95);
    bodyRoot.add(belly);

    // Head bump
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), this.mats.birdBody);
    head.position.set(0.18, 0.16, 0.22);
    head.castShadow = true;
    bodyRoot.add(head);

    // Crest (signature silhouette)
    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 6),
      this.mats.birdCrest,
    );
    crest.position.set(0.12, 0.42, 0.12);
    crest.rotation.z = -0.35;
    crest.castShadow = true;
    bodyRoot.add(crest);

    const crest2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 6),
      this.mats.birdCrest,
    );
    crest2.position.set(0.02, 0.4, 0.05);
    crest2.rotation.z = -0.15;
    bodyRoot.add(crest2);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), this.mats.birdBeak);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0.2, 0.08, 0.48);
    beak.castShadow = true;
    bodyRoot.add(beak);

    // Eyes
    const eyeWhiteGeo = new THREE.SphereGeometry(0.09, 12, 10);
    const pupilGeo = new THREE.SphereGeometry(0.045, 10, 8);

    const mkEye = (x: number) => {
      const pivot = new THREE.Group();
      const white = new THREE.Mesh(eyeWhiteGeo, this.mats.birdEyeWhite);
      const pupil = new THREE.Mesh(pupilGeo, this.mats.birdEye);
      pupil.position.set(0.02, 0.01, 0.05);
      pivot.add(white, pupil);
      pivot.position.set(x, 0.2, 0.38);
      bodyRoot.add(pivot);
      return white;
    };
    this.leftEye = mkEye(0.22);
    this.rightEye = mkEye(0.08);

    // Wings as hinged groups
    this.wingL = this.makeWing(-1);
    this.wingR = this.makeWing(1);
    bodyRoot.add(this.wingL, this.wingR);

    // Tail
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.32, 5),
      this.mats.birdWing,
    );
    tail.position.set(-0.05, 0.05, -0.48);
    tail.rotation.x = Math.PI / 2.4;
    bodyRoot.add(tail);

    // Soft key light attached for silhouette pop
    const glow = new THREE.PointLight(0xffc878, 0.55, 4, 2);
    glow.position.set(0.3, 0.2, 0.5);
    bodyRoot.add(glow);

    // Motion trail dots (pooled)
    for (let i = 0; i < 6; i++) {
      const mat = this.mats.particleFlap.clone();
      mat.opacity = 0.35 - i * 0.04;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08 - i * 0.008, 6, 6), mat);
      m.visible = false;
      this.trail.push(m);
      this.trailMats.push(mat);
      this.group.parent; // placeholder
    }
  }

  /** Attach trail meshes to scene root (not bird local). */
  attachTrail(scene: THREE.Scene): void {
    for (const t of this.trail) scene.add(t);
  }

  private makeWing(side: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(0.02 * side, 0.06, -0.02);

    // Thick wing slab — readable in profile and 3/4 view.
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.42, 4, 8),
      this.mats.birdWing,
    );
    mesh.rotation.z = side * 0.9;
    mesh.rotation.y = side * 0.25;
    mesh.position.set(side * 0.28, 0.05, 0);
    mesh.scale.set(1, 1, 0.45);
    mesh.castShadow = true;
    g.add(mesh);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      this.mats.birdCrest,
    );
    tip.position.set(side * 0.52, 0.18, 0.02);
    g.add(tip);

    return g;
  }

  reset(y = 0): void {
    this.group.position.set(0, y, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocityY = 0;
    this.alive = true;
    this.flapT = 0;
    this.wingBoost = 0;
    this.tilt = 0;
    this.blinkT = 2 + Math.random() * 3;
    for (const t of this.trail) t.visible = false;
  }

  flap(): void {
    if (!this.alive) return;
    this.velocityY = BIRD.flapVelocity;
    this.wingBoost = 1;
    this.flapT = 0;
  }

  update(dt: number, opts: { idle?: boolean; scrollX?: number } = {}): void {
    const idle = opts.idle ?? false;

    if (idle) {
      this.group.position.y = Math.sin(performance.now() * 0.001 * BIRD.idleBobSpeed) * BIRD.idleBobAmp;
      this.velocityY = 0;
      this.tilt = THREE.MathUtils.lerp(this.tilt, 0.15, 1 - Math.exp(-6 * dt));
    } else if (this.alive) {
      this.velocityY += BIRD.gravity * dt;
      this.velocityY = THREE.MathUtils.clamp(this.velocityY, BIRD.maxFallSpeed, BIRD.maxRiseSpeed);
      this.group.position.y += this.velocityY * dt;

      const targetTilt =
        this.velocityY > 0
          ? THREE.MathUtils.mapLinear(this.velocityY, 0, BIRD.maxRiseSpeed, 0.1, BIRD.tiltUp)
          : THREE.MathUtils.mapLinear(this.velocityY, 0, BIRD.maxFallSpeed, 0, BIRD.tiltDown);
      this.tilt = THREE.MathUtils.lerp(this.tilt, targetTilt, 1 - Math.exp(-BIRD.tiltLerp * dt));
    } else {
      // Death tumble
      this.velocityY += BIRD.gravity * 1.2 * dt;
      this.group.position.y += this.velocityY * dt;
      this.group.rotation.z += dt * 6;
      this.group.rotation.x += dt * 2;
      this.tilt = BIRD.tiltDown;
    }

    this.group.rotation.x = this.tilt * 0.85;
    // Slight bank for 3D read
    this.group.rotation.z = this.tilt * 0.15;

    // Wings
    this.flapT += dt * (BIRD.wingFlapSpeed * (0.55 + this.wingBoost * 1.8));
    this.wingBoost = Math.max(0, this.wingBoost - dt * 3.5);
    const flapAngle = Math.sin(this.flapT) * (0.55 + this.wingBoost * 0.9);
    this.wingL.rotation.z = flapAngle;
    this.wingR.rotation.z = -flapAngle;
    this.wingL.rotation.x = -0.25 + this.wingBoost * 0.4;
    this.wingR.rotation.x = -0.25 + this.wingBoost * 0.4;

    // Blink
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.eyeScale = 0.15;
      this.blinkT = 2.2 + Math.random() * 3.5;
    }
    this.eyeScale = THREE.MathUtils.lerp(this.eyeScale, 1, 1 - Math.exp(-18 * dt));
    this.leftEye.scale.y = this.eyeScale;
    this.rightEye.scale.y = this.eyeScale;

    // Trail
    const baseX = this.group.position.x;
    const baseY = this.group.position.y;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i]!;
      if (i === 0) {
        t.position.set(baseX - 0.35, baseY - 0.05, 0);
        t.visible = !idle && this.alive && (this.wingBoost > 0.05 || this.velocityY > 2);
      } else {
        const prev = this.trail[i - 1]!;
        t.position.lerp(prev.position, 1 - Math.exp(-14 * dt));
        t.position.x -= dt * 1.5;
        t.visible = prev.visible;
      }
      const mat = this.trailMats[i]!;
      mat.opacity = t.visible ? 0.4 - i * 0.05 : 0;
    }
  }

  /** Axis-aligned bounds for collision (slightly tighter than mesh). */
  getBounds(): { x: number; y: number; r: number } {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      r: this.radius * 0.82,
    };
  }
}
