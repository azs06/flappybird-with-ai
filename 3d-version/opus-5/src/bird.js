import * as THREE from 'three';
import { CFG } from './config.js';

/**
 * A faint self-emission tied to each part's own colour. Purely so the bird
 * stays readable during the night phase of the day/night cycle, where the sun
 * drops to 0.9 intensity and a purely diffuse bird silhouettes to near-black.
 */
const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.02,
    emissive: color,
    emissiveIntensity: 0.14,
    ...opts,
  });

/**
 * The player.
 *
 * The mesh is built entirely from primitives — no asset pipeline, no loader,
 * no CORS. The trade-off is that every proportion is a magic number, so the
 * model is assembled in one place with the pivots named for readability.
 */
export class Bird {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    // Scaled up a little for screen presence. Collision uses CFG.bird.radius,
    // which is tuned against this final on-screen size, not the raw geometry.
    this.group.scale.setScalar(1.12);
    scene.add(this.group);

    // `body` holds the whole visual rig so we can pitch/roll it without
    // disturbing group.position, which physics owns.
    this.body = new THREE.Group();
    this.group.add(this.body);

    const YELLOW = 0xffd93b;
    const ORANGE = 0xff9d2e;
    const CREAM = 0xfff0b0;

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), mat(YELLOW));
    torso.scale.set(1.22, 1.0, 1.0);
    torso.castShadow = true;
    this.body.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), mat(CREAM));
    belly.scale.set(1.16, 0.82, 0.95);
    belly.position.set(0.06, -0.16, 0);
    this.body.add(belly);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 16), mat(YELLOW));
    head.position.set(0.5, 0.3, 0);
    head.castShadow = true;
    this.body.add(head);

    // Cones point along +Y by default; rotate -90° about Z to aim down +X.
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.46, 10), mat(ORANGE, { roughness: 0.4 }));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.0, 0.24, 0);
    this.body.add(beak);

    const eyeGeo = new THREE.SphereGeometry(0.145, 14, 12);
    const pupilGeo = new THREE.SphereGeometry(0.072, 12, 10);
    const eyeMat = mat(0xffffff, { roughness: 0.25 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.2 });
    this.eyes = [];
    for (const z of [0.26, -0.26]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.position.set(0.7, 0.45, z);
      const p = new THREE.Mesh(pupilGeo, pupilMat);
      p.position.set(0.11, 0.01, z > 0 ? 0.055 : -0.055);
      e.add(p);
      this.body.add(e);
      this.eyes.push(e);
    }

    // Wings hang off pivot groups placed at the shoulder, so rotating the pivot
    // sweeps the wing around the body instead of spinning it in place.
    //
    // The wing is a squashed ellipsoid, not a box. From this game's near-side-on
    // camera a flat box is seen edge-on for most of the flap cycle and reads as
    // a dark pencil line across the bird; a lens shape always shows a shaded
    // curve, so the wing stays legible at every angle.
    const wingGeo = new THREE.SphereGeometry(1, 16, 10);
    wingGeo.scale(0.36, 0.085, 0.46);
    wingGeo.translate(0, 0, 0.42); // pivot sits at the shoulder, wing points out
    this.wings = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(-0.02, 0.16, side * 0.38);
      pivot.rotation.y = side * -0.14; // slight backward sweep
      const w = new THREE.Mesh(wingGeo, mat(0xffcf2a));
      w.castShadow = true;
      if (side < 0) w.scale.z = -1;
      pivot.add(w);
      this.body.add(pivot);
      this.wings.push({ pivot, side, baseYaw: side * -0.14 });
    }

    // Three fanned feathers rather than one cone — a single rotated cone reads
    // as a floating quad from the side-on camera angle the game actually uses.
    const tail = new THREE.Group();
    const featherGeo = new THREE.BoxGeometry(0.66, 0.09, 0.22);
    featherGeo.translate(-0.33, 0, 0); // pivot at the inner (body) end
    for (const spread of [-0.3, 0, 0.3]) {
      const f = new THREE.Mesh(featherGeo, mat(0xffc61f));
      f.rotation.y = spread;
      f.rotation.z = 0.3; // sweep the tail upward
      f.castShadow = true;
      tail.add(f);
    }
    tail.position.set(-0.66, 0.08, 0);
    this.body.add(tail);
    this.tail = tail;

    const footGeo = new THREE.ConeGeometry(0.09, 0.3, 6);
    this.feet = [];
    for (const z of [0.18, -0.18]) {
      const f = new THREE.Mesh(footGeo, mat(ORANGE));
      f.rotation.z = Math.PI;
      f.position.set(0.08, -0.6, z);
      this.body.add(f);
      this.feet.push(f);
    }

    this.reset();
  }

  reset() {
    this.group.position.set(0, 1.2, 0);
    this.vy = 0;
    this.pitch = 0;
    this.wingPhase = 0;
    this.flapEnergy = 0; // decays after each flap; drives wing amplitude
    this.dead = false;
    this.grounded = false;
    this.tumble = 0;
    this.tumbleSpeed = 9;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
  }

  flap() {
    this.vy = CFG.physics.flapImpulse;
    this.flapEnergy = 1;
    // Start the downstroke immediately so the animation reads as *causing* the
    // lift rather than reacting to it.
    this.wingPhase = -Math.PI / 2;
  }

  /** Fixed-step physics. Returns nothing; caller reads group.position / vy. */
  step(dt, forwardSpeed) {
    const P = CFG.physics;
    this.vy += P.gravity * dt;
    if (this.vy < P.terminalVelocity) this.vy = P.terminalVelocity;

    this.group.position.y += this.vy * dt;
    if (!this.dead) this.group.position.x += forwardSpeed * dt;

    if (!this.dead && this.group.position.y > P.ceilingY) {
      this.group.position.y = P.ceilingY;
      if (this.vy > 0) this.vy = -1.5; // soft bonk instead of a hard stop
    }
  }

  /** Visual-only update; safe to run at variable frame rate. */
  animate(dt, t) {
    const B = CFG.bird;

    if (this.dead) {
      // Spin freely while falling, then grind to a halt on impact — a bird that
      // keeps pinwheeling after it has landed looks like a broken animation.
      if (this.grounded) this.tumbleSpeed = Math.max(0, this.tumbleSpeed - dt * 26);
      this.tumble += dt * this.tumbleSpeed;
      this.body.rotation.z = -this.tumble;
      this.body.rotation.x = Math.sin(this.tumble * 0.7) * 0.5;
      const flail = this.tumbleSpeed / 9;
      for (const { pivot, side } of this.wings) {
        pivot.rotation.x = side * (0.9 + Math.sin(this.tumble * 2.2) * 0.5 * flail);
      }
      return;
    }

    // Pitch tracks vertical velocity, but with different gains up vs down —
    // the nose drops harder than it lifts, which is what makes the dive read.
    const target =
      this.vy > 0
        ? Math.min(B.maxPitchUp, this.vy * B.pitchUp)
        : Math.max(B.maxPitchDown, this.vy * B.pitchDown);
    this.pitch += (target - this.pitch) * Math.min(1, B.pitchLerp * dt);
    this.body.rotation.z = this.pitch;
    this.body.rotation.x = Math.sin(t * 2.3) * 0.045;

    // Flap: fast, wide strokes right after input, settling into an idle glide.
    this.flapEnergy = Math.max(0, this.flapEnergy - dt * 2.4);
    const speed = 7 + this.flapEnergy * 22;
    this.wingPhase += dt * speed;
    const amp = 0.34 + this.flapEnergy * 1.0;
    const swing = Math.sin(this.wingPhase) * amp;
    for (const { pivot, side, baseYaw } of this.wings) {
      // The +0.34 dihedral keeps the wings raised at rest so they never sit
      // perfectly horizontal, where they'd vanish against the body.
      pivot.rotation.x = side * (swing + 0.34);
      pivot.rotation.y = baseYaw + side * this.flapEnergy * -0.18;
    }

    // Subtle bob so the bird never looks frozen mid-glide.
    this.body.position.y = Math.sin(t * 3.1) * 0.045 * (1 - this.flapEnergy);

    for (const f of this.feet) f.rotation.x = Math.sin(t * 2) * 0.15 - this.pitch * 0.4;
  }

  /** Where the trail particles should spawn from (just behind the tail). */
  tailPoint(out) {
    return out.set(
      this.group.position.x - 0.95,
      this.group.position.y + 0.1,
      this.group.position.z
    );
  }

  get position() {
    return this.group.position;
  }
}
