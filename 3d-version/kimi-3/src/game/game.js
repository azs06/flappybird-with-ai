import * as THREE from 'three';
import { CONFIG, difficulty } from './config.js';
import { checkWorldCollision } from '../systems/collision.js';

// ---------------------------------------------------------------------------
// Game — owns the state machine (menu → playing → dying → gameover → menu),
// score/difficulty, bird physics, world scroll, camera composition, and all
// the juice wiring (particles, shake, hitstop, slow-mo, audio, HUD events).
// ---------------------------------------------------------------------------

export const State = { MENU: 'menu', PLAYING: 'playing', DYING: 'dying', GAMEOVER: 'gameover', PAUSED: 'paused' };

export class Game {
  constructor({ engine, bird, pipes, env, sparks, feathers, effects, audio, ui, bot = false }) {
    this.engine = engine;
    this.bird = bird;
    this.pipes = pipes;
    this.env = env;
    this.sparks = sparks;
    this.feathers = feathers;
    this.effects = effects;
    this.audio = audio;
    this.ui = ui;
    this.bot = bot;

    this.state = State.MENU;
    this.prevState = null;
    this.score = 0;
    this.best = parseInt(localStorage.getItem(CONFIG.storageKeys.best) || '0', 10);
    this.newBest = false;
    this.birdY = CONFIG.bird.startY;
    this.birdVy = 0;
    this.speed = CONFIG.speed.start * CONFIG.speed.menuFactor;
    this.deathT = 0;
    this.groundHitDone = false;
    this._trailAcc = 0;
    this._camY = this.birdY;
    this._lookY = this.birdY;
    this._gameoverT = 0;

    this.pipes.reset(difficulty(0), { firstZ: -105 });
    this.ui.setBest(this.best);
    this.ui.showScreen('menu');
  }

  get diff() {
    return difficulty(this.score);
  }

  // ---------------------------------------------------------------- input

  press() {
    this.audio.init();
    switch (this.state) {
      case State.MENU:
        this._startRun();
        break;
      case State.PLAYING:
        this._flap();
        break;
      case State.GAMEOVER:
        // Small lockout so the killing tap doesn't instantly restart.
        if (this._gameoverT > 0.55) this._toMenu();
        break;
      case State.PAUSED:
        this.resume();
        break;
      default:
        break;
    }
  }

  _flap() {
    this.birdVy = CONFIG.bird.flapImpulse;
    this.bird.flap();
    this.audio.flap();
    const p = this.bird.group.position;
    this.sparks.spawn(p.x - 0.1, p.y - 0.5, p.z + 0.4, {
      count: 5, color: 0xfff0c0, color2: 0xffc93c, speed: 1.6, up: -1.2,
      life: 0.45, size: 1.0, gravity: -3,
    });
    if (Math.random() < 0.35) {
      this.feathers.burst(new THREE.Vector3(p.x, p.y - 0.2, p.z + 0.5), { count: 1, speed: 1.2, life: 1.1, scale: 0.8 });
    }
  }

  _startRun() {
    this.state = State.PLAYING;
    this.score = 0;
    this.newBest = false;
    this.birdY = CONFIG.bird.startY;
    this.birdVy = 0;
    this.bird.reset();
    this.pipes.reset(this.diff, { firstZ: -38 });
    this.ui.showScreen(null);
    this.ui.setScore(0);
    this._flap(); // the press that starts the run also flaps
  }

  _toMenu() {
    this.state = State.MENU;
    this.bird.reset();
    this.birdY = CONFIG.bird.startY;
    this.birdVy = 0;
    this.pipes.reset(this.diff, { firstZ: -105 });
    this.ui.setBest(this.best);
    this.ui.showScreen('menu');
  }

  _die(cause) {
    if (this.state !== State.PLAYING) return;
    this.state = State.DYING;
    this.deathT = 0;
    this.groundHitDone = false;
    this.bird.die();
    this.audio.hit();
    this.effects.hitstop(0.09);
    this.effects.slowmo(0.35, 0.9);
    this.effects.addTrauma(cause === 'pipe' ? 0.55 : 0.4);
    const p = this.bird.group.position;
    this.feathers.burst(p.clone(), { count: 14, speed: 6, life: 1.9, scale: 1.15 });
    this.sparks.spawn(p.x, p.y, p.z, { count: 26, color: 0xffd23f, color2: 0xff7f2a, speed: 6, up: 2, life: 0.9, size: 2.0 });
    if (cause === 'pipe') this.birdVy = Math.max(this.birdVy, 3.5); // bounce off
  }

