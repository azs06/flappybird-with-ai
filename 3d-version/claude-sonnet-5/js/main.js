// main.js — game state machine, physics tuning, camera, input, and the loop.

import * as THREE from 'three';
import { World } from './world.js';
import { Bird } from './bird.js';
import { ObstacleField, FIELD } from './obstacles.js';
import { Particles } from './particles.js';
import { SFX } from './audio.js';
import { UI } from './ui.js';
import { PostFX } from './postfx.js';

// ----------------------------------------------------------------------
// TUNING — the entire game feel lives in this block. Units are meters
// and seconds. Tweak freely: gravity/flap set the arc, speed sets panic.
// ----------------------------------------------------------------------
const TUNING = {
  gravity: -24,        // pull, m/s²
  flapImpulse: 8.2,    // upward velocity set by a flap
  maxFall: -14,        // terminal velocity
  baseSpeed: 10.5,     // world scroll at score 0
  speedPerPoint: 0.085, // acceleration per gate cleared
  maxSpeed: 18,
  voidY: -9,            // falling past this means lost to the void
};

// ---- renderer / scene ----
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const BASE_FOV = 58;
// near=0.5: depth precision is proportional to near/far, and nothing ever
// gets closer than ~2 units to the chase camera — a tight near plane is the
// cheapest z-fighting insurance there is
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.5, 400);

const world = new World(scene, renderer);
const bird = new Bird(scene);
const field = new ObstacleField(scene);
const particles = new Particles(scene);
const sfx = new SFX();
const ui = new UI();
const postfx = new PostFX(renderer, scene, camera);

// ---- state machine: ready -> playing <-> paused, playing -> dying -> over ----
let state = 'ready';
let score = 0;
let speed = TUNING.baseSpeed;
let shake = 0;
let fovKick = 0;
let deathTimer = 0;
let elapsed = 0;

ui.setMuted(sfx.muted);

function startGame() {
  score = 0;
  speed = TUNING.baseSpeed;
  bird.reset();
  field.reset();
  state = 'playing';
  ui.showPlaying();
  sfx.swoosh();
  sfx.startAmbient();
  bird.flap(TUNING.flapImpulse);
  particles.flap(bird.group.position);
}

function flap() {
  if (state === 'ready') { startGame(); return; }
  if (state !== 'playing') return;
  bird.flap(TUNING.flapImpulse);
  fovKick = 5;
  sfx.flap();
  particles.flap(bird.group.position);
}

function crash() {
  state = 'dying';
  deathTimer = 0;
  shake = 1;
  bird.die();
  particles.burst(bird.group.position);
  sfx.hit();
  sfx.stopAmbient();
}

function gameOver() {
  state = 'over';
  ui.showGameOver(score);
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    ui.showPause(true);
    sfx.stopAmbient();
  } else if (state === 'paused') {
    state = 'playing';
    ui.showPause(false);
    sfx.startAmbient();
  }
}

// ---- input ----
function isTyping() {
  return document.activeElement && document.activeElement.tagName === 'INPUT';
}

window.addEventListener('keydown', (e) => {
  if (isTyping()) return;
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === 'over') startGame();
    else flap();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
  } else if (e.code === 'KeyM') {
    ui.setMuted(sfx.toggleMute());
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  flap();
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', togglePause);
ui.el.btnPause.addEventListener('click', togglePause);
ui.el.btnMute.addEventListener('click', () => ui.setMuted(sfx.toggleMute()));
ui.el.nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  ui.submitName();
});

// pause automatically when the tab loses focus mid-flight
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') togglePause();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});

// ---- camera: a soft chase rig that breathes with the bird, kicks its FOV
// wide on every flap, and rattles on impact ----
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 5, -10);

function updateCamera(dt) {
  const birdY = bird.y;
  // ride a fixed height above the bird and look just above it, so the bird
  // stays framed in the lower-middle of the screen at any altitude
  camTarget.set(
    Math.sin(elapsed * 0.25) * 0.4,
    THREE.MathUtils.clamp(birdY + 3.6, -3, 17),
    8.6,
  );
  camera.position.lerp(camTarget, Math.min(1, dt * 4));

  lookTarget.lerp(new THREE.Vector3(0, birdY + 0.4, -12), Math.min(1, dt * 5));
  camera.lookAt(lookTarget);

  fovKick = Math.max(0, fovKick - dt * 14);
  camera.fov = BASE_FOV + fovKick;
  camera.updateProjectionMatrix();

  if (shake > 0) {
    shake = Math.max(0, shake - dt * 2.2);
    const s = shake * shake * 0.5;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }
}

// ---- main loop ----
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 1 / 30); // clamp so tab-switch can't teleport
  elapsed += dt;

  if (state === 'ready') {
    bird.hover(dt, elapsed);
    world.update(dt, TUNING.baseSpeed * 0.35); // slow scenic drift behind the menu
  } else if (state === 'playing') {
    bird.update(dt, TUNING.gravity, TUNING.maxFall, TUNING.voidY);

    const result = field.update(dt, speed, bird);
    if (result.scored) {
      score = field.score;
      speed = Math.min(TUNING.maxSpeed, TUNING.baseSpeed + score * TUNING.speedPerPoint);
      ui.setScore(score);
      sfx.score();
      particles.score(bird.group.position);
    }

    if (bird.y > FIELD.ceiling) {
      bird.y = FIELD.ceiling;
      bird.velocity = Math.min(bird.velocity, 0);
    }

    if (result.hit || bird.y <= TUNING.voidY) crash();

    world.update(dt, speed);
  } else if (state === 'dying') {
    bird.update(dt, TUNING.gravity, TUNING.maxFall, TUNING.voidY - 6);
    deathTimer += dt;
    if (deathTimer > 0.9) gameOver();
  }
  // 'paused' and 'over': freeze the world, keep rendering

  particles.update(dt);
  updateCamera(dt);
  postfx.render(dt);
}

tick();

// small debug handle for tinkering and automated testing
window.__prism = {
  get state() { return state; },
  get score() { return score; },
  get birdY() { return bird.y; },
  gates: () => field.gates.map((g) => ({
    z: +g.z.toFixed(1),
    gapLow: +g.bottom.highY.toFixed(1),
    gapHigh: +g.top.lowY.toFixed(1),
  })),
  flap,
};
