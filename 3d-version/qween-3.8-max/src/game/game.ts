import * as THREE from 'three';
import { CFG, scrollSpeedFor } from './config';
import { Bird } from './bird';
import { World } from './world';
import { Vfx } from './vfx';
import { Hud } from './hud';
import { SoundKit } from '../core/audio';
import { mulberry32 } from '../core/rng';

export type GameState = 'ready' | 'playing' | 'dying' | 'gameover';

export class Game {
  state: GameState = 'ready';
  score = 0;
  best = 0;
  frame = 0;
  autopilot = false;
  camDist = 12.2;

  readonly bird = new Bird();
  readonly world: World;
  readonly vfx = new Vfx();
  readonly sounds = new SoundKit();
  readonly camera: THREE.PerspectiveCamera;
  readonly scene = new THREE.Scene();

  private hud: Hud;
  private rng = mulberry32(0xc0ffee);
  private accumulator = 0;
  private elapsed = 0;
  private deathTimer = 0;
  private overAt = 0;
  private fovPunch = 0;
  private baseFov = 55;
  private camY = 0;
  private readyScroll = 0;
  private botCooldown = 0;

  constructor(camera: THREE.PerspectiveCamera, hud: Hud) {
    this.camera = camera;
    this.hud = hud;
    this.camera.position.set(-4.6, 1.4, 12.2);
    this.camera.lookAt(-0.4, 0.4, 0);
    this.baseFov = camera.fov;

    this.world = new World(this.rng);
    this.scene.add(this.world.group);
    this.scene.add(this.bird.group);
    this.scene.add(this.vfx.group);
    this.scene.fog = new THREE.Fog(0xdff3fb, 46, 120);

    const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x8fbf6a, 0.85);
    const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
    sun.position.set(-9, 14, 10);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.0006;
    this.scene.add(hemi, sun, sun.target);

