import * as THREE from 'three';
import { GAME_STATES, CAMERA_MODES, THEMES, TRAILS, PHYSICS, POWERUPS } from './game/constants.js';
import { Bird } from './entities/Bird.js';
import { PipeManager } from './entities/PipeManager.js';
import { Environment } from './world/Environment.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { CameraSystem } from './game/CameraSystem.js';
import { CollisionSystem } from './game/CollisionSystem.js';
import { ScoreManager } from './game/ScoreManager.js';
import { SoundSynth } from './audio/SoundSynth.js';
import { UIManager } from './ui/UIManager.js';

class FlappyGame {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.state = GAME_STATES.MENU;

    // Active Powerups map
    this.activePowerups = {
      SHIELD: { timer: 0, duration: POWERUPS.SHIELD.duration, color: POWERUPS.SHIELD.color, icon: POWERUPS.SHIELD.icon, name: POWERUPS.SHIELD.name },
      SLOW_MO: { timer: 0, duration: POWERUPS.SLOW_MO.duration, color: POWERUPS.SLOW_MO.color, icon: POWERUPS.SLOW_MO.icon, name: POWERUPS.SLOW_MO.name },
      MAGNET: { timer: 0, duration: POWERUPS.MAGNET.duration, color: POWERUPS.MAGNET.color, icon: POWERUPS.MAGNET.icon, name: POWERUPS.MAGNET.name },
      MINI: { timer: 0, duration: POWERUPS.MINI.duration, color: POWERUPS.MINI.color, icon: POWERUPS.MINI.icon, name: POWERUPS.MINI.name }
    };

    this.currentThemeId = 'SUNSET';
    this.currentTrailId = 'sparkles';

