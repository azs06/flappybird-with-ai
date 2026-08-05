import * as THREE from 'three';
import { CFG } from './config.js';
import { getDifficulty } from './difficulty.js';
import { World } from './world.js';
import { Bird } from './bird.js';
import { PipeField } from './pipes.js';
import { ParticleSystem } from './particles.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { Hud } from './hud.js';

const STATE = { READY: 'ready', PLAYING: 'playing', DYING: 'dying', OVER: 'over', PAUSED: 'paused' };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

class Game {
  constructor() {
    const canvas = document.getElementById('gl');

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // ACES gives the saturated sky and emissive gems a filmic rolloff instead
    // of clipping to flat white.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.1, 1200);

    this.world = new World(this.scene, this.renderer);
    this.bird = new Bird(this.scene);
    this.pipes = new PipeField(this.scene);

    this.sparks = new ParticleSystem(this.scene, {
      capacity: 600,
      blending: THREE.AdditiveBlending,
      gravity: -6,
    });
    this.debris = new ParticleSystem(this.scene, {
      capacity: 400,
      blending: THREE.NormalBlending,
      gravity: -16,
    });

    this.sfx = new Sfx();
    this.hud = new Hud();
    this.hud.setMuted(this.sfx.muted);

    this.best = Number(localStorage.getItem('fb3d.best') || 0);
    this.hud.setBest(this.best);

    this._tmp = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.shake = 0;
    this.paletteValue = 0; // must agree with World's initial applyPalette()
    this.accumulator = 0;
    this.elapsed = 0;
    this.trailTimer = 0;
    this.restartLock = 0;
    this.frameSamples = [];

    this._bindEvents();
    this.resize();
    this.reset();
    this._placeCameraInstantly();

    this.lastTime = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  _bindEvents() {
    new Input(document.getElementById('app'), {
      onFlap: () => this.onFlap(),
      onPause: () => this.togglePause(),
      onMute: () => this.toggleMute(),
      onRestart: () => {
        if (this.state === STATE.OVER || this.state === STATE.PLAYING) this.reset();
      },
    });

    addEventListener('resize', () => this.resize());
    document.getElementById('mute').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });
    document.getElementById('restart').addEventListener('click', (e) => {
      e.stopPropagation();
      this.reset();
    });

