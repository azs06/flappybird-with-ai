import * as THREE from "three";
import { Bird } from "./bird.js";
import { World, WORLD } from "./world.js";
import { ParticleSystem } from "./particles.js";
import { AudioBus } from "./audio.js";

const STORAGE_KEY = "aether-flap-best";

/** @typedef {'menu' | 'countdown' | 'playing' | 'gameover'} GameState */

class AetherFlap {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.els = {
      menu: document.getElementById("menu"),
      gameover: document.getElementById("gameover"),
      countdown: document.getElementById("countdown"),
      countdownNum: document.getElementById("countdown-num"),
      hud: document.getElementById("hud"),
      score: document.getElementById("score"),
      best: document.getElementById("best"),
      finalScore: document.getElementById("final-score"),
      finalBest: document.getElementById("final-best"),
      newRecord: document.getElementById("new-record"),
      flash: document.getElementById("flash"),
      startBtn: document.getElementById("start-btn"),
      retryBtn: document.getElementById("retry-btn"),
      menuBtn: document.getElementById("menu-btn"),
    };

    this.score = 0;
    this.best = Number(localStorage.getItem(STORAGE_KEY) || 0);
    this.state = /** @type {GameState} */ ("menu");
    this.clock = new THREE.Clock();
    this.audio = new AudioBus();
    this.cameraShake = 0;
    this.countdownTimer = 0;
    this.countdownStep = 3;
    this.pointerDown = false;
    this.deathLockUntil = 0;

    this.els.best.textContent = String(this.best);

    this._initThree();
    this._bindUI();
    this._bindInput();
    this._onResize();
    window.addEventListener("resize", () => this._onResize());

