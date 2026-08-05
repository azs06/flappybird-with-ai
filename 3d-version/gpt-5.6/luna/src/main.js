import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#game-canvas');
const wrap = document.querySelector('#game-wrap');
const introPanel = document.querySelector('#intro-panel');
const gameOverPanel = document.querySelector('#game-over-panel');
const startButton = document.querySelector('#start-button');
const restartButton = document.querySelector('#restart-button');
const soundButton = document.querySelector('#sound-button');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#best-score');
const finalScoreElement = document.querySelector('#final-score');
const altitudeElement = document.querySelector('#altitude');
const statusLabel = document.querySelector('#status-label');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9edeb);
scene.fog = new THREE.Fog(0xb9edeb, 16, 34);

const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 100);
camera.position.set(0, 2.4, 12);
camera.lookAt(0, 1.25, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const palette = {
  ink: 0x193742,
  coral: 0xe96b4e,
  yellow: 0xf4bf52,
  wing: 0xe6a83e,
  green: 0x2b8c72,
  greenLight: 0x55b992,
  ground: 0x4b9b88,
  cloud: 0xf7f1dd,
};

scene.add(new THREE.HemisphereLight(0xe8ffff, 0x447c7c, 2.6));
const sun = new THREE.DirectionalLight(0xfff5da, 3.4);
sun.position.set(-7, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -8;
scene.add(sun);

function material(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, flatShading: true });
}

function makeCloud(x, y, z, scale = 1) {
  const cloud = new THREE.Group();
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: palette.cloud, roughness: 1, transparent: true, opacity: 0.67, flatShading: true });
  [[0, 0, 0, 1.15], [1.1, .12, .02, .78], [-1, .03, .03, .7], [.2, .42, .02, .82]].forEach(([px, py, pz, size]) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 1), cloudMaterial);
    puff.position.set(px, py, pz); cloud.add(puff);
  });
  cloud.position.set(x, y, z); cloud.scale.setScalar(scale);
  world.add(cloud);
  return cloud;
}

makeCloud(-9, 5.3, -8, 1.25);
makeCloud(7.2, 5.7, -9, .9);
makeCloud(3.4, 3.8, -6, .54);

function createMountain(x, z, height, color, width = 4) {
  const mountain = new THREE.Mesh(new THREE.ConeGeometry(width, height, 4), material(color));
  mountain.position.set(x, -2.1 + height / 2, z);
  mountain.rotation.y = Math.PI / 4;
  mountain.receiveShadow = true;
  world.add(mountain);
}

createMountain(-8, -8, 6.2, 0x9ed8cc, 4.7);
createMountain(-2.8, -9, 4.4, 0x8fcfc4, 3.7);
createMountain(4, -9, 5.3, 0x9ed8cc, 4.4);
createMountain(9, -8, 3.8, 0x86c8bc, 3.4);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 36), material(palette.ground));
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -2.55, -1);
ground.receiveShadow = true;
world.add(ground);

const groundAccent = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.16), material(0xe5b95d));
groundAccent.rotation.x = -Math.PI / 2;
groundAccent.position.set(0, -2.535, 1.7);
world.add(groundAccent);

