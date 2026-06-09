(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreValue = document.getElementById('scoreValue');
  const bestValue = document.getElementById('bestValue');
  const messagePanel = document.getElementById('messagePanel');
  const messageTitle = document.getElementById('messageTitle');
  const messageText = document.getElementById('messageText');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const muteButton = document.getElementById('muteButton');
  const clearScoresButton = document.getElementById('clearScoresButton');
  const leaderboardList = document.getElementById('leaderboardList');
  const scoreDialog = document.getElementById('scoreDialog');
  const scoreForm = document.getElementById('scoreForm');
  const finalScore = document.getElementById('finalScore');
  const playerName = document.getElementById('playerName');

  const STORAGE_KEY = 'flappy-skies-leaderboard-v1';
  const W = 432;
  const H = 768;
  const groundHeight = 96;
  const floorY = H - groundHeight;

  const state = {
    mode: 'ready',
    score: 0,
    frameTime: 0,
    elapsed: 0,
    pipeTimer: 0,
    nextPipeIn: 1.05,
    shake: 0,
    muted: false,
    savedThisRound: false,
    roundId: 0,
    leaderboard: [],
    clouds: [],
    hills: [],
    groundOffset: 0,
  };

  const bird = {
    x: 118,
    y: 310,
    radius: 18,
    velocity: 0,
    rotation: 0,
    flapPhase: 0,
  };

  const physics = {
    gravity: 1560,
    flapVelocity: -455,
    terminalVelocity: 640,
    pipeSpeed: 158,
    pipeWidth: 76,
    pipeGap: 178,
  };

  let pipes = [];
  let audioContext = null;
  let lastTimestamp = 0;

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loadLeaderboard() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      state.leaderboard = Array.isArray(saved)
        ? saved.filter(entry => entry && typeof entry.name === 'string' && Number.isFinite(entry.score)).slice(0, 10)
        : [];
    } catch {
      state.leaderboard = [];
    }
    renderLeaderboard();
  }

  function saveLeaderboard() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaderboard.slice(0, 10)));
    renderLeaderboard();
  }

  function bestScore() {
    return state.leaderboard[0]?.score || 0;
  }

  function renderLeaderboard() {
    leaderboardList.innerHTML = '';
    bestValue.textContent = bestScore();

    if (!state.leaderboard.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-scores';
      empty.textContent = 'No flights logged yet. Be the first!';
      leaderboardList.append(empty);
      return;
    }

    state.leaderboard.forEach(entry => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const score = document.createElement('span');
      name.className = 'name';
      score.className = 'score';
      name.textContent = entry.name;
      score.textContent = entry.score;
      item.append(name, score);
      leaderboardList.append(item);
    });
  }

  function resetBird() {
    bird.y = 310;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.flapPhase = 0;
  }

  function resetGame(mode = 'ready') {
    state.mode = mode;
    state.score = 0;
    state.elapsed = 0;
    state.pipeTimer = 0;
    state.nextPipeIn = mode === 'playing' ? 0.65 : 1.05;
    state.groundOffset = 0;
    state.shake = 0;
    state.savedThisRound = false;
    state.roundId += 1;
    pipes = [];
    resetBird();
    updateScore();
    pauseButton.disabled = mode !== 'playing';
    pauseButton.textContent = 'Pause';
    startButton.textContent = mode === 'playing' ? 'Restart' : 'Start';
    setMessage(
      mode === 'playing' ? '' : 'Ready?',
      mode === 'playing' ? '' : 'Press Space, tap, or click to flap and start.',
      mode === 'playing'
    );
  }

  function startGame() {
    unlockAudio();
    resetGame('playing');
    flap();
  }

  function updateScore() {
    scoreValue.textContent = state.score;
    bestValue.textContent = Math.max(bestScore(), state.score);
  }

  function setMessage(title, text, hidden = false) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    messagePanel.classList.toggle('hidden', hidden);
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    pauseButton.textContent = 'Resume';
    startButton.textContent = 'Resume';
    setMessage('Paused', 'Press P, Resume, or tap Resume to continue.');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    pauseButton.textContent = 'Pause';
    startButton.textContent = 'Restart';
    setMessage('', '', true);
    lastTimestamp = performance.now();
  }

  function togglePause() {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  }

  function gameOver() {
    if (state.mode === 'gameover') return;
    state.mode = 'gameover';
    state.shake = 16;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';
    startButton.textContent = 'Restart';
    setMessage('Crashed!', 'Save your score, then press R or Start for another flight.');
    playSound('hit');
    const roundId = state.roundId;
    window.setTimeout(() => {
      if (state.roundId === roundId && state.mode === 'gameover') promptForScore();
    }, 350);
  }

  function promptForScore() {
    if (state.savedThisRound || scoreDialog.open) return;
    finalScore.textContent = state.score;
    const previousName = localStorage.getItem('flappy-skies-last-name') || '';
    playerName.value = previousName;
    if (typeof scoreDialog.showModal === 'function') {
      scoreDialog.showModal();
      playerName.focus();
      playerName.select();
    } else {
      const name = window.prompt(`Game over! Score: ${state.score}\nName or initials:`, previousName || 'ACE');
      recordScore(name);
    }
  }

  function recordScore(name) {
    if (state.savedThisRound) return;
    const cleaned = String(name || 'BIRD').trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 12) || 'BIRD';
    state.savedThisRound = true;
    localStorage.setItem('flappy-skies-last-name', cleaned);
    state.leaderboard.push({ name: cleaned, score: state.score, date: new Date().toISOString() });
    state.leaderboard.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
    state.leaderboard = state.leaderboard.slice(0, 10);
    saveLeaderboard();
  }

  function spawnPipe() {
    const difficulty = Math.min(state.score / 18, 1);
    const gap = physics.pipeGap - difficulty * 34;
    const margin = 76;
    const usable = floorY - margin * 2 - gap;
    const gapY = margin + gap / 2 + Math.random() * usable;
    pipes.push({
      x: W + 8,
      width: physics.pipeWidth,
      gapY,
      gap,
      passed: false,
      wiggle: Math.random() * Math.PI * 2,
    });
    state.nextPipeIn = 1.36 + Math.random() * 0.18;
  }

  function flap() {
    unlockAudio();
    if (state.mode === 'ready' || state.mode === 'gameover') {
      startGame();
      return;
    }
    if (state.mode === 'paused') {
      resumeGame();
      return;
    }
    if (state.mode !== 'playing') return;
    bird.velocity = physics.flapVelocity;
    bird.flapPhase = 1;
    playSound('flap');
  }

  function update(dt) {
    state.elapsed += dt;

    if (state.mode === 'ready') {
      bird.y = 310 + Math.sin(state.elapsed * 3.1) * 10;
      bird.rotation = Math.sin(state.elapsed * 2.5) * 0.08;
      state.groundOffset = (state.groundOffset + 42 * dt) % 48;
      return;
    }

    if (state.mode === 'paused') return;

    if (state.mode === 'playing') {
      state.pipeTimer += dt;
      if (state.pipeTimer >= state.nextPipeIn) {
        state.pipeTimer = 0;
        spawnPipe();
      }
    }

    const speed = physics.pipeSpeed + Math.min(state.score, 25) * 2.2;
    state.groundOffset = (state.groundOffset + speed * dt) % 48;

    bird.velocity = Math.min(bird.velocity + physics.gravity * dt, physics.terminalVelocity);
    bird.y += bird.velocity * dt;
    bird.rotation = Math.max(-0.55, Math.min(1.2, bird.velocity / 520));
    bird.flapPhase = Math.max(0, bird.flapPhase - dt * 5.5);

    pipes.forEach(pipe => {
      pipe.x -= speed * dt;
      if (state.mode === 'playing' && !pipe.passed && pipe.x + pipe.width < bird.x) {
        pipe.passed = true;
        state.score += 1;
        updateScore();
        playSound('score');
      }
    });
    pipes = pipes.filter(pipe => pipe.x + pipe.width > -20);

    if (state.mode === 'playing' && (bird.y - bird.radius <= 0 || bird.y + bird.radius >= floorY || pipes.some(collidesWithPipe))) {
      gameOver();
    }

    if (state.mode === 'gameover' && bird.y + bird.radius >= floorY) {
      bird.y = floorY - bird.radius;
      bird.velocity = 0;
    }

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
  }

  function collidesWithPipe(pipe) {
    const topHeight = pipe.gapY - pipe.gap / 2;
    const bottomY = pipe.gapY + pipe.gap / 2;
    return circleRectCollision(bird.x, bird.y, bird.radius * 0.88, pipe.x, 0, pipe.width, topHeight)
      || circleRectCollision(bird.x, bird.y, bird.radius * 0.88, pipe.x, bottomY, pipe.width, floorY - bottomY);
  }

  function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    drawSky();
    drawClouds();
    drawHills();
    pipes.forEach(drawPipe);
    drawGround();
    drawBird();
    drawScorePop();
    ctx.restore();
  }

  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, floorY);
    gradient.addColorStop(0, '#66cdf6');
    gradient.addColorStop(0.56, '#9ce9ff');
    gradient.addColorStop(1, '#e3fbff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    for (let i = 0; i < 18; i++) {
      const x = (i * 97 + state.elapsed * 11) % (W + 90) - 45;
      const y = 28 + (i * 47) % 265;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function createScenery() {
    state.clouds = Array.from({ length: 7 }, (_, i) => ({
      x: i * 86 + Math.random() * 45,
      y: 54 + Math.random() * 270,
      scale: 0.75 + Math.random() * 0.75,
      speed: 12 + Math.random() * 18,
    }));
    state.hills = Array.from({ length: 5 }, (_, i) => ({
      x: i * 120 - 30,
      h: 70 + Math.random() * 70,
      w: 150 + Math.random() * 80,
    }));
  }

  function drawClouds() {
    state.clouds.forEach(cloud => {
      const x = ((cloud.x - state.elapsed * cloud.speed) % (W + 130) + W + 130) % (W + 130) - 70;
      ctx.save();
      ctx.translate(x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(0, 12, 16, Math.PI * 0.8, Math.PI * 1.86);
      ctx.arc(18, 2, 20, Math.PI * 1.0, Math.PI * 1.95);
      ctx.arc(42, 11, 15, Math.PI * 1.12, Math.PI * 2.1);
      ctx.lineTo(54, 23);
      ctx.lineTo(-14, 23);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawHills() {
    ctx.fillStyle = '#71d084';
    state.hills.forEach((hill, index) => {
      const x = ((hill.x - state.elapsed * 24) % (W + 160) + W + 160) % (W + 160) - 80;
      ctx.beginPath();
      ctx.ellipse(x + hill.w / 2, floorY + 24, hill.w / 2, hill.h, 0, Math.PI, 0);
      ctx.fillStyle = index % 2 ? '#6ac47b' : '#80dd8f';
      ctx.fill();
    });
  }

  function drawPipe(pipe) {
    const topHeight = pipe.gapY - pipe.gap / 2;
    const bottomY = pipe.gapY + pipe.gap / 2;
    drawPipeSection(pipe.x, 0, pipe.width, topHeight, true);
    drawPipeSection(pipe.x, bottomY, pipe.width, floorY - bottomY, false);
  }

  function drawPipeSection(x, y, width, height, upsideDown) {
    if (height <= 0) return;
    const capH = 34;
    const capY = upsideDown ? y + height - capH : y;
    const bodyY = upsideDown ? y : y + capH;
    const bodyH = Math.max(0, height - capH);

    const bodyGradient = ctx.createLinearGradient(x, 0, x + width, 0);
    bodyGradient.addColorStop(0, '#158d4c');
    bodyGradient.addColorStop(0.22, '#4ce17b');
    bodyGradient.addColorStop(0.72, '#24b85e');
    bodyGradient.addColorStop(1, '#0b6a3c');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(x + 8, bodyY, width - 16, bodyH);

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x + width - 16, bodyY, 8, bodyH);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + 15, bodyY, 7, bodyH);

    roundRect(x, capY, width, capH, 8, bodyGradient);
    ctx.strokeStyle = 'rgba(5, 77, 42, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 8.5, bodyY + 0.5, width - 17, Math.max(0, bodyH));
    ctx.strokeRect(x + 0.5, capY + 0.5, width - 1, capH - 1);
  }

  function roundRect(x, y, w, h, r, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround() {
    ctx.fillStyle = '#e8bd62';
    ctx.fillRect(0, floorY, W, groundHeight);
    ctx.fillStyle = '#7bda76';
    ctx.fillRect(0, floorY, W, 18);
    ctx.fillStyle = '#5fc962';
    for (let x = -48 - state.groundOffset; x < W + 48; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 18);
      ctx.lineTo(x + 28, floorY + 18);
      ctx.lineTo(x + 48, floorY);
      ctx.lineTo(x + 20, floorY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(111, 76, 31, 0.18)';
    for (let x = -state.groundOffset; x < W; x += 34) {
      ctx.fillRect(x, floorY + 48, 18, 5);
      ctx.fillRect(x + 10, floorY + 73, 24, 4);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    const wingLift = Math.sin(bird.flapPhase * Math.PI) * 13;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(2, 24, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f7b52c';
    ctx.strokeStyle = '#9c5b10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.ellipse(-6, 4, 12, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(-0.38 - wingLift / 85);
    ctx.fillStyle = '#ff8f2f';
    ctx.strokeStyle = '#9c5b10';
    ctx.beginPath();
    ctx.ellipse(-8, 7 + wingLift, 10, 18, 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1f2c38';
    ctx.beginPath();
    ctx.arc(12, -8, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1f2c38';
    ctx.beginPath();
    ctx.arc(15, -7, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff7540';
    ctx.strokeStyle = '#9c341f';
    ctx.beginPath();
    ctx.moveTo(21, -1);
    ctx.lineTo(39, 4);
    ctx.lineTo(21, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawScorePop() {
    if (state.mode === 'playing' || state.mode === 'paused') {
      ctx.save();
      ctx.font = '900 54px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(10, 32, 49, 0.72)';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(state.score, W / 2, 92);
      ctx.fillText(state.score, W / 2, 92);
      ctx.restore();
    }
  }

  function unlockAudio() {
    if (state.muted) return;
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function playSound(type) {
    if (state.muted) return;
    unlockAudio();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.connect(audioContext.destination);

    if (type === 'flap') {
      const osc = audioContext.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(870, now + 0.08);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    if (type === 'score') {
      [784, 1046].forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.13, now + index * 0.07 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.12);
        osc.connect(gain).connect(master);
        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.13);
      });
      master.gain.value = 0.8;
    }

    if (type === 'hit') {
      const osc = audioContext.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  function handlePrimaryAction(event) {
    event?.preventDefault();
    flap();
  }

  startButton.addEventListener('click', () => {
    if (state.mode === 'paused') resumeGame();
    else startGame();
  });

  pauseButton.addEventListener('click', togglePause);

  muteButton.addEventListener('click', () => {
    state.muted = !state.muted;
    muteButton.textContent = state.muted ? 'Sound Off' : 'Sound On';
    muteButton.setAttribute('aria-pressed', String(state.muted));
    if (!state.muted) unlockAudio();
  });

  clearScoresButton.addEventListener('click', () => {
    if (!state.leaderboard.length || window.confirm('Clear all leaderboard scores?')) {
      state.leaderboard = [];
      saveLeaderboard();
    }
  });

  canvas.addEventListener('pointerdown', handlePrimaryAction);

  window.addEventListener('keydown', event => {
    if (scoreDialog.open) return;
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) handlePrimaryAction(event);
    if (event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
      togglePause();
    }
    if (event.code === 'KeyR') {
      event.preventDefault();
      startGame();
    }
  });

  scoreForm.addEventListener('submit', event => {
    event.preventDefault();
    recordScore(playerName.value);
    scoreDialog.close();
  });

  scoreDialog.addEventListener('cancel', event => {
    event.preventDefault();
  });

  playerName.addEventListener('input', () => {
    playerName.value = playerName.value.toUpperCase();
  });

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0, 0.033);
    lastTimestamp = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  createScenery();
  loadLeaderboard();
  resetGame('ready');
  requestAnimationFrame(loop);
  window.addEventListener('resize', resizeCanvas);
})();
