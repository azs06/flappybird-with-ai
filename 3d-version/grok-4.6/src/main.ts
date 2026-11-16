import "./style.css";
import * as THREE from "three";
import { CFG, Phase, currentSpeed, nightBlend } from "./game/config.ts";
import { rng } from "./core/rng.ts";
import { input } from "./core/input.ts";
import { audio } from "./core/audio.ts";
import { loadTextures } from "./assets/textures.ts";
import { createMaterials } from "./assets/materials.ts";
import { createBirdMesh, wingStroke, type BirdView } from "./assets/birdMesh.ts";
import { createWorld, tickWorld } from "./entities/world.ts";
import { Course } from "./entities/course.ts";
import { Vfx } from "./systems/vfx.ts";
import { bindHud } from "./ui/hud.ts";

type Snapshot = {
  phase: Phase;
  score: number;
  best: number;
  y: number;
  vy: number;
  speed: number;
  night: number;
};

const BEST_KEY = "aurelion.best";
const debugOn = new URLSearchParams(location.search).has("debug");
const hud = bindHud();
const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
const pauseBtn = document.getElementById("pause")!;
const muteBtn = document.getElementById("mute")!;

let phase: Phase = Phase.Boot;
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let y = 0.6;
let vy = 0;
let scroll = 0;
let flapBoost = 0;
let flapAge = 99;
let visualY = 0.65;
let visualTilt = 0;
let visualWing = 0;
let deathT = 0;
let hitstop = 0;
let shake = 0;
let fovKick = 0;
let time = 0;
let acc = 0;
let last = performance.now();
let frames = 0;
let fps = 60;
let fpsAccum = 0;
let quality: "high" | "low" = "high";

hud.setBest(best);
hud.setBoot(true, "loading the canyon");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
  alpha: false,
  stencil: false,
  depth: true,
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xd9b49a, 0.011);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 140);
camera.position.set(-0.8, 1.15, 8.2);

const hemi = new THREE.HemisphereLight(0xffc8a0, 0x1b3040, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 1.45);
sun.position.set(-10, 12, 6);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x88a0ff, 0.25);
fill.position.set(6, 2, 4);
scene.add(fill);

let bird: BirdView;
let course: Course;
let world: ReturnType<typeof createWorld>;
let vfx: Vfx;
const camTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();

function resetRun(keepPhase: Phase): void {
  y = 0.65;
  vy = 0;
  scroll = 0;
  score = 0;
  flapBoost = 0;
  flapAge = 99;
  visualY = y;
  visualTilt = 0;
  visualWing = 0;
  deathT = 0;
  bird.root.position.set(0, y, 0);
  bird.root.rotation.set(0, 0, 0);
  course.reset();
  hud.setScore(0);
  phase = keepPhase;
  hud.setPhase(phase);
}

function flap(): void {
  const carry = Math.max(vy, 0) * 0.18;
  vy = CFG.flapImpulse * 0.88 + carry;
  flapBoost = 1;
  flapAge = 0;
  fovKick = 1.1;
  shake = Math.max(shake, 0.035);
  vfx.burst(bird.root.position, "flap");
  audio.flap();
}

function die(): void {
  if (phase !== Phase.Playing) return;
  phase = Phase.Dying;
  deathT = 0;
  hitstop = CFG.hitstop;
  shake = 0.55;
  vy = 2.2;
  audio.die();
  vfx.burst(bird.root.position.clone(), "death");
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
    hud.setBest(best);
  }
  hud.writeDead(score, best);
}

function startPlay(): void {
  phase = Phase.Playing;
  hud.setPhase(phase);
  flap();
}

function onFlap(): void {
  audio.unlock();
  if (phase === Phase.Title) startPlay();
  else if (phase === Phase.Playing) flap();
  else if (phase === Phase.Dead) {
    resetRun(Phase.Playing);
    flap();
  }
}

function togglePause(): void {
  if (phase === Phase.Playing) {
    phase = Phase.Paused;
    hud.setPhase(phase);
    audio.ui();
  } else if (phase === Phase.Paused) {
    phase = Phase.Playing;
    hud.setPhase(phase);
    audio.ui();
  }
}

pauseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePause();
});
muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  audio.unlock();
  hud.setMuted(audio.toggleMute());
  audio.ui();
});

function step(dt: number): void {
  if (input.consumePause()) togglePause();
  if (input.consumeMute()) {
    audio.unlock();
    hud.setMuted(audio.toggleMute());
  }
  if (input.consumeFlap()) onFlap();

  if (phase === Phase.Paused || phase === Phase.Boot) return;

  if (hitstop > 0) {
    hitstop -= dt;
    return;
  }

  const speed = phase === Phase.Title ? 0.55 : currentSpeed(score);

  if (phase === Phase.Playing || phase === Phase.Title || phase === Phase.Dying) {
    if (phase !== Phase.Title) {
      const apex = 1 - THREE.MathUtils.smoothstep(Math.abs(vy), 0.6, 2.8);
      const g = CFG.gravity * (1 - apex * 0.22);
      vy -= g * dt;
      vy = THREE.MathUtils.clamp(vy, CFG.maxFall, CFG.maxRise);
      y += vy * dt;
    } else {
      y = 0.85 + Math.sin(time * 1.2) * 0.08;
    }
    if (phase === Phase.Playing || phase === Phase.Title) {
      const travel = (phase === Phase.Title ? 0.5 : speed) * dt;
      scroll += travel;
      course.advance(travel, score, time);
    }
    if (phase === Phase.Playing) {
      const got = course.collectScore(y);
      if (got.scored) {
        score += 1;
        hud.setScore(score);
        audio.score(got.perfect);
        tmp.set(0.2, y, 0);
        vfx.burst(tmp, got.perfect ? "perfect" : "score");
        if (got.perfect) hud.showToast("true center");
        if (got.near) {
          vfx.nearMiss(bird.root.position);
          hud.showToast("close air");
        }
        if (score === 10 || score === 25 || score === 50 || score === 80) {
          hud.showToast(`${score === 80 ? "aurelion" : score === 50 ? "gold" : score === 25 ? "silver" : "bronze"} seal`);
        }
      }
      if (course.hits(y, CFG.birdRadius)) die();
    }
    if (phase === Phase.Dying) {
      deathT += dt;
      if (y < CFG.groundY - 0.2) y = CFG.groundY - 0.2;
      if (deathT > CFG.deathHold) {
        phase = Phase.Dead;
        hud.setPhase(phase);
      }
    }
  }

  flapAge += dt;
}

function present(dt: number): void {
  if (!bird || !world || !vfx) return;
  const night = nightBlend(score);
  const pose = bird.root;
  visualY = THREE.MathUtils.damp(visualY, y, 18, dt);
  const tiltTarget = THREE.MathUtils.clamp(vy * 0.055, -0.7, 0.42);
  visualTilt = THREE.MathUtils.damp(visualTilt, tiltTarget, 8, dt);
  pose.position.set(0, visualY, 0);
  pose.rotation.z = visualTilt;
  pose.rotation.y = 0;
  flapBoost = THREE.MathUtils.damp(flapBoost, 0, 6, dt);
  const mode = phase === Phase.Dying || phase === Phase.Dead ? "dead" : phase === Phase.Title ? "idle" : "fly";
  visualWing = THREE.MathUtils.damp(visualWing, wingStroke(flapAge, time, mode), 18, dt);
  bird.setWingAngle(visualWing);
  const punch = flapAge < 0.22 ? Math.sin((flapAge / 0.22) * Math.PI) : 0;
  const s = 1.12;
  pose.scale.set(s * (1 + punch * 0.028), s * (1 - punch * 0.04), s);
  tickWorld(world, scroll, dt, night, time);
  vfx.update(dt);
  audio.setWind(phase === Phase.Playing ? currentSpeed(score) / CFG.maxSpeed : 0.2);

  const fog = scene.fog as THREE.FogExp2;
  fog.color.setHSL(0.05 + night * 0.12, 0.35 - night * 0.1, 0.55 - night * 0.28);
  fog.density = 0.016 + night * 0.006;
  hemi.intensity = 0.72 - night * 0.22;
  sun.intensity = 1.45 - night * 0.7;
  renderer.toneMappingExposure = 1.05 - night * 0.12;

  shake = THREE.MathUtils.damp(shake, 0, 6, dt);
  fovKick = THREE.MathUtils.damp(fovKick, 0, 5, dt);
  const idleOrbit = phase === Phase.Title ? Math.sin(time * 0.22) * 0.22 : 0;
  const tall = camera.aspect < 0.78;
  camTarget.set((tall ? 0.55 : 1.7) + idleOrbit, visualY * 0.18 + 0.72, 0);
  camera.position.x = THREE.MathUtils.damp(camera.position.x, (tall ? -0.15 : -1.05) + idleOrbit * 0.25, 5, dt);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, visualY * 0.16 + (tall ? 1.2 : 1.05), 6, dt);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, tall ? (phase === Phase.Title ? 9.1 : 8.6) : phase === Phase.Title ? 7.6 : 7.1, 4, dt);
  if (shake > 0.002) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.2;
    camera.position.y += (Math.random() - 0.5) * shake * 0.2;
  }
  camera.lookAt(camTarget);
  const nextFov = 42 + fovKick;
  if (Math.abs(camera.fov - nextFov) > 0.01) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
}