  _gameOver() {
    this.state = State.GAMEOVER;
    this._gameoverT = 0;
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      localStorage.setItem(CONFIG.storageKeys.best, String(this.best));
    }
    const medal = this._medalFor(this.score);
    this.ui.showGameOver({
      score: this.score,
      best: this.best,
      newBest: this.newBest,
      medal,
      nextMedal: CONFIG.medals.find((m) => m.score > this.score) || null,
    });
  }

  _medalFor(score) {
    let earned = null;
    for (const m of CONFIG.medals) if (score >= m.score) earned = m;
    return earned;
  }

  pause() {
    if (this.state === State.PLAYING) {
      this.prevState = this.state;
      this.state = State.PAUSED;
      this.ui.showScreen('paused');
    }
  }

  resume() {
    if (this.state === State.PAUSED) {
      this.state = State.PLAYING;
      this.ui.showScreen(null);
    }
  }

  // Debug/QA hook: force a crash.
  debugKill() {
    this._die('pipe');
  }

  // ---------------------------------------------------------------- update

  update(realDt) {
    const timeScale = this.effects.update(realDt);
    const dt = realDt * timeScale;
    const st = this.state;

    if (st === State.PAUSED) {
      this._composeCamera(realDt, 0);
      return;
    }

    // Difficulty-driven speed (menus scroll at ambient rate).
    const targetSpeed = st === State.PLAYING || st === State.DYING
      ? this.diff.speed
      : CONFIG.speed.start * CONFIG.speed.menuFactor;
    this.speed += (targetSpeed - this.speed) * Math.min(1, realDt * 2);

    // World keeps scrolling in every state (even hitstop renders; dt=0 freezes motion).
    const scrollSpeed = st === State.DYING ? this.speed * 0.25 : this.speed;
    if (dt > 0) {
      this.env.update(dt, scrollSpeed);
      if (st !== State.DYING) this.pipes.update(dt, scrollSpeed, this.diff);
    }

    // Bird physics.
    if (st === State.PLAYING) {
      if (this.bot) this._botControl();
      this._integrateBird(dt, true);
      this._checkCollisions();
      this._checkPasses();
    } else if (st === State.DYING) {
      this.deathT += dt;
      this._integrateBird(dt, false);
      // Ground impact beat.
      if (!this.groundHitDone && this.birdY - CONFIG.bird.radius <= CONFIG.world.groundY + 0.05) {
        this.groundHitDone = true;
        this.audio.thud();
        this.effects.addTrauma(0.5);
        const p = this.bird.group.position;
        this.sparks.spawn(p.x, CONFIG.world.groundY + 0.4, p.z, {
          count: 22, color: 0xe8b077, color2: 0xc0784e, speed: 5, up: 3.5, life: 0.8, size: 2.2, gravity: -12,
        });
      }
      if (this.deathT > 1.25) this._gameOver();
    } else if (st === State.MENU) {
      // Idle hover around the start height.
      this.birdY = CONFIG.bird.startY + Math.sin(performance.now() * 0.0016) * 0.35;
      this.bird.group.position.set(CONFIG.bird.x, this.birdY, CONFIG.bird.z);
      this.bird.update(realDt, 0, { idle: true, scrollSpeed: this.speed });
    } else if (st === State.GAMEOVER) {
      this._gameoverT += realDt;
    }

    // Trail sparkles while flying.
    if ((st === State.PLAYING || st === State.MENU) && dt > 0) {
      this._trailAcc += dt;
      const rate = st === State.PLAYING ? 0.045 : 0.12;
      while (this._trailAcc > rate) {
        this._trailAcc -= rate;
        const p = this.bird.group.position;
        this.sparks.spawn(p.x + (Math.random() - 0.5) * 0.3, p.y - 0.1 + (Math.random() - 0.5) * 0.3, p.z + 0.8, {
          count: 1, color: 0xffe9a8, color2: 0xffc93c, speed: 0.3, up: -0.4,
          life: 0.55, size: 0.9, gravity: -1,
        });
      }
    }

    this.sparks.update(dt);
    this.feathers.update(dt);
    this._composeCamera(realDt, timeScale);

    // FOV kick follows speed.
    this.effects.fovKick = THREE.MathUtils.clamp(
      (this.speed - CONFIG.speed.start) / (CONFIG.speed.max - CONFIG.speed.start), 0, 1
    ) * CONFIG.camera.fovKickMax;
  }

  _integrateBird(dt, alive) {
    this.birdVy = Math.max(CONFIG.bird.maxFallSpeed, this.birdVy + CONFIG.bird.gravity * dt);
    this.birdY += this.birdVy * dt;
    if (alive) {
      const top = CONFIG.world.ceilingY - CONFIG.bird.radius;
      if (this.birdY > top) {
        this.birdY = top;
        if (this.birdVy > 0) this.birdVy = 0;
      }
    }
    const floor = CONFIG.world.groundY + CONFIG.bird.radius;
    if (this.birdY < floor) {
      this.birdY = floor;
      this.birdVy = 0;
    }
    this.bird.group.position.set(CONFIG.bird.x, this.birdY, CONFIG.bird.z);
    this.bird.update(dt, this.birdVy, { idle: false, scrollSpeed: this.speed });
  }

  _checkCollisions() {
    const pipeHit = this.pipes.checkCollision(this.birdY, CONFIG.bird.radius);
    if (pipeHit) {
      this._die('pipe');
      return;
    }
    if (checkWorldCollision(this.birdY, CONFIG.bird.radius)) {
      this._die('ground');
    }
  }

  _checkPasses() {
    const cleared = this.pipes.collectPasses();
    for (const gate of cleared) {
      this.score += 1;
      this.ui.setScore(this.score);
      this.audio.score();
      // Gap-center burst + a few celebratory feathers on milestones.
      this.sparks.spawn(CONFIG.bird.x, gate.gapY, CONFIG.bird.z - 1.2, {
        count: 18, color: 0x5fffc8, color2: 0xffd23f, speed: 3.2, up: 0.8,
        life: 0.8, size: 1.6, gravity: -2,
      });
      // Near-miss detection: tight clearance on either lip.
      const clearance = Math.min(
        Math.abs(this.birdY + CONFIG.bird.radius - (gate.gapY + gate.gap / 2)),
        Math.abs(this.birdY - CONFIG.bird.radius - (gate.gapY - gate.gap / 2))
      );
      if (clearance < 0.55) {
        this.effects.addTrauma(0.16);
        this.audio.nearMiss();
      }
      if (this.score % 10 === 0) {
        this.audio.milestone();
        this.effects.fovPunch(0.3);
        this.ui.flashMilestone(this.score);
      }
    }
  }

  _composeCamera(realDt, _timeScale) {
    const cam = this.engine.camera;
    const { offset, look, followY, lag } = CONFIG.camera;

    // Smooth follow of bird height (separate look smoothing for stability).
    const k = Math.min(1, realDt * lag);
    this._camY += (this.birdY * followY - this._camY) * k;
    this._lookY += (this.birdY - this._lookY) * Math.min(1, realDt * (lag * 1.35));

    const shake = this.effects.shakeOffset;
    cam.position.set(
      offset.x + shake.x,
      this._camY + offset.y + shake.y,
      CONFIG.bird.z + offset.z
    );
    cam.lookAt(look.x + shake.x * 0.5, this._lookY * 0.6 + look.y + shake.y * 0.5, CONFIG.bird.z + look.z);
    cam.rotation.z += this.effects.shakeRot;

    // Menu: slow cinematic drift for life.
    if (this.state === State.MENU || this.state === State.GAMEOVER) {
      const t = performance.now() * 0.00022;
      cam.position.x += Math.sin(t) * 0.5;
      cam.position.y += Math.sin(t * 1.7) * 0.25;
    }
  }

  _botControl() {
    // QA autopilot: bang-bang altitude hold around the next gate center.
    // Flap only when below target and not already rising fast — the ~1.7u
    // apex overshoot stays well inside even the smallest gap.
    const gate = this.pipes.nextGate();
    if (!gate) return;
    // Aim a touch below center: flap apex overshoot (~1.7u) then stays inside
    // even the tightest late-game gap.
    const target = gate.gapY - 0.35;
    if (this.birdVy < 1 && this.birdY < target - 0.1) {
      this._flap();
    }
  }

  // QA/diagnostics snapshot for the visual harness.
  getDebugInfo() {
    return {
      state: this.state,
      score: this.score,
      best: this.best,
      speed: Number(this.speed.toFixed(2)),
      birdY: Number(this.birdY.toFixed(2)),
      renderer: this.engine.diagnostics(),
    };
  }
}
