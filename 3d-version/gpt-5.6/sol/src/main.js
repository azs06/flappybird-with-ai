import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#game');
const ui = {
  intro: document.querySelector('#intro'), gameover: document.querySelector('#gameover'),
  paused: document.querySelector('#paused'), hud: document.querySelector('#hud'),
  score: document.querySelector('#score'), best: document.querySelector('#bestScore'),
  finalScore: document.querySelector('#finalScore'), finalBest: document.querySelector('#finalBest'),
  newBest: document.querySelector('#newBest'), flash: document.querySelector('#flash'),
  start: document.querySelector('#startButton'), restart: document.querySelector('#restartButton'),
  pause: document.querySelector('#pauseButton'), sound: document.querySelector('#soundButton')
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8fdcf1, 0.022);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 1.2, 14);
camera.lookAt(0, .2, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const hemi = new THREE.HemisphereLight(0xe5fbff, 0x3f7f91, 2.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2cc, 4.2);
sun.position.set(-7, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
scene.add(sun);

const MAT = {
  yellow: new THREE.MeshStandardMaterial({ color: 0xffd84d, roughness: .62 }),
  yellowDark: new THREE.MeshStandardMaterial({ color: 0xe7a932, roughness: .7 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xfff8da, roughness: .75 }),
  coral: new THREE.MeshStandardMaterial({ color: 0xff765f, roughness: .55 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x102f3b, roughness: .65 }),
  mint: new THREE.MeshStandardMaterial({ color: 0x4dbf9c, roughness: .58 }),
  mintDark: new THREE.MeshStandardMaterial({ color: 0x288a7c, roughness: .72 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 }),
  island: new THREE.MeshStandardMaterial({ color: 0xb6d772, roughness: .9 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6a8e8f, roughness: 1 })
};

function mesh(geo, mat, parent, pos = [0,0,0], scale = [1,1,1]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

function makeBird() {
  const bird = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(.58, 18, 14), MAT.yellow, bird, [0,0,0], [1.2,.88,.9]);
  body.rotation.z = -.08;
  mesh(new THREE.SphereGeometry(.42, 16, 12), MAT.cream, bird, [.18,-.24,.25], [.86,.58,.35]);
  const head = mesh(new THREE.SphereGeometry(.43, 16, 12), MAT.yellow, bird, [.52,.25,.03], [1,.95,.9]);
  const eyeWhite = mesh(new THREE.SphereGeometry(.145, 12, 10), MAT.white, bird, [.77,.38,.27], [1,.98,.48]);
  mesh(new THREE.SphereGeometry(.072, 10, 8), MAT.ink, eyeWhite, [.22,.02,.45], [1,1,.65]);
  const beak = mesh(new THREE.ConeGeometry(.19,.55,4), MAT.coral, bird, [1.02,.15,.02], [1,.85,1]);
  beak.rotation.z = -Math.PI / 2;
  const wing = mesh(new THREE.SphereGeometry(.4, 14, 10), MAT.yellowDark, bird, [-.2,.02,.5], [1,.38,.72]);
  wing.rotation.z = -.45;
  const tail = mesh(new THREE.ConeGeometry(.24,.48,4), MAT.coral, bird, [-.72,.02,0], [1,.9,1]);
  tail.rotation.z = Math.PI / 2;
  bird.userData = { wing, body, eyeWhite };
  scene.add(bird); return bird;
}

const bird = makeBird();
bird.position.set(-2.4,.5,0);

const world = new THREE.Group(); scene.add(world);
const pipeGroup = new THREE.Group(); world.add(pipeGroup);
const decorGroup = new THREE.Group(); world.add(decorGroup);
const cloudGroup = new THREE.Group(); world.add(cloudGroup);
const particleGroup = new THREE.Group(); world.add(particleGroup);

function makeCloud(x,y,z,s=1) {
  const g = new THREE.Group();
  [[0,0,0,.65],[.52,.05,0,.46],[-.5,-.05,.05,.4],[.1,.32,0,.48]].forEach(([px,py,pz,sc]) => {
    const c = mesh(new THREE.SphereGeometry(1, 10, 8), MAT.white, g, [px,py,pz], [sc,sc*.62,sc]); c.castShadow = false;
  });
  g.position.set(x,y,z); g.scale.setScalar(s); g.userData.speed = .15 + Math.random()*.15; cloudGroup.add(g);
}
for (let i=0;i<14;i++) makeCloud(-12+Math.random()*25, -1+Math.random()*8, -8-Math.random()*32, .6+Math.random()*1.5);

function makeIsland(x,y,z,s) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(1.5, .25, 2.4, 7), MAT.rock, g, [0,-.7,0]);
  mesh(new THREE.CylinderGeometry(1.52, 1.45, .35, 7), MAT.island, g, [0,.62,0]);
  for(let i=0;i<3;i++) {
    const trunk = mesh(new THREE.CylinderGeometry(.06,.09,.55,6), MAT.ink, g, [(-.5+i*.5),.95,(i%2)*.3]);
    const crown = mesh(new THREE.ConeGeometry(.28,.65,7), MAT.mintDark, g, [trunk.position.x,1.35,trunk.position.z]);
  }
  g.position.set(x,y,z); g.scale.setScalar(s); decorGroup.add(g);
}
makeIsland(6,-4,-14,1.1); makeIsland(-7,-5,-20,1.8); makeIsland(13,-3,-30,1.35); makeIsland(-14,-3,-35,1);