    this.initThree();
    this.initSystems();
    this.initInputs();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  initSystems() {
    this.soundSynth = new SoundSynth();
    this.scoreManager = new ScoreManager();

    this.bird = new Bird(this.scene);
    this.pipeManager = new PipeManager(this.scene);
    this.environment = new Environment(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.cameraSystem = new CameraSystem(this.camera);
    this.collisionSystem = new CollisionSystem();

    this.uiManager = new UIManager(this);

    // Connect Score events to UI
    this.scoreManager.onScoreChanged = (s) => this.uiManager.updateScore(s);
    this.scoreManager.onComboChanged = (c) => this.uiManager.updateCombo(c);
    this.scoreManager.onCoinsChanged = (coins) => this.uiManager.updateCoins(coins);

    this.uiManager.updateCoins(this.scoreManager.coins);

    // Set initial Camera Mode to Cinematic in Menu
    this.cameraSystem.setMode(CAMERA_MODES.CINEMATIC);
  }

  initInputs() {
    const handleAction = () => {
      this.soundSynth.ensureContext();

      if (this.state === GAME_STATES.MENU) {
        this.setReady();
      } else if (this.state === GAME_STATES.READY) {
        this.startPlaying();
        this.flap();
      } else if (this.state === GAME_STATES.PLAYING) {
        this.flap();
      } else if (this.state === GAME_STATES.GAME_OVER) {
        this.setReady();
      }
    };

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleAction();
      } else if (e.code === 'KeyC') {
        const nextMode = this.cameraSystem.cycleMode();
        this.uiManager.updateCameraButtons(nextMode);
        this.soundSynth.playClick();
      } else if (e.code === 'Digit1') {
        this.cameraSystem.setMode(CAMERA_MODES.THIRD_PERSON);
        this.uiManager.updateCameraButtons(CAMERA_MODES.THIRD_PERSON);
      } else if (e.code === 'Digit2') {
        this.cameraSystem.setMode(CAMERA_MODES.SIDE_VIEW);
        this.uiManager.updateCameraButtons(CAMERA_MODES.SIDE_VIEW);
      } else if (e.code === 'Digit3') {
        this.cameraSystem.setMode(CAMERA_MODES.FIRST_PERSON);
        this.uiManager.updateCameraButtons(CAMERA_MODES.FIRST_PERSON);
      } else if (e.code === 'KeyT') {
        this.cycleTheme();
      } else if (e.code === 'KeyM') {
        this.toggleMute();
      } else if (e.code === 'KeyO') {
        this.uiManager.openSettings();
      }
    });

    // Screen Touch / Click
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handleAction();
    });
  }

  flap() {
    this.bird.flap();
    this.soundSynth.playFlap();
    this.particleSystem.emitFlapPuff(this.bird.position);
    this.cameraSystem.addTrauma(0.08);
  }

  setReady() {
    this.state = GAME_STATES.READY;
    this.bird.reset();
    this.pipeManager.reset();
    this.scoreManager.resetRun();
    this.particleSystem.clearTrail();
    this.resetPowerups();

    this.cameraSystem.setMode(CAMERA_MODES.THIRD_PERSON);
    this.uiManager.updateCameraButtons(CAMERA_MODES.THIRD_PERSON);
    this.uiManager.showReady();
    this.uiManager.updateScore(0);
    this.uiManager.updateCombo(1);

    this.soundSynth.startBGM(THEMES[this.currentThemeId].musicTheme);
  }

  startPlaying() {
    this.state = GAME_STATES.PLAYING;
    this.uiManager.showPlaying();
  }

  gameOver() {
    this.state = GAME_STATES.GAME_OVER;
    this.soundSynth.playHit();
    this.soundSynth.stopBGM();

    this.cameraSystem.addTrauma(0.7);
    this.particleSystem.emitCrashExplosion(this.bird.position, this.bird.currentSkin.bodyColor);

    const summary = this.scoreManager.getRunSummary();
    this.uiManager.showGameOver(summary);
  }

  setTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return;
    this.currentThemeId = themeKey;
    this.environment.setTheme(theme);
    this.pipeManager.setTheme(theme);
    this.particleSystem.setTheme(theme);
    this.soundSynth.setTheme(theme.musicTheme);
  }

  cycleTheme() {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(this.currentThemeId);
    const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
    this.setTheme(nextTheme);
    this.soundSynth.playClick();
  }

  setTrail(trailId) {
    this.currentTrailId = trailId;
  }

  toggleMute() {
    this.soundSynth.setMuted(!this.soundSynth.isMuted);
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.textContent = this.soundSynth.isMuted ? '🔇' : '🔊';
    }
  }

  applyPowerup(type) {
    const p = this.activePowerups[type];
    if (!p) return;

    p.timer = p.duration;
    this.soundSynth.playPowerup();

    if (type === 'SHIELD') {
      this.bird.setShield(true);
    } else if (type === 'MINI') {
      this.bird.setMini(true);
    }

    this.particleSystem.emitSparkles(this.bird.position, p.color, 24);
  }

  resetPowerups() {
    for (let k in this.activePowerups) {
      this.activePowerups[k].timer = 0;
    }
    this.bird.setShield(false);
    this.bird.setMini(false);
    this.uiManager.updatePowerups(this.activePowerups);
  }

  updatePowerups(delta) {
    let changed = false;
    for (let k in this.activePowerups) {
      const p = this.activePowerups[k];
      if (p.timer > 0) {
        p.timer -= delta;
        changed = true;
        if (p.timer <= 0) {
          p.timer = 0;
          if (k === 'SHIELD') this.bird.setShield(false);
          if (k === 'MINI') this.bird.setMini(false);
        }
      }
    }
    if (changed) {
      this.uiManager.updatePowerups(this.activePowerups);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    let rawDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    let delta = Math.min(rawDelta, 0.05);

    // Slow-mo powerup time warp
    if (this.activePowerups.SLOW_MO.timer > 0) {
      delta *= 0.5;
    }

    const isPlaying = this.state === GAME_STATES.PLAYING;
    const isGameOver = this.state === GAME_STATES.GAME_OVER;

    // 1. Bird Forward Speed Scaling with Score
    if (isPlaying) {
      const targetForwardSpeed = Math.min(
        PHYSICS.MAX_FORWARD_SPEED,
        PHYSICS.FORWARD_SPEED + this.scoreManager.score * PHYSICS.SPEED_INCREMENT_PER_SCORE
      );
      this.bird.velocity.z = targetForwardSpeed;
      this.scoreManager.distance = this.bird.position.z;
    }

    // 2. Entity Updates
    this.bird.update(delta, isPlaying);
    this.collisionSystem.update(delta);
    this.environment.update(delta, this.bird.position);
    this.pipeManager.update(delta, this.bird.position, this.activePowerups.MAGNET.timer > 0);

    // 3. Trail & Particles
    const trailDef = TRAILS.find(t => t.id === this.currentTrailId) || TRAILS[0];
    this.particleSystem.updateTrail(this.bird.position, trailDef.color);
    this.particleSystem.update(delta, this.bird.position);

    // 4. Powerups
    if (isPlaying) {
      this.updatePowerups(delta);
    }

    // 5. Game Logic & Collision Checks
    if (isPlaying) {
      // Pipe pass score check
      for (let pipe of this.pipeManager.getActivePipes()) {
        if (!pipe.passed && this.bird.position.z > pipe.z) {
          pipe.passed = true;
          this.scoreManager.addPipeScore();
          this.soundSynth.playScore(this.scoreManager.combo);
        }
      }

      // Collectibles check (Coins, Rings, Powerups)
      const collectibles = this.collisionSystem.checkCollectibles(this.bird, this.pipeManager);

      // Coins
      if (collectibles.coinsCollected.length > 0) {
        for (let coin of collectibles.coinsCollected) {
          this.scoreManager.addCoin(1);
          this.soundSynth.playCoin();
          this.particleSystem.emitSparkles(coin.mesh.position, 0xffd700, 14);
        }
      }

      // Golden Rings
      if (collectibles.ringsPassed.length > 0) {
        for (let ring of collectibles.ringsPassed) {
          this.scoreManager.addRingBonus();
          this.soundSynth.playRing();
          this.particleSystem.emitRingShockwave(ring.mesh.position);
          this.cameraSystem.addTrauma(0.15);
        }
      }

      // Powerups
      if (collectibles.powerupsCollected.length > 0) {
        for (let pup of collectibles.powerupsCollected) {
          this.applyPowerup(pup.type);
        }
      }

      // Obstacle & Bounds Collision
      const colResult = this.collisionSystem.checkCollisions(this.bird, this.pipeManager);

      if (colResult.nearMiss) {
        this.scoreManager.addNearMissBonus();
        this.soundSynth.playNearMiss();
        this.uiManager.showNearMiss();
        this.cameraSystem.addTrauma(0.2);
      }

      if (colResult.hit) {
        // Check if Shield can absorb
        if (this.activePowerups.SHIELD.timer > 0) {
          this.activePowerups.SHIELD.timer = 0;
          this.bird.setShield(false);
          this.soundSynth.playShieldBreak();
          this.collisionSystem.triggerInvulnerability(1.2);
          this.particleSystem.emitCrashExplosion(this.bird.position, 0x38bdf8);
          this.cameraSystem.addTrauma(0.4);
        } else {
          this.gameOver();
        }
      }
    }

    // 6. Camera Update
    this.cameraSystem.update(delta, this.bird, isGameOver);

    // 7. Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game Instance on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new FlappyGame();
});
