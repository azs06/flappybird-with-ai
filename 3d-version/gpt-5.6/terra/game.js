import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#game-canvas'), scoreEl = $('#score'), bestEl = $('#best-score');
const startPanel = $('#start-panel'), overPanel = $('#gameover-panel'), hint = $('#hint');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#75c8ee');
scene.fog = new THREE.Fog('#75c8ee', 19, 62);
const camera = new THREE.PerspectiveCamera(52, 1, .1, 100);
camera.position.set(0, 2.6, 14); camera.lookAt(0, 1.5, -5);
scene.add(new THREE.HemisphereLight('#e6fbff', '#155078', 2.25));
const sun = new THREE.DirectionalLight('#fff4cd', 2.7);
sun.position.set(-8, 13, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const mat = (color, roughness = .7) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

const clouds = [];
function addCloud(x, y, z, scale) {
  const group = new THREE.Group(), cloudMat = mat('#fff8e8');
  const ball = new THREE.SphereGeometry(1, 10, 7);
  [[0,0,0], [.75,.12,.05], [-.68,.08,.12], [.2,.42,.05]].forEach(([px,py,pz], i) => {
    const puff = new THREE.Mesh(ball, cloudMat); puff.scale.setScalar(i === 3 ? .68 : .82); puff.position.set(px,py,pz); group.add(puff);
  });
  group.position.set(x,y,z); group.scale.setScalar(scale); world.add(group); clouds.push(group);
}
addCloud(-8, 6, -16, 1.5); addCloud(6, 8, -21, 1.1); addCloud(-3, 1, -28, 1.8); addCloud(10, 4, -35, 1.3);

const islandMat = mat('#2e946a'), rockMat = mat('#397b6d');
for (let i = 0; i < 11; i++) {
  const island = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.ConeGeometry(1.9 + Math.random()*1.6, 2.5, 7), rockMat);
  rock.scale.y = .65; rock.rotation.x = Math.PI; rock.castShadow = true; island.add(rock);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4 + Math.random()*1.1, 1.7, .42, 7), islandMat);
  top.position.y = .72; top.castShadow = true; island.add(top);
  island.position.set((Math.random()-.5)*25, -3.1 - Math.random()*1.3, -10 - i*5); island.scale.setScalar(.65 + Math.random()*.5); world.add(island);
}

const pipeMat = mat('#45a85d'), pipeLight = mat('#75d873'), pipeDark = mat('#277644'), pipes = [];
function pipeEnd(bottom, gapCenter) {
  const group = new THREE.Group();
  const height = bottom ? gapCenter - 1.45 : 12 - gapCenter - 1.45;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.82, .92, height, 10), pipeMat);
  body.position.y = bottom ? gapCenter - 1.45 - height / 2 : gapCenter + 1.45 + height / 2; body.castShadow = body.receiveShadow = true; group.add(body);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, .52, 10), pipeLight);
  lip.position.y = bottom ? gapCenter - 1.2 : gapCenter + 1.2; lip.castShadow = true; group.add(lip);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.82, .08, 6, 10), pipeDark);
  rim.rotation.x = Math.PI / 2; rim.position.y = bottom ? gapCenter - .94 : gapCenter + .94; group.add(rim);
  return group;
}
function spawnPipe(z) {
  const center = -.2 + (Math.random() - .5) * 3.15;
  const group = new THREE.Group(); group.add(pipeEnd(true, center), pipeEnd(false, center)); group.position.z = z; world.add(group);
  pipes.push({ group, scored: false });
}
spawnPipe(-17); spawnPipe(-31); spawnPipe(-45);

const bird = new THREE.Group();
const body = new THREE.Mesh(new THREE.SphereGeometry(.62, 16, 12), mat('#ffd04d'));
body.scale.set(1.08, .86, .9); body.castShadow = true; bird.add(body);
const belly = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 8), mat('#fff0be'));
belly.scale.set(1.05,.86,.25); belly.position.set(0,-.13,.53); bird.add(belly);
const beak = new THREE.Mesh(new THREE.ConeGeometry(.25,.55,4), mat('#f47c35'));
beak.rotation.x = Math.PI/2; beak.position.set(.05,.03,.87); bird.add(beak);
const wing = new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 7), mat('#f6a83f'));
wing.scale.set(1.35,.3,.8); wing.position.set(-.47,-.03,.05); wing.castShadow = true; bird.add(wing);
[-.23,.23].forEach(x => { const eye = new THREE.Mesh(new THREE.SphereGeometry(.095, 8, 8), mat('#142546')); eye.position.set(x,.25,.63); bird.add(eye); });
bird.position.set(0, .6, 3); bird.rotation.y = Math.PI; world.add(bird);

