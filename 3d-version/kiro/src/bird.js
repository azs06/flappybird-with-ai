import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  ConeGeometry,
  MathUtils,
} from 'three';
import { CFG, clamp } from './config.js';

const MAT = {
  body: new MeshStandardMaterial({ color: 0xffd23f, roughness: 0.55, metalness: 0.02 }),
  belly: new MeshStandardMaterial({ color: 0xfff1c1, roughness: 0.7 }),
  wing: new MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.65 }),
  beak: new MeshStandardMaterial({ color: 0xff7f11, roughness: 0.4 }),
  eye: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
  pupil: new MeshStandardMaterial({ color: 0x20262b, roughness: 0.2 }),
  crest: new MeshStandardMaterial({ color: 0xef476f, roughness: 0.6 }),
};

const GEO = {
  sphere: new SphereGeometry(1, 22, 16),
  cone: new ConeGeometry(1, 1, 10),
  cone4: new ConeGeometry(1, 1, 4),
};

function part(geo, mat, pos, scale, cast = true) {
  const m = new Mesh(geo, mat);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  m.castShadow = cast;
  return m;
}

/**
 * The player: a low-poly bird with flapping wings and velocity-driven pitch.
 * Physics is 1D (vertical only); horizontal motion is faked by scrolling the
 * world, which keeps the bird permanently inside the shadow frustum.
 */
export class Bird {
  constructor() {
    this.group = new Group();
    this.group.position.set(CFG.bird.x, CFG.bird.startY, 0);

    this.body = new Group();
    this.group.add(this.body);

    this.body.add(part(GEO.sphere, MAT.body, [0, 0, 0], [0.5, 0.44, 0.42]));
    this.body.add(part(GEO.sphere, MAT.belly, [0.04, -0.14, 0], [0.42, 0.3, 0.37]));

    // Head blends into the body for a chunky, readable silhouette.
    this.body.add(part(GEO.sphere, MAT.body, [0.3, 0.2, 0], [0.32, 0.31, 0.3]));

    // Crest
    this.body.add(part(GEO.cone4, MAT.crest, [0.18, 0.46, 0], [0.1, 0.22, 0.16]));

    // Beak: cone rotated to point down +X.
    const beak = part(GEO.cone, MAT.beak, [0.66, 0.14, 0], [0.13, 0.34, 0.13]);
    beak.rotation.z = -Math.PI / 2;
    this.body.add(beak);

    for (const side of [-1, 1]) {
      this.body.add(part(GEO.sphere, MAT.eye, [0.44, 0.28, side * 0.16], [0.1, 0.11, 0.1], false));
      this.body.add(part(GEO.sphere, MAT.pupil, [0.5, 0.28, side * 0.19], [0.055, 0.06, 0.055], false));
    }

    // Tail
    const tail = part(GEO.cone4, MAT.body, [-0.52, 0.1, 0], [0.2, 0.3, 0.1]);
    tail.rotation.z = Math.PI / 2 + 0.35;
    this.body.add(tail);

    // Wings pivot at the shoulder so rotation reads as a real flap.
    this.wings = [];
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(-0.02, 0.02, side * 0.2);
      const wing = part(GEO.sphere, MAT.wing, [0, 0, side * 0.28], [0.28, 0.07, 0.32]);
      wing.rotation.x = side * -0.15;
      pivot.add(wing);
      pivot.userData.side = side;
      this.body.add(pivot);
      this.wings.push(pivot);
    }

    this.reset();
  }

  reset() {
    this.velocity = 0;
    this.alive = true;
    this.group.position.set(CFG.bird.x, CFG.bird.startY, 0);
    this.group.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.flapTimer = 0;
    this.idlePhase = Math.random() * Math.PI * 2;
    this.tumble = 0;
  }

  get y() {
    return this.group.position.y;
  }

  flap() {
    this.velocity = CFG.flapVelocity;
    this.flapTimer = 0.26;
  }

  /** Idle hover used on the title screen. */
  updateIdle(dt, elapsed) {
    this.group.position.y = CFG.bird.startY + Math.sin(elapsed * 2.6 + this.idlePhase) * 0.3;
    this.group.rotation.z = Math.sin(elapsed * 2.6 + this.idlePhase) * 0.1;
    this.#animateWings(dt, 7.5, 0.55);
  }

  updatePlaying(dt) {
    this.velocity = Math.max(this.velocity + CFG.gravity * dt, CFG.terminalVelocity);
    this.group.position.y += this.velocity * dt;

    if (this.group.position.y > CFG.ceiling) {
      this.group.position.y = CFG.ceiling;
      this.velocity = Math.min(this.velocity, 0);
    }

    const target = MathUtils.mapLinear(
      clamp(this.velocity, -14, CFG.flapVelocity),
      -14,
      CFG.flapVelocity,
      CFG.bird.maxPitchDown,
      CFG.bird.maxPitchUp,
    );
    // Snap up quickly on a flap, ease down while falling.
    const responsiveness = this.velocity > 0 ? 18 : 6;
    this.group.rotation.z += (target - this.group.rotation.z) * Math.min(1, responsiveness * dt);
    this.group.rotation.y *= 1 - Math.min(1, 6 * dt);

    this.flapTimer = Math.max(0, this.flapTimer - dt);
    const speed = this.flapTimer > 0 ? 26 : 9;
    const amp = this.flapTimer > 0 ? 0.9 : 0.35;
    this.#animateWings(dt, speed, amp);
  }

  /** Post-collision tumble; returns true once the bird has hit the floor. */
  updateDying(dt) {
    this.velocity = Math.max(this.velocity + CFG.gravity * 1.15 * dt, CFG.terminalVelocity);
    this.group.position.y += this.velocity * dt;
    this.tumble += dt;
    this.group.rotation.z -= 7.5 * dt;
    this.group.rotation.x += 3.5 * dt;
    for (const w of this.wings) w.rotation.x = w.userData.side * -1.1;

    const floor = CFG.groundY + CFG.bird.radius * 0.75;
    if (this.group.position.y <= floor) {
      this.group.position.y = floor;
      this.velocity = 0;
      return true;
    }
    return false;
  }

  #animateWings(dt, speed, amplitude) {
    this.wingPhase = (this.wingPhase ?? 0) + dt * speed;
    const a = Math.sin(this.wingPhase) * amplitude;
    for (const w of this.wings) w.rotation.x = w.userData.side * a;
  }
}