    try {
      this.best = Number(localStorage.getItem('flappy3d.best') ?? 0) || 0;
    } catch {
      this.best = 0;
    }
    this.hud.showReady();
  }

  setSeed(seed: number): void {
    this.rng = mulberry32(seed);
    this.world.setSeed(seed);
  }

  flap(): void {
    if (this.state === 'ready') {
      this.startPlaying();
    }
    if (this.state !== 'playing') return;
    this.bird.vy = CFG.flapVelocity;
    this.bird.flap();
    this.vfx.flapBurst(CFG.birdX, this.bird.y);
    this.fovPunch = Math.min(this.fovPunch + 1.6, 2.6);
    this.sounds.flap();
  }

  private startPlaying(): void {
    this.state = 'playing';
    this.score = 0;
    this.hud.showPlaying();
    this.hud.setScore(0);
  }

  restart(): void {
    this.state = 'ready';
    this.score = 0;
    this.deathTimer = 0;
    this.bird.reset();
    this.world.reset();
    this.hud.showReady();
    this.sounds.swoosh();
  }

  forceDeath(): void {
    if (this.state !== 'playing') return;
    this.die('pipe');
  }

  private die(cause: 'pipe' | 'ground'): void {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.deathTimer = 0;
    this.bird.kill(this.rng() > 0.5 ? 1 : -1);
    this.vfx.addShake(cause === 'ground' ? 0.9 : 1);
    this.vfx.featherBurst(CFG.birdX, this.bird.y);
    this.hud.flashHit();
    this.sounds.hit();
    this.sounds.die();
    if (cause === 'ground') {
      this.landDeath();
    }
  }

  private landDeath(): void {
    this.bird.y = Math.max(this.bird.y, CFG.groundY + 0.42);
    this.state = 'gameover';
    this.overAt = this.elapsed;
    const isNew = this.score > this.best;
    if (isNew) {
      this.best = this.score;
      try {
        localStorage.setItem('flappy3d.best', String(this.best));
      } catch {
        this.best = this.score;
      }
    }
    this.hud.showGameOver(this.score, this.best, isNew);
    if (isNew && this.score > 0) this.sounds.medal();
  }

  update(dt: number): void {
    this.frame++;
    this.elapsed += dt;
    this.accumulator += Math.min(dt, 0.1);
    let steps = 0;
    while (this.accumulator >= CFG.fixedDt && steps < CFG.maxSubSteps) {
      this.step(CFG.fixedDt);
      this.accumulator -= CFG.fixedDt;
      steps++;
    }

    const speed =
      this.state === 'playing'
        ? scrollSpeedFor(this.score)
        : this.state === 'ready'
          ? 2.2
          : 0;
    this.world.update(dt, speed, this.state === 'playing', this.score);
    this.bird.update(dt, this.state);
    this.vfx.update(dt, scrollSpeedFor(this.score));
    this.updateCamera(dt);
  }

  private step(dt: number): void {
    if (this.state === 'ready') {
      this.readyScroll += dt;
      return;
    }

    if (this.state === 'playing') {
      if (this.autopilot) this.botStep(dt);
      this.bird.vy = Math.max(CFG.maxFallSpeed, this.bird.vy + CFG.gravity * dt);
      this.bird.y += this.bird.vy * dt;

      if (this.bird.y > CFG.ceilingY) {
        this.bird.y = CFG.ceilingY;
        this.bird.vy = Math.min(this.bird.vy, 0);
      }
      if (this.bird.y - CFG.birdRadius <= CFG.groundY) {
        this.die('ground');
        return;
      }

      const speed = scrollSpeedFor(this.score);
      for (const gate of this.world.pipes) {
        gate.x -= speed * dt;
        gate.group.position.x = gate.x;

        if (!gate.scored && gate.x < CFG.birdX - CFG.pipeRadius) {
          gate.scored = true;
          this.score++;
          gate.flashScore();
          this.vfx.scoreBurst(gate.x + 1.2, gate.gapCenter);
          this.sounds.score();
          this.hud.setScore(this.score);
        }

        const dx = Math.abs(gate.x - CFG.birdX);
        const within = dx < CFG.pipeRadius + CFG.birdRadius;
        if (within) {
          const gapBottom = gate.gapCenter - gate.gapSize / 2;
          const gapTop = gate.gapCenter + gate.gapSize / 2;
          if (this.bird.y - CFG.birdRadius < gapBottom || this.bird.y + CFG.birdRadius > gapTop) {
            this.die('pipe');
            return;
          }
        }
      }
      return;
    }

    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.bird.vy = Math.max(CFG.maxFallSpeed, this.bird.vy + CFG.gravity * dt);
      this.bird.y += this.bird.vy * dt;
      if (this.bird.y - CFG.birdRadius <= CFG.groundY) {
        this.landDeath();
      }
    }
  }

  private botStep(dt: number): void {
    this.botCooldown -= dt;
    const gate = this.world.nextGateAfter(CFG.birdX - CFG.pipeRadius - CFG.birdRadius);
    if (!gate) return;
    const flapH = (CFG.flapVelocity * CFG.flapVelocity) / (2 * Math.abs(CFG.gravity));
    const bottomSafe = gate.gapCenter - gate.gapSize / 2 + CFG.birdRadius + 0.15;
    const topSafe = gate.gapCenter + gate.gapSize / 2 - CFG.birdRadius - 0.15;
    const safeTop = topSafe - flapH;
    const next = this.world.nextGateAfter(gate.x);
    let target = gate.gapCenter;
    if (next) {
      const drop = THREE.MathUtils.clamp(next.gapCenter - gate.gapCenter, -1.6, 1.6);
      const w = gate.x < CFG.birdX ? 0.85 : 0.35;
      target = gate.gapCenter + drop * w;
    }
    target = THREE.MathUtils.clamp(target, bottomSafe, safeTop);
    if (this.bird.y < bottomSafe + 0.06 && this.botCooldown <= 0) {
      this.doBotFlap(0.12);
      return;
    }
    if (this.bird.y < target && this.bird.vy < 4 && this.bird.y <= safeTop && this.botCooldown <= 0) {
      this.doBotFlap(0.1);
    }
  }

  private doBotFlap(cooldown: number): void {
    this.bird.vy = CFG.flapVelocity;
    this.bird.flap();
    this.vfx.flapBurst(CFG.birdX, this.bird.y);
    this.botCooldown = cooldown;
  }

  private updateCamera(dt: number): void {
    const follow = THREE.MathUtils.clamp((this.bird.y - 0.6) * 0.3, -0.9, 1.7);
    this.camY = THREE.MathUtils.damp(this.camY, follow, 6, dt);
    const shakeAmt = this.vfx.shake * this.vfx.shake * 0.34;
    const sx = (Math.sin(this.elapsed * 61) + Math.sin(this.elapsed * 47.3)) * 0.5 * shakeAmt;
    const sy = (Math.sin(this.elapsed * 53.7) + Math.sin(this.elapsed * 71.1)) * 0.5 * shakeAmt;
    this.camera.position.set(-4.6 + sx, 1.4 + this.camY + sy, this.camDist);
    this.camera.lookAt(-0.4 + sx * 0.4, 0.4 + this.camY * 0.75 + sy * 0.4, 0);

    this.fovPunch = Math.max(0, this.fovPunch - dt * 7);
    const targetFov = this.baseFov + this.fovPunch + (this.state === 'dying' || this.state === 'gameover' ? 2.5 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }

    const shadow = this.world.blobShadow;
    shadow.position.x = CFG.birdX;
    const h = THREE.MathUtils.clamp((this.bird.y - CFG.groundY) / 9, 0, 1);
    shadow.scale.setScalar(1.15 - h * 0.55);
    (shadow.material as THREE.MeshBasicMaterial).opacity = 0.75 - h * 0.55;
  }

  canRestart(): boolean {
    return this.state === 'gameover' && this.elapsed - this.overAt > 0.45;
  }
}
