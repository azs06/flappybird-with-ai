import * as THREE from "three";
import { audio } from "../core/audio";
import { input } from "../core/input";
import { rng } from "../core/rng";
import { Bird } from "../entities/Bird";
import { ParticleSystem } from "../entities/Particles";
import { PipeManager } from "../entities/Pipes";
import { WorldDecor } from "../entities/WorldDecor";
import { MaterialKit } from "../systems/materials";
import { Hud } from "../ui/hud";
import { FEEL, STORAGE_KEY, WORLD } from "./constants";

export type GameMode = "title" | "ready" | "playing" | "dying" | "gameover";

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  private mats = new MaterialKit();
  private bird: Bird;
  private pipes: PipeManager;
  private world: WorldDecor;
  private particles: ParticleSystem;
  private hud: Hud;

  private mode: GameMode = "title";
  private score = 0;
  private best = 0;
  private clock = new THREE.Clock();
  private running = false;
  private hitStop = 0;
  private shake = 0;
  private deathTimer = 0;
  private readyTimer = 0;
  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private look = new THREE.Vector3();
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private rim!: THREE.DirectionalLight;

  /** Deterministic hooks for automated tests. */
  readonly test = {
    getMode: () => this.mode,
    getScore: () => this.score,
    getBest: () => this.best,
    flap: () => this.handleFlap(),
    start: () => this.beginFromTitle(),
    restart: () => this.retry(),
    getBirdY: () => this.bird.group.position.y,
    forceScore: (n: number) => {
      this.score = n;
      this.hud.setScore(n);
    },
  };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x1a2744);
    this.scene.fog = new THREE.Fog(0x1a2744, WORLD.fogNear, WORLD.fogFar);

    this.setupLights();
    this.setupCamera();

    this.bird = new Bird(this.mats);
    this.pipes = new PipeManager(this.mats, rng);
    this.world = new WorldDecor(this.mats, rng);
    this.particles = new ParticleSystem(this.mats);

    this.scene.add(this.world.root);
    this.scene.add(this.pipes.root);
    this.scene.add(this.bird.group);
    this.scene.add(this.particles.root);
    this.bird.attachTrail(this.scene);

    this.best = this.loadBest();
    this.hud = new Hud(
      () => this.beginFromTitle(),
      () => this.retry(),
    );
    this.hud.setBest(this.best);
    this.hud.showState("title");

    input.bind(canvas);
    input.on((intent) => {
      void audio.unlock();
      if (intent === "flap") this.handleFlap();
      if (intent === "restart") {
        if (this.mode === "gameover" || this.mode === "title") this.retry();
      }
      if (intent === "start") this.beginFromTitle();
    });

    window.addEventListener("resize", this.onResize);
    this.onResize();

    // Expose for Playwright / console QA
    (window as unknown as { __AETHER_FLAP__: Game["test"] }).__AETHER_FLAP__ = this.test;

    this.resetWorld(false);
    this.running = true;
    this.clock.start();
    this.loop();
  }

  private setupLights(): void {
    this.hemi = new THREE.HemisphereLight(0xb7d7ff, 0x3a2a18, 0.72);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
    this.sun.position.set(-8, 16, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 50;
    this.sun.shadow.camera.left = -16;
    this.sun.shadow.camera.right = 16;
    this.sun.shadow.camera.top = 12;
    this.sun.shadow.camera.bottom = -12;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);

    this.rim = new THREE.DirectionalLight(0x66d8ff, 0.55);
    this.rim.position.set(10, 4, -8);
    this.scene.add(this.rim);

    const fill = new THREE.PointLight(0xff9a5c, 0.45, 40, 2);
    fill.position.set(4, 2, 4);
    this.scene.add(fill);

    // Ground bounce disc light feel via ambient-ish secondary hemi already.
  }

  private setupCamera(): void {
    this.camPos.set(WORLD.camOffset.x, WORLD.camOffset.y, WORLD.camOffset.z);
    this.camera.position.copy(this.camPos);
    this.look.set(WORLD.camLookAt.x, WORLD.camLookAt.y, WORLD.camLookAt.z);
    this.camera.lookAt(this.look);
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    // Slightly wider FOV on tall mobile for vertical play space.
    this.camera.fov = h > w ? 58 : 50;
    this.camera.updateProjectionMatrix();
  };

  private loadBest(): number {
    try {
      return Math.max(0, Number(localStorage.getItem(STORAGE_KEY) || 0) || 0);
    } catch {
      return 0;
    }
  }

  private saveBest(n: number): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(n));
    } catch {
      /* ignore quota */
    }
  }

  private resetWorld(withPipes: boolean): void {
    rng.reseed(0xc0ffee ^ ((Date.now() & 0xffff) << 3));
    this.score = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.deathTimer = 0;
    this.bird.reset(0.5);
    this.world.reset();
    this.particles.clear();
    if (withPipes) this.pipes.reset(0);
    else {
      for (const p of this.pipes.pairs) {
        p.active = false;
        p.group.visible = false;
      }
    }
    this.hud.setScore(0);
  }

  private beginFromTitle(): void {
    if (this.mode !== "title" && this.mode !== "gameover") return;
    void audio.unlock();
    audio.ui();
    this.resetWorld(true);
    this.mode = "ready";
    this.readyTimer = 0.85;
    this.hud.showState("ready", { score: 0, best: this.best });
  }

  private retry(): void {
    void audio.unlock();
    audio.ui();
    this.resetWorld(true);
    this.mode = "ready";
    this.readyTimer = 0.55;
    this.hud.showState("ready", { score: 0, best: this.best });
  }

  private startPlaying(): void {
    this.mode = "playing";
    this.hud.showState("playing", { score: this.score, best: this.best });
    // Opening flap so player doesn't instantly drop.
    this.bird.reset(0.6);
    this.bird.flap();
    audio.flap();
    this.particles.flap(this.bird.group.position.x, this.bird.group.position.y);
  }

  private handleFlap(): void {
    if (this.mode === "title") {
      this.beginFromTitle();
      return;
    }
    if (this.mode === "gameover") {
      this.retry();
      return;
    }
    if (this.mode === "ready") {
      this.startPlaying();
      return;
    }
    if (this.mode === "playing") {
      this.bird.flap();
      audio.flap();
      this.particles.flap(this.bird.group.position.x, this.bird.group.position.y);
      this.shake = Math.min(0.2, this.shake + 0.04);
    }
  }

  private die(): void {
    if (this.mode !== "playing") return;
    this.mode = "dying";
    this.bird.alive = false;
    this.bird.velocityY = Math.min(this.bird.velocityY, 2);
    this.hitStop = FEEL.hitStopMs / 1000;
    this.shake = FEEL.shakeAmp;
    this.deathTimer = 0;
    audio.hit();
    this.particles.hit(this.bird.group.position.x, this.bird.group.position.y);
    this.hud.flashScreen();
  }

  private finishDeath(): void {
    this.mode = "gameover";
    const isNewBest = this.score > this.best;
    if (isNewBest) {
      this.best = this.score;
      this.saveBest(this.best);
    }
    this.hud.showState("gameover", {
      score: this.score,
      best: this.best,
      isNewBest,
    });
  }

  private updateCamera(dt: number): void {
    const birdY = this.bird.group.position.y;
    const targetY = WORLD.camOffset.y + birdY * 0.22;
    this.camTarget.set(WORLD.camOffset.x, targetY, WORLD.camOffset.z);
    this.camPos.lerp(this.camTarget, 1 - Math.exp(-4.5 * dt));

    // Screen shake
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - this.shake * FEEL.shakeDecay * dt);
    }

    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.look.set(
      WORLD.camLookAt.x,
      WORLD.camLookAt.y + birdY * 0.18 + sy * 0.3,
      WORLD.camLookAt.z,
    );
    this.camera.lookAt(this.look);
  }

  private updateGameplay(dt: number): void {
    const playing = this.mode === "playing";
    const idle = this.mode === "title" || this.mode === "ready";

    if (this.mode === "gameover") {
      // Freeze bird pose after crash settles.
    } else {
      this.bird.update(dt, { idle });
    }

    const speed = playing ? this.pipes.getSpeed() : this.mode === "dying" ? this.pipes.getSpeed() * 0.35 : 1.2;
    this.world.update(dt, speed, playing || this.mode === "dying");

    if (playing) {
      const gained = this.pipes.update(dt, WORLD.birdX, this.score);
      if (gained > 0) {
        this.score += gained;
        this.hud.setScore(this.score);
        audio.score();
        this.particles.score(this.bird.group.position.x + 0.5, this.bird.group.position.y);
        this.shake = Math.min(0.25, this.shake + 0.08);
      }

      const b = this.bird.getBounds();
      // Floor / ceiling
      if (b.y - b.r <= WORLD.floorY || b.y + b.r >= WORLD.ceilingY) {
        this.die();
      } else if (this.pipes.collides(b.x, b.y, b.r)) {
        this.die();
      }
    } else if (this.mode === "dying") {
      this.pipes.update(dt * 0.35, WORLD.birdX, this.score);
      this.deathTimer += dt;
      // End when bird hits floor or timer elapses
      if (this.bird.group.position.y < WORLD.floorY - 0.5 || this.deathTimer > 0.85) {
        this.finishDeath();
      }
    } else if (this.mode === "ready") {
      this.readyTimer -= dt;
      // Auto-start if they wait — still requires flap usually; keep ready until flap.
      this.pipes.update(0, WORLD.birdX, 0); // keep static
    }

    this.particles.update(dt);
  }

  private loop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    let dt = this.clock.getDelta();
    // Clamp huge tabs-in-background dt
    dt = Math.min(0.05, dt);

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      // Still render shake during hitstop
      this.updateCamera(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.updateGameplay(dt);
    this.updateCamera(dt);

    // Gentle sun sway
    const t = performance.now() * 0.00015;
    this.sun.position.x = -8 + Math.sin(t) * 2;
    this.rim.intensity = 0.45 + Math.sin(t * 3) * 0.08;

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.running = false;
    input.unbind();
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.mats.dispose();
  }
}
