// ─────────────────────────────────────────────
//  Flappy Bird — game.js
// ─────────────────────────────────────────────

// ── Canvas setup ──────────────────────────────
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 480, H = 640;
canvas.width = W;
canvas.height = H;

// Compatibility shim for rounded rect (avoids ctx.roundRect which needs Chrome 99+)
function roundRect(x, y, w, h, tlr, trr, brr, blr) {
  ctx.beginPath();
  ctx.moveTo(x + tlr, y);
  ctx.lineTo(x + w - trr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + trr);
  ctx.lineTo(x + w, y + h - brr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - brr, y + h);
  ctx.lineTo(x + blr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - blr);
  ctx.lineTo(x, y + tlr);
  ctx.quadraticCurveTo(x, y, x + tlr, y);
  ctx.closePath();
}

// ── Constants ─────────────────────────────────
const GRAVITY       = 0.45;
const FLAP_VEL      = -9.5;
const PIPE_SPEED    = 2.8;
const PIPE_GAP      = 155;
const PIPE_INTERVAL = 1600;   // ms between pipes
const PIPE_WIDTH    = 58;
const GROUND_H      = 80;
const BIRD_X        = 90;
const BIRD_W        = 38;
const BIRD_H        = 28;
const MAX_SCORES    = 10;
const STORAGE_KEY   = 'flappyLeaderboard_v1';

// ── Game state ────────────────────────────────
const STATE = { START: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3, LEADERBOARD: 4 };
let state   = STATE.START;
let score   = 0;
let bestScore = 0;
let lastTime  = 0;
let lastPipeTime = -PIPE_INTERVAL;

// ── Bird ──────────────────────────────────────
const bird = {
  x: BIRD_X, y: H / 2,
  vy: 0,
  rotation: 0,
  wingAngle: 0,
  wingDir: 1,
  alive: true,
};

function resetBird() {
  bird.x  = BIRD_X;
  bird.y  = H / 2 - 40;
  bird.vy = 0;
  bird.rotation = 0;
  bird.wingAngle = 0;
  bird.alive = true;
}

function flapBird() {
  bird.vy = FLAP_VEL;
  bird.wingAngle = -0.6;
  Audio.flap();
}

// ── Pipes ─────────────────────────────────────
const pipes = [];

function spawnPipe() {
  const minTop = 60;
  const maxTop = H - GROUND_H - PIPE_GAP - 60;
  const topH = minTop + Math.random() * (maxTop - minTop);
  pipes.push({ x: W + PIPE_WIDTH / 2, topH, passed: false });
}

// ── Particles ─────────────────────────────────
const particles = [];

function spawnParticles(x, y, color = '#f5c518') {
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      size: 3 + Math.random() * 4,
      color,
    });
  }
}

// ── Clouds ────────────────────────────────────
const clouds = [];
for (let i = 0; i < 5; i++) {
  clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 160, speed: 0.3 + Math.random() * 0.3, r: 30 + Math.random() * 25 });
}

// ── Ground scroll ─────────────────────────────
let groundX = 0;

// ── Score animation ───────────────────────────
let scoreFlash = 0;

// ── Leaderboard ───────────────────────────────
let leaderboard = [];

function loadLeaderboard() {
  try {
    leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { leaderboard = []; }
  bestScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
}

function saveLeaderboard() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
}

function addToLeaderboard(name, sc) {
  leaderboard.push({ name: name.trim() || 'Player', score: sc });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, MAX_SCORES);
  if (leaderboard[0].score > bestScore) bestScore = leaderboard[0].score;
  saveLeaderboard();
}

function getEntryIndex(name, sc) {
  // find first matching entry (in case of ties, find the one we just added)
  for (let i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].score === sc && leaderboard[i].name === (name.trim() || 'Player')) return i;
  }
  return -1;
}