const cloudShadows = [];
for (let i = 0; i < 12; i += 1) {
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55 + (i % 3) * .16, 16), new THREE.MeshBasicMaterial({ color: 0x337b70, transparent: true, opacity: .12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(-15 + i * 2.8, -2.52, 3 + (i % 2) * 1.2);
  shadow.scale.x = 1.8;
  world.add(shadow); cloudShadows.push(shadow);
}

function createBird() {
  const bird = new THREE.Group();
  bird.position.set(-2.1, 1.35, 0.9);
  bird.rotation.order = 'YXZ';
  bird.userData.baseY = bird.position.y;
  const bodyMat = material(palette.yellow);
  const wingMat = material(palette.wing);
  const beakMat = material(palette.coral);
  const darkMat = material(palette.ink);

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 1), bodyMat);
  body.scale.set(1.16, .95, 1.02); body.castShadow = true; bird.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(.34, 8, 6), material(0xffd66d));
  chest.position.set(.34, -.06, .02); chest.scale.set(.7, 1.05, .96); chest.castShadow = true; bird.add(chest);

  const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45 }));
  eyeWhite.position.set(.37, .28, -.43); bird.add(eyeWhite);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), darkMat);
  pupil.position.set(.43, .29, -.57); bird.add(pupil);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.19, .58, 4), beakMat);
  beak.rotation.z = -Math.PI / 2; beak.position.set(.82, .02, -.02); beak.castShadow = true; bird.add(beak);
  const beakLine = new THREE.Mesh(new THREE.BoxGeometry(.3, .025, .28), darkMat);
  beakLine.position.set(.78, -.055, -.02); beakLine.rotation.z = -.04; bird.add(beakLine);

  const wing = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .5, 3, 6), wingMat);
  wing.position.set(-.2, -.06, -.52); wing.rotation.set(.12, -.16, -.78); wing.scale.set(1.05, .9, .72); wing.castShadow = true; bird.add(wing);
  const farWing = wing.clone(); farWing.position.z = .5; farWing.material = material(0xd89337); bird.add(farWing);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.2, .58, 4), wingMat);
  tail.rotation.z = Math.PI / 2; tail.position.set(-.6, .02, 0); tail.scale.set(1, .7, .7); bird.add(tail);

  bird.userData.wing = wing;
  bird.userData.farWing = farWing;
  scene.add(bird);
  return bird;
}

const bird = createBird();
const birdX = bird.position.x;
const pipeMaterial = material(palette.green);
const pipeLightMaterial = material(palette.greenLight);
const pipeShadowMaterial = material(0x1e745f);
const pipes = [];

function createPipePart(x, y, height, isTop) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, height, 10), pipeMaterial);
  body.position.y = y; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, .28, 10), pipeLightMaterial);
  rim.position.y = isTop ? y - height / 2 + .18 : y + height / 2 - .18; rim.castShadow = true; group.add(rim);
  const rimShadow = new THREE.Mesh(new THREE.CylinderGeometry(.59, .59, .06, 10), pipeShadowMaterial);
  rimShadow.position.y = rim.position.y + (isTop ? -.14 : .14); group.add(rimShadow);
  group.position.x = x; group.position.z = 0;
  return group;
}

function spawnPipe(x = 9.5) {
  const gap = 2.7;
  const gapCenter = THREE.MathUtils.randFloat(-.1, 1.7);
  const topHeight = 7.2 - (gapCenter + gap / 2);
  const bottomHeight = (gapCenter - gap / 2) - (-2.55);
  const pair = new THREE.Group();
  pair.add(createPipePart(x, gapCenter + gap / 2 + topHeight / 2, topHeight, true));
  pair.add(createPipePart(x, -2.55 + bottomHeight / 2, bottomHeight, false));
  pair.userData = { gapCenter, gap, passed: false };
  world.add(pair); pipes.push(pair);
}

spawnPipe(8.9);

let state = 'ready';
let score = 0;
let bestScore = Number(localStorage.getItem('luna-best-score') || 0);
let velocity = 0;
let spawnTimer = 0;
let soundOn = true;
let audioContext;
bestScoreElement.textContent = String(bestScore).padStart(2, '0');

function playTone(frequency, duration = .09, type = 'sine', volume = .035) {
  if (!soundOn) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext ||= new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}

function setScore(next) {
  score = next; scoreElement.textContent = String(score).padStart(2, '0');
  if (score > bestScore) { bestScore = score; bestScoreElement.textContent = String(bestScore).padStart(2, '0'); localStorage.setItem('luna-best-score', bestScore); }
}

function setState(next) {
  state = next;
  introPanel.classList.toggle('hidden', next !== 'ready');
  gameOverPanel.classList.toggle('hidden', next !== 'gameover');
  statusLabel.textContent = next === 'playing' ? 'IN FLIGHT' : next === 'gameover' ? 'FLIGHT ENDED' : 'READY TO FLY';
  document.querySelector('.status-dot').style.background = next === 'playing' ? '#55b992' : '#e96b4e';
}

function flap() {
  if (state === 'gameover') return;
  if (state === 'ready') {
    setState('playing');
    velocity = 6.15;
  } else velocity = 6.55;
  playTone(530, .075, 'triangle', .04);
}

