import {
  ACESFilmicToneMapping,
  MathUtils,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { CFG, PALETTES, PALETTE_EVERY, clamp, lerp } from './config.js';
import { World } from './world.js';
import { Bird } from './bird.js';
import { PipeField } from './pipes.js';
import { Particles } from './particles.js';
import { SoundKit } from './audio.js';
import { UI } from './ui.js';

export const STATE = {
  READY: 'ready',
  PLAYING: 'playing',
  DYING: 'dying',
  OVER: 'over',
};

const FIXED_DT = 1 / 120;
const MAX_SUBSTEPS = 8;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(CFG.camera.fov, 1, 0.5, 600);

    this.world = new World(this.scene);
    this.pipes = new PipeField(this.scene);
    this.bird = new Bird();
    this.scene.add(this.bird.group);
    this.particles = new Particles(this.scene);
    this.sound = new SoundKit();
    this.ui = new UI();

    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.elapsed = 0;

    this.state = STATE.READY;
    this.score = 0;
    this.best = this.#loadBest();
    this.muted = this.#loadMuted();
    this.paused = false;
    this.shake = 0;
    this.camY = CFG.bird.startY * 0.55;
    this.overSince = 0;

    this.sound.setMuted(this.muted);
    this.ui.setMuted(this.muted);
    this.ui.setScore(0);
    this.ui.showTitle();

    this.resize();
    this.#bindUI();
  }

  // --- Persistence ---------------------------------------------------------

  #loadBest() {
    try {
      return Number.parseInt(localStorage.getItem(CFG.storageKey) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  #saveBest() {
    try {
      localStorage.setItem(CFG.storageKey, String(this.best));
    } catch {
      /* private browsing — scores just won't persist */
    }
  }

  #loadMuted() {
    try {
      return localStorage.getItem(`${CFG.storageKey}.muted`) === '1';
    } catch {
      return false;
    }
  }

  #bindUI() {
    const { startBtn, retryBtn, resumeBtn, muteBtn, pauseBtn } = this.ui.el;
    startBtn.addEventListener('click', () => this.beginRun());
    retryBtn.addEventListener('click', () => this.restart());
    resumeBtn.addEventListener('click', () => this.setPaused(false));
    muteBtn.addEventListener('click', () => this.toggleMute());
    pauseBtn.addEventListener('click', () => this.setPaused(!this.paused));
  }

  // --- Layout --------------------------------------------------------------

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);

    const halfFov = MathUtils.degToRad(CFG.camera.fov) / 2;
    // Pull back on narrow screens to keep some track visible ahead, but never
    // so far that the bird turns into a speck.
    const needed = CFG.camera.minVisibleWidth / 2 / (Math.tan(halfFov) * aspect);
    const dist = clamp(needed, CFG.camera.baseDistance, CFG.camera.maxDistance);

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.camDist = dist;

    const halfWidth = Math.tan(halfFov) * dist * aspect;
    // Offset the bird toward the left edge so the player sees what's coming.
    this.camX = CFG.bird.x + Math.min(CFG.camera.lookAheadX, halfWidth * 0.5);
    this.pipes.setBounds(this.camX, halfWidth);
  }

  // --- State transitions ---------------------------------------------------

  beginRun() {
    if (this.state !== STATE.READY) return;
    this.sound.resume();
    this.state = STATE.PLAYING;
    this.ui.showPlaying();
    this.flap();
  }

  restart() {
    this.score = 0;
    this.ui.setScore(0);
    this.bird.reset();
    this.pipes.reset();
    this.particles.clear();
    this.world.reset();
    this.camY = CFG.bird.startY * 0.55;
    this.shake = 0;
    this.state = STATE.READY;
    this.ui.showReady();
    this.sound.swoosh();
  }

  /** Single entry point for every input source. */
  input() {
    if (this.paused) {
      this.setPaused(false);
      return;
    }
    switch (this.state) {
      case STATE.READY:
        this.beginRun();
        break;
      case STATE.PLAYING:
        this.flap();
        break;
      case STATE.OVER:
        // Small delay stops the fatal tap from instantly restarting.
        if (this.elapsed - this.overSince > 0.6) this.restart();
        break;
      default:
        break;
    }
  }

  flap() {
    this.bird.flap();
    this.sound.flap();
    this.particles.puff(this.bird.group.position.x, this.bird.group.position.y);
  }

  die(cause) {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.DYING;
    this.bird.alive = false;
    this.shake = 1;
    this.ui.flash();
    this.sound.hit();
    this.sound.die();
    this.particles.burst(this.bird.group.position.x, this.bird.group.position.y, 14);

    if (cause === 'ground') this.#land();
  }

  #land() {
    if (this.state === STATE.OVER) return;
    this.state = STATE.OVER;
    this.overSince = this.elapsed;
    this.sound.thud();
    this.shake = Math.max(this.shake, 0.55);

    const isNewBest = this.score > this.best;
    if (isNewBest) {
      this.best = this.score;
      this.#saveBest();
    }
    this.ui.showGameOver({ score: this.score, best: this.best, isNewBest });
  }

  setPaused(paused) {
    if (this.state !== STATE.PLAYING && paused) return;
    this.paused = paused;
    this.ui.showPaused(paused);
    // Drop the accumulated time so resuming doesn't fast-forward physics.
    if (!paused) {
      this.lastTime = performance.now() / 1000;
      this.accumulator = 0;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.resume();
    this.sound.setMuted(this.muted);
    this.ui.setMuted(this.muted);
    try {
      localStorage.setItem(`${CFG.storageKey}.muted`, this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  // --- Simulation ----------------------------------------------------------

  get speed() {
    if (this.state === STATE.DYING || this.state === STATE.OVER) return 0;
    return Math.min(CFG.maxSpeed, CFG.baseSpeed + this.score * CFG.speedPerPoint);
  }

  step(dt) {
    this.elapsed += dt;
    const speed = this.speed;
    const scrolling = this.state === STATE.READY || this.state === STATE.PLAYING;

    this.world.update(dt, scrolling ? speed : 0);
    this.particles.update(dt, scrolling ? speed : 0);

    if (this.state === STATE.READY) {
      this.bird.updateIdle(dt, this.elapsed);
    } else if (this.state === STATE.PLAYING) {
      this.bird.updatePlaying(dt);
      const { scored, hit } = this.pipes.update(dt, speed, this.score, this.bird.y, true);
      if (scored > 0) {
        this.score += scored;
        this.ui.setScore(this.score);
        this.sound.score(this.score);
        this.world.setPalette(Math.floor(this.score / PALETTE_EVERY) % PALETTES.length);
      }
      if (hit) {
        this.die('pipe');
      } else if (this.bird.y - CFG.bird.radius * 0.75 <= CFG.groundY) {
        this.die('ground');
      }
    } else if (this.state === STATE.DYING) {
      if (this.bird.updateDying(dt)) this.#land();
    }

    this.shake = Math.max(0, this.shake - dt * 2.6);
  }

  #updateCamera(dt) {
    const targetY = clamp(this.bird.y * 0.5, -1.5, 2.4);
    this.camY = lerp(this.camY, targetY, Math.min(1, CFG.camera.followFactor * dt * 60));

    const s = this.shake * this.shake;
    const jitterX = (Math.random() - 0.5) * s * 0.9;
    const jitterY = (Math.random() - 0.5) * s * 0.9;

    this.camera.position.set(this.camX + jitterX, this.camY + jitterY, this.camDist);
    this.camera.lookAt(this.camX + 0.9, this.camY * 0.82 + jitterY * 0.4, 0);
  }

  frame() {
    const now = performance.now() / 1000;
    let dt = now - this.lastTime;
    this.lastTime = now;

    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // Clamp so a backgrounded tab can't teleport the bird through a pipe.
    dt = Math.min(Math.max(dt, 0), 0.1);
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;

    this.#updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