const ocean = mesh(new THREE.PlaneGeometry(160,160,1,1), new THREE.MeshStandardMaterial({color:0x4ba8bd,roughness:.35,metalness:.05,transparent:true,opacity:.6}), world, [0,-6,-30]);
ocean.rotation.x = -Math.PI/2; ocean.receiveShadow = true;

const pipes = [];
function createPipe(x, gapY, gapSize) {
  const pair = new THREE.Group();
  const radius = .9, height = 9;
  const lowerTop = gapY - gapSize/2;
  const upperBottom = gapY + gapSize/2;
  const lower = mesh(new THREE.CylinderGeometry(radius,radius,height,12), MAT.mint, pair, [0,lowerTop-height/2,0]);
  const upper = mesh(new THREE.CylinderGeometry(radius,radius,height,12), MAT.mint, pair, [0,upperBottom+height/2,0]);
  const rimGeo = new THREE.CylinderGeometry(1.08,1.08,.42,12);
  const lr = mesh(rimGeo,MAT.mintDark,pair,[0,lowerTop-.2,0]);
  const ur = mesh(rimGeo,MAT.mintDark,pair,[0,upperBottom+.2,0]);
  [lower,upper,lr,ur].forEach(m => m.receiveShadow = true);
  for (const sy of [lowerTop-.2, upperBottom+.2]) {
    const ring = mesh(new THREE.TorusGeometry(1.1,.055,6,24),MAT.cream,pair,[0,sy,0]); ring.rotation.x = Math.PI/2;
  }
  pair.position.set(x,0,0); pair.userData = { gapY, gapSize, scored:false };
  pipeGroup.add(pair); pipes.push(pair); return pair;
}

const trail = [];
for(let i=0;i<18;i++) {
  const p = mesh(new THREE.TetrahedronGeometry(.055 + Math.random()*.04), i%3===0?MAT.coral:MAT.cream, particleGroup);
  p.visible=false; trail.push({mesh:p, life:0});
}
let trailCursor=0;

let state='ready', score=0, best=Number(localStorage.getItem('skybound-best')||0), velocity=0, elapsed=0, spawnTimer=0, shake=0;
let muted=false, audioCtx=null;
ui.best.textContent=best;

function tone(freq, duration, type='sine', volume=.08, slide=0) {
  if(muted) return;
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,audioCtx.currentTime); if(slide) o.frequency.exponentialRampToValueAtTime(slide,audioCtx.currentTime+duration);
  g.gain.setValueAtTime(volume,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+duration);
}

function reset() {
  pipes.forEach(p=>pipeGroup.remove(p)); pipes.length=0;
  score=0; ui.score.textContent='0'; velocity=0; spawnTimer=1.1; elapsed=0;
  bird.position.set(-2.4,.5,0); bird.rotation.set(0,0,0); camera.position.set(0,1.2,14);
  ui.gameover.hidden=true; ui.intro.hidden=true; ui.paused.hidden=true; ui.hud.classList.add('visible');
  state='playing'; tone(420,.1,'sine',.06,650);
}

function flap() {
  if(state==='ready' || state==='gameover') return reset();
  if(state!=='playing') return;
  velocity=5.3; shake=.07; tone(310,.09,'triangle',.065,560);
  bird.userData.wing.rotation.z=-1.2;
}

function gameOver() {
  if(state!=='playing') return;
  state='gameover'; shake=.75; tone(150,.45,'sawtooth',.09,55);
  const oldBest=best; best=Math.max(best,score); localStorage.setItem('skybound-best',best);
  ui.best.textContent=best; ui.finalScore.textContent=score; ui.finalBest.textContent=best; ui.newBest.hidden=!(score>oldBest);
  ui.hud.classList.remove('visible'); ui.gameover.hidden=false;
  ui.flash.classList.remove('go'); void ui.flash.offsetWidth; ui.flash.classList.add('go');
}

function addScore() {
  score++; ui.score.textContent=score; ui.score.classList.remove('bump'); void ui.score.offsetWidth; ui.score.classList.add('bump');
  tone(620,.12,'sine',.055,920); setTimeout(()=>tone(920,.1,'sine',.035,1100),55);
}

