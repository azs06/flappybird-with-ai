// Flappy Bird mini clone
// Use ES module for clarity

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Scale for high-DPI and keep logical dimensions
let LOG_W = 800, LOG_H = 600;
function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  // prefer explicit attributes, fallback to client size
  const wAttr = canvas.getAttribute('width');
  const hAttr = canvas.getAttribute('height');
  const w = wAttr ? Number(wAttr) : Math.max(300, Math.floor(canvas.clientWidth));
  const h = hAttr ? Number(hAttr) : Math.max(200, Math.floor(canvas.clientHeight));
  LOG_W = w; LOG_H = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
fitCanvas();
window.addEventListener('resize', () => { fitCanvas(); });

// Game constants
const GRAVITY = 900; // px/s^2
const FLAP_V = -300; // px/s impulse
const BIRD_X = 160;
const PIPE_WIDTH = 80;
const PIPE_GAP = 170;
const PIPE_INTERVAL = 1600; // ms between pipes
const PIPE_SPEED = 180; // px/s

let lastTime = 0;
let acc = 0;

const state = {
  running: false,
  started: false,
  gameOver: false,
  score: 0,
  highscore: Number(localStorage.getItem('flappy_high') || 0),
}

// Bird
const bird = {
  x: BIRD_X,
  y: 300,
  w: 34,
  h: 24,
  vy: 0,
  rotation: 0,
}

let pipes = [];
let spawnTimer = 0;

// Background layers
const bg = {
  cloudsOffset: 0,
  groundOffset: 0,
}

// Audio using WebAudio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type){
  const t = audioCtx.currentTime;
  if(type==='flap'){
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(700, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.25);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t+0.25);
  } else if(type==='score'){
    const o1=audioCtx.createOscillator(); const o2=audioCtx.createOscillator(); const g=audioCtx.createGain();
    o1.type='triangle'; o1.frequency.setValueAtTime(880,t);
    o2.type='sine'; o2.frequency.setValueAtTime(1320,t);
    g.gain.setValueAtTime(0.08,t);
    o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    o1.start(t); o2.start(t); o1.stop(t+0.12); o2.stop(t+0.12);
  } else if(type==='hit'){
    const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='square'; o.frequency.setValueAtTime(140,t); g.gain.setValueAtTime(0.2,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.4); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.4);
  }
}

// Input
function flap(){
  if(!state.started){ startGame(); }
  if(state.gameOver) return;
  bird.vy = FLAP_V;
  bird.rotation = -0.6;
  playSound('flap');
}
window.addEventListener('keydown', (e)=>{ if(e.code==='Space') { e.preventDefault(); flap(); } });
canvas.addEventListener('pointerdown', (e)=>{ flap(); });

// UI
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const panelTitle = document.getElementById('panel-title');
const panelSub = document.getElementById('panel-sub');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
highEl.textContent = state.highscore;
startBtn.addEventListener('click', ()=>{ startGame(); });

function startGame(){
  // resume audio context
  if(audioCtx.state==='suspended') audioCtx.resume();
  state.running = true; state.started=true; state.gameOver=false; state.score=0;
  pipes = []; spawnTimer=0; bird.y=300; bird.vy=0; bird.rotation=0; lastTime = performance.now();
  overlay.style.display='none';
}

function endGame(){
  state.gameOver=true; state.running=false; overlay.style.display='flex'; panelTitle.textContent='Game Over'; panelSub.textContent='Click to restart';
  overlay.querySelector('.small .muted');
  if(state.score > state.highscore){ state.highscore = state.score; localStorage.setItem('flappy_high', state.highscore); highEl.textContent = state.highscore; }
  playSound('hit');
}

function spawnPipe(){
  const h = 100 + Math.random()*220; // top pipe height
  const gap = PIPE_GAP;
  pipes.push({ x: LOG_W + 50, hTop: h, gap, passed:false });
}

