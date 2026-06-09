(function () {
  "use strict";

  const WIDTH = 420;
  const HEIGHT = 640;
  const GROUND_HEIGHT = 84;
  const BIRD_X = 98;
  const BIRD_WIDTH = 38;
  const BIRD_HEIGHT = 30;
  const PIPE_WIDTH = 70;
  const PIPE_CAP = 18;
  const START_GAP = 176;
  const MIN_GAP = 128;
  const START_SPEED = 142;
  const MAX_SPEED = 224;
  const GRAVITY = 1040;
  const FLAP_VELOCITY = -344;
  const PIPE_INTERVAL = 1.38;
  const STORAGE_KEY = "harbor-hop-gpt-55-high-leaderboard-v1";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const statusText = document.getElementById("statusText");
  const scoreText = document.getElementById("scoreText");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlayKicker");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayBody = document.getElementById("overlayBody");
  const primaryButton = document.getElementById("primaryButton");
  const restartButton = document.getElementById("restartButton");
  const pauseButton = document.getElementById("pauseButton");
  const soundButton = document.getElementById("soundButton");
  const nameForm = document.getElementById("nameForm");
  const playerName = document.getElementById("playerName");
  const leaderboardList = document.getElementById("leaderboardList");
  const clearScoresButton = document.getElementById("clearScoresButton");

  const state = {
    mode: "ready",
    score: 0,
    elapsed: 0,
    pipeTimer: 0,
    savedScore: false,
    muted: false,
    lastFrame: 0,
    best: 0,
    tide: 0,
  };

  const bird = {
    x: BIRD_X,
    y: HEIGHT * 0.45,
    vy: 0,
    rotation: 0,
    wing: 0,
  };

  let pipes = [];
  let motes = [];
  let clouds = [];
  let audioContext = null;
  let leaderboard = loadLeaderboard();

  function init() {
    canvas.tabIndex = 0;
    fitCanvas();
    buildClouds();
    resetRun();
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
        flapCommand();
      }

      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        togglePause();
      }
    });

    canvas.addEventListener("pointerdown", () => {
      canvas.focus();
      flapCommand();
    });

    primaryButton.addEventListener("click", () => {
      if (state.mode === "paused") {
        resumeRun();
      } else {
        startRun();
      }
    });

    restartButton.addEventListener("click", startRun);
    pauseButton.addEventListener("click", togglePause);

    soundButton.addEventListener("click", () => {
      state.muted = !state.muted;
      soundButton.setAttribute("aria-pressed", String(state.muted));
      soundButton.querySelector(".button-text").textContent = state.muted ? "Muted" : "Sound";
      if (!state.muted) {
        ensureAudio();
        playSound("score");
      }
    });

    nameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveScore();
    });

    clearScoresButton.addEventListener("click", () => {
      if (!leaderboard.length || !window.confirm("Clear the Harbor Hop leaderboard?")) {
        return;
      }
      leaderboard = [];
      persistLeaderboard();
      renderLeaderboard();
      state.best = 0;
      updateStatus();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.mode === "playing") {
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
    state.score = 0;
    state.elapsed = 0;
    state.pipeTimer = 0.62;
    state.savedScore = false;
    state.best = leaderboard[0] ? leaderboard[0].score : 0;
    bird.y = HEIGHT * 0.45;
    bird.vy = 0;
    bird.rotation = 0;
    bird.wing = 0;
    pipes = [];
    motes = [];
    playerName.value = "";
    scoreText.textContent = "0";
  }

  function startRun() {
    resetRun();
    ensureAudio();
    setMode("playing");
    playSound("start");
    flap();
  }

  function pauseRun() {
    if (state.mode !== "playing") {
      return;
    }
    setMode("paused");
    playSound("pause");
  }

  function resumeRun() {
    if (state.mode !== "paused") {
      return;
    }
    ensureAudio();
    setMode("playing");
    playSound("start");
  }

  function togglePause() {
    if (state.mode === "playing") {
      pauseRun();
    } else if (state.mode === "paused") {
      resumeRun();
    }
  }

  function flapCommand() {
    if (state.mode === "ready") {
      startRun();
      return;
    }

    if (state.mode !== "playing") {
      return;
    }

    flap();
  }

  function flap() {
    ensureAudio();
    bird.vy = FLAP_VELOCITY;
    bird.rotation = -0.44;
    bird.wing = 1;
    addFlapMotes();
    playSound("flap");
  }

  function endRun(reason) {
    if (state.mode !== "playing") {
      return;
    }

    if (reason === "ground") {
      bird.y = HEIGHT - GROUND_HEIGHT - BIRD_HEIGHT * 0.42;
    } else if (reason === "ceiling") {
      bird.y = BIRD_HEIGHT * 0.48;
    }

    addBurstMotes();
    setMode("gameover");
    playSound("hit");

    window.setTimeout(() => {
      playerName.focus();
      playerName.select();
    }, 90);
  }

  function setMode(mode) {
    state.mode = mode;
    pauseButton.disabled = mode !== "playing" && mode !== "paused";
    pauseButton.querySelector(".button-text").textContent = mode === "paused" ? "Resume" : "Pause";
    pauseButton.querySelector("span[aria-hidden='true']").textContent = mode === "paused" ? ">" : "||";
    overlay.hidden = mode === "playing";

    if (mode === "ready") {
      overlayKicker.textContent = "Ready";
      overlayTitle.textContent = "Harbor Hop";
      overlayBody.textContent = "Tap, click, or press Space to flap through the sea stacks.";
      primaryButton.textContent = "Start";
      restartButton.hidden = true;
      nameForm.hidden = true;
    }

    if (mode === "paused") {
      overlayKicker.textContent = "Paused";
      overlayTitle.textContent = "Run Held";
      overlayBody.textContent = `Current score: ${state.score}`;
      primaryButton.textContent = "Resume";
      restartButton.hidden = false;
      nameForm.hidden = true;
    }

    if (mode === "gameover") {
      overlayKicker.textContent = "Game Over";
      overlayTitle.textContent = "Splashdown";
      overlayBody.textContent = `Final score: ${state.score}`;
      primaryButton.textContent = "Play Again";
      restartButton.hidden = true;
      nameForm.hidden = false;
    }

    updateStatus();
  }

  function updateStatus() {
    if (state.mode === "ready") {
      statusText.textContent = state.best ? `Best score ${state.best}` : "Ready for takeoff";
    } else if (state.mode === "playing") {
      statusText.textContent = "In flight";
    } else if (state.mode === "paused") {
      statusText.textContent = "Paused";
    } else {
      statusText.textContent = state.best ? `Best score ${state.best}` : "Run complete";
    }
  }

  function frame(now) {
    const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.033) : 0;
    state.lastFrame = now;

    updateAmbient(dt);
    if (state.mode === "playing") {
      updateGame(dt);
    } else {
      updateIdle(dt, now);
    }
    updateMotes(dt);
    draw(now / 1000);

    requestAnimationFrame(frame);
  }

  function updateAmbient(dt) {
    state.tide += dt;
    for (const cloud of clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -130) {
        cloud.x = WIDTH + 70 + Math.random() * 90;
        cloud.y = 46 + Math.random() * 155;
      }
    }
  }

  function updateIdle(dt, now) {
    if (state.mode === "ready") {
      bird.y = HEIGHT * 0.45 + Math.sin(now / 430) * 7;
      bird.rotation = Math.sin(now / 620) * 0.08;
      bird.wing = 0.42 + Math.sin(now / 118) * 0.42;
    } else {
      bird.wing = Math.max(0, bird.wing - dt * 2.2);
    }
  }

  function updateGame(dt) {
    state.elapsed += dt;
    state.pipeTimer -= dt;

    if (state.pipeTimer <= 0) {
      spawnPipe(currentGap());
      state.pipeTimer += PIPE_INTERVAL;
    }

    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.rotation = clamp(bird.rotation + dt * 2.35, -0.52, 1.15);
    bird.wing = Math.max(0, bird.wing - dt * 5.4);

    const speed = currentSpeed();
    for (const pipe of pipes) {
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x - BIRD_WIDTH * 0.45) {
        pipe.scored = true;
        state.score += 1;
        scoreText.textContent = String(state.score);
        playSound("score");
      }
    }

    pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -44);
    testCollisions();
  }

  function currentSpeed() {
    return Math.min(MAX_SPEED, START_SPEED + state.score * 4.4 + state.elapsed * 1.25);
  }

  function currentGap() {
    return Math.max(MIN_GAP, START_GAP - state.score * 2.7);
  }

  function spawnPipe(gap) {
    const topMargin = 74;
    const bottomMargin = GROUND_HEIGHT + 76;
    const minCenter = topMargin + gap / 2;
    const maxCenter = HEIGHT - bottomMargin - gap / 2;

    pipes.push({
      x: WIDTH + 24,
      gap,
      centerY: random(minCenter, maxCenter),
      scored: false,
      colorShift: Math.random(),
      barnacles: Math.floor(random(1, 4)),
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
      x: bird.x - BIRD_WIDTH * 0.36,
      y: bird.y - BIRD_HEIGHT * 0.34,
      w: BIRD_WIDTH * 0.72,
      h: BIRD_HEIGHT * 0.68,
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function draw(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawSky();
    drawSun(time);
    drawClouds();
    drawHarbor(time);
    drawPipes();
    drawMotes();
    drawBird(time);
    drawGround(time);
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#70c9e5");
    sky.addColorStop(0.44, "#b4ebe3");
    sky.addColorStop(0.76, "#f3d67d");
    sky.addColorStop(1, "#efa35e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawSun(time) {
    const x = WIDTH - 72;
    const y = 76;
    const pulse = Math.sin(time * 0.7) * 2;
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 76 + pulse);
    glow.addColorStop(0, "rgba(255, 243, 166, 0.9)");
    glow.addColorStop(0.45, "rgba(255, 197, 93, 0.35)");
    glow.addColorStop(1, "rgba(255, 197, 93, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffe681";
    ctx.beginPath();
    ctx.arc(x, y, 25 + pulse * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClouds() {
    for (const cloud of clouds) {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      ctx.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 8, 34, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(24, 2, 22, 19, 0, 0, Math.PI * 2);
      ctx.ellipse(-24, 5, 23, 17, 0, 0, Math.PI * 2);
      ctx.ellipse(1, -8, 25, 21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHarbor(time) {
    const waterY = HEIGHT - GROUND_HEIGHT - 48;

    ctx.fillStyle = "rgba(34, 63, 85, 0.16)";
    for (let i = 0; i < 7; i += 1) {
      const w = 42 + ((i * 19) % 34);
      const h = 44 + ((i * 37) % 76);
      const x = i * 70 - 26;
      ctx.fillRect(x, waterY - h, w, h);
      ctx.fillRect(x + w * 0.28, waterY - h - 14, w * 0.44, 14);
    }

    const water = ctx.createLinearGradient(0, waterY, 0, HEIGHT - GROUND_HEIGHT);
    water.addColorStop(0, "rgba(24, 125, 137, 0.32)");
    water.addColorStop(1, "rgba(31, 96, 126, 0.44)");
    ctx.fillStyle = water;
    ctx.fillRect(0, waterY, WIDTH, 48);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const y = waterY + 9 + i * 8;
      ctx.beginPath();
      for (let x = -20; x <= WIDTH + 20; x += 18) {
        const wave = Math.sin(x * 0.035 + time * 1.7 + i) * 2.2;
        if (x === -20) {
          ctx.moveTo(x, y + wave);
        } else {
          ctx.lineTo(x, y + wave);
        }
      }
      ctx.stroke();
    }
  }

  function drawPipes() {
    for (const pipe of pipes) {
      const topHeight = pipe.centerY - pipe.gap / 2;
      const bottomY = pipe.centerY + pipe.gap / 2;
      drawPipe(pipe.x, 0, topHeight, true, pipe);
      drawPipe(pipe.x, bottomY, HEIGHT - GROUND_HEIGHT - bottomY, false, pipe);
    }
  }

  function drawPipe(x, y, height, top, pipe) {
    if (height <= 0) {
      return;
    }

    const gradient = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, "#0e665b");
    gradient.addColorStop(0.2, "#279572");
    gradient.addColorStop(0.66, pipe.colorShift > 0.5 ? "#68c76f" : "#52b967");
    gradient.addColorStop(1, "#0f5b52");

    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, PIPE_WIDTH, height, 8);
    ctx.fill();

    const capY = top ? y + height - PIPE_CAP : y;
    ctx.fillStyle = "#0d524d";
    roundedRect(ctx, x - 7, capY, PIPE_WIDTH + 14, PIPE_CAP, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(x + 13, y + 10, 7, Math.max(0, height - 20));

    ctx.fillStyle = "rgba(7, 52, 48, 0.18)";
    for (let i = 0; i < pipe.barnacles; i += 1) {
      const bx = x + 22 + i * 18;
      const by = top ? capY - 14 - i * 19 : capY + PIPE_CAP + 16 + i * 21;
      if (by > y + 8 && by < y + height - 8) {
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBird(time) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    const flapOffset = Math.sin(time * 20) * 4 * bird.wing;
    const body = ctx.createLinearGradient(-20, -14, 22, 18);
    body.addColorStop(0, "#ff7d4f");
    body.addColorStop(0.52, "#f4bd3d");
    body.addColorStop(1, "#ffe178");

    ctx.fillStyle = "rgba(32, 52, 71, 0.2)";
    ctx.beginPath();
    ctx.ellipse(-1, 4, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_WIDTH * 0.5, BIRD_HEIGHT * 0.47, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f05f45";
    ctx.beginPath();
    ctx.ellipse(-8, 7 + flapOffset, 12, 6, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffde6b";
    ctx.beginPath();
    ctx.moveTo(17, -2);
    ctx.lineTo(31, 4);
    ctx.lineTo(17, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(10, -7, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#17212b";
    ctx.beginPath();
    ctx.arc(12, -6, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGround(time) {
    const y = HEIGHT - GROUND_HEIGHT;
    const ground = ctx.createLinearGradient(0, y, 0, HEIGHT);
    ground.addColorStop(0, "#e1a647");
    ground.addColorStop(0.28, "#c9853c");
    ground.addColorStop(1, "#8d5933");
    ctx.fillStyle = ground;
    ctx.fillRect(0, y, WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = "#247a67";
    ctx.fillRect(0, y, WIDTH, 12);

    ctx.strokeStyle = "rgba(255, 241, 180, 0.58)";
    ctx.lineWidth = 3;
    const offset = (time * currentSpeed() * 0.38) % 34;
    for (let x = -40 - offset; x < WIDTH + 40; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x + 18, y + 14);
      ctx.lineTo(x + 36, y + 22);
      ctx.stroke();
    }
  }

  function drawMotes() {
    for (const mote of motes) {
      ctx.globalAlpha = mote.life / mote.maxLife;
      ctx.fillStyle = mote.color;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function addFlapMotes() {
    for (let i = 0; i < 8; i += 1) {
      motes.push({
        x: bird.x - 15 + random(-4, 4),
        y: bird.y + random(2, 13),
        vx: random(-76, -24),
        vy: random(18, 70),
        size: random(2, 4.5),
        life: random(0.28, 0.5),
        maxLife: 0.5,
        color: i % 2 ? "#ffffff" : "#ffe178",
      });
    }
  }

  function addBurstMotes() {
    for (let i = 0; i < 24; i += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(56, 190);
      motes.push({
        x: bird.x,
        y: bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: random(2.5, 6),
        life: random(0.45, 0.95),
        maxLife: 0.95,
        color: i % 3 === 0 ? "#f05f45" : i % 3 === 1 ? "#ffe178" : "#ffffff",
      });
    }
  }

  function updateMotes(dt) {
    for (const mote of motes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.vy += 130 * dt;
      mote.life -= dt;
    }
    motes = motes.filter((mote) => mote.life > 0);
  }

  function buildClouds() {
    clouds = Array.from({ length: 7 }, (_, index) => ({
      x: random(20, WIDTH + 150) + index * 35,
      y: random(42, 210),
      scale: random(0.48, 1.04),
      alpha: random(0.46, 0.82),
      speed: random(8, 20),
    }));
  }

  function ensureAudio() {
    if (state.muted) {
      return;
    }
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return;
      }
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playSound(type) {
    if (state.muted || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    if (type === "flap") {
      tone(440, 0.06, "square", 0.045, now);
      tone(650, 0.08, "sine", 0.025, now + 0.035);
    } else if (type === "score") {
      tone(660, 0.08, "sine", 0.04, now);
      tone(920, 0.11, "sine", 0.035, now + 0.07);
    } else if (type === "hit") {
      noise(0.16, 0.18, now);
      tone(130, 0.2, "sawtooth", 0.055, now);
    } else if (type === "pause") {
      tone(260, 0.09, "triangle", 0.035, now);
    } else {
      tone(520, 0.08, "triangle", 0.035, now);
    }
  }

  function tone(frequency, duration, wave, volume, start) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function noise(duration, volume, start) {
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start(start);
  }

  function loadLeaderboard() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((entry) => ({
          name: sanitizeName(entry.name || "Pilot"),
          score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : 0,
          date: entry.date || new Date().toISOString(),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  function persistLeaderboard() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
    } catch (error) {
      window.console.warn("Unable to save leaderboard", error);
    }
  }

  function saveScore() {
    if (state.savedScore) {
      return;
    }

    leaderboard.push({
      name: sanitizeName(playerName.value || "Pilot"),
      score: state.score,
      date: new Date().toISOString(),
    });
    leaderboard.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    leaderboard = leaderboard.slice(0, 10);
    state.savedScore = true;
    state.best = leaderboard[0] ? leaderboard[0].score : 0;
    persistLeaderboard();
    renderLeaderboard();
    nameForm.hidden = true;
    overlayBody.textContent = "Score saved. Ready for another run?";
    updateStatus();
  }

  function renderLeaderboard() {
    leaderboardList.innerHTML = "";
    if (!leaderboard.length) {
      const empty = document.createElement("li");
      empty.className = "empty-row";
      empty.textContent = "No flights logged yet.";
      leaderboardList.append(empty);
      return;
    }

    leaderboard.forEach((entry, index) => {
      const item = document.createElement("li");

      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(index + 1);

      const label = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const date = document.createElement("span");
      date.textContent = formatDate(entry.date);
      label.append(name, date);

      const points = document.createElement("div");
      points.className = "points";
      points.textContent = String(entry.score);

      item.append(rank, label, points);
      leaderboardList.append(item);
    });
  }

  function sanitizeName(value) {
    const compact = String(value).trim().replace(/\s+/g, " ");
    return compact ? compact.slice(0, 14) : "Pilot";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Saved run";
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  init();
})();
