import * as THREE from 'three';
import { Bird } from './bird.js';
import { PipeManager } from './pipe.js';
import { Environment } from './environment.js';
import { ParticleSystem } from './particles.js';
import { audio } from './audio.js';

// Game states
const STATE_MENU = 'menu';
const STATE_PLAYING = 'playing';
const STATE_GAMEOVER = 'gameover';

class Game {
  constructor() {
    this.state = STATE_MENU;
    this.score = 0;
    this.highscore = parseInt(localStorage.getItem('flappy3d_highscore') || '0', 10);
    
    // Config settings (loaded from localStorage or defaults)
    this.config = {
      cameraMode: localStorage.getItem('flappy3d_camera') || 'chase',
      quality: localStorage.getItem('flappy3d_quality') || 'medium',
      volume: parseFloat(localStorage.getItem('flappy3d_volume') || '0.5'),
      theme: localStorage.getItem('flappy3d_theme') || 'synthwave'
    };

    this.isMuted = this.config.volume === 0;

    // Core timing
    this.clock = new THREE.Clock();
    
    this.initDOM();
    this.initThree();
    this.initGameModules();
    this.initInput();
    
    // Hide loader and show main menu
    document.getElementById('loader').classList.add('hidden');
    this.setGameState(STATE_MENU);
    
    // Start main render loop
    this.animate();
  }