function update(dt){
  if(!state.running) return;

  // background
  bg.cloudsOffset -= 20 * dt;
  bg.groundOffset -= PIPE_SPEED * dt;

  // bird physics
  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;
  bird.rotation += 4 * dt; // slowly rotate downwards
  if(bird.rotation > 1.2) bird.rotation = 1.2;

  // spawn pipes
  spawnTimer += dt*1000;
  if(spawnTimer >= PIPE_INTERVAL){ spawnTimer -= PIPE_INTERVAL; spawnPipe(); }

  // move pipes
  for(const p of pipes){ p.x -= PIPE_SPEED * dt; }
  // remove offscreen (logical coords)
  pipes = pipes.filter(p=> p.x + PIPE_WIDTH > -50);

  // collisions and scoring
  for(const p of pipes){
    const bx = bird.x, by = bird.y, bw = bird.w, bh = bird.h;
  const topRect = { x:p.x, y:0, w:PIPE_WIDTH, h:p.hTop };
  const bottomRect = { x:p.x, y:p.hTop + p.gap, w:PIPE_WIDTH, h: LOG_H - (p.hTop + p.gap) };
    if(rectIntersect(bx-bw/2, by-bh/2, bw, bh, topRect.x, topRect.y, topRect.w, topRect.h) || rectIntersect(bx-bw/2, by-bh/2, bw, bh, bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h)){
      if(!state.gameOver) endGame();
    }
    // scoring
    if(!p.passed && p.x + PIPE_WIDTH < bird.x - bird.w/2){ p.passed=true; state.score++; scoreEl.textContent = state.score; playSound('score'); }
  }

  // ground collision (logical coords)
  const groundY = LOG_H - 110;
  if(bird.y + bird.h/2 >= groundY){ bird.y = groundY - bird.h/2; if(!state.gameOver) endGame(); }
  if(bird.y - bird.h/2 <= 0){ bird.y = bird.h/2; bird.vy = 0; }
}

function rectIntersect(x1,y1,w1,h1,x2,y2,w2,h2){ return !(x2 > x1 + w1 || x2 + w2 < x1 || y2 > y1 + h1 || y2 + h2 < y1); }

function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W = LOG_W;
  const H = LOG_H;

  // sky gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#80d8e8'); g.addColorStop(1,'#bfeef4');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  // clouds (parallax)
  ctx.fillStyle='rgba(255,255,255,0.85)';
  for(let i=0;i<6;i++){
    const cx = (i*220 + (bg.cloudsOffset*0.4 % 220));
    const cy = 80 + (i%3)*20;
    drawCloud(cx,cy);
  }

  // pipes
  for(const p of pipes){
    ctx.fillStyle='#4db050';
    roundRect(ctx, p.x, 0, PIPE_WIDTH, p.hTop, 6, true, false);
  roundRect(ctx, p.x, p.hTop + p.gap, PIPE_WIDTH, H - (p.hTop + p.gap) - 110, 6, true, false);
    // caps
    ctx.fillStyle='#3b8b3b';
    ctx.fillRect(p.x-6, p.hTop - 12, PIPE_WIDTH+12, 12);
    ctx.fillRect(p.x-6, p.hTop + p.gap, PIPE_WIDTH+12, 12);
  }

  // ground
  const groundY = H - 110;
  ctx.fillStyle='#d7b45e'; ctx.fillRect(0, groundY, W, 110);
  // ground details
  ctx.fillStyle='#c9a652';
  for(let i=0;i<30;i++){ ctx.fillRect(((i*60) + (bg.groundOffset%60)), groundY+70, 40, 12); }

  // bird (simple circle + wing)
  ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rotation);
  // body
  ctx.fillStyle='#ffd34d';
  roundRect(ctx, -bird.w/2, -bird.h/2, bird.w, bird.h, 6, true, false);
  // eye
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(6, -4, 3,0,Math.PI*2); ctx.fill();
  // beak
  ctx.fillStyle='#ff8c2a'; ctx.beginPath(); ctx.moveTo(bird.w/2,0); ctx.lineTo(bird.w/2+8,-5); ctx.lineTo(bird.w/2+8,5); ctx.closePath(); ctx.fill();
  ctx.restore();

  // HUD score drawn big centered
  if(state.started && !state.gameOver){
    ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.font='600 48px Inter, Arial'; ctx.textAlign='center'; ctx.fillText(state.score, W/2, 90);
  }
}

function drawCloud(x,y){
  ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,30,0,Math.PI*2); ctx.arc(x+30,y+6,20,0,Math.PI*2); ctx.arc(x-28,y+6,20,0,Math.PI*2); ctx.fill(); }
function roundRect(ctx,x,y,w,h,r,fill,stroke){ if(typeof r==='undefined') r=5; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// expose for debugging
window.__gb = { state, bird, pipes };

// overlay restart: clicking overlay restarts when game over or before start
overlay.addEventListener('pointerdown', (e)=>{
  if(!state.started || state.gameOver){ startGame(); }
});

