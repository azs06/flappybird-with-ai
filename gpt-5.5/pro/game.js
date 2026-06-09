(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const W = 420;
  const H = 640;
  const GROUND_H = 86;
  const GROUND_Y = H - GROUND_H;
  const STORAGE_KEY = "skyhop.flappy.leaderboard.v1";
  const SETTINGS_KEY = "skyhop.flappy.settings.v1";

  const scoreText = document.getElementById("scoreText");
  const bestText = document.getElementById("bestText");
  const pauseButton = document.getElementById("pauseButton");
  const muteButton = document.getElementById("muteButton");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const messageOverlay = document.getElementById("messageOverlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const scoreForm = document.getElementById("scoreForm");
  const finalScoreTitle = document.getElementById("finalScoreTitle");
  const playerName = document.getElementById("playerName");
  const playAgainButton = document.getElementById("playAgainButton");
  const rankMessage = document.getElementById("rankMessage");
  const leaderboardList = document.getElementById("leaderboardList");
  const clearScoresButton = document.getElementById("clearScoresButton");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => Math.random() * (max - min) + min;

  class SoundFX {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
    }

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    setMuted(muted) {
      this.muted = muted;
    }

    tone({ type = "sine", start = 440, end = 440, duration = 0.12, volume = 0.12, delay = 0 }) {
      if (this.muted) return;
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    }

    flap() {
      this.tone({ type: "triangle", start: 520, end: 780, duration: 0.09, volume: 0.09 });
      this.tone({ type: "sine", start: 240, end: 170, duration: 0.08, volume: 0.035 });
    }

    score() {
      this.tone({ type: "sine", start: 660, end: 880, duration: 0.1, volume: 0.1 });
      this.tone({ type: "sine", start: 990, end: 1320, duration: 0.11, volume: 0.095, delay: 0.08 });
    }

    pause() {
      this.tone({ type: "square", start: 360, end: 260, duration: 0.07, volume: 0.04 });
    }

    hit() {
      if (this.muted) return;
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const length = Math.floor(this.ctx.sampleRate * 0.18);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        const fade = 1 - i / length;
        data[i] = (Math.random() * 2 - 1) * fade;
      }

      const noise = this.ctx.createBufferSource();
      const noiseGain = this.ctx.createGain();
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(1200, now);
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      noise.connect(lowpass).connect(noiseGain).connect(this.ctx.destination);
      noise.start(now);

      this.tone({ type: "sawtooth", start: 180, end: 60, duration: 0.22, volume: 0.13 });
    }
  }

  const sound = new SoundFX();

  const state = {
    mode: "menu",
    score: 0,
    frame: 0,
    time: 0,
    cameraShake: 0,
    groundOffset: 0,
    pipes: [],
    particles: [],
    leaderboard: [],
    scoreSaved: false,
    lastTimestamp: 0,
    settings: {
      muted: false
    }
  };

  const bird = {
    x: 116,
    y: 264,
    vy: 0,
    radius: 15,
    width: 36,
    height: 30,
    rotation: 0,
    flapPhase: 0
  };

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      state.settings.muted = Boolean(parsed.muted);
    } catch {
      state.settings.muted = false;
    }
    sound.setMuted(state.settings.muted);
    muteButton.textContent = state.settings.muted ? "Sound Off" : "Sound On";
    muteButton.setAttribute("aria-pressed", String(state.settings.muted));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function loadLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) throw new Error("Leaderboard was not an array");
      state.leaderboard = parsed
        .filter(entry => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
        .map(entry => ({
          name: cleanName(entry.name),
          score: Math.max(0, Math.floor(entry.score)),
          date: typeof entry.date === "string" ? entry.date : new Date().toISOString()
        }))
        .sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date))
        .slice(0, 10);
    } catch {
      state.leaderboard = [];
    }
    renderLeaderboard();
  }

  function saveLeaderboard() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaderboard));
    renderLeaderboard();
  }

  function cleanName(value) {
    const cleaned = String(value || "")
      .replace(/[^a-zA-Z0-9 _.-]/g, "")
      .trim()
      .slice(0, 12)
      .toUpperCase();
    return cleaned || "PILOT";
  }

  function bestScore() {
    return state.leaderboard.length ? state.leaderboard[0].score : 0;
  }

  function addScore(name, score) {
    const entry = {
      name: cleanName(name),
      score: Math.max(0, Math.floor(score)),
      date: new Date().toISOString()
    };
    state.leaderboard.push(entry);
    state.leaderboard.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
    state.leaderboard = state.leaderboard.slice(0, 10);
    saveLeaderboard();
    return state.leaderboard.findIndex(item => item === entry) + 1;
  }

  function renderLeaderboard() {
    bestText.textContent = String(bestScore());
    leaderboardList.innerHTML = "";

    if (!state.leaderboard.length) {
      const item = document.createElement("li");
      item.className = "empty";
      item.textContent = "No flights yet. Start a run and claim the first spot.";
      leaderboardList.append(item);
      return;
    }

    state.leaderboard.forEach((entry, index) => {
      const item = document.createElement("li");

      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(index + 1);

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = entry.name;

      const score = document.createElement("span");
      score.className = "player-score";
      score.textContent = String(entry.score);

      item.append(rank, name, score);
      leaderboardList.append(item);
    });
  }

  function resetGame() {
    state.score = 0;
    state.frame = 0;
    state.time = 0;
    state.cameraShake = 0;
    state.pipes = [];
    state.particles = [];
    state.scoreSaved = false;
    state.groundOffset = 0;

    bird.y = 270;
    bird.vy = 0;
    bird.rotation = 0;
    bird.flapPhase = 0;

    scoreText.textContent = "0";
    scoreForm.hidden = true;
    scoreForm.classList.remove("is-visible");
    playerName.value = "";
    rankMessage.textContent = "";
    spawnPipe(W + 110);
  }

  function startGame() {
    sound.resume();
    resetGame();
    state.mode = "playing";
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    hideMessageOverlay();
    flap(true);
  }

  function showMessageOverlay(title, text, startLabel = "Start Game") {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startButton.textContent = startLabel;
    restartButton.hidden = state.mode === "menu";
    messageOverlay.classList.add("is-visible");
  }

  function hideMessageOverlay() {
    messageOverlay.classList.remove("is-visible");
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    pauseButton.textContent = "Resume";
    showMessageOverlay("Paused", "Take a breath. Resume whenever you are ready.", "Resume");
    sound.pause();
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    sound.resume();
    state.mode = "playing";
    pauseButton.textContent = "Pause";
    hideMessageOverlay();
  }

  function togglePause() {
    if (state.mode === "playing") pauseGame();
    else if (state.mode === "paused") resumeGame();
  }

  function endGame() {
    if (state.mode === "gameover") return;
    state.mode = "gameover";
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    state.cameraShake = 13;
    sound.hit();

    for (let i = 0; i < 22; i += 1) {
      state.particles.push({
        x: bird.x + rand(-8, 8),
        y: bird.y + rand(-8, 8),
        vx: rand(-3.3, 2.2),
        vy: rand(-5, 1.5),
        life: rand(24, 48),
        size: rand(2, 5),
        kind: Math.random() > 0.45 ? "feather" : "spark"
      });
    }

    finalScoreTitle.textContent = `Score: ${state.score}`;
    const wouldPlace = state.leaderboard.length < 10 || state.score >= state.leaderboard[state.leaderboard.length - 1].score;
    rankMessage.textContent = wouldPlace
      ? "Nice flight — this score can make the board."
      : "Save it anyway and keep climbing.";
    scoreForm.hidden = false;
    scoreForm.classList.add("is-visible");
    window.setTimeout(() => playerName.focus(), 120);
  }

  function flap(silent = false) {
    if (state.mode === "menu") {
      startGame();
      return;
    }
    if (state.mode === "paused") {
      resumeGame();
      return;
    }
    if (state.mode !== "playing") return;

    bird.vy = -7.65;
    bird.flapPhase = 1;
    if (!silent) sound.flap();

    for (let i = 0; i < 5; i += 1) {
      state.particles.push({
        x: bird.x - 13 + rand(-2, 2),
        y: bird.y + 8 + rand(-4, 4),
        vx: rand(-2.4, -0.7),
        vy: rand(-1.2, 1.4),
        life: rand(16, 26),
        size: rand(2, 4),
        kind: "puff"
      });
    }
  }

  function currentSpeed() {
    return 2.45 + Math.min(1.05, state.score * 0.025);
  }

  function currentGap() {
    return Math.max(130, 168 - Math.min(38, state.score * 1.25));
  }

  function spawnPipe(x = W + 30) {
    const gap = currentGap();
    const marginTop = 106;
    const marginBottom = 96;
    const center = rand(marginTop + gap / 2, GROUND_Y - marginBottom - gap / 2);
    state.pipes.push({
      x,
      width: 78,
      gapY: center,
      gap,
      passed: false,
      wobble: rand(0, Math.PI * 2)
    });
  }

  function updateGame(dt) {
    state.frame += dt;
    state.time += dt;
    const speed = currentSpeed();

    bird.vy = clamp(bird.vy + 0.43 * dt, -11, 10.8);
    bird.y += bird.vy * dt;
    bird.rotation = clamp(bird.vy / 10, -0.55, 1.05);
    bird.flapPhase = Math.max(0, bird.flapPhase - 0.08 * dt);

    state.groundOffset = (state.groundOffset + speed * dt) % 42;

    const spawnDistance = Math.max(164, 188 - Math.min(22, state.score * 0.5));
    const lastPipe = state.pipes[state.pipes.length - 1];
    if (!lastPipe || lastPipe.x < W - spawnDistance) {
      spawnPipe();
    }

    for (const pipe of state.pipes) {
      pipe.x -= speed * dt;
      if (!pipe.passed && pipe.x + pipe.width < bird.x - bird.radius) {
        pipe.passed = true;
        state.score += 1;
        scoreText.textContent = String(state.score);
        sound.score();
      }
    }
    state.pipes = state.pipes.filter(pipe => pipe.x + pipe.width > -24);

    updateParticles(dt, speed);

    if (checkCollision()) {
      endGame();
    }
  }

  function updateParticles(dt, speed = 0) {
    for (const particle of state.particles) {
      particle.x += (particle.vx - speed * 0.18) * dt;
      particle.y += particle.vy * dt;
      particle.vy += 0.09 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter(particle => particle.life > 0);
  }

  function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  function checkCollision() {
    if (bird.y - bird.radius <= 0) return true;
    if (bird.y + bird.radius >= GROUND_Y) return true;

    const hitR = bird.radius - 1.5;
    for (const pipe of state.pipes) {
      const topH = pipe.gapY - pipe.gap / 2;
      const bottomY = pipe.gapY + pipe.gap / 2;
      const bottomH = GROUND_Y - bottomY;
      if (
        circleRectCollision(bird.x, bird.y, hitR, pipe.x, 0, pipe.width, topH) ||
        circleRectCollision(bird.x, bird.y, hitR, pipe.x, bottomY, pipe.width, bottomH)
      ) {
        return true;
      }
    }
    return false;
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, "#6bd7ff");
    sky.addColorStop(0.58, "#b3ecff");
    sky.addColorStop(1, "#f7f2c4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawSun();
    drawClouds();
    drawDistantHills();
    drawCitySilhouette();
  }

  function drawSun() {
    const pulse = Math.sin(state.time * 0.018) * 2;
    ctx.save();
    ctx.translate(334, 90);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 68 + pulse);
    glow.addColorStop(0, "rgba(255, 230, 134, 0.85)");
    glow.addColorStop(1, "rgba(255, 230, 134, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 68 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffdb6e";
    ctx.beginPath();
    ctx.arc(0, 0, 27 + pulse * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCloud(x, y, scale, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.beginPath();
    ctx.arc(0, 10, 18, Math.PI, 0);
    ctx.arc(22, 2, 22, Math.PI, 0);
    ctx.arc(49, 10, 17, Math.PI, 0);
    ctx.arc(25, 15, 30, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawClouds() {
    const slow = (state.time * 0.28) % (W + 160);
    drawCloud(50 - slow, 150, 0.78, 0.66);
    drawCloud(270 - slow * 0.72, 205, 0.58, 0.58);
    drawCloud(465 - slow, 118, 0.9, 0.7);
    drawCloud(220 - ((state.time * 0.16) % (W + 170)), 72, 0.52, 0.46);
  }

  function drawDistantHills() {
    ctx.save();
    ctx.fillStyle = "rgba(67, 151, 166, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 116);
    ctx.quadraticCurveTo(70, GROUND_Y - 188, 150, GROUND_Y - 118);
    ctx.quadraticCurveTo(235, GROUND_Y - 52, 332, GROUND_Y - 132);
    ctx.quadraticCurveTo(384, GROUND_Y - 172, 420, GROUND_Y - 140);
    ctx.lineTo(W, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(50, 119, 143, 0.22)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 62);
    ctx.quadraticCurveTo(92, GROUND_Y - 142, 180, GROUND_Y - 74);
    ctx.quadraticCurveTo(255, GROUND_Y - 18, 350, GROUND_Y - 96);
    ctx.quadraticCurveTo(390, GROUND_Y - 130, 420, GROUND_Y - 104);
    ctx.lineTo(W, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCitySilhouette() {
    const offset = (state.time * 0.36) % 118;
    ctx.save();
    ctx.fillStyle = "rgba(43, 96, 122, 0.24)";
    for (let x = -120 - offset; x < W + 80; x += 118) {
      ctx.fillRect(x + 0, GROUND_Y - 58, 26, 58);
      ctx.fillRect(x + 34, GROUND_Y - 82, 34, 82);
      ctx.fillRect(x + 78, GROUND_Y - 48, 42, 48);
      ctx.fillRect(x + 100, GROUND_Y - 69, 30, 69);
    }
    ctx.restore();
  }

  function drawPipes() {
    for (const pipe of state.pipes) {
      drawPipe(pipe);
    }
  }

  function drawPipe(pipe) {
    const topH = pipe.gapY - pipe.gap / 2;
    const bottomY = pipe.gapY + pipe.gap / 2;
    const capH = 28;
    const capOverhang = 7;
    const wobble = Math.sin(state.time * 0.03 + pipe.wobble) * 1.5;
    const x = pipe.x;

    const pipeGradient = ctx.createLinearGradient(x, 0, x + pipe.width, 0);
    pipeGradient.addColorStop(0, "#139957");
    pipeGradient.addColorStop(0.22, "#42da89");
    pipeGradient.addColorStop(0.72, "#22b96d");
    pipeGradient.addColorStop(1, "#0c703f");

    ctx.save();
    ctx.translate(0, wobble);
    drawPipeSegment(x, 0, pipe.width, topH, capH, capOverhang, pipeGradient, true);
    drawPipeSegment(x, bottomY, pipe.width, GROUND_Y - bottomY, capH, capOverhang, pipeGradient, false);
    ctx.restore();
  }

  function drawPipeSegment(x, y, width, height, capH, capOverhang, fill, isTop) {
    if (height <= 0) return;
    ctx.save();
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    roundRect(ctx, x + 12, y + 10, 9, Math.max(0, height - 20), 5);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    roundRect(ctx, x + width - 14, y + 8, 8, Math.max(0, height - 16), 5);
    ctx.fill();

    const capY = isTop ? y + height - capH : y;
    ctx.fillStyle = fill;
    roundRect(ctx, x - capOverhang, capY, width + capOverhang * 2, capH, 9);
    ctx.fill();

    ctx.strokeStyle = "rgba(3, 65, 34, 0.38)";
    ctx.lineWidth = 3;
    roundRect(ctx, x - capOverhang, capY, width + capOverhang * 2, capH, 9);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    const bodyGradient = ctx.createRadialGradient(-8, -8, 3, 0, 0, 28);
    bodyGradient.addColorStop(0, "#fff3a3");
    bodyGradient.addColorStop(0.45, "#ffd166");
    bodyGradient.addColorStop(1, "#f7a900");

    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.ellipse(3, 4, 21, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(122, 73, 0, 0.42)";
    ctx.stroke();

    const wingLift = -4 - bird.flapPhase * 10 + Math.sin(state.time * 0.4) * 1.2;
    ctx.save();
    ctx.translate(-7, 5);
    ctx.rotate(-0.25 - bird.flapPhase * 0.48);
    ctx.fillStyle = "#ffbc42";
    ctx.beginPath();
    ctx.ellipse(0, wingLift, 12, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(122, 73, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ff7a00";
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(35, 4);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(124, 58, 0, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(9, -8, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17223b";
    ctx.beginPath();
    ctx.arc(11.2, -8.2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(12.2, -9.4, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / 36, 0, 1);
      ctx.globalAlpha = alpha;
      if (particle.kind === "feather") {
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size * 0.75, particle.size * 1.55, particle.vx * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === "spark") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawGround() {
    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    groundGradient.addColorStop(0, "#caa46a");
    groundGradient.addColorStop(0.18, "#ead28b");
    groundGradient.addColorStop(1, "#906a34");

    ctx.fillStyle = "#5fbf67";
    ctx.fillRect(0, GROUND_Y - 16, W, 20);

    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    for (let x = -state.groundOffset; x < W + 26; x += 42) {
      ctx.beginPath();
      ctx.ellipse(x + 12, GROUND_Y - 13, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, W, GROUND_H);

    ctx.fillStyle = "rgba(97, 63, 24, 0.22)";
    for (let x = -state.groundOffset; x < W + 44; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 10);
      ctx.lineTo(x + 22, GROUND_Y + 30);
      ctx.lineTo(x, GROUND_Y + 50);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(83, 54, 21, 0.22)";
      ctx.stroke();
    }
  }

  function drawScorePop() {
    if (state.mode === "playing" && state.score > 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 76px ui-sans-serif, system-ui";
      ctx.lineWidth = 9;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
      ctx.strokeText(state.score, W / 2, 108);
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.fillText(state.score, W / 2, 108);
      ctx.restore();
    }
  }

  function drawPausedTint() {
    if (state.mode !== "paused") return;
    ctx.save();
    ctx.fillStyle = "rgba(20, 33, 61, 0.22)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (state.cameraShake > 0.1) {
      const shake = state.cameraShake;
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
      state.cameraShake *= 0.84;
    }

    drawBackground();
    drawPipes();
    drawParticles();
    drawBird();
    drawGround();
    drawScorePop();
    drawPausedTint();

    ctx.restore();
  }

  function gameLoop(timestamp = 0) {
    const elapsed = state.lastTimestamp ? timestamp - state.lastTimestamp : 16.67;
    state.lastTimestamp = timestamp;
    const dt = clamp(elapsed / 16.67, 0.25, 2.2);

    if (state.mode === "playing") {
      updateGame(dt);
    } else {
      state.time += dt * 0.45;
      state.groundOffset = (state.groundOffset + 0.65 * dt) % 42;
      updateParticles(dt, 0.65);
      bird.y += Math.sin(state.time * 0.08) * 0.08;
      bird.rotation = Math.sin(state.time * 0.04) * 0.08;
      bird.flapPhase = Math.max(0, bird.flapPhase - 0.045 * dt);
    }

    draw();
    requestAnimationFrame(gameLoop);
  }

  function handlePrimaryInput(event) {
    if (event) event.preventDefault();
    sound.resume();
    flap();
  }

  function saveCurrentScore(name) {
    if (state.scoreSaved) return;
    const rank = addScore(name, state.score);
    state.scoreSaved = true;
    rankMessage.textContent = rank > 0
      ? `Saved at #${rank}. Nice flying!`
      : "Saved. The top ten is tough today.";
    finalScoreTitle.textContent = `Saved: ${state.score}`;
  }

  startButton.addEventListener("click", () => {
    if (state.mode === "paused") resumeGame();
    else startGame();
  });

  restartButton.addEventListener("click", startGame);
  playAgainButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);

  muteButton.addEventListener("click", () => {
    state.settings.muted = !state.settings.muted;
    sound.setMuted(state.settings.muted);
    muteButton.textContent = state.settings.muted ? "Sound Off" : "Sound On";
    muteButton.setAttribute("aria-pressed", String(state.settings.muted));
    saveSettings();
    if (!state.settings.muted) sound.score();
  });

  scoreForm.addEventListener("submit", event => {
    event.preventDefault();
    saveCurrentScore(playerName.value);
  });

  clearScoresButton.addEventListener("click", () => {
    if (!state.leaderboard.length) return;
    const confirmed = window.confirm("Clear the local Skyhop leaderboard?");
    if (!confirmed) return;
    state.leaderboard = [];
    saveLeaderboard();
  });

  canvas.addEventListener("pointerdown", handlePrimaryInput);

  document.addEventListener("keydown", event => {
    if (event.repeat) return;
    const active = document.activeElement;
    const typing = active && ["INPUT", "TEXTAREA"].includes(active.tagName);

    if (typing) {
      if (event.key === "Enter" && state.mode === "gameover") {
        return;
      }
      return;
    }

    if ([" ", "Spacebar", "ArrowUp", "w", "W"].includes(event.key)) {
      handlePrimaryInput(event);
    } else if (["p", "P", "Escape"].includes(event.key)) {
      event.preventDefault();
      togglePause();
    }
  });

  window.addEventListener("blur", () => {
    if (state.mode === "playing") pauseGame();
  });

  // Prevent the browser from scrolling when the player uses Space or ArrowUp.
  window.addEventListener("keydown", event => {
    if ([" ", "Spacebar", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
    }
  }, { passive: false });

  loadSettings();
  loadLeaderboard();
  resetGame();
  showMessageOverlay("Ready to fly?", "Thread the gaps, dodge the pipes, and chase the leaderboard.", "Start Game");
  requestAnimationFrame(gameLoop);
})();
