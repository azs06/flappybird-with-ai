// main.js — SPARK game loop, physics, camera, input, state machine

import * as THREE from 'three';
import { World, GROUND_Y, CEILING_Y } from './world.js';
import { Bird } from './bird.js';
import { ObstacleField } from './obstacles.js';
import { Particles } from './particles.js';
import { SFX } from './audio.js';
import { UI } from './ui.js';
import { PostFX } from './postfx.js';

// ----------------------------------------------------------------------
// TUNING — feel lives here
// ----------------------------------------------------------------------
const TUNING = {
  gravity: -28,
  flapImpulse: 8.0,
  maxFall: -16,
  baseSpeed: 10.5,
  speedPerPoint: 0.09,
  maxSpeed: 18,
  voidY: -2,
  // Soft play corridor — generous enough for recovery, tight enough to matter
  camLag: 6,
  camOffset: new THREE.Vector3(5.5, 2.2, 7.5),
  camLookAhead: new THREE.Vector3(0, 0.4, -4),
};

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  56,
  window.innerWidth / window.innerHeight,
  0.4,
  350,
);

const world = new World(scene, renderer);
const bird = new Bird(scene);
const field = new ObstacleField(scene);
const particles = new Particles(scene);
const sfx = new SFX();
const ui = new UI();
const postfx = new PostFX(renderer, scene, camera);

// ---- state: ready -> playing <-> paused, playing -> dying -> over ----
let state = 'ready';
let score = 0;
let speed = TUNING.baseSpeed;
let shake = 0;
let fovKick = 0;
let deathTimer = 0;
let elapsed = 0;

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const _tmp = new THREE.Vector3();

ui.setMuted(sfx.muted);
placeIdleCamera();

function placeIdleCamera() {
  camPos.set(6.5, 11, 10);
  camLook.set(0, 9, -2);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

function startGame() {
  sfx.unlock();
  score = 0;
  speed = TUNING.baseSpeed;
  bird.reset();
  field.reset();
  shake = 0;
  fovKick = 0;
  deathTimer = 0;
  state = 'playing';
  ui.showPlaying();
  sfx.swoosh();
  sfx.startAmbient();
  bird.flap(TUNING.flapImpulse);
  particles.flap(bird.position);
}

function flap() {
  sfx.unlock();
  if (state === 'ready') {
    startGame();
    return;
  }
  if (state === 'over') {
    startGame();
    return;
  }
  if (state !== 'playing') return;
  bird.flap(TUNING.flapImpulse);
  fovKick = 4;
  sfx.flap();
  particles.flap(bird.position);
}

function crash() {
  if (state !== 'playing') return;
  state = 'dying';
  deathTimer = 0;
  shake = 1.2;
  bird.die();
  particles.burst(bird.position.clone());
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

function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
}

// ---- input ----
window.addEventListener('keydown', (e) => {
  if (isTyping()) return;
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    flap();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'KeyM') {
    ui.setMuted(sfx.toggleMute());
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  flap();
});

document.getElementById('btn-start').addEventListener('click', () => {
  sfx.unlock();
  startGame();
});
document.getElementById('btn-retry').addEventListener('click', () => startGame());
document.getElementById('btn-resume').addEventListener('click', () => togglePause());
ui.el.btnPause.addEventListener('click', () => togglePause());
ui.el.btnMute.addEventListener('click', () => ui.setMuted(sfx.toggleMute()));
ui.el.nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  ui.submitName();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') togglePause();
});

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  postfx.resize(w, h);
});

// ---- camera ----
function updateCamera(dt) {
  const target = bird.position;
  _tmp.copy(TUNING.camOffset);
  // Slight speed-based pull-back
  _tmp.z += Math.min(3, (speed - TUNING.baseSpeed) * 0.25);
  _tmp.y += Math.sin(elapsed * 1.1) * 0.15;

  const desired = _tmp.add(target);
  // Idle / ready: soft orbit
  if (state === 'ready') {
    const ang = elapsed * 0.25;
    desired.set(
      Math.cos(ang) * 8 + 2,
      10 + Math.sin(elapsed * 0.4) * 0.5,
      Math.sin(ang) * 6 + 6,
    );
    camLook.set(0, 9 + Math.sin(elapsed * 0.5) * 0.3, -2);
  } else {
    camLook.copy(target).add(TUNING.camLookAhead);
  }

  const lag = 1 - Math.exp(-TUNING.camLag * dt);
  camPos.lerp(desired, lag);
  camera.position.copy(camPos);

  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.45;
    camera.position.y += (Math.random() - 0.5) * shake * 0.35;
    shake = Math.max(0, shake - dt * 3.5);
  }

  camera.lookAt(camLook);

  // FOV kick on flap
  if (fovKick > 0) {
    fovKick = Math.max(0, fovKick - dt * 12);
  }
  camera.fov = 56 + fovKick + Math.min(4, (speed - TUNING.baseSpeed) * 0.3);
  camera.updateProjectionMatrix();
}

// ---- frame ----
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  let dt = clock.getDelta();
  // Clamp huge tabs-background spikes
  if (dt > 0.05) dt = 0.05;
  elapsed += dt;

  const sim = state === 'playing' || state === 'dying' || state === 'ready';

  if (state === 'playing') {
    bird.update(dt, TUNING.gravity, TUNING.maxFall);
    world.update(dt, speed);
    const gained = field.update(dt, speed, bird.position.z);
    if (gained > 0) {
      score += gained;
      speed = Math.min(TUNING.maxSpeed, TUNING.baseSpeed + score * TUNING.speedPerPoint);
      ui.setScore(score);
      sfx.score();
      particles.score(bird.position);
    }
    particles.update(dt, bird.position, true);

    // Collisions — slightly forgiving hitbox on the bird
    if (bird.y - bird.radius * 0.9 <= GROUND_Y + 0.02) crash();
    else if (bird.y + bird.radius * 0.9 >= CEILING_Y) crash();
    else if (field.collides(bird.position, bird.radius * 0.78)) crash();
  } else if (state === 'dying') {
    bird.update(dt, TUNING.gravity, TUNING.maxFall);
    world.update(dt, speed * 0.3);
    field.update(dt, speed * 0.3, bird.position.z);
    particles.update(dt, bird.position, false);
    deathTimer += dt;
    if (deathTimer > 0.85 || bird.y < TUNING.voidY) gameOver();
  } else if (state === 'ready') {
    bird.idle(dt, elapsed);
    world.update(dt, 2.5);
    particles.update(dt, bird.position, true);
  } else if (state === 'paused' || state === 'over') {
    // Freeze sim; still render
    particles.update(dt * 0.3, null, false);
  }

  if (sim || state === 'paused' || state === 'over') {
    updateCamera(dt);
  }

  postfx.render();
}

frame();
