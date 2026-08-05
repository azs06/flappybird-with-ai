import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { MaterialKit } from '../assets/materials';
import { AudioBus } from '../audio/synth';
import { Input } from '../core/input';
import { SeededRNG } from '../core/rng';
import { ScreenShake } from '../core/shake';
import { loadBest, loadMute, saveBest, saveMute } from '../core/storage';
import { Bird } from '../entities/bird';
import { PillarPool } from '../entities/pillar';
import { World } from '../entities/world';
import { ParticleSystem } from '../systems/particles';
import { HUD, type ScreenId } from '../ui/hud';
import { CONFIG } from './config';

export type GameState = 'title' | 'playing' | 'paused' | 'dying' | 'gameover';

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  private readonly mats = new MaterialKit();
  private readonly rng = new SeededRNG(0xf1a99f);
  private readonly input = new Input();
  private readonly shake = new ScreenShake();
  private readonly audio = new AudioBus();
  private readonly hud = new HUD();

  private readonly bird: Bird;
  private readonly pillars: PillarPool;
  private readonly world: World;
  private readonly particles: ParticleSystem;

  private readonly clock = new THREE.Clock();
  private readonly camPos = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  private state: GameState = 'title';
  private score = 0;
  private best = 0;
  private hitstop = 0;
  private dieTimer = 0;
  private nextPillarZ: number = CONFIG.firstPillarZ;
  private lastGapY = 1.2;
  private running = false;
  private raf = 0;
  private titleBob = 0;
  /** Classic Flappy: no gravity / scroll until the first flap. */
  private awaitingFirstFlap = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.best = loadBest();
    this.audio.setMuted(loadMute());
    this.hud.setBest(this.best);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 250);
    this.camPos.set(CONFIG.camOffset.x, CONFIG.camOffset.y + 1.2, CONFIG.camOffset.z);
    this.camera.position.copy(this.camPos);

    // Lighting
    const hemi = new THREE.HemisphereLight(0x6ab0ff, 0x1a1028, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffe0c0, 1.35);
    key.position.set(6, 12, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0008;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x5cf0ff, 0.55);
    rim.position.set(-8, 4, -6);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0xff4fd8, 0.6, 40, 2);
    fill.position.set(-3, 2, 2);
    this.scene.add(fill);

    this.scene.fog = new THREE.FogExp2(0x0a1020, 0.018);

    // Post
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45,
      0.6,
      0.82,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Entities
    this.world = new World(this.mats, this.rng);
    this.scene.add(this.world.root);

    this.pillars = new PillarPool(this.mats, 10);
    this.scene.add(this.pillars.root);

    this.bird = new Bird(this.mats);
    this.scene.add(this.bird.group);
    this.bird.attachTrails(this.scene);

    this.particles = new ParticleSystem(80);
    this.scene.add(this.particles.root);

    // Soft ground plane shadow catcher glow
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffc94a,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = CONFIG.floorY + 0.02;
    disc.name = 'bird-glow';
    this.scene.add(disc);

    this.resize();
    window.addEventListener('resize', this.onResize);

    const touch = document.getElementById('touch-flap')!;
    this.input.bind(canvas, touch);

    this.hud.bindButtons({
      onStart: () => void this.startGame(),
      onResume: () => this.resume(),
      onQuit: () => this.toTitle(),
      onRetry: () => void this.startGame(),
      onMenu: () => this.toTitle(),
    });

    this.setState('title');
    this.prepTitleScene();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = (): void => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private readonly onResize = (): void => this.resize();

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);

    // Mobile: slightly tighter FOV feel via offset
    if (w < 600) {
      this.camera.fov = 58;
    } else {
      this.camera.fov = 52;
    }
    this.camera.updateProjectionMatrix();
  }

  private async startGame(): Promise<void> {
    await this.audio.unlock();
    this.rng.reset((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    this.score = 0;
    this.hud.setScore(0);
    this.hud.showCombo(null);
    this.shake.reset();
    this.hitstop = 0;
    this.dieTimer = 0;
    this.nextPillarZ = CONFIG.firstPillarZ;
    this.lastGapY = 1.2;

    for (const p of this.pillars.activePairs()) this.pillars.release(p);

    this.bird.reset();
    this.awaitingFirstFlap = true;
    // Seed initial pillars
    for (let i = 0; i < 5; i++) this.spawnPillar();

    this.setState('playing');
    this.audio.whoosh();
    this.hud.showToast('Flap to launch', 1600);
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.setState('playing');
  }

  private pause(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
  }

  private toTitle(): void {
    for (const p of this.pillars.activePairs()) this.pillars.release(p);
    this.bird.reset();
    this.shake.reset();
    this.prepTitleScene();
    this.setState('title');
  }

  private prepTitleScene(): void {
    this.bird.group.position.set(0, 1.4, 0);
    this.bird.velocity.set(0, 0, 0);
    // Decorative pillars for title
    if (this.pillars.activePairs().length === 0) {
      this.rng.reset(0x7111e01);
      this.nextPillarZ = -12;
      this.lastGapY = 1.5;
      for (let i = 0; i < 4; i++) this.spawnPillar();
    }
  }

  private setState(s: GameState): void {
    this.state = s;
    const screen: ScreenId =
      s === 'title'
        ? 'title'
        : s === 'paused'
          ? 'paused'
          : s === 'gameover' || s === 'dying'
            ? s === 'gameover'
              ? 'gameover'
              : 'playing'
            : 'playing';
    if (s === 'dying') {
      this.hud.setScreen('playing');
    } else {
      this.hud.setScreen(screen);
    }
  }

  private spawnPillar(): void {
    const gap = Math.max(
      CONFIG.minGap,
      CONFIG.baseGap - this.score * CONFIG.gapShrinkPerScore,
    );
    const wander = CONFIG.gapYWander * (0.6 + Math.min(1, this.score / 15));
    let gapY = this.lastGapY + this.rng.range(-wander, wander);
    gapY = THREE.MathUtils.clamp(gapY, CONFIG.gapYMin, CONFIG.gapYMax);
    // Keep playable margin from floor/ceiling
    const half = gap / 2;
    gapY = THREE.MathUtils.clamp(gapY, CONFIG.floorY + half + 0.6, CONFIG.ceilingY - half - 0.5);
    this.lastGapY = gapY;

    this.pillars.spawn(this.nextPillarZ, gapY, gap);
    this.nextPillarZ -= CONFIG.pillarSpacing;
  }

  private scrollSpeed(): number {
    return Math.min(
      CONFIG.maxScrollSpeed,
      CONFIG.baseScrollSpeed + this.score * CONFIG.speedRampPerScore,
    );
  }

  private frame(): void {
    let dt = Math.min(this.clock.getDelta(), 0.05);
    const intent = this.input.consume();

    if (intent.mutePressed) {
      const m = !this.audio.isMuted();
      this.audio.setMuted(m);
      saveMute(m);
      this.hud.showToast(m ? 'Muted' : 'Sound on');
    }

    if (intent.pausePressed) {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    // Hitstop freeze
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt = 0;
    }

    switch (this.state) {
      case 'title':
        this.updateTitle(dt, intent.flapPressed);
        break;
      case 'playing':
        this.updatePlaying(dt, intent.flapPressed);
        break;
      case 'paused':
        break;
      case 'dying':
        this.updateDying(dt);
        break;
      case 'gameover':
        if (intent.flapPressed) void this.startGame();
        this.bird.update(dt, CONFIG.gravity, CONFIG.maxFallSpeed, CONFIG.maxRiseSpeed);
        this.particles.update(dt);
        break;
    }

    this.hud.update(dt);
    this.updateCamera(dt);
    this.composer.render();
  }

  private updateTitle(dt: number, flap: boolean): void {
    this.titleBob += dt;
    this.bird.group.position.y = 1.4 + Math.sin(this.titleBob * 2.2) * 0.25;
    this.bird.group.rotation.y = Math.PI + Math.sin(this.titleBob * 0.7) * 0.35;
    // Idle wing animation
    this.bird.update(dt, 0, 0, 0);
    this.bird.velocity.y = 0;
    this.world.update(dt, 1.8);
    this.pillars.update(dt, 1.8);
    // Recycle title pillars
    for (const p of [...this.pillars.activePairs()]) {
      if (p.z > 8) {
        this.pillars.release(p);
        this.spawnPillar();
      }
    }
    if (this.pillars.activePairs().length < 3) this.spawnPillar();
    this.particles.update(dt);
    if (flap) void this.startGame();
  }

  private updatePlaying(dt: number, flap: boolean): void {
    if (flap) {
      void this.audio.unlock();
      this.bird.flap(CONFIG.flapImpulse);
      this.audio.flap();
      this.awaitingFirstFlap = false;
    }

    // Hover until the player commits the first flap
    if (this.awaitingFirstFlap) {
      this.bird.velocity.y = 0;
      this.bird.group.position.y = 1.35 + Math.sin(performance.now() * 0.005) * 0.08;
      this.bird.update(dt, 0, 0, 0);
      this.bird.velocity.y = 0;
      this.world.update(dt, 0.6);
      this.particles.update(dt);
      return;
    }

    const speed = this.scrollSpeed();
    this.bird.update(dt, CONFIG.gravity, CONFIG.maxFallSpeed, CONFIG.maxRiseSpeed);
    this.world.update(dt, speed);
    this.pillars.update(dt, speed);
    this.particles.update(dt);

    // Move bird glow disc
    const disc = this.scene.getObjectByName('bird-glow');
    if (disc) {
      disc.position.x = this.bird.group.position.x;
      disc.position.z = this.bird.group.position.z;
    }

    // Spawn / recycle pillars (gates approach from −Z, leave past +Z)
    for (const p of [...this.pillars.activePairs()]) {
      if (p.z > 8) {
        this.pillars.release(p);
      } else if (!p.scored && p.z > this.bird.group.position.z + 0.15) {
        // Score once the gate has passed the bird
        p.scored = true;
        this.score += 1;
        this.hud.setScore(this.score);
        this.audio.score();
        this.shake.add(CONFIG.scorePopShake);
        this.particles.burst(this.bird.group.position.clone(), 12, 0x7dffb3, 3.5, 0.45);
        if (this.score > 0 && this.score % 5 === 0) {
          this.hud.showCombo(`STREAK ×${this.score}`);
          window.setTimeout(() => this.hud.showCombo(null), 1200);
        }
      }
    }

    // Keep a stream of gates ahead of the bird (−Z)
    if (this.pillars.activePairs().length < 5) {
      this.spawnPillar();
    }

    // Collisions
    const c = this.bird.getCollider();
    if (c.y - c.r < CONFIG.floorY || c.y + c.r > CONFIG.ceilingY) {
      this.crash();
      return;
    }
    if (this.pillars.collides(c.x, c.y, c.z, c.r)) {
      this.crash();
    }
  }

  private crash(): void {
    if (this.state !== 'playing') return;
    this.bird.kill();
    this.audio.crash();
    this.shake.add(CONFIG.crashShake);
    this.hitstop = CONFIG.hitstop;
    this.dieTimer = 0.85;
    this.particles.burst(this.bird.group.position.clone(), 28, 0xff5c7a, 7, 0.7);
    this.particles.burst(this.bird.group.position.clone(), 16, 0xffc94a, 5, 0.5);
    this.setState('dying');
  }

  private updateDying(dt: number): void {
    this.bird.update(dt, CONFIG.gravity, CONFIG.maxFallSpeed, CONFIG.maxRiseSpeed);
    this.particles.update(dt);
    this.world.update(dt, this.scrollSpeed() * 0.3);
    this.dieTimer -= dt;
    if (this.dieTimer <= 0) {
      const isNew = this.score > this.best;
      if (isNew) {
        this.best = this.score;
        saveBest(this.best);
        this.hud.setBest(this.best);
      }
      this.hud.showGameOver(this.score, this.best, isNew);
      this.setState('gameover');
    }
  }

  private updateCamera(dt: number): void {
    const birdY = this.bird.group.position.y;
    const desired = this.tmp.set(
      CONFIG.camOffset.x,
      CONFIG.camOffset.y + birdY * 0.25,
      CONFIG.camOffset.z,
    );

    if (this.state === 'title') {
      desired.x = 5.5;
      desired.y = 2.2;
      desired.z = 9;
    }

    this.camPos.lerp(desired, 1 - Math.exp(-CONFIG.camLerp * dt));
    const sh = this.shake.update(dt);
    this.camera.position.set(
      this.camPos.x + sh.x,
      this.camPos.y + sh.y,
      this.camPos.z + sh.z,
    );

    this.lookAt.set(0, birdY * 0.35 + 0.4, -CONFIG.camLookAhead);
    this.camera.lookAt(this.lookAt);
  }

  /** Public snapshot for bots / debugging (no private-field hacks). */
  getSnapshot(): {
    state: GameState;
    score: number;
    best: number;
    birdY: number;
    birdVy: number;
    pillars: { z: number; gapY: number; gapSize: number; scored: boolean }[];
  } {
    return {
      state: this.state,
      score: this.score,
      best: this.best,
      birdY: this.bird.group.position.y,
      birdVy: this.bird.velocity.y,
      pillars: this.pillars.activePairs().map((p) => ({
        z: p.z,
        gapY: p.gapY,
        gapSize: p.gapSize,
        scored: p.scored,
      })),
    };
  }

  /** Inject a flap intent (bot / external control). */
  requestFlap(): void {
    this.input.queueFlap();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    const touch = document.getElementById('touch-flap');
    if (touch) this.input.unbind(this.canvas, touch);
    this.bird.dispose();
    this.pillars.dispose();
    this.world.dispose();
    this.particles.dispose();
    this.mats.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
