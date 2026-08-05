import * as THREE from "three";
import { GROUND_Y, CEILING_Y } from "./Environment.js";

const POOL_SIZE = 6;
const SPAWN_X = 38;
const RECYCLE_X = -10;
const PIPE_RADIUS = 0.92;
const COLLIDE_HALF = PIPE_RADIUS + 0.34;
const BASE_SPACING = 11.5;
const BASE_GAP = 5.4;
const MIN_GAP = 3.7;

const pipeColor = 0x5cc24a;
const pipeDarkColor = 0x3f9a36;
const capColor = 0x4fb03f;
const ringColor = 0xb6f08a;

export class PipePair {
  constructor() {
    this.group = new THREE.Group();
    this.active = false;
    this.x = -100;
    this.gapCenter = 4.2;
    this.gapH = BASE_GAP;
    this.scored = false;
    this.passed = false;

    const bodyMat = new THREE.MeshStandardMaterial({ color: pipeColor, roughness: 0.5, metalness: 0.08, flatShading: true });
    const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5, metalness: 0.08, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: pipeDarkColor, roughness: 0.6, metalness: 0.05, flatShading: true });
    const ringMat = new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.4, metalness: 0.1, emissive: 0x2a5a22, emissiveIntensity: 0.25 });

    this._bodyMat = bodyMat;
    this._top = this._makeColumn(bodyMat, capMat, darkMat, ringMat, true);
    this._bottom = this._makeColumn(bodyMat, capMat, darkMat, ringMat, false);
    this.group.add(this._top, this._bottom);
    this.group.position.set(this.x, 0, 0);
  }

  _makeColumn(bodyMat, capMat, darkMat, ringMat, isTop) {
    const col = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, 1, 20, 1, true), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    col.add(body);
    this._isTop = isTop;
    col.userData.body = body;

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_RADIUS * 1.16, PIPE_RADIUS * 1.16, 0.55, 20), capMat);
    cap.castShadow = true;
    col.add(cap);
    col.userData.cap = cap;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(PIPE_RADIUS * 1.02, 0.06, 8, 20), ringMat);
    col.add(ring);
    col.userData.ring = ring;

    const shade = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_RADIUS * 0.96, PIPE_RADIUS * 0.96, 1, 20, 1, true), darkMat);
    shade.castShadow = false;
    col.add(shade);
    col.userData.shade = shade;

    return col;
  }

  configure(x, gapCenter, gapH) {
    this.x = x;
    this.gapCenter = gapCenter;
    this.gapH = gapH;
    this.scored = false;
    this.passed = false;
    this.active = true;

    const gapTop = gapCenter + gapH / 2;
    const gapBottom = gapCenter - gapH / 2;

    const top = this._top;
    const topH = Math.max(0.4, CEILING_Y - gapTop);
    top.userData.body.scale.y = topH;
    top.userData.body.position.y = gapTop + topH / 2;
    top.userData.cap.position.y = gapTop - 0.28;
    top.userData.ring.position.y = gapTop - 0.55;
    top.userData.ring.rotation.x = Math.PI / 2;
    top.userData.shade.scale.y = topH * 0.999;
    top.userData.shade.position.y = gapTop + topH / 2 + 0.02;

    const bot = this._bottom;
    const botH = Math.max(0.4, gapBottom - GROUND_Y);
    bot.userData.body.scale.y = botH;
    bot.userData.body.position.y = GROUND_Y + botH / 2;
    bot.userData.cap.position.y = gapBottom + 0.28;
    bot.userData.ring.position.y = gapBottom + 0.55;
    bot.userData.ring.rotation.x = Math.PI / 2;
    bot.userData.shade.scale.y = botH * 0.999;
    bot.userData.shade.position.y = GROUND_Y + botH / 2 - 0.02;

    this.group.position.set(this.x, 0, 0);
  }

  moveTo(x) {
    this.x = x;
    this.group.position.x = x;
  }
}

export class PipeManager {
  constructor(scene) {
    this.scene = scene;
    this.pipes = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = new PipePair();
      scene.add(p.group);
      this.pipes.push(p);
    }
    this.reset();
  }

  reset() {
    for (const p of this.pipes) {
      p.active = false;
      p.moveTo(-200);
      p.scored = false;
    }
  }

  _spawn(x, gapCenter, gapH) {
    let p = this.pipes.find(pp => !pp.active);
    if (!p) p = this.pipes.reduce((a, b) => (a.x < b.x ? a : b), this.pipes[0]);
    p.configure(x, gapCenter, gapH);
  }

  computeGap(score) {
    return Math.max(MIN_GAP, BASE_GAP - score * 0.05);
  }

  computeGapCenter() {
    const margin = 3.0;
    const minY = GROUND_Y + margin + BASE_GAP / 2;
    const maxY = CEILING_Y - margin - BASE_GAP / 2;
    const band = maxY - minY;
    return minY + band * (0.25 + Math.random() * 0.5);
  }

  update(dt, speed, score) {
    const move = speed * dt;
    let rightmostX = -Infinity;
    const scored = [];
    for (const p of this.pipes) {
      if (!p.active) continue;
      p.moveTo(p.x - move);
      if (!p.scored && p.x + COLLIDE_HALF < 0) {
        p.scored = true;
        scored.push(p);
      }
      if (p.x > rightmostX) rightmostX = p.x;
      if (p.x < RECYCLE_X) {
        p.active = false;
        p.moveTo(-200);
      }
    }
    if (rightmostX <= SPAWN_X - BASE_SPACING) {
      const gapH = this.computeGap(score);
      const gapCenter = this.computeGapCenter();
      this._spawn(SPAWN_X, gapCenter, gapH);
    }
    return scored;
  }

  checkCollision(bird) {
    const r = bird.radius * 0.82;
    for (const p of this.pipes) {
      if (!p.active) continue;
      const dx = Math.abs(bird.x - p.x);
      if (dx > COLLIDE_HALF + r) continue;
      const gapTop = p.gapCenter + p.gapH / 2;
      const gapBottom = p.gapCenter - p.gapH / 2;
      if (bird.y + r > gapTop || bird.y - r < gapBottom) return true;
    }
    return false;
  }

  getNearbyForFx(bird) {
    let nearest = null;
    let best = Infinity;
    for (const p of this.pipes) {
      if (!p.active) continue;
      const d = Math.abs(p.x - bird.x);
      if (d < best) { best = d; nearest = p; }
    }
    return nearest;
  }

  forEachActive(cb) {
    for (const p of this.pipes) if (p.active) cb(p);
  }
}
