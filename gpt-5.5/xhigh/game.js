(function () {
  "use strict";

  const WIDTH = 432;
  const HEIGHT = 640;
  const GROUND_HEIGHT = 86;
  const BIRD_X = 104;
  const BIRD_WIDTH = 38;
  const BIRD_HEIGHT = 30;
  const PIPE_WIDTH = 74;
  const PIPE_CAP_HEIGHT = 18;
  const START_GAP = 174;
  const MIN_GAP = 132;
  const START_SPEED = 146;
  const MAX_SPEED = 224;
  const GRAVITY = 1050;
  const FLAP_FORCE = -342;
  const PIPE_INTERVAL = 1.42;
  const STORAGE_KEY = "skyline-flap-xhigh-leaderboard-v1";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreText = document.getElementById("scoreText");
  const statusText = document.getElementById("statusText");
  const overlay = document.getElementById("overlay");
  const overlayEyebrow = document.getElementById("overlayEyebrow");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayCopy = document.getElementById("overlayCopy");
  const primaryButton = document.getElementById("primaryButton");
  const secondaryButton = document.getElementById("secondaryButton");
  const pauseButton = document.getElementById("pauseButton");
  const soundButton = document.getElementById("soundButton");
  const scoreForm = document.getElementById("scoreForm");
  const playerName = document.getElementById("playerName");
  const leaderboardList = document.getElementById("leaderboardList");
  const resetScoresButton = document.getElementById("resetScoresButton");

  const game = {
    mode: "ready",
    score: 0,
    runTime: 0,
    pipeTimer: 0,
    best: 0,
    saved: false,
    muted: false,
    lastFrame: 0,
  };

  const bird = {
    x: BIRD_X,
    y: HEIGHT * 0.45,
    vy: 0,
    angle: 0,
    wing: 0,
  };

  let pipes = [];
  let particles = [];
  let clouds = [];
  let audioContext = null;
  let leaderboard = loadLeaderboard();

  function init() {
    canvas.tabIndex = 0;
    fitCanvas();
    resetRun();
    buildClouds();
    renderLeaderboard();
    setMode("ready");
    bindEvents();
    requestAnimationFrame(frame);
  }

  function bindEvents() {
    window.addEventListener("resize", fitCanvas);

    document.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }

      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "Enter") {
        event.preventDefault();
        flapAction();
      }

      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        togglePause();
      }
    });

    canvas.addEventListener("pointerdown", () => {
      canvas.focus();
      flapAction();
    });

    primaryButton.addEventListener("click", () => {
      if (game.mode === "ready" || game.mode === "gameover") {
        startRun();
      } else if (game.mode === "paused") {
        resumeRun();
      }
    });

    secondaryButton.addEventListener("click", () => {
      startRun();
    });

    pauseButton.addEventListener("click", togglePause);

    soundButton.addEventListener("click", () => {
      game.muted = !game.muted;
      soundButton.setAttribute("aria-pressed", String(game.muted));
      soundButton.textContent = game.muted ? "Muted" : "Sound";
      if (!game.muted) {
        ensureAudio();
        playSound("score");
      }
    });

    scoreForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCurrentScore();
    });

    resetScoresButton.addEventListener("click", () => {
      if (!leaderboard.length || !window.confirm("Reset the Skyline Flap leaderboard?")) {
        return;
      }
      leaderboard = [];
      persistLeaderboard();
      renderLeaderboard();
      game.best = 0;
      updateStatusText();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.mode === "playing") {
        pauseRun();
      }
    });
  }

  function fitCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetRun() {
    game.score = 0;
    game.runTime = 0;
    game.pipeTimer = 0.78;
    game.saved = false;
    bird.y = HEIGHT * 0.45;
    bird.vy = 0;
    bird.angle = 0;
    bird.wing = 0;
    pipes = [];
    particles = [];
    scoreText.textContent = "0";
    playerName.value = "";
    game.best = leaderboard[0] ? leaderboard[0].score : 0;
  }

  function startRun() {
    resetRun();
    ensureAudio();
    setMode("playing");
    playSound("start");
    flap();
  }

  function pauseRun() {
    if (game.mode !== "playing") {
      return;
    }
    setMode("paused");
    playSound("pause");
  }

  function resumeRun() {
    if (game.mode !== "paused") {
      return;
    }
    ensureAudio();
    setMode("playing");
    playSound("start");
  }

  function togglePause() {
    if (game.mode === "playing") {
      pauseRun();
    } else if (game.mode === "paused") {
      resumeRun();
    }
  }

  function flapAction() {
    if (game.mode === "ready") {
      startRun();
      return;
    }

    if (game.mode !== "playing") {
      return;
    }

    flap();
  }

  function flap() {
    ensureAudio();
    bird.vy = FLAP_FORCE;
    bird.angle = -0.42;
    bird.wing = 1;
    addFlapParticles();
    playSound("flap");
  }

  function endRun(reason) {
    if (game.mode !== "playing") {
      return;
    }

    if (reason === "ground") {
      bird.y = HEIGHT - GROUND_HEIGHT - BIRD_HEIGHT * 0.45;
    } else if (reason === "ceiling") {
      bird.y = BIRD_HEIGHT * 0.5;
    }

    addHitParticles();
    setMode("gameover");
    playSound("hit");

    window.setTimeout(() => {
      playerName.focus();
      playerName.select();
    }, 80);
  }

  function setMode(mode) {
    game.mode = mode;
    pauseButton.disabled = mode !== "playing" && mode !== "paused";
    pauseButton.textContent = mode === "paused" ? "Resume" : "Pause";

    if (mode === "playing") {
      overlay.hidden = true;
    } else {
      overlay.hidden = false;
    }

    if (mode === "ready") {
      overlayEyebrow.textContent = "Ready";
      overlayTitle.textContent = "Skyline Flap";
      overlayCopy.textContent = "Clear the gates and keep the run alive.";
      primaryButton.textContent = "Start Flight";
      secondaryButton.hidden = true;
      scoreForm.hidden = true;
    }

    if (mode === "paused") {
      overlayEyebrow.textContent = "Paused";
      overlayTitle.textContent = "Run Holding";
      overlayCopy.textContent = `Score ${game.score}`;
      primaryButton.textContent = "Resume";
      secondaryButton.textContent = "Restart";
      secondaryButton.hidden = false;
      scoreForm.hidden = true;
    }

    if (mode === "gameover") {
      overlayEyebrow.textContent = "Game Over";
      overlayTitle.textContent = "Run Complete";
      overlayCopy.textContent = `Score ${game.score}`;
      primaryButton.textContent = "Play Again";
      secondaryButton.hidden = true;
      scoreForm.hidden = false;
    }

    updateStatusText();
  }

  function updateStatusText() {
    if (game.mode === "ready") {
      statusText.textContent = game.best ? `Best ${game.best}` : "Ready";
    } else if (game.mode === "playing") {
      statusText.textContent = "In flight";
    } else if (game.mode === "paused") {
      statusText.textContent = "Paused";
    } else {
      statusText.textContent = game.best ? `Best ${game.best}` : "Run complete";
    }
  }

  function frame(now) {
    const dt = game.lastFrame ? Math.min((now - game.lastFrame) / 1000, 0.033) : 0;
    game.lastFrame = now;

    updateAmbient(dt);
    if (game.mode === "playing") {
      updateGame(dt);
    } else {
      updateIdle(dt, now);
    }
    updateParticles(dt);
    draw(now / 1000);

    requestAnimationFrame(frame);
  }

  function updateAmbient(dt) {
    for (const cloud of clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -120) {
        cloud.x = WIDTH + 80 + Math.random() * 90;
        cloud.y = 42 + Math.random() * 190;
      }
    }
  }

  function updateIdle(dt, now) {
    if (game.mode === "ready") {
      bird.y = HEIGHT * 0.45 + Math.sin(now / 440) * 8;
      bird.angle = Math.sin(now / 620) * 0.08;
      bird.wing = 0.45 + Math.sin(now / 120) * 0.45;
    } else {
      bird.wing = Math.max(0, bird.wing - dt * 2);
    }
  }

  function updateGame(dt) {
    game.runTime += dt;
    game.pipeTimer -= dt;

    const speed = currentSpeed();
    const gap = currentGap();
    if (game.pipeTimer <= 0) {
      spawnPipe(gap);
      game.pipeTimer += PIPE_INTERVAL;
    }

    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.angle = clamp(bird.angle + dt * 2.35, -0.52, 1.12);
    bird.wing = Math.max(0, bird.wing - dt * 5.2);

    for (const pipe of pipes) {
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x - BIRD_WIDTH * 0.45) {
        pipe.scored = true;
        game.score += 1;
        scoreText.textContent = String(game.score);
        playSound("score");
      }
    }

    pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -36);
    testCollisions();
  }

  function currentSpeed() {
    return Math.min(MAX_SPEED, START_SPEED + game.score * 4.2 + game.runTime * 1.4);
  }

  function currentGap() {
    return Math.max(MIN_GAP, START_GAP - game.score * 2.6);
  }

  function spawnPipe(gap) {
    const marginTop = 74;
    const marginBottom = GROUND_HEIGHT + 72;
    const minCenter = marginTop + gap / 2;
    const maxCenter = HEIGHT - marginBottom - gap / 2;
    const centerY = random(minCenter, maxCenter);

    pipes.push({
      x: WIDTH + 24,
      gap,
      centerY,
      scored: false,
      shade: Math.random() * 0.4,
    });
  }

  function testCollisions() {
    const hitbox = birdHitbox();

    if (hitbox.y <= 0) {
      endRun("ceiling");
      return;
    }

    if (hitbox.y + hitbox.h >= HEIGHT - GROUND_HEIGHT) {
      endRun("ground");
      return;
    }

    for (const pipe of pipes) {
      const topHeight = pipe.centerY - pipe.gap / 2;
      const bottomY = pipe.centerY + pipe.gap / 2;
      const topRect = { x: pipe.x, y: 0, w: PIPE_WIDTH, h: topHeight };
      const bottomRect = {
        x: pipe.x,
        y: bottomY,
        w: PIPE_WIDTH,
        h: HEIGHT - GROUND_HEIGHT - bottomY,
      };

      if (rectsOverlap(hitbox, topRect) || rectsOverlap(hitbox, bottomRect)) {
        endRun("pipe");
        return;
      }
    }
  }

  function birdHitbox() {
    return {
      x: bird.x - BIRD_WIDTH * 0.37,
      y: bird.y - BIRD_HEIGHT * 0.37,
      w: BIRD_WIDTH * 0.74,
      h: BIRD_HEIGHT * 0.74,
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function draw(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawSky();
    drawSun(time);
    drawCloudLayer();
    drawSkyline();
    drawPipes();
    drawParticles();
    drawBird(time);
    drawGround(time);
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#78cceb");
    sky.addColorStop(0.46, "#b8ece6");
    sky.addColorStop(0.8, "#f7d58c");
    sky.addColorStop(1, "#e6a45b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawSun(time) {
    const pulse = 2 + Math.sin(time * 0.8) * 1.5;
    const x = WIDTH - 74;
    const y = 78;
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 72 + pulse);
    glow.addColorStop(0, "rgba(255, 239, 164, 0.92)");
    glow.addColorStop(0.45, "rgba(255, 198, 96, 0.36)");
    glow.addColorStop(1, "rgba(255, 198, 96, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffe785";
    ctx.beginPath();
    ctx.arc(x, y, 24 + pulse * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloudLayer() {
    for (const cloud of clouds) {
      drawCloud(cloud.x, cloud.y, cloud.scale, cloud.alpha);
    }
  }

  function drawCloud(x, y, scale, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 8, 34, 17, 0, 0, Math.PI * 2);
    ctx.ellipse(24, 3, 24, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(-24, 5, 23, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(2, -9, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSkyline() {
    const baseY = HEIGHT - GROUND_HEIGHT;
    ctx.fillStyle = "rgba(38, 52, 66, 0.18)";
    for (let i = 0; i < 8; i += 1) {
      const w = 34 + ((i * 17) % 28);
      const h = 48 + ((i * 29) % 74);
      const x = i * 62 - 18;
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillStyle = i % 2 ? "rgba(38, 52, 66, 0.16)" : "rgba(38, 52, 66, 0.2)";
    }
  }

  function drawPipes() {
    for (const pipe of pipes) {
      const topHeight = pipe.centerY - pipe.gap / 2;
      const bottomY = pipe.centerY + pipe.gap / 2;
      drawPipe(pipe.x, 0, topHeight, true, pipe.shade);
      drawPipe(pipe.x, bottomY, HEIGHT - GROUND_HEIGHT - bottomY, false, pipe.shade);
    }
  }

  function drawPipe(x, y, height, top, shade) {
    if (height <= 0) {
      return;
    }

    const gradient = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, "#126f52");
    gradient.addColorStop(0.22, "#2cb271");
    gradient.addColorStop(0.68, shade > 0.2 ? "#84df76" : "#69cd68");
    gradient.addColorStop(1, "#0f5f48");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, PIPE_WIDTH, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(x + 12, y, 8, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(x + PIPE_WIDTH - 12, y, 6, height);

    const capY = top ? y + height - PIPE_CAP_HEIGHT : y;
    ctx.fillStyle = "#1d8a5d";
    roundRect(x - 8, capY, PIPE_WIDTH + 16, PIPE_CAP_HEIGHT, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(x - 2, capY + 4, PIPE_WIDTH * 0.42, 4);
  }

  function drawGround(time) {
    const y = HEIGHT - GROUND_HEIGHT;
    ctx.fillStyle = "#58b75d";
    ctx.fillRect(0, y, WIDTH, 18);

    ctx.fillStyle = "#d69b54";
    ctx.fillRect(0, y + 18, WIDTH, GROUND_HEIGHT - 18);

    ctx.fillStyle = "#ba7d3f";
    ctx.globalAlpha = 0.45;
    const offset = ((game.runTime * currentSpeed()) % 44) || ((time * 18) % 44);
    for (let x = -44 - offset; x < WIDTH + 44; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, y + 28);
      ctx.lineTo(x + 26, y + 28);
      ctx.lineTo(x + 16, y + 42);
      ctx.lineTo(x - 10, y + 42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#2a8d4f";
    for (let x = -18; x < WIDTH + 24; x += 24) {
      ctx.fillRect(x, y + 8 + Math.sin(x + time * 8) * 2, 14, 5);
    }
  }

  function drawBird(time) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.angle);

    ctx.fillStyle = "rgba(31, 42, 54, 0.22)";
    ctx.beginPath();
    ctx.ellipse(2, BIRD_HEIGHT * 0.65, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const wingLift = Math.sin(time * 18) * 5 * Math.max(0.25, bird.wing);
    ctx.fillStyle = "#f7a44f";
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wingLift, 15, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(-19, -16, 19, 16);
    body.addColorStop(0, "#ffe270");
    body.addColorStop(0.45, "#f7c547");
    body.addColorStop(1, "#f16b4f");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff8d6";
    ctx.beginPath();
    ctx.ellipse(5, 7, 12, 6, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff7e36";
    ctx.beginPath();
    ctx.moveTo(16, -2);
    ctx.lineTo(30, 3);
    ctx.lineTo(16, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(8, -6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#172029";
    ctx.beginPath();
    ctx.arc(10, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function addFlapParticles() {
    for (let i = 0; i < 5; i += 1) {
      particles.push({
        x: bird.x - 17,
        y: bird.y + random(-8, 12),
        vx: random(-82, -34),
        vy: random(-18, 30),
        life: random(0.22, 0.38),
        maxLife: 0.38,
        size: random(2, 4),
        color: i % 2 ? "#ffffff" : "#ffe270",
      });
    }
  }

  function addHitParticles() {
    for (let i = 0; i < 18; i += 1) {
      particles.push({
        x: bird.x + random(-10, 10),
        y: bird.y + random(-10, 10),
        vx: random(-160, 110),
        vy: random(-170, 80),
        life: random(0.45, 0.78),
        maxLife: 0.78,
        size: random(3, 7),
        color: i % 3 === 0 ? "#f16b4f" : i % 3 === 1 ? "#ffe270" : "#ffffff",
      });
    }
  }

  function updateParticles(dt) {
    particles = particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 320 * dt;
      return particle.life > 0;
    });
  }

  function drawParticles() {
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function buildClouds() {
    clouds = [
      { x: 44, y: 92, scale: 0.72, speed: 11, alpha: 0.88 },
      { x: 190, y: 154, scale: 0.52, speed: 14, alpha: 0.74 },
      { x: 354, y: 68, scale: 0.66, speed: 9, alpha: 0.8 },
      { x: 460, y: 226, scale: 0.58, speed: 13, alpha: 0.72 },
    ];
  }

  function ensureAudio() {
    if (game.muted || !window.AudioContext && !window.webkitAudioContext) {
      return null;
    }

    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  function playSound(type) {
    const audio = ensureAudio();
    if (!audio) {
      return;
    }

    const now = audio.currentTime;
    if (type === "flap") {
      tone(now, 0.12, 520, 860, "sine", 0.09);
    } else if (type === "score") {
      tone(now, 0.08, 760, 980, "triangle", 0.07);
      tone(now + 0.07, 0.11, 980, 1320, "triangle", 0.06);
    } else if (type === "hit") {
      tone(now, 0.24, 180, 72, "sawtooth", 0.11);
      noise(now, 0.18, 0.08);
    } else if (type === "pause") {
      tone(now, 0.08, 360, 260, "sine", 0.04);
    } else {
      tone(now, 0.1, 420, 620, "triangle", 0.045);
    }
  }

  function tone(start, duration, from, to, type, gainValue) {
    const audio = audioContext;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(start, duration, gainValue) {
    const audio = audioContext;
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audio.destination);
    source.start(start);
    source.stop(start + duration);
  }

  function loadLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
        .map((entry) => ({
          name: entry.name.slice(0, 12),
          score: Math.max(0, Math.floor(entry.score)),
          date: entry.date || new Date().toISOString(),
        }))
        .sort(sortScores)
        .slice(0, 10);
    } catch (_error) {
      return [];
    }
  }

  function persistLeaderboard() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard.slice(0, 10)));
  }

  function saveCurrentScore() {
    if (game.saved) {
      return;
    }

    const name = sanitizeName(playerName.value);
    leaderboard.push({
      name,
      score: game.score,
      date: new Date().toISOString(),
    });
    leaderboard.sort(sortScores);
    leaderboard = leaderboard.slice(0, 10);
    persistLeaderboard();
    renderLeaderboard();
    game.best = leaderboard[0] ? leaderboard[0].score : 0;
    game.saved = true;
    scoreForm.hidden = true;
    overlayCopy.textContent = `Saved ${name} with ${game.score}`;
    updateStatusText();
  }

  function sanitizeName(value) {
    const name = value.trim().replace(/\s+/g, " ").slice(0, 12);
    return name || "Pilot";
  }

  function sortScores(a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }

  function renderLeaderboard() {
    leaderboardList.innerHTML = "";

    if (!leaderboard.length) {
      const empty = document.createElement("li");
      empty.className = "empty-score";
      empty.textContent = "No scores yet";
      leaderboardList.appendChild(empty);
      return;
    }

    leaderboard.forEach((entry, index) => {
      const item = document.createElement("li");

      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(index + 1);

      const meta = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const date = document.createElement("span");
      date.textContent = formatDate(entry.date);
      meta.append(name, date);

      const points = document.createElement("div");
      points.className = "points";
      points.textContent = String(entry.score);

      item.append(rank, meta, points);
      leaderboardList.appendChild(item);
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Saved run";
    }
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  init();
})();