function resetGame(startImmediately = false) {
  pipes.forEach((pipe) => world.remove(pipe)); pipes.length = 0;
  bird.position.y = bird.userData.baseY; bird.rotation.set(0, 0, 0); velocity = 0; spawnTimer = 0; setScore(0);
  spawnPipe(8.9);
  setState(startImmediately ? 'playing' : 'ready');
  if (startImmediately) { velocity = 6.15; playTone(530, .075, 'triangle', .04); }
}

function endGame() {
  if (state !== 'playing') return;
  setState('gameover');
  finalScoreElement.textContent = String(score).padStart(2, '0');
  playTone(130, .22, 'sawtooth', .045);
  bird.rotation.z = -.65;
}

function updateGame(delta, elapsed) {
  const dt = Math.min(delta, .035);
  if (state === 'ready') {
    bird.position.y = bird.userData.baseY + Math.sin(elapsed * 2.4) * .12;
    bird.rotation.z = Math.sin(elapsed * 2.4) * .025;
    bird.userData.wing.rotation.z = -.78 + Math.sin(elapsed * 9) * .28;
    bird.userData.farWing.rotation.z = -.78 - Math.sin(elapsed * 9) * .28;
    return;
  }

  if (state === 'playing') {
    velocity -= 16.5 * dt;
    bird.position.y += velocity * dt;
    bird.rotation.z = THREE.MathUtils.lerp(bird.rotation.z, THREE.MathUtils.clamp(velocity * .075, -.9, .5), 5 * dt);
    const wingFlap = Math.sin(elapsed * 18) * .34;
    bird.userData.wing.rotation.z = -.78 + wingFlap;
    bird.userData.farWing.rotation.z = -.78 - wingFlap;

    const speed = Math.min(8.4, 6.1 + score * .16);
    spawnTimer += dt;
    if (spawnTimer > 2.05) { spawnTimer = 0; spawnPipe(9.5); }
    pipes.forEach((pipe) => {
      pipe.position.x -= speed * dt;
      if (!pipe.userData.passed && pipe.position.x < birdX - .8) {
        pipe.userData.passed = true; setScore(score + 1); playTone(760, .12, 'sine', .035);
      }
      if (pipe.position.x < -12) world.remove(pipe);
      const withinX = Math.abs(pipe.position.x - birdX) < .86;
      const gapTop = pipe.userData.gapCenter + pipe.userData.gap / 2 - .42;
      const gapBottom = pipe.userData.gapCenter - pipe.userData.gap / 2 + .42;
      if (withinX && (bird.position.y > gapTop || bird.position.y < gapBottom)) endGame();
    });
    if (bird.position.y < -2.05 || bird.position.y > 6.1) endGame();
  }

  if (state === 'gameover') {
    bird.position.y += velocity * dt; velocity -= 16.5 * dt;
    bird.rotation.z = THREE.MathUtils.lerp(bird.rotation.z, -1.25, 2 * dt);
    bird.userData.wing.rotation.z = -.78;
    if (bird.position.y < -2.02) bird.position.y = -2.02;
  }
}

function updateDecor(elapsed) {
  cloudShadows.forEach((shadow, i) => { shadow.position.x -= .008 + (i % 3) * .003; if (shadow.position.x < -16) shadow.position.x = 16; });
}

function render() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  updateGame(delta, elapsed); updateDecor(elapsed);
  altitudeElement.textContent = Math.max(0, bird.position.y + 0.25).toFixed(1);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resize() {
  const { clientWidth, clientHeight } = wrap;
  camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight, false);
}

startButton.addEventListener('click', flap);
restartButton.addEventListener('click', () => resetGame(true));
soundButton.addEventListener('click', () => { soundOn = !soundOn; soundButton.classList.toggle('is-muted', !soundOn); soundButton.textContent = soundOn ? '♪' : '×'; });
window.addEventListener('keydown', (event) => { if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); if (state === 'gameover') resetGame(true); else flap(); } });
canvas.addEventListener('pointerdown', () => { if (state === 'gameover') resetGame(true); else flap(); });
window.addEventListener('resize', resize);
resize(); render();
