import * as THREE from "three";

const POOL_SIZE = 180;

function makeSoftTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this._tex = makeSoftTexture();
    this._pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.SpriteMaterial({ map: this._tex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 5;
      scene.add(sprite);
      this._pool.push({
        sprite, mat,
        active: false,
        life: 0, maxLife: 1,
        vel: new THREE.Vector3(),
        gravity: 0,
        size0: 0.2, size1: 0.2,
        spin: 0, rot: 0,
        fade: 1
      });
    }
  }

  _get() {
    for (const p of this._pool) if (!p.active) return p;
    return null;
  }

  _spawn(opts) {
    const p = this._get();
    if (!p) return;
    p.active = true;
    p.life = 0;
    p.maxLife = opts.maxLife;
    p.vel.copy(opts.vel);
    p.gravity = opts.gravity || 0;
    p.size0 = opts.size0;
    p.size1 = opts.size1;
    p.spin = opts.spin || 0;
    p.rot = Math.random() * Math.PI;
    p.fade = opts.fade != null ? opts.fade : 1;
    p.mat.color.setHex(opts.color);
    p.mat.opacity = opts.opacity != null ? opts.opacity : 1;
    p.sprite.position.copy(opts.pos);
    p.sprite.scale.setScalar(opts.size0);
    p.sprite.visible = true;
  }

  flapPuff(pos) {
    for (let i = 0; i < 6; i++) {
      this._spawn({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.2, (Math.random() - 0.5) * 0.3)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, -1.2 - Math.random() * 0.8, (Math.random() - 0.5) * 1.6),
        gravity: 2.0,
        maxLife: 0.45,
        size0: 0.3 + Math.random() * 0.2,
        size1: 0.9,
        color: 0xffffff,
        opacity: 0.85,
        fade: 1
      });
    }
  }

  feathers(pos) {
    const colors = [0xffce4d, 0xffae2d, 0xf2a02a, 0xfff6df];
    for (let i = 0; i < 22; i++) {
      this._spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 5 + 1.5, (Math.random() - 0.5) * 5),
        gravity: -16,
        maxLife: 1.3,
        size0: 0.35 + Math.random() * 0.25,
        size1: 0.1,
        color: colors[(Math.random() * colors.length) | 0],
        opacity: 1,
        spin: (Math.random() - 0.5) * 10
      });
    }
  }

  sparkle(pos) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 1.6;
      this._spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r + 0.6, (Math.random() - 0.5) * r),
        gravity: 1.5,
        maxLife: 0.7,
        size0: 0.2 + Math.random() * 0.2,
        size1: 0.55,
        color: Math.random() < 0.5 ? 0xffe27a : 0x9be8ff,
        opacity: 1,
        fade: 1
      });
    }
  }

  dust(pos) {
    for (let i = 0; i < 12; i++) {
      this._spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2.5, (Math.random() - 0.5) * 3),
        gravity: -10,
        maxLife: 0.8,
        size0: 0.3,
        size1: 0.9,
        color: 0xcdb389,
        opacity: 0.8,
        fade: 1
      });
    }
  }

  burst(pos, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 3;
      this._spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * r),
        gravity: -8,
        maxLife: 0.6,
        size0: 0.3,
        size1: 0.7,
        color,
        opacity: 0.9
      });
    }
  }

  update(dt) {
    for (const p of this._pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.visible = false;
        p.mat.opacity = 0;
        continue;
      }
      const t = p.life / p.maxLife;
      p.vel.y += p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const size = THREE.MathUtils.lerp(p.size0, p.size1, t);
      p.sprite.scale.setScalar(size);
      p.rot += p.spin * dt;
      p.mat.opacity = (1 - t) * p.fade;
      p.mat.rotation = p.rot;
    }
  }
}