    // A tab switch would otherwise return with a huge accumulated dt and warp
    // the bird straight into a pipe.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) this.togglePause();
    });
    addEventListener('blur', () => {
      if (this.state === STATE.PLAYING) this.togglePause();
    });

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      document.getElementById('fatal').classList.add('visible');
    });
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;

    // Pick the camera rig for this orientation. Everything downstream reads
    // `this.rig`, so there's exactly one place that knows about portrait mode.
    const C = CFG.camera;
    this.rig =
      this.camera.aspect < 1
        ? { offset: C.portrait.offset, lookAhead: C.portrait.lookAhead, fov: C.fov + C.portrait.fovBoost }
        : { offset: C.offset, lookAhead: C.lookAhead, fov: C.fov };

    this.camera.fov = this.rig.fov;
    this.camera.updateProjectionMatrix();
    this._syncParticleScale();
  }

  /** Particle point size depends on both FOV and framebuffer height. */
  _syncParticleScale() {
    const fbHeight = innerHeight * this.renderer.getPixelRatio();
    this.sparks.setProjection(this.camera.fov, fbHeight);
    this.debris.setProjection(this.camera.fov, fbHeight);
  }

  // ── State transitions ────────────────────────────────────────────────────

  reset() {
    this.state = STATE.READY;
    this.score = 0;
    this.pipesPassed = 0;
    this.gemsCollected = 0;
    this.deathTimer = 0;
    this.shake = 0;
    this.accumulator = 0;
    this.nextMilestone = 10;
    this.landed = false;

    this.bird.reset();
    this.pipes.reset();
    this.sparks.clear();
    this.debris.clear();

    this.hud.setScore(0);
    this.hud.show('ready');
  }

  start() {
    this.state = STATE.PLAYING;
    this.hud.show('playing');
  }

  onFlap() {
    this.sfx.unlock();

    if (this.state === STATE.PAUSED) {
      this.togglePause();
      return;
    }
    if (this.state === STATE.OVER) {
      // Short lockout so the panicked tap that killed you doesn't also skip
      // past the score screen.
      if (this.restartLock <= 0) this.reset();
      return;
    }
    if (this.state === STATE.DYING) return;
    if (this.state === STATE.READY) this.start();

    this.bird.flap();
    this.sfx.flap();

    // Downwash puff under each wing.
    const p = this.bird.position;
    this.sparks.emit({ x: p.x - 0.1, y: p.y - 0.45, z: p.z }, {
      count: 7,
      color: [0xffffff, 0xdff1ff, 0xffe9a8],
      speed: 2.6,
      spread: 0.5,
      life: 0.45,
      size: 0.26,
      jitter: 0.7,
      dir: { x: -3.5, y: -2.2, z: 0 },
      gravity: 0.15,
    });
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.hud.show('paused');
      this.sfx.wind(0);
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.hud.show('playing');
      this.lastTime = performance.now(); // discard the paused interval
    }
  }

  toggleMute() {
    this.sfx.unlock();
    this.sfx.setMuted(!this.sfx.muted);
    this.hud.setMuted(this.sfx.muted);
  }

  addScore(n) {
    this.score += n;
    this.hud.setScore(this.score);
    this.hud.pop();
    if (this.score >= this.nextMilestone) {
      this.nextMilestone += 10;
      this.sfx.milestone();
      this.hud.toast(`${this.score} POINTS`);
    }
  }

  die(cause) {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.DYING;
    this.bird.dead = true;
    this.bird.vy = Math.max(this.bird.vy, 4.5); // small pop before the fall
    this.deathTimer = 0;
    this.shake = 1;
    this.sfx.hit();
    this.sfx.die();
    this.sfx.wind(0);
    this.hud.flash('rgba(255,70,55,0.5)');

    const p = this.bird.position;
    this.debris.emit(p, {
      count: 26,
      color: [0xffd93b, 0xffc61f, 0xfff0b0, 0xff9d2e],
      speed: 7,
      spread: 0.5,
      life: 1.4,
      size: 0.3,
      jitter: 0.5,
      drag: 1.1,
    });
    this.sparks.emit(p, {
      count: 18,
      color: [0xffffff, 0xffd257],
      speed: 9,
      spread: 0.6,
      life: 0.5,
      size: 0.34,
      gravity: 0.2,
    });

    if (cause === 'ground') {
      this.landed = true;
      this.bird.grounded = true;
      this.impactGround();
    }
  }

  impactGround() {
    const p = this.bird.position;
    this.debris.emit({ x: p.x, y: CFG.world.groundY + 0.2, z: p.z }, {
      count: 30,
      color: [0x8f6b45, 0x6fbf5f, 0xc9b487],
      speed: 6.5,
      spread: 0.35,
      life: 1.0,
      size: 0.26,
      dir: { x: 1.5, y: 4, z: 0 },
      drag: 1.4,
    });
    this.sfx.splat();
    this.shake = Math.max(this.shake, 0.85);
  }

  gameOver() {
    this.state = STATE.OVER;
    this.restartLock = 0.5;
    const isBest = this.score > this.best;
    if (isBest) {
      this.best = this.score;
      localStorage.setItem('fb3d.best', String(this.best));
      this.hud.setBest(this.best);
    }
    this.hud.showGameOver({
      score: this.score,
      best: this.best,
      pipes: this.pipesPassed,
      gems: this.gemsCollected,
      isBest,
    });
  }

  // ── Simulation ───────────────────────────────────────────────────────────

  /** One fixed physics step. Only ever called with dt = CFG.physics.fixedStep. */
  fixedUpdate(dt) {
    const d = getDifficulty(this.score);
    this.bird.step(dt, d.speed);

    const p = this.bird.position;

    if (this.state === STATE.PLAYING) {
      const gained = this.pipes.tallyPassed(p.x);
      if (gained) {
        this.pipesPassed += gained;
        this.sfx.score();
        this.addScore(gained * CFG.scoring.pipe);
      }

      const gemPipe = this.pipes.collectGems(p, CFG.bird.radius);
      if (gemPipe) {
        this.gemsCollected++;
        this.sfx.gem();
        this.hud.flash('rgba(255,205,80,0.22)');
        this.sparks.emit({ x: gemPipe.x, y: gemPipe.gem.position.y, z: 0 }, {
          count: 26,
          color: [0xffd257, 0xfff3c0, 0xffffff],
          speed: 6,
          spread: 0.55,
          life: 0.7,
          size: 0.26,
          gravity: 0.1,
        });
        this.addScore(CFG.scoring.gem);
      }

      if (this.pipes.hits(p, CFG.bird.radius)) {
        this.die('pipe');
      } else if (p.y <= CFG.physics.deathY) {
        p.y = CFG.physics.deathY;
        this.die('ground');
      }
    } else if (this.state === STATE.DYING) {
      if (p.y <= CFG.physics.deathY) {
        p.y = CFG.physics.deathY;
        this.bird.vy = 0;
        if (!this.landed) {
          this.landed = true;
          this.bird.grounded = true;
          this.impactGround();
        }
      }
    }
  }

  /** Variable-rate visuals: camera, particles, scenery, audio mix. */
  variableUpdate(dt) {
    const p = this.bird.position;
    const d = getDifficulty(this.score);

    if (this.state === STATE.READY) {
      // Idle hover so the start screen isn't a static image.
      p.y = 1.2 + Math.sin(this.elapsed * 2.1) * 0.55;
      this.bird.vy = Math.cos(this.elapsed * 2.1) * 1.15;
      this.bird.flapEnergy = Math.max(this.bird.flapEnergy, 0.28);
    }

    this.bird.animate(dt, this.elapsed);
    this.world.update(dt, p.x);
    this.pipes.update(dt, this.elapsed, p.x, this.score);
    this.sparks.update(dt);
    this.debris.update(dt);

    if (this.state === STATE.PLAYING) {
      // Speed trail: short-lived sparks shed from the tail.
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.045;
        this.bird.tailPoint(this._tmp);
        this.sparks.emit(this._tmp, {
          count: 1,
          color: [0xfff3c0, 0xffd257, 0xffffff],
          speed: 0.8,
          spread: 0.25,
          life: 0.5,
          size: 0.15,
          jitter: 0.18,
          gravity: -0.05,
          drag: 2.2,
        });
      }
      const norm = (d.speed - 11.5) / 6.5;
      this.sfx.wind(0.35 + clamp(norm, 0, 1) * 0.65);
    }

    if (this.state === STATE.DYING) {
      this.deathTimer += dt;
      if (this.deathTimer > 1.15) this.gameOver();
    }

    if (this.restartLock > 0) this.restartLock -= dt;

    // Day/night: chase the target palette rather than snapping, so the sky
    // shifts continuously instead of stepping on every point scored.
    const targetPalette = this.world.paletteForScore(this.score);
    let delta = targetPalette - this.paletteValue;
    const n = 5;
    if (delta > n / 2) delta -= n; // shortest way around the cycle
    if (delta < -n / 2) delta += n;
    this.paletteValue = (this.paletteValue + delta * Math.min(1, dt * 1.2) + n) % n;
    this.world.applyPalette(this.paletteValue);

    this.updateCamera(dt, d);
  }

  updateCamera(dt, d) {
    const C = CFG.camera;
    const R = this.rig;
    const p = this.bird.position;

    // Exponential smoothing: framerate-independent, unlike a raw lerp factor.
    const k = 1 - Math.exp(-C.lag * dt);

    const targetY = clamp(p.y * C.heightFollow, -3.4, 6.2) + R.offset[1];
    this.camPos.x += (p.x + R.offset[0] - this.camPos.x) * k;
    this.camPos.y += (targetY - this.camPos.y) * k;
    this.camPos.z += (R.offset[2] - this.camPos.z) * k;

    const lookY = clamp(p.y, -6, 9) * 0.72;
    this.camLook.x += (p.x + R.lookAhead - this.camLook.x) * k;
    this.camLook.y += (lookY - this.camLook.y) * k;
    this.camLook.z += (0 - this.camLook.z) * k;

    this.camera.position.copy(this.camPos);

    if (this.shake > 0.001) {
      this.shake = Math.max(0, this.shake - dt * 1.9);
      const s = this.shake * this.shake * 1.15; // quadratic falloff feels punchier
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.camera.position.z += (Math.random() - 0.5) * s * 0.5;
    }

    this.camera.lookAt(this.camLook);

    // Speed pushes the FOV out slightly — cheap, effective sense of velocity.
    const want = R.fov + clamp((d.speed - 11.5) / 6.5, 0, 1) * 7;
    if (Math.abs(this.camera.fov - want) > 0.01) {
      this.camera.fov += (want - this.camera.fov) * Math.min(1, dt * 2.2);
      this.camera.updateProjectionMatrix();
      this._syncParticleScale(); // point size is FOV-dependent
    }
  }

  _placeCameraInstantly() {
    const p = this.bird.position;
    const R = this.rig;
    this.camPos.set(p.x + R.offset[0], R.offset[1], R.offset[2]);
    this.camLook.set(p.x + R.lookAhead, 0, 0);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  // ── Frame ────────────────────────────────────────────────────────────────

  frame() {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1; // a stall must not teleport the simulation
    this.elapsed += dt;

    if (this.state === STATE.PAUSED) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === STATE.PLAYING || this.state === STATE.DYING) {
      const step = CFG.physics.fixedStep;
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= step && steps < CFG.physics.maxStepsPerFrame) {
        this.fixedUpdate(step);
        this.accumulator -= step;
        steps++;
        if (this.state === STATE.OVER) break;
      }
      // If we hit the step cap we're running behind; drop the backlog rather
      // than spiralling further into debt.
      if (steps >= CFG.physics.maxStepsPerFrame) this.accumulator = 0;
    }

    this.variableUpdate(dt);
    this._adaptQuality(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * If we're consistently missing frame budget, shed resolution before we shed
   * gameplay responsiveness. Runs once, not continuously — no oscillation.
   */
  _adaptQuality(dt) {
    if (this.qualityLocked) return;
    this.frameSamples.push(dt);
    if (this.frameSamples.length < 90) return;
    const avg = this.frameSamples.reduce((a, b) => a + b, 0) / this.frameSamples.length;
    this.frameSamples.length = 0;
    if (avg > 0.026 && this.renderer.getPixelRatio() > 1) {
      this.renderer.setPixelRatio(1);
      this._syncParticleScale(); // framebuffer height just changed
    } else if (avg > 0.034) {
      this.renderer.shadowMap.enabled = false;
      this.qualityLocked = true;
    } else {
      this.qualityLocked = true;
    }
  }
}

try {
  // Exposed deliberately: lets you poke at difficulty, camera and state from
  // the devtools console without a rebuild. e.g. game.score = 40
  window.game = new Game();
} catch (err) {
  console.error(err);
  document.getElementById('fatal').classList.add('visible');
  document.getElementById('fatal-msg').textContent = String(err && err.message ? err.message : err);
}