  // Cache DOM references and bind menu button actions
  initDOM() {
    this.dom = {
      container: document.getElementById('canvas-container'),
      mainMenu: document.getElementById('main-menu'),
      settingsMenu: document.getElementById('settings-menu'),
      gameOverMenu: document.getElementById('game-over-menu'),
      scoreText: document.getElementById('score'),
      finalScore: document.getElementById('final-score'),
      bestScore: document.getElementById('best-score'),
      newHighscore: document.getElementById('new-highscore-badge'),
      
      btnStart: document.getElementById('btn-start'),
      btnSettingsOpen: document.getElementById('btn-settings-open'),
      btnSettingsClose: document.getElementById('btn-settings-close'),
      btnRestart: document.getElementById('btn-restart'),
      btnMenu: document.getElementById('btn-menu'),
      
      hudAudio: document.getElementById('hud-audio-toggle'),
      camClassic: document.getElementById('cam-classic'),
      camChase: document.getElementById('cam-chase'),
      camFirstPerson: document.getElementById('cam-firstperson'),
      
      selectCamera: document.getElementById('select-camera'),
      selectQuality: document.getElementById('select-quality'),
      selectAudio: document.getElementById('select-audio'),
      selectTheme: document.getElementById('select-theme')
    };

    // Apply saved config values to settings UI
    this.dom.selectCamera.value = this.config.cameraMode;
    this.dom.selectQuality.value = this.config.quality;
    this.dom.selectAudio.value = this.config.volume.toString();
    this.dom.selectTheme.value = this.config.theme;
    this.updateAudioHUDButton();

    // Setup HUD camera active state
    this.updateCameraHUDButtons();

    // Button Event Listeners
    this.dom.btnStart.addEventListener('click', () => this.startGame());
    
    this.dom.btnSettingsOpen.addEventListener('click', () => {
      this.dom.mainMenu.classList.add('hidden');
      this.dom.settingsMenu.classList.remove('hidden');
      audio.init(); // initialize context on click
    });

    this.dom.btnSettingsClose.addEventListener('click', () => {
      this.saveConfig();
      this.dom.settingsMenu.classList.add('hidden');
      this.dom.mainMenu.classList.remove('hidden');
    });

    this.dom.btnRestart.addEventListener('click', () => this.startGame());
    
    this.dom.btnMenu.addEventListener('click', () => {
      this.dom.gameOverMenu.classList.add('hidden');
      this.dom.mainMenu.classList.remove('hidden');
      this.setGameState(STATE_MENU);
    });

    // Audio HUD Click
    this.dom.hudAudio.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });

    // HUD Camera Buttons Click
    this.dom.camClassic.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeCameraMode('classic');
    });
    this.dom.camChase.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeCameraMode('chase');
    });
    this.dom.camFirstPerson.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeCameraMode('firstperson');
    });
  }

  // Initialize Three.js scene, camera, and renderer
  initThree() {
    this.scene = new THREE.Scene();
    
    const width = this.dom.container.clientWidth;
    const height = this.dom.container.clientHeight;
    
    // Perspective Camera: Field of View, aspect ratio, clipping planes
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(2, 1, 7); // Default menu view position
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // limit to 2 for performance
    
    // Set colorspace mapping for realistic lighting
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.config.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.dom.container.appendChild(this.renderer.domElement);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // Instantiate standard game logic modules
  initGameModules() {
    this.environment = new Environment(this.scene, this.camera, this.config.quality);
    this.environment.setTheme(this.config.theme);

    this.bird = new Bird(this.scene);
    this.pipeManager = new PipeManager(this.scene);
    this.pipeManager.setTheme(this.config.theme);
    
    this.particles = new ParticleSystem(this.scene);

    // Initial audio configuration
    audio.setVolume(this.config.volume);
    audio.setMute(this.isMuted);
  }

  // Manage UI visibility and trigger game flow states
  setGameState(newState) {
    this.state = newState;

    if (newState === STATE_MENU) {
      this.dom.scoreText.classList.add('hidden');
      this.bird.reset();
      this.pipeManager.clear();
      this.particles.clear();
      audio.stopMusic();
    } 
    else if (newState === STATE_PLAYING) {
      this.dom.scoreText.classList.remove('hidden');
      this.dom.scoreText.innerText = '0';
      this.score = 0;
      
      this.bird.reset();
      this.pipeManager.clear();
      this.particles.clear();
      
      audio.startMusic();
    } 
    else if (newState === STATE_GAMEOVER) {
      audio.stopMusic();
      
      this.dom.finalScore.innerText = this.score;
      this.dom.bestScore.innerText = this.highscore;
      
      if (this.score > this.highscore) {
        this.highscore = this.score;
        localStorage.setItem('flappy3d_highscore', this.highscore.toString());
        this.dom.newHighscore.classList.remove('hidden');
        this.dom.bestScore.innerText = this.highscore;
      } else {
        this.dom.newHighscore.classList.add('hidden');
      }
      
      this.dom.gameOverMenu.classList.remove('hidden');
    }
  }

  startGame() {
    this.dom.mainMenu.classList.add('hidden');
    this.dom.gameOverMenu.classList.add('hidden');
    
    // Initialize procedural audio on user touch interaction
    audio.init(); 
    this.setGameState(STATE_PLAYING);
  }

  // Keyboard and click/touch input handling
  initInput() {
    // Jump trigger from space
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.triggerJump();
      }
    });

    // Jump trigger from clicking or tapping the canvas wrapper
    const handleJumpInput = (e) => {
      // Prevent jumping when clicking HUD controls or menus
      if (e.target.closest('button') || e.target.closest('select') || e.target.closest('.panel')) {
        return;
      }
      e.preventDefault();
      this.triggerJump();
    };

    this.dom.container.addEventListener('mousedown', handleJumpInput);
    this.dom.container.addEventListener('touchstart', handleJumpInput, { passive: false });
  }

  triggerJump() {
    if (this.state === STATE_PLAYING) {
      this.bird.flap();
      audio.playFlap();
      
      // Spawn tiny feather release particles
      this.particles.spawnFeathers(this.bird.group.position, 4);
    } 
    else if (this.state === STATE_MENU && this.dom.settingsMenu.classList.contains('hidden')) {
      // Allow starting game by tapping space/canvas in main menu
      this.startGame();
    }
  }

  // Adjust camera types
  changeCameraMode(mode) {
    this.config.cameraMode = mode;
    localStorage.setItem('flappy3d_camera', mode);
    this.dom.selectCamera.value = mode;
    this.updateCameraHUDButtons();
  }

  updateCameraHUDButtons() {
    this.dom.camClassic.classList.remove('active');
    this.dom.camChase.classList.remove('active');
    this.dom.camFirstPerson.classList.remove('active');

    if (this.config.cameraMode === 'classic') this.dom.camClassic.classList.add('active');
    if (this.config.cameraMode === 'chase') this.dom.camChase.classList.add('active');
    if (this.config.cameraMode === 'firstperson') this.dom.camFirstPerson.classList.add('active');
  }

  // Audio mute/unmute
  toggleMute() {
    this.isMuted = !this.isMuted;
    audio.setMute(this.isMuted);
    
    this.updateAudioHUDButton();
    
    // Save mute state to select setting
    const newVolume = this.isMuted ? 0 : 0.5;
    this.config.volume = newVolume;
    this.dom.selectAudio.value = newVolume.toString();
    localStorage.setItem('flappy3d_volume', newVolume.toString());
  }

  updateAudioHUDButton() {
    if (this.isMuted) {
      this.dom.hudAudio.innerText = '🔇';
      this.dom.hudAudio.classList.add('muted');
    } else {
      this.dom.hudAudio.innerText = '🔊';
      this.dom.hudAudio.classList.remove('muted');
    }
  }

  // Save configurations from Settings panel
  saveConfig() {
    const prevTheme = this.config.theme;
    
    this.config.cameraMode = this.dom.selectCamera.value;
    this.config.quality = this.dom.selectQuality.value;
    this.config.volume = parseFloat(this.dom.selectAudio.value);
    this.config.theme = this.dom.selectTheme.value;

    this.isMuted = this.config.volume === 0;

    localStorage.setItem('flappy3d_camera', this.config.cameraMode);
    localStorage.setItem('flappy3d_quality', this.config.quality);
    localStorage.setItem('flappy3d_volume', this.config.volume.toString());
    localStorage.setItem('flappy3d_theme', this.config.theme);

    // Apply updates
    audio.setVolume(this.config.volume);
    audio.setMute(this.isMuted);
    this.updateAudioHUDButton();
    this.updateCameraHUDButtons();

    this.renderer.shadowMap.enabled = this.config.quality === 'high';
    this.environment.setQuality(this.config.quality);
    
    if (prevTheme !== this.config.theme) {
      this.environment.setTheme(this.config.theme);
      this.pipeManager.setTheme(this.config.theme);
    }
  }

  // Score points
  incrementScore() {
    this.score++;
    this.dom.scoreText.innerText = this.score;
    audio.playScore();
    
    // Trigger score text scale bump animation
    this.dom.scoreText.classList.remove('score-bump');
    void this.dom.scoreText.offsetWidth; // Force DOM reflow
    this.dom.scoreText.classList.add('score-bump');
  }

  // Collision with obstacles
  handleCrash() {
    this.bird.die();
    audio.playCrash();
    
    // Spawn gorgeous voxel explosion colored by bird yellow (0xffdb14) and pipe neon (primary theme)
    const birdPos = this.bird.group.position.clone();
    const primaryThemeHex = parseInt(this.environment.themeColors.primary.replace('#', '0x'), 16);
    this.particles.spawnExplosion(birdPos, 0xffdb14, primaryThemeHex, 45);
    
    // Trigger screen shake (quick movement offset on camera)
    this.cameraShakeTimer = 0.4; // 0.4 seconds of shake
    
    this.setGameState(STATE_GAMEOVER);
  }

  // Main game loop (runs 60 times a second via requestAnimationFrame)
  animate() {
    requestAnimationFrame(() => this.animate());

    let deltaTime = this.clock.getDelta();
    // Cap deltaTime to prevent giant physics jumps on frame lag
    if (deltaTime > 0.1) deltaTime = 0.1;

    this.update(deltaTime);
    this.render();
  }

  update(deltaTime) {
    // 1. Update active particle physics
    this.particles.update(deltaTime);

    if (this.state === STATE_PLAYING) {
      // Update bird physics
      this.bird.update(deltaTime);

      if (!this.bird.isDead) {
        // Move background parallax elements and speed up slightly
        this.environment.update(deltaTime, this.pipeManager.speed);
        
        // Spawn/move pipes, check scoring pass-through gates
        this.pipeManager.update(
          deltaTime, 
          this.bird.group.position.x, 
          () => this.incrementScore(),
          this.particles
        );

        // Check if bird is out of bounds or hits a pipe column
        const birdBox = this.bird.getBoundingBox();
        const bottomCollision = this.bird.y <= -3.85;
        const obstacleCollision = this.pipeManager.checkCollision(birdBox);

        if (bottomCollision || obstacleCollision) {
          this.handleCrash();
        }
      }
    } 
    else if (this.state === STATE_MENU) {
      // Menu state: slow hover bobbing animation for the bird
      const elapsed = Date.now() * 0.0025;
      this.bird.y = Math.sin(elapsed) * 0.35;
      this.bird.vy = 0;
      this.bird.group.position.y = this.bird.y;
      this.bird.wingTimer += deltaTime * 5; // gentle flapping
      
      const wingAngle = Math.sin(this.bird.wingTimer) * 0.3;
      this.bird.leftWingJoint.rotation.x = wingAngle;
      this.bird.rightWingJoint.rotation.x = -wingAngle;
      
      // Keep background sliding gently
      this.environment.update(deltaTime, 2.0);
    } 
    else if (this.state === STATE_GAMEOVER) {
      // Bird falling down
      this.bird.update(deltaTime);
    }

    // 2. Camera controller following bird
    const birdVelocity = new THREE.Vector3(this.pipeManager.speed, this.bird.vy, 0);
    this.environment.updateCamera(this.config.cameraMode, this.bird.group.position, birdVelocity, deltaTime);

    // Apply camera shake if timer active
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer -= deltaTime;
      const shakeMagnitude = 0.15 * (this.cameraShakeTimer / 0.4); // fade out shake
      this.camera.position.x += (Math.random() - 0.5) * shakeMagnitude;
      this.camera.position.y += (Math.random() - 0.5) * shakeMagnitude;
      this.camera.position.z += (Math.random() - 0.5) * shakeMagnitude;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // Maintain responsiveness on resizing viewport
  onWindowResize() {
    const width = this.dom.container.clientWidth;
    const height = this.dom.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }
}

// Initialise the game object
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
