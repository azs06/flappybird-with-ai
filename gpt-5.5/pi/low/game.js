const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const primaryBtn = document.getElementById('primaryBtn');
const pauseBtn = document.getElementById('pauseBtn');
const scoreList = document.getElementById('scoreList');
const resetScores = document.getElementById('resetScores');

const W = canvas.width, H = canvas.height, GROUND = 82, STORE = 'skyChirpLeaderboard';
const cfg = { gravity: 1650, flap: -500, pipeSpeed: 170, pipeW: 72, gap: 158, spawn: 1.42 };
const bird = { x: 112, y: 260, r: 18, vy: 0, rot: 0 };
let state = 'ready', score = 0, best = 0, last = 0, clock = 0, spawnTimer = 0;
let pipes = [], particles = [], audio;

function scores() { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
function saveScores(list) { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 10))); renderScores(); }
function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function renderScores() {
  const list = scores();
  best = list[0]?.score || 0;
  scoreList.innerHTML = list.length
    ? list.map((s, i) => `<li><span>${i + 1}. ${escapeHtml(s.name)}</span><span>${s.score}</span></li>`).join('')
    : '<li class="empty">No flights yet</li>';
}

function beep(type) {
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  const [freq, dur, wave, vol] = { flap:[520,.06,'square',.045], score:[880,.13,'sine',.06], hit:[90,.24,'sawtooth',.12] }[type];
  const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
  osc.type = wave; osc.frequency.setValueAtTime(freq, now);
  if (type === 'hit') osc.frequency.exponentialRampToValueAtTime(35, now + dur);
  gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(.001, now + dur);
  osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + dur);
}

function resetGame() {
  state = 'playing'; score = 0; clock = 0; spawnTimer = cfg.spawn * .55; pipes = []; particles = [];
  Object.assign(bird, { y: 260, vy: 0, rot: 0 });
  overlay.classList.add('hidden'); pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
  last = performance.now();
}
function flap() {
  if (state === 'ready' || state === 'gameover') { resetGame(); beep('flap'); return; }
  if (state !== 'playing') return;
  bird.vy = cfg.flap; bird.rot = -0.55; beep('flap');
  for (let i = 0; i < 7; i++) particles.push({ x: bird.x - 12, y: bird.y + 8, vx: -80 - Math.random() * 80, vy: (Math.random() - .5) * 90, a: 1 });
}
function togglePause() {
  if (!['playing', 'paused'].includes(state)) return;
  state = state === 'playing' ? 'paused' : 'playing';
  pauseBtn.textContent = state === 'paused' ? 'Resume' : 'Pause';
  overlayTitle.textContent = 'Paused'; overlayText.textContent = 'Take a breather. Press P to resume.'; primaryBtn.textContent = 'Resume';
  overlay.classList.toggle('hidden', state !== 'paused'); last = performance.now();
}
function spawnPipe() {
  const top = 70 + Math.random() * (H - GROUND - cfg.gap - 160);
  pipes.push({ x: W + 20, top, bottom: top + cfg.gap, passed: false });
}
function endGame() {
  if (state === 'gameover') return;
  state = 'gameover'; beep('hit'); pauseBtn.disabled = true;
  setTimeout(() => {
    const name = (prompt(`Game over! Score: ${score}\nEnter your name or initials:`, 'ACE') || 'ANON').trim().slice(0, 12).toUpperCase();
    saveScores([...scores(), { name, score }].sort((a, b) => b.score - a.score));
    overlayTitle.textContent = 'Game Over'; overlayText.textContent = `Score ${score} · Best ${Math.max(best, score)}`; primaryBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }, 120);
}

function update(dt) {
  if (state !== 'playing') return;
  clock += dt; spawnTimer += dt;
  bird.vy += cfg.gravity * dt; bird.y += bird.vy * dt; bird.rot = Math.min(1.2, bird.rot + 2.8 * dt);
  if (spawnTimer > cfg.spawn) { spawnTimer = 0; spawnPipe(); }
  for (const p of pipes) {
    p.x -= cfg.pipeSpeed * dt;
    if (!p.passed && p.x + cfg.pipeW < bird.x) { p.passed = true; score++; beep('score'); }
  }
  pipes = pipes.filter(p => p.x > -cfg.pipeW - 10);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 2.4; });
  particles = particles.filter(p => p.a > 0);
  if (bird.y - bird.r < 0 || bird.y + bird.r > H - GROUND) endGame();
  for (const p of pipes) {
    const withinX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + cfg.pipeW;
    if (withinX && (bird.y - bird.r < p.top || bird.y + bird.r > p.bottom)) endGame();
  }
}

function drawPipe(p) {
  ctx.fillStyle = '#16a34a'; ctx.strokeStyle = '#0f7a37'; ctx.lineWidth = 5;
  [[0, p.top], [p.bottom, H - GROUND - p.bottom]].forEach(([y, h]) => { ctx.fillRect(p.x, y, cfg.pipeW, h); ctx.strokeRect(p.x, y, cfg.pipeW, h); });
  ctx.fillStyle = '#22c55e'; ctx.fillRect(p.x - 8, p.top - 24, cfg.pipeW + 16, 24); ctx.fillRect(p.x - 8, p.bottom, cfg.pipeW + 16, 24);
}
function drawBird() {
  ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rot);
  ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 17, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(-8, 5, 12, 8, -.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -7, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(10, -7, 2, 0, 7); ctx.fill();
  ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(20, -1); ctx.lineTo(36, 4); ctx.lineTo(20, 10); ctx.closePath(); ctx.fill(); ctx.restore();
}
function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#75d7ff'); g.addColorStop(.65, '#c7f9ff'); g.addColorStop(1, '#b5f48c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 5; i++) { const x = ((i * 130 - clock * 22) % (W + 150) + W + 150) % (W + 150) - 80; ctx.beginPath(); ctx.ellipse(x, 90 + i * 35, 42, 16, 0, 0, 7); ctx.ellipse(x + 34, 88 + i * 35, 30, 13, 0, 0, 7); ctx.fill(); }
  pipes.forEach(drawPipe);
  ctx.fillStyle = '#58b947'; ctx.fillRect(0, H - GROUND, W, GROUND);
  ctx.fillStyle = '#8bd45b'; for (let x = -40 + ((clock * cfg.pipeSpeed) % 40); x < W; x += 40) ctx.fillRect(x, H - GROUND, 24, 10);
  particles.forEach(p => { ctx.globalAlpha = p.a; ctx.fillStyle = '#fff7ad'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
  drawBird();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 6; ctx.font = '900 54px system-ui'; ctx.textAlign = 'center'; ctx.strokeText(score, W / 2, 78); ctx.fillText(score, W / 2, 78);
  ctx.font = '800 16px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(15,50,79,.75)'; ctx.fillText(`Best ${best}`, 16, 30);
}
function loop(t) { const dt = Math.min((t - last) / 1000 || 0, .033); last = t; update(dt); draw(); requestAnimationFrame(loop); }

primaryBtn.onclick = () => state === 'paused' ? togglePause() : resetGame();
pauseBtn.onclick = togglePause;
resetScores.onclick = () => confirm('Clear all high scores?') && saveScores([]);
addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); flap(); } if (e.code === 'KeyP') togglePause(); });
canvas.addEventListener('pointerdown', flap);

renderScores();
requestAnimationFrame(loop);