// ── Drawing helpers ───────────────────────────

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  grad.addColorStop(0,   '#1a8fb5');
  grad.addColorStop(0.5, '#4ec0ca');
  grad.addColorStop(1,   '#b8e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_H);
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(c.x,        c.y,      c.r,        0, Math.PI * 2);
    ctx.arc(c.x + c.r,  c.y - 8,  c.r * 0.75, 0, Math.PI * 2);
    ctx.arc(c.x - c.r,  c.y - 4,  c.r * 0.6,  0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  // brown ground
  ctx.fillStyle = '#c89b3c';
  ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

  // green top strip
  ctx.fillStyle = '#73bf2e';
  ctx.fillRect(0, H - GROUND_H, W, 18);

  // darker green line
  ctx.fillStyle = '#5a9c1f';
  ctx.fillRect(0, H - GROUND_H + 18, W, 4);

  // scrolling dashes
  ctx.fillStyle = '#b07c28';
  const dashW = 24, dashH = 6, dashGap = 40;
  for (let i = 0; i < W / dashGap + 2; i++) {
    const dx = ((i * dashGap - groundX) % (W + dashGap) + W + dashGap) % (W + dashGap) - dashGap;
    ctx.fillRect(dx, H - GROUND_H + 32, dashW, dashH);
  }
}

function drawPipe(p) {
  const x = p.x - PIPE_WIDTH / 2;
  const capW = PIPE_WIDTH + 10;
  const capH = 20;
  const capX = x - 5;

  // Body gradient
  const bodyGrad = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
  bodyGrad.addColorStop(0,    '#5a9c1f');
  bodyGrad.addColorStop(0.35, '#73bf2e');
  bodyGrad.addColorStop(0.7,  '#5a9c1f');
  bodyGrad.addColorStop(1,    '#3d7010');

  // Top pipe (hangs from top)
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(x, 0, PIPE_WIDTH, p.topH - capH);

  // Top pipe cap
  const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
  capGrad.addColorStop(0,    '#5a9c1f');
  capGrad.addColorStop(0.35, '#8fdb3f');
  capGrad.addColorStop(0.7,  '#5a9c1f');
  capGrad.addColorStop(1,    '#3d7010');
  ctx.fillStyle = capGrad;
  roundRect(capX, p.topH - capH, capW, capH, 0, 0, 6, 6);
  ctx.fill();

  // Bottom pipe body
  const botY = p.topH + PIPE_GAP;
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(x, botY + capH, PIPE_WIDTH, H - GROUND_H - botY - capH);

  // Bottom pipe cap
  ctx.fillStyle = capGrad;
  roundRect(capX, botY, capW, capH, 6, 6, 0, 0);
  ctx.fill();

  // Highlight line on pipes
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 8, 0, 6, p.topH - capH);
  ctx.fillRect(x + 8, botY + capH, 6, H - GROUND_H - botY - capH);
}