const particles = [];
function burst(position, color, count = 15) {
  for (let i=0; i<count; i++) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.07 + Math.random()*.07), mat(color)); mesh.position.copy(position); world.add(mesh);
    particles.push({ mesh, velocity: new THREE.Vector3((Math.random()-.5)*6, (Math.random()-.5)*5, (Math.random()-.5)*3), life:.45 + Math.random()*.45 });
  }
}

let state = 'ready', score = 0, best = Number(localStorage.getItem('sky-hopper-best') || 0);
let velocity = 0, elapsed = 0, lastTime = performance.now(), muted = false, audioCtx;
bestEl.textContent = best;
function tone(freq, duration, type) {
  if (muted) return;
  try { audioCtx ||= new AudioContext(); const oscillator = audioCtx.createOscillator(), gain = audioCtx.createGain(); oscillator.type = type; oscillator.frequency.value = freq; gain.gain.setValueAtTime(.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration); oscillator.connect(gain).connect(audioCtx.destination); oscillator.start(); oscillator.stop(audioCtx.currentTime + duration); } catch (_) { /* Audio is an enhancement. */ }
}
function reset() {
  score = 0; velocity = 0; bird.position.set(0,.6,3); bird.rotation.set(0,Math.PI,0); scoreEl.textContent = '0';
  pipes.forEach((p,i) => { p.group.position.z = -17 - i*14; p.scored = false; }); state = 'ready'; hint.classList.remove('hidden');
}
function start() { if (state === 'over') reset(); state = 'playing'; startPanel.classList.remove('active'); overPanel.classList.remove('active'); flap(); }
function flap() { if (state === 'ready') { start(); return; } if (state !== 'playing') return; velocity = 6.1; hint.classList.add('hidden'); tone(540,.055,'triangle'); burst(bird.position.clone().add(new THREE.Vector3(0,-.1,-.2)), '#ffe182', 5); }
function endGame() {
  if (state !== 'playing') return; state = 'over'; burst(bird.position, '#ffbc4b', 26); tone(130,.22,'sawtooth');
  best = Math.max(best, score); localStorage.setItem('sky-hopper-best', best); bestEl.textContent = best; $('#final-score').textContent = score; $('#final-best').textContent = best;
  setTimeout(() => overPanel.classList.add('active'), 500);
}
function point() { score++; scoreEl.textContent = score; tone(820,.07,'sine'); }
function resize() { renderer.setSize(innerWidth,innerHeight,false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function update(dt) {
  elapsed += dt;
  clouds.forEach((cloud, i) => { cloud.position.x += dt * (.12 + i*.025); if (cloud.position.x > 12) cloud.position.x = -13; });
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity,dt); p.velocity.y -= 8*dt; p.mesh.rotation.x += dt*7; if (p.life <= 0) { world.remove(p.mesh); particles.splice(i,1); } }
  if (state === 'ready') { bird.position.y = .6 + Math.sin(elapsed*2.2)*.17; bird.rotation.z = Math.sin(elapsed*2.2)*.08; wing.rotation.z = Math.sin(elapsed*8)*.22; return; }
  if (state !== 'playing') { bird.rotation.z = Math.min(bird.rotation.z + dt*2.8, 1.48); bird.position.y -= dt*2; return; }
  velocity -= 16.5*dt; bird.position.y += velocity*dt; bird.rotation.z = THREE.MathUtils.lerp(bird.rotation.z, THREE.MathUtils.clamp(-velocity*.09,-.62,.72), .12); wing.rotation.z = Math.sin(elapsed*22)*.35;
  pipes.forEach(p => {
    p.group.position.z += dt * 5.1;
    if (p.group.position.z > 7) { p.group.position.z -= 42; p.scored = false; }
    if (!p.scored && p.group.position.z > 3) { p.scored = true; point(); }
    if (Math.abs(p.group.position.z - bird.position.z) < .86) {
      const bottomLip = p.group.children[0].children[1].position.y, topLip = p.group.children[1].children[1].position.y;
      if (bird.position.y - .48 < bottomLip + .25 || bird.position.y + .48 > topLip - .25) endGame();
    }
  });
  if (bird.position.y < -4.45 || bird.position.y > 7.6) endGame();
}
function loop(now) { const dt = Math.min((now-lastTime)/1000,.04); lastTime = now; update(dt); renderer.render(scene,camera); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
$('#start-button').addEventListener('click', start); $('#restart-button').addEventListener('click', start); canvas.addEventListener('pointerdown', flap);
addEventListener('keydown', event => { if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); flap(); } });
$('#sound-button').addEventListener('click', event => { muted = !muted; event.currentTarget.textContent = muted ? '♩' : '♫'; event.currentTarget.style.opacity = muted ? '.45' : '1'; });