    this.clock.start();
    this._loop();
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc45c26, 0.018);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    this.camera.position.set(0, 0.6, 7.5);
    this.cameraBase = this.camera.position.clone();

    // Lights
    const amb = new THREE.AmbientLight(0xffc9a0, 0.55);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffe0b0, 1.35);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.sun = sun;

    const rim = new THREE.DirectionalLight(0x7ec8ff, 0.45);
    rim.position.set(-4, 2, -6);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0xff8a4c, 0.8, 20);
    fill.position.set(-2, 1, 3);
    this.scene.add(fill);

    this.world = new World(this.scene);
    this.bird = new Bird(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Soft ground shadow disc under bird
    const shadowGeo = new THREE.CircleGeometry(0.35, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.blobShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.blobShadow.rotation.x = -Math.PI / 2;
    this.blobShadow.position.y = WORLD.FLOOR + 0.02;
    this.scene.add(this.blobShadow);
  }

  _bindUI() {
    this.els.startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audio.resume();
      this.audio.ui();
      this.startCountdown();
    });
    this.els.retryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audio.resume();
      this.audio.ui();
      this.startCountdown();
    });
    this.els.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audio.ui();
      this.goMenu();
    });
  }

  _bindInput() {
    const flap = (e) => {
      if (e) {
        // Don't steal button clicks
        if (e.target?.closest?.("button")) return;
      }
      this.audio.resume();

      if (this.state === "menu") {
        this.audio.ui();
        this.startCountdown();
        return;
      }
      if (this.state === "gameover") {
        // Brief lock so impact + overlay can land before restart
        if (performance.now() < this.deathLockUntil) return;
        this.audio.ui();
        this.startCountdown();
        return;
      }
      if (this.state === "playing") {
        this.bird.flap();
        this.audio.flap();
      }
    };

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (e.repeat) return;
        flap(e);
      }
    });

    this.canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      flap(e);
    });

    // Also allow flapping from HUD area during play (not overlays)
    window.addEventListener("pointerdown", (e) => {
      if (this.state !== "playing") return;
      if (e.target?.closest?.("button")) return;
      if (e.target === this.canvas) return; // already handled
      // ignore if overlay visible
      if (!this.els.menu.classList.contains("hidden")) return;
      if (!this.els.gameover.classList.contains("hidden")) return;
      this.bird.flap();
      this.audio.flap();
    });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  goMenu() {
    this.state = "menu";
    this.score = 0;
    this.els.score.textContent = "0";
    this.els.menu.classList.remove("hidden");
    this.els.gameover.classList.add("hidden");
    this.els.countdown.classList.add("hidden");
    this.els.hud.classList.add("hidden");
    this.bird.reset();
    this.world.reset();
  }

  startCountdown() {
    this.state = "countdown";
    this.score = 0;
    this.els.score.textContent = "0";
    this.els.menu.classList.add("hidden");
    this.els.gameover.classList.add("hidden");
    this.els.countdown.classList.remove("hidden");
    this.els.hud.classList.remove("hidden");
    this.bird.reset();
    this.world.reset();
    this.countdownStep = 3;
    this.countdownTimer = 1;
    this.els.countdownNum.textContent = "3";
    this.els.countdownNum.style.animation = "none";
    void this.els.countdownNum.offsetWidth;
    this.els.countdownNum.style.animation = "";
    this.audio.tick();
  }

  beginPlay() {
    this.state = "playing";
    this.els.countdown.classList.add("hidden");
    this.bird.flap();
    this.audio.go();
  }

  gameOver() {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.bird.alive = false;
    this.deathLockUntil = performance.now() + 650;
    this.audio.crash();
    this.cameraShake = 0.55;

    this.particles.burst(this.bird.group.position, {
      count: 36,
      color: new THREE.Color(1, 0.45, 0.25),
      speed: 5,
      life: 0.9,
    });
    this.particles.burst(this.bird.group.position, {
      count: 18,
      color: new THREE.Color(1, 0.85, 0.4),
      speed: 3,
      life: 0.7,
    });

    this.els.flash.classList.remove("burst");
    void this.els.flash.offsetWidth;
    this.els.flash.classList.add("burst");

    const isRecord = this.score > this.best;
    if (isRecord) {
      this.best = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.best));
      this.els.best.textContent = String(this.best);
    }

    this.els.finalScore.textContent = String(this.score);
    this.els.finalBest.textContent = String(this.best);
    this.els.newRecord.classList.toggle("hidden", !isRecord);

    // slight delay so impact lands
    setTimeout(() => {
      if (this.state === "gameover") {
        this.els.gameover.classList.remove("hidden");
      }
    }, 480);
  }

  addScore(n) {
    if (n <= 0) return;
    this.score += n;
    this.els.score.textContent = String(this.score);
    this.audio.score();
    this.particles.burst(
      new THREE.Vector3(this.bird.group.position.x + 0.5, this.bird.group.position.y, 0),
      {
        count: 14,
        color: new THREE.Color(0.5, 0.85, 1),
        speed: 2.5,
        life: 0.55,
      }
    );
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    const playing = this.state === "playing";
    const countdown = this.state === "countdown";

    if (countdown) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownStep -= 1;
        if (this.countdownStep <= 0) {
          this.beginPlay();
        } else {
          this.countdownTimer = 1;
          this.els.countdownNum.textContent = String(this.countdownStep);
          this.els.countdownNum.style.animation = "none";
          void this.els.countdownNum.offsetWidth;
          this.els.countdownNum.style.animation = "";
          this.audio.tick();
        }
      }
    }

    this.bird.update(dt, {
      gravity: WORLD.GRAVITY,
      ceiling: WORLD.CEILING,
      floor: WORLD.FLOOR,
      playing,
    });

    this.world.update(dt, playing);
    this.particles.update(dt);

    if (playing && this.bird.alive) {
      const bounds = this.bird.getBounds();
      const { hit, scored } = this.world.checkBird(bounds, this.bird.group.position.x);
      if (scored) this.addScore(scored);
      if (hit || !this.bird.alive) this.gameOver();
    } else if (playing && !this.bird.alive) {
      this.gameOver();
    }

    // Blob shadow under bird
    this.blobShadow.position.x = this.bird.group.position.x;
    this.blobShadow.position.z = this.bird.group.position.z;
    const heightAbove = this.bird.group.position.y - WORLD.FLOOR;
    const s = THREE.MathUtils.clamp(1.2 - heightAbove * 0.12, 0.35, 1.2);
    this.blobShadow.scale.setScalar(s);
    this.blobShadow.material.opacity = THREE.MathUtils.clamp(0.35 - heightAbove * 0.04, 0.08, 0.32);

    // Camera follow + shake
    const targetY = THREE.MathUtils.clamp(this.bird.group.position.y * 0.15, -0.4, 0.5);
    this.cameraBase.y = THREE.MathUtils.lerp(this.cameraBase.y, 0.6 + targetY, 1 - Math.pow(0.02, dt));
    this.cameraBase.x = THREE.MathUtils.lerp(
      this.cameraBase.x,
      playing ? this.bird.group.position.x * 0.08 : 0,
      1 - Math.pow(0.05, dt)
    );

    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    const shake = this.cameraShake;
    this.camera.position.x = this.cameraBase.x + (Math.random() - 0.5) * shake * 0.4;
    this.camera.position.y = this.cameraBase.y + (Math.random() - 0.5) * shake * 0.35;
    this.camera.position.z = 7.5 + (Math.random() - 0.5) * shake * 0.15;
    this.camera.lookAt(this.bird.group.position.x * 0.3, this.bird.group.position.y * 0.2, 0);

    // Sun gentle drift
    this.sun.position.x = 6 + Math.sin(performance.now() * 0.0002) * 1.5;
  }
}

const game = new AetherFlap();
// Dev/debug hook for tests & console tinkering
window.__aetherFlap = game;