function drawBird() {
  const bx = bird.x;
  const by = bird.y;
  const rot = Math.max(-0.5, Math.min(1.4, bird.rotation));

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(2, BIRD_H / 2 + 4, BIRD_W / 2 - 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, BIRD_W / 2);
  bodyGrad.addColorStop(0, '#ffe566');
  bodyGrad.addColorStop(0.6, '#f5c518');
  bodyGrad.addColorStop(1, '#c8960c');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_W / 2, BIRD_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing (flapping)
  const wingY = bird.wingAngle * 12;
  ctx.fillStyle = '#e6b800';
  ctx.beginPath();
  ctx.ellipse(-4, wingY, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(11, -7, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#f08c00';
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.lineTo(22, 0);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawScore() {
  const sz = scoreFlash > 0 ? 56 + scoreFlash * 8 : 56;
  ctx.save();
  ctx.font = `900 ${sz}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText(score, W / 2, 72);
  ctx.restore();
}

// ── Collision detection ───────────────────────
function getHitbox() {
  const margin = 5;
  return {
    left:   bird.x - BIRD_W / 2 + margin,
    right:  bird.x + BIRD_W / 2 - margin,
    top:    bird.y - BIRD_H / 2 + margin,
    bottom: bird.y + BIRD_H / 2 - margin,
  };
}

function checkCollision() {
  const hb = getHitbox();

  // Ground / ceiling
  if (hb.bottom >= H - GROUND_H || hb.top <= 0) return true;

  // Pipes
  for (const p of pipes) {
    const pLeft  = p.x - PIPE_WIDTH / 2 - 5;
    const pRight = p.x + PIPE_WIDTH / 2 + 5;
    if (hb.right < pLeft || hb.left > pRight) continue;
    if (hb.top < p.topH || hb.bottom > p.topH + PIPE_GAP) return true;
  }

  return false;
}

// ── Update logic ──────────────────────────────
function update(dt) {
  if (state !== STATE.PLAYING) return;

  // Bird physics
  bird.vy += GRAVITY;
  bird.y  += bird.vy;

  // Rotation: nose-down when falling, level-ish when rising
  bird.rotation += (bird.vy * 0.04 - bird.rotation) * 0.12;

  // Wing flap animation
  bird.wingAngle += bird.wingDir * 0.12;
  if (bird.wingAngle >  0.6) bird.wingDir = -1;
  if (bird.wingAngle < -0.6) bird.wingDir =  1;

  // Clouds parallax
  for (const c of clouds) {
    c.x -= c.speed;
    if (c.x < -c.r * 3) { c.x = W + c.r; c.y = 40 + Math.random() * 160; }
  }

  // Ground scroll
  groundX = (groundX + PIPE_SPEED * 0.9) % 40;

  // Score flash decay
  if (scoreFlash > 0) scoreFlash = Math.max(0, scoreFlash - 2);

  // Spawn pipes
  const now = performance.now();
  if (now - lastPipeTime >= PIPE_INTERVAL) {
    spawnPipe();
    lastPipeTime = now;
  }

  // Move pipes & score
  for (const p of pipes) {
    p.x -= PIPE_SPEED;
    if (!p.passed && p.x + PIPE_WIDTH / 2 < bird.x) {
      p.passed = true;
      score++;
      scoreFlash = 8;
      Audio.score();
      spawnParticles(bird.x, bird.y, '#f5c518');
    }
  }

  // Remove off-screen pipes
  while (pipes.length > 0 && pipes[0].x < -PIPE_WIDTH) pipes.shift();

  // Particles
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  // Collision
  if (checkCollision()) {
    Audio.hit();
    setTimeout(() => Audio.die(), 120);
    spawnParticles(bird.x, bird.y, '#ff4444');
    triggerGameOver();
  }
}

// ── Render ────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawClouds();

  for (const p of pipes) drawPipe(p);

  drawGround();
  drawParticles();

  if (state !== STATE.START) drawBird();
  if (state === STATE.PLAYING || state === STATE.PAUSED) drawScore();
}

// ── Game loop ─────────────────────────────────
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50); // cap dt to avoid spiral of death
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ── State transitions ─────────────────────────
function startGame() {
  score = 0;
  pipes.length = 0;
  particles.length = 0;
  lastPipeTime = -PIPE_INTERVAL;
  resetBird();
  scoreFlash = 0;
  showScreen(null);
  el('hud').classList.remove('hidden');
  el('score-display').textContent = '0';
  state = STATE.PLAYING;
}

function triggerGameOver() {
  state = STATE.GAMEOVER;
  bird.alive = false;
  el('hud').classList.add('hidden');

  el('go-score').textContent = score;
  if (score > bestScore) bestScore = score;
  el('go-best').textContent = bestScore;

  el('btn-save').classList.remove('hidden');
  el('name-entry').classList.remove('hidden');
  el('btn-restart').classList.add('hidden');
  el('player-name').value = '';

  showScreen('screen-gameover');
  setTimeout(() => el('player-name').focus(), 100);
}

function pauseGame() {
  if (state !== STATE.PLAYING) return;
  state = STATE.PAUSED;
  showScreen('screen-pause');
  el('hud').classList.add('hidden');
}

function resumeGame() {
  if (state !== STATE.PAUSED) return;
  state = STATE.PLAYING;
  showScreen(null);
  el('hud').classList.remove('hidden');
}

// ── UI helpers ────────────────────────────────
function el(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'visible');
    if (s.id !== 'hud') s.classList.add('hidden');
  });
  if (id) {
    const s = el(id);
    s.classList.remove('hidden');
    s.classList.add('active');
  }
}

function showLeaderboard(fromGameOver = false) {
  state = STATE.LEADERBOARD;
  el('hud').classList.add('hidden');
  renderLeaderboard(fromGameOver ? getEntryIndex(
    el('player-name') ? el('player-name').value : '',
    score) : -1);
  showScreen('screen-leaderboard');
}

function renderLeaderboard(highlightIdx = -1) {
  const list = el('lb-list');
  list.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  leaderboard.forEach((entry, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('current-entry');
    li.innerHTML = `
      <span class="rank">${medals[i] || (i + 1)}</span>
      <span class="lb-name">${escapeHtml(entry.name)}</span>
      <span class="lb-score">${entry.score}</span>`;
    list.appendChild(li);
  });
  if (leaderboard.length === 0) {
    list.innerHTML = '<li style="justify-content:center;color:#888">No scores yet</li>';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Input ─────────────────────────────────────
function handleAction() {
  if (state === STATE.START) { startGame(); return; }
  if (state === STATE.PLAYING) { flapBird(); return; }
  if (state === STATE.GAMEOVER || state === STATE.LEADERBOARD) return; // handled by buttons
}

document.addEventListener('keydown', e => {
  const key = e.code || e.key;
  if (key === 'Space' || key === 'ArrowUp') { e.preventDefault(); handleAction(); return; }
  if ((key === 'KeyP' || key === 'Escape') && state === STATE.PLAYING)  { pauseGame(); return; }
  if ((key === 'KeyP' || key === 'Escape') && state === STATE.PAUSED)   { resumeGame(); return; }
  if (key === 'Enter' && state === STATE.GAMEOVER) {
    el('btn-save').click();
  }
});

canvas.addEventListener('click', handleAction);
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleAction(); }, { passive: false });

el('screen-start').addEventListener('click', handleAction);
el('screen-start').addEventListener('touchstart', e => { e.preventDefault(); handleAction(); }, { passive: false });

el('btn-pause').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
el('btn-resume').addEventListener('click', resumeGame);
el('btn-pause-quit').addEventListener('click', () => {
  state = STATE.START;
  el('hud').classList.add('hidden');
  showScreen('screen-start');
});

el('btn-save').addEventListener('click', () => {
  const name = el('player-name').value.trim() || 'Player';
  addToLeaderboard(name, score);
  el('name-entry').classList.add('hidden');
  el('btn-save').classList.add('hidden');
  el('btn-restart').classList.remove('hidden');
  el('go-best').textContent = bestScore;
});

el('btn-restart').addEventListener('click', startGame);

el('btn-leaderboard').addEventListener('click', () => showLeaderboard(false));

el('btn-lb-play').addEventListener('click', startGame);
el('btn-lb-back').addEventListener('click', () => {
  if (bird.alive === false) {
    showScreen('screen-gameover');
    state = STATE.GAMEOVER;
  } else {
    showScreen('screen-start');
    state = STATE.START;
  }
});

// Enter key in name field submits
el('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') el('btn-save').click();
});

// Prevent canvas click from triggering when interacting with overlaid buttons
document.querySelectorAll('.overlay-box, #screen-pause, #screen-leaderboard, #screen-gameover')
  .forEach(node => node.addEventListener('click', e => e.stopPropagation()));

// ── Init ──────────────────────────────────────
loadLeaderboard();
showScreen('screen-start');
el('hud').classList.add('hidden');
resetBird();

// kick off render loop (update only runs in PLAYING state)
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