function snapshot(): Snapshot {
  return {
    phase,
    score,
    best,
    y,
    vy,
    speed: currentSpeed(score),
    night: nightBlend(score),
  };
}

function loop(now: number): void {
  const raw = Math.min(0.08, (now - last) / 1000);
  last = now;
  acc += raw;
  let steps = 0;
  while (acc >= CFG.timestep && steps < CFG.maxSteps) {
    time += CFG.timestep;
    step(CFG.timestep);
    acc -= CFG.timestep;
    steps++;
  }
  if (steps === CFG.maxSteps) acc = 0;

  present(raw);

  frames++;
  fpsAccum += raw;
  if (fpsAccum >= 0.4) {
    fps = frames / fpsAccum;
    frames = 0;
    fpsAccum = 0;
    if (fps < 58 && quality === "high") dropQuality();
    hud.setFps(fps);
  }

  renderer.render(scene, camera);

  if (debugOn) {
    const info = renderer.info;
    hud.setDiag(
      `AURELION  fps ${fps.toFixed(0)}  draw ${info.render.calls}  tris ${info.render.triangles}\n` +
        `phase ${phase}  score ${score}  y ${y.toFixed(2)}  vy ${vy.toFixed(2)}\n` +
        `speed ${currentSpeed(score).toFixed(2)}  night ${nightBlend(score).toFixed(2)}  q ${quality}`,
      true,
    );
  }

  requestAnimationFrame(loop);
}

function dropQuality(): void {
  quality = "low";
  world.dust.visible = false;
  fill.intensity = 0;
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener("resize", onResize);

const hooks = {
  getState: () => phase,
  getScore: () => score,
  getBest: () => best,
  flap: () => onFlap(),
  restart: () => resetRun(Phase.Title),
  pause: () => togglePause(),
  setMuted: (v: boolean) => {
    audio.setMuted(v);
    hud.setMuted(v);
  },
  setSeed: (s: number) => rng.setSeed(s),
  snapshot,
};
(window as unknown as { __AURELION: typeof hooks }).__AURELION = hooks;

async function boot(): Promise<void> {
  try {
    const tex = await loadTextures();
    const mats = createMaterials(tex);
    bird = createBirdMesh(tex);
    bird.root.scale.setScalar(1.12);
    bird.root.position.set(0, y, 0);
    scene.add(bird.root);
    world = createWorld(mats, scene);
    course = new Course(mats, tex);
    scene.add(course.root);
    vfx = new Vfx(mats);
    scene.add(vfx.root);
    input.attach(document.getElementById("app")!);
    hud.setBoot(false);
    resetRun(Phase.Title);
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    hud.setBoot(true, "the forge failed — reload");
  }
}

void boot();