function togglePause() {
  if(state==='playing') { state='paused'; ui.paused.hidden=false; }
  else if(state==='paused') { state='playing'; ui.paused.hidden=true; }
}

ui.start.addEventListener('click',e=>{e.stopPropagation();reset()});
ui.restart.addEventListener('click',e=>{e.stopPropagation();reset()});
ui.pause.addEventListener('click',e=>{e.stopPropagation();togglePause()});
ui.sound.addEventListener('click',e=>{e.stopPropagation();muted=!muted;ui.sound.classList.toggle('muted',muted)});
addEventListener('pointerdown',e=>{if(!e.target.closest('button,a')) flap()});
addEventListener('keydown',e=>{
  if(['Space','ArrowUp'].includes(e.code)){e.preventDefault();flap()}
  if(e.code==='KeyP'||e.code==='Escape') togglePause();
  if(e.code==='KeyR'&&state==='gameover') reset();
  if(e.code==='KeyM'){muted=!muted;ui.sound.classList.toggle('muted',muted)}
});

function spawnTrail() {
  const t=trail[trailCursor++%trail.length]; t.mesh.visible=true; t.life=1;
  t.mesh.position.copy(bird.position); t.mesh.position.x-=.55; t.mesh.position.y+=(Math.random()-.5)*.22; t.mesh.position.z+=(Math.random()-.5)*.25;
  t.mesh.scale.setScalar(.7+Math.random()*.8);
}

function update(dt) {
  elapsed+=dt;
  cloudGroup.children.forEach(c=>{ c.position.x-=c.userData.speed*dt; if(c.position.x<-15)c.position.x=15; });
  ocean.position.y=-6+Math.sin(elapsed*.5)*.08;
  decorGroup.rotation.y=Math.sin(elapsed*.06)*.025;

  if(state==='ready') {
    bird.position.y=.55+Math.sin(elapsed*2.1)*.22; bird.rotation.z=Math.sin(elapsed*2.1)*.06;
    bird.userData.wing.rotation.z=-.35+Math.sin(elapsed*6)*.35;
  }
  if(state==='playing') {
    velocity-=12.5*dt; bird.position.y+=velocity*dt;
    bird.rotation.z=THREE.MathUtils.lerp(bird.rotation.z,THREE.MathUtils.clamp(velocity*.08,-.72,.38),dt*7);
    bird.userData.wing.rotation.z=THREE.MathUtils.lerp(bird.userData.wing.rotation.z,-.15+Math.sin(elapsed*22)*.32,dt*12);
    spawnTimer-=dt;
    if(spawnTimer<=0){ createPipe(10,-.15+(Math.random()-.5)*4.4,3.25); spawnTimer=Math.max(1.42,1.8-score*.012); }
    pipes.forEach(p=>{
      p.position.x-=(4.1+Math.min(score*.035,1.1))*dt; p.rotation.y=Math.sin(elapsed*.7+p.position.x)*.018;
      const dx=Math.abs(p.position.x-bird.position.x), gy=p.userData.gapY, half=p.userData.gapSize/2;
      if(!p.userData.scored&&p.position.x<bird.position.x){p.userData.scored=true;addScore()}
      if(dx<1.16&&(bird.position.y+.42>gy+half||bird.position.y-.42<gy-half)) gameOver();
    });
    while(pipes[0]&&pipes[0].position.x<-11){pipeGroup.remove(pipes[0]);pipes.shift()}
    if(bird.position.y<-5.1||bird.position.y>6.8) gameOver();
    if(Math.random()<dt*18) spawnTrail();
  }
  if(state==='gameover') {
    velocity-=15*dt; bird.position.y=Math.max(-5.2,bird.position.y+velocity*dt); bird.rotation.z-=dt*2.8;
  }
  trail.forEach(t=>{ if(t.life>0){t.life-=dt*1.9;t.mesh.position.x-=dt*1.25;t.mesh.rotation.x+=dt*4;t.mesh.rotation.y+=dt*3;t.mesh.scale.multiplyScalar(.97);if(t.life<=0)t.mesh.visible=false;} });
  if(shake>0){shake=Math.max(0,shake-dt*2.5);camera.position.x=(Math.random()-.5)*shake;camera.position.y=1.2+(Math.random()-.5)*shake;}
  else {camera.position.x=THREE.MathUtils.lerp(camera.position.x,0,dt*5);camera.position.y=THREE.MathUtils.lerp(camera.position.y,1.2+bird.position.y*.035,dt*2)}
  camera.lookAt(0,.2,0);
}

const clock=new THREE.Clock();
function animate(){ requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),.033); if(state!=='paused')update(dt); renderer.render(scene,camera); }
animate();

addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); });
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause()});
