(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const leaderboardEl = document.getElementById('leaderboard');
  const clearScoresBtn = document.getElementById('clearScores');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_H = 82;
  const STORE_KEY = 'flappy-skies-leaderboard-v1';

  const state = {
    mode: 'ready',
    score: 0,
    best: 0,
    frame: 0,
    speed: 156,
    spawnTimer: 0,
    lastTime: 0,
    flash: 0,
    shake: 0,
  };

  const bird = {
    x: 116,
    y: H * 0.42,
    r: 18,
    vy: 0,
    rot: 0,
  };

  let pipes = [];
  let particles = [];
  let clouds = [];
  let leaderboard = loadScores();
  let audioCtx;

  function resetWorld() {
    state.score = 0;
    state.frame = 0;
    state.speed = 156;
    state.spawnTimer = 0.9;
    state.flash = 0;
    state.shake = 0;
    bird.y = H * 0.42;
    bird.vy = 0;
    bird.rot = 0;
    pipes = [];
    particles = [];
    clouds = Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * W,
      y: 38 + Math.random() * 300,
      s: 0.55 + Math.random() * 1.15,
      v: 9 + Math.random() * 16,
      phase: i * 0.7,
    }));
  }

  function startGame() {
    ensureAudio();
    resetWorld();
    state.mode = 'playing';
    hideOverlay();
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    flap();
  }

  function gameOver() {
    if (state.mode === 'gameover') return;
    state.mode = 'gameover';
    state.shake = 16;
    state.flash = 1;
    playSound('hit');
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';

    setTimeout(() => {
      const qualifies = leaderboard.length < 10 || state.score > leaderboard[leaderboard.length - 1].score;
      if (state.score > 0 || qualifies) {
        const raw = prompt(`Game over! Your score: ${state.score}\nEnter your name for the leaderboard:`, 'PIP');
        const name = (raw || 'ANON').trim().slice(0, 12).toUpperCase() || 'ANON';
        addScore(name, state.score);
      }
      showOverlay('Game Over', `Score: ${state.score}. Press Start or R to fly again.`, 'Play Again');
    }, 160);
  }

  function togglePause() {
    if (state.mode === 'playing') {
      state.mode = 'paused';
      pauseBtn.textContent = 'Resume';
      showOverlay('Paused', 'Take a breather. Press P or Resume when ready.', 'Resume');
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      pauseBtn.textContent = 'Pause';
      hideOverlay();
      state.lastTime = performance.now();
    }
  }

  function flap() {
    if (state.mode === 'ready' || state.mode === 'gameover') return startGame();
    if (state.mode === 'paused') return togglePause();
    bird.vy = -355;
    bird.rot = -0.42;
    playSound('flap');
    for (let i = 0; i < 6; i++) {
      particles.push({ x: bird.x - 12, y: bird.y + 6, vx: -80 - Math.random() * 80, vy: (Math.random() - 0.5) * 80, life: 0.35, c: '#fff1a8' });
    }
  }

  function spawnPipe() {
    const gap = Math.max(138, 174 - state.score * 1.6);
    const margin = 78;
    const minCenter = margin + gap / 2;
    const maxCenter = H - GROUND_H - margin - gap / 2;
    const center = minCenter + Math.random() * (maxCenter - minCenter);
    pipes.push({ x: W + 34, w: 72, gapY: center, gap, passed: false });
  }

  function update(dt) {
    state.frame += dt;
    state.speed = Math.min(238, 156 + state.score * 3.5);
    state.flash = Math.max(0, state.flash - dt * 3.5);
    state.shake = Math.max(0, state.shake - dt * 34);

    clouds.forEach(cloud => {
      cloud.x -= cloud.v * dt;
      cloud.phase += dt;
      if (cloud.x < -110) {
        cloud.x = W + 90;
        cloud.y = 35 + Math.random() * 310;
      }
    });

    if (state.mode !== 'playing') return;

    bird.vy += 940 * dt;
    bird.y += bird.vy * dt;
    bird.rot = Math.min(1.2, bird.rot + dt * 2.7 + bird.vy * 0.0008);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnPipe();
      state.spawnTimer = 1.38;
    }

    pipes.forEach(pipe => {
      pipe.x -= state.speed * dt;
      if (!pipe.passed && pipe.x + pipe.w < bird.x - bird.r) {
        pipe.passed = true;
        state.score += 1;
        playSound('score');
        for (let i = 0; i < 12; i++) particles.push({ x: bird.x, y: bird.y, vx: (Math.random() - 0.5) * 170, vy: -70 - Math.random() * 100, life: 0.55, c: '#61f2a1' });
      }
    });
    pipes = pipes.filter(pipe => pipe.x > -pipe.w - 20);

    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);

    if (bird.y - bird.r < 0 || bird.y + bird.r > H - GROUND_H || pipes.some(hitPipe)) gameOver();
  }

  function hitPipe(pipe) {
    const inX = bird.x + bird.r > pipe.x && bird.x - bird.r < pipe.x + pipe.w;
    if (!inX) return false;
    const topBottom = pipe.gapY - pipe.gap / 2;
    const bottomTop = pipe.gapY + pipe.gap / 2;
    return bird.y - bird.r < topBottom || bird.y + bird.r > bottomTop;
  }

  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    drawSky();
    drawPipes();
    drawGround();
    drawParticles();
    drawBird();
    drawHud();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#45c7ff');
    grad.addColorStop(0.55, '#7b6cff');
    grad.addColorStop(1, '#18224c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = 0; i < 70; i++) {
      const x = (i * 83 + state.frame * 12) % W;
      const y = (i * 47) % 410;
      ctx.fillRect(x, y, 2, 2);
    }

    clouds.forEach(c => drawCloud(c.x, c.y + Math.sin(c.phase) * 4, c.s));

    ctx.fillStyle = 'rgba(14, 25, 61, 0.3)';
    for (let i = 0; i < 7; i++) {
      const x = ((i * 95 - state.frame * 22) % (W + 130)) - 90;
      const h = 85 + (i % 3) * 34;
      ctx.beginPath();
      ctx.moveTo(x, H - GROUND_H);
      ctx.lineTo(x + 60, H - GROUND_H - h);
      ctx.lineTo(x + 128, H - GROUND_H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCloud(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(0, 12, 18, 0, Math.PI * 2);
    ctx.arc(22, 4, 24, 0, Math.PI * 2);
    ctx.arc(50, 14, 18, 0, Math.PI * 2);
    ctx.rect(-5, 12, 62, 20);
    ctx.fill();
    ctx.restore();
  }

  function drawPipes() {
    pipes.forEach(pipe => {
      const topH = pipe.gapY - pipe.gap / 2;
      const bottomY = pipe.gapY + pipe.gap / 2;
      drawPipe(pipe.x, 0, pipe.w, topH, true);
      drawPipe(pipe.x, bottomY, pipe.w, H - GROUND_H - bottomY, false);
    });
  }

  function drawPipe(x, y, w, h, flip) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#188b58');
    grad.addColorStop(0.5, '#61f2a1');
    grad.addColorStop(1, '#087546');
    ctx.fillStyle = grad;
    roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const capH = 28;
    const capY = flip ? y + h - capH : y;
    ctx.fillStyle = '#72ffb5';
    roundRect(x - 8, capY, w + 16, capH, 9);
    ctx.fill();
    ctx.strokeStyle = '#087546';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawGround() {
    const y = H - GROUND_H;
    ctx.fillStyle = '#7c4b2a';
    ctx.fillRect(0, y, W, GROUND_H);
    ctx.fillStyle = '#5cff9a';
    ctx.fillRect(0, y, W, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = -40 + ((-state.frame * state.speed) % 40); x < W + 40; x += 40) {
      ctx.fillRect(x, y + 16, 22, 8);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    ctx.fillStyle = '#ffcb3d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a3b00';
    ctx.lineWidth = 3;
    ctx.stroke();

    const wingY = Math.sin(state.frame * 26) * 5;
    ctx.fillStyle = '#ff8a30';
    ctx.beginPath();
    ctx.ellipse(-8, 8 + wingY, 13, 7, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(9, -7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15203c';
    ctx.beginPath();
    ctx.arc(11, -7, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(34, 6);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9b311b';
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawHud() {
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = '900 58px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(11,16,36,0.75)';
    ctx.lineWidth = 8;
    ctx.strokeText(state.score, W / 2, 78);
    ctx.fillStyle = '#fff';
    ctx.fillText(state.score, W / 2, 78);

    ctx.textAlign = 'left';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(`Best: ${leaderboard[0]?.score ?? 0}`, 18, 30);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function showOverlay(title, text, buttonText) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = buttonText;
    overlay.classList.add('show');
  }

  function hideOverlay() {
    overlay.classList.remove('show');
  }

  function loadScores() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch {
      return [];
    }
  }

  function saveScores() {
    localStorage.setItem(STORE_KEY, JSON.stringify(leaderboard));
  }

  function addScore(name, score) {
    leaderboard.push({ name, score, date: new Date().toISOString() });
    leaderboard.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    leaderboard = leaderboard.slice(0, 10);
    saveScores();
    renderLeaderboard();
  }

  function renderLeaderboard() {
    leaderboardEl.innerHTML = '';
    if (!leaderboard.length) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="rank">—</span><span class="name">No flights yet</span><span class="score">0</span>';
      leaderboardEl.appendChild(li);
      return;
    }
    leaderboard.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">#${i + 1}</span><span class="name"></span><span class="score">${entry.score}</span>`;
      li.querySelector('.name').textContent = entry.name;
      leaderboardEl.appendChild(li);
    });
  }

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    if (type === 'flap') {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.12);
    } else if (type === 'score') {
      [523, 784].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq; osc.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.16);
        osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.17);
      });
    } else if (type === 'hit') {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.26);
    }
  }

  startBtn.addEventListener('click', () => state.mode === 'paused' ? togglePause() : startGame());
  pauseBtn.addEventListener('click', togglePause);
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); ensureAudio(); flap(); });
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp'].includes(e.code)) { e.preventDefault(); ensureAudio(); flap(); }
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyR') startGame();
  });
  clearScoresBtn.addEventListener('click', () => {
    if (confirm('Clear the local leaderboard?')) {
      leaderboard = [];
      saveScores();
      renderLeaderboard();
    }
  });

  resetWorld();
  renderLeaderboard();
  requestAnimationFrame(loop);
})();
