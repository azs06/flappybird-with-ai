(function () {
  "use strict";

  const WIDTH = 432;
  const HEIGHT = 640;
  const GROUND = 78;
  const BIRD_X = 96;
  const BIRD_W = 38;
  const BIRD_H = 30;
  const PIPE_W = 68;
  const PIPE_INTERVAL = 1.42;
  const START_GAP = 178;
  const MIN_GAP = 128;
  const START_SPEED = 148;
  const MAX_SPEED = 222;
  const GRAVITY = 1040;
  const FLAP = -352;
  const STORAGE_KEY = "flap-forge-gpt-55-medium-leaderboard-v2";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const stateText = document.getElementById("stateText");
  const scoreText = document.getElementById("scoreText");
  const overlay = document.getElementById("overlay");
  const overlayLabel = document.getElementById("overlayLabel");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const mainButton = document.getElementById("mainButton");
  const newRunButton = document.getElementById("newRunButton");
  const pauseButton = document.getElementById("pauseButton");
  const muteButton = document.getElementById("muteButton");
  const scoreForm = document.getElementById("scoreForm");
  const playerName = document.getElementById("playerName");
  const leaderboardEl = document.getElementById("leaderboard");
  const clearButton = document.getElementById("clearButton");

  const state = {
    mode: "ready",
    score: 0,
    elapsed: 0,
    pipeTimer: 0,
    lastFrame: 0,
    muted: false,
    saved: false,
    best: 0,
    wind: 0,
  };

  const bird = {
    x: BIRD_X,
    y: HEIGHT * 0.42,
    vy: 0,
    rotation: 0,
    wing: 0,
  };

  let pipes = [];
  let sparks = [];
  let clouds = [];
  let audioCtx = null;
  let leaderboard = loadLeaderboard();

  init();

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

    mainButton.addEventListener("click", () => {
      if (state.mode === "paused") {
        resumeRun();
      } else {
        startRun();
      }
    });

    newRunButton.addEventListener("click", startRun);
    pauseButton.addEventListener("click", togglePause);

    muteButton.addEventListener("click", () => {
      state.muted = !state.muted;
      muteButton.setAttribute("aria-pressed", String(state.muted));
      muteButton.querySelector("span:last-child").textContent = state.muted ? "Muted" : "Sound";
      if (!state.muted) {
        ensureAudio();
        playSound("score");
      }
    });

    scoreForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveScore();
    });

    clearButton.addEventListener("click", () => {
      if (!leaderboard.length || !window.confirm("Clear the Flap Forge leaderboard?")) {
        return;
      }
      leaderboard = [];
      persistLeaderboard();
      renderLeaderboard();
      state.best = 0;
      updateStateText();
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

  function buildClouds() {
    clouds = Array.from({ length: 7 }, (_, index) => ({
      x: index * 82 + 20,
      y: 42 + ((index * 43) % 135),
      r: 18 + (index % 3) * 6,
      speed: 8 + (index % 4) * 4,
    }));
  }

  function resetRun() {
    state.score = 0;
    state.elapsed = 0;
    state.pipeTimer = 0.4;
    state.saved = false;
    state.best = leaderboard[0] ? leaderboard[0].score : 0;
    bird.y = HEIGHT * 0.42;
    bird.vy = 0;
    bird.rotation = 0;
    bird.wing = 0;
    pipes = [];
    sparks = [];
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
    if (state.mode === "playing") {
      flap();
    }
  }

  function flap() {
    bird.vy = FLAP;
    bird.rotation = -0.48;
    bird.wing = 1;
    addSparks(bird.x - 10, bird.y + 8, 5, "#fff4bd");
    playSound("flap");
  }

  function setMode(mode) {
    state.mode = mode;
    pauseButton.disabled = mode !== "playing" && mode !== "paused";
    pauseButton.querySelector("span:first-child").textContent = mode === "paused" ? ">" : "||";
    pauseButton.querySelector("span:last-child").textContent = mode === "paused" ? "Resume" : "Pause";
    overlay.hidden = mode === "playing";

    if (mode === "ready") {
      overlayLabel.textContent = "Ready";
      overlayTitle.textContent = "Flap Forge";
      overlayText.textContent = "Click, tap, or press Space to flap through the brass pipes.";
      mainButton.textContent = "Start";
      newRunButton.hidden = true;
      scoreForm.hidden = true;
    } else if (mode === "paused") {
      overlayLabel.textContent = "Paused";
      overlayTitle.textContent = "Run Suspended";
      overlayText.textContent = `Current score: ${state.score}`;
      mainButton.textContent = "Resume";
      newRunButton.hidden = false;
      scoreForm.hidden = true;
    } else if (mode === "gameover") {
      overlayLabel.textContent = "Game Over";
      overlayTitle.textContent = "Workshop Closed";
      overlayText.textContent = `Final score: ${state.score}`;
      mainButton.textContent = "Play Again";
      newRunButton.hidden = true;
      scoreForm.hidden = false;
    }

    updateStateText();
  }

  function updateStateText() {
    if (state.mode === "ready") {
      stateText.textContent = state.best ? `Best score ${state.best}` : "Ready";
    } else if (state.mode === "playing") {
      stateText.textContent = "Flying";
    } else if (state.mode === "paused") {
      stateText.textContent = "Paused";
    } else {
      stateText.textContent = state.best ? `Best score ${state.best}` : "Run ended";
    }
  }

  function frame(now) {
    const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.033) : 0;
    state.lastFrame = now;

    updateAmbient(dt);
    if (state.mode === "playing") {
      updateGame(dt);
    } else {
      updateIdle(dt);
    }

    draw();
    requestAnimationFrame(frame);
  }

  function updateAmbient(dt) {
    state.wind += dt;
    clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x + cloud.r * 3 < 0) {
        cloud.x = WIDTH + cloud.r * 2;
        cloud.y = 36 + Math.random() * 160;
      }
    });

    sparks = sparks
      .map((spark) => ({
        ...spark,
        x: spark.x + spark.vx * dt,
        y: spark.y + spark.vy * dt,
        vy: spark.vy + 420 * dt,
        life: spark.life - dt,
      }))
      .filter((spark) => spark.life > 0);
  }

  function updateIdle(dt) {
    bird.wing = Math.max(0, bird.wing - dt * 4);
    if (state.mode === "ready") {
      bird.y = HEIGHT * 0.42 + Math.sin(state.wind * 2.6) * 9;
      bird.rotation = Math.sin(state.wind * 2.1) * 0.08;
    }
  }

  function updateGame(dt) {
    state.elapsed += dt;
    state.pipeTimer -= dt;

    const speed = Math.min(MAX_SPEED, START_SPEED + state.elapsed * 3.4);
    const gap = Math.max(MIN_GAP, START_GAP - state.elapsed * 1.4);

    if (state.pipeTimer <= 0) {
      addPipe(gap);
      state.pipeTimer += PIPE_INTERVAL;
    }

    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.rotation = clamp(bird.rotation + dt * 2.5, -0.55, 1.05);
    bird.wing = Math.max(0, bird.wing - dt * 7);

    pipes.forEach((pipe) => {
      pipe.x -= speed * dt;
      if (!pipe.passed && pipe.x + PIPE_W < bird.x - BIRD_W / 2) {
        pipe.passed = true;
        state.score += 1;
        scoreText.textContent = String(state.score);
        addSparks(bird.x + 18, bird.y, 7, "#f1bd42");
        playSound("score");
      }
    });

    pipes = pipes.filter((pipe) => pipe.x + PIPE_W > -8);

    const hit = getCollision();
    if (hit) {
      endRun(hit);
    }
  }

  function addPipe(gap) {
    const marginTop = 64;
    const marginBottom = GROUND + 58;
    const minCenter = marginTop + gap / 2;
    const maxCenter = HEIGHT - marginBottom - gap / 2;
    const center = minCenter + Math.random() * (maxCenter - minCenter);
    pipes.push({
      x: WIDTH + 18,
      top: center - gap / 2,
      bottom: center + gap / 2,
      passed: false,
      shade: Math.random() * 0.18,
    });
  }

  function getCollision() {
    const box = {
      left: bird.x - BIRD_W * 0.42,
      right: bird.x + BIRD_W * 0.42,
      top: bird.y - BIRD_H * 0.42,
      bottom: bird.y + BIRD_H * 0.42,
    };

    if (box.top <= 0) {
      return "ceiling";
    }
    if (box.bottom >= HEIGHT - GROUND) {
      return "ground";
    }

    for (const pipe of pipes) {
      const inPipeX = box.right > pipe.x && box.left < pipe.x + PIPE_W;
      const inPipeY = box.top < pipe.top || box.bottom > pipe.bottom;
      if (inPipeX && inPipeY) {
        return "pipe";
      }
    }

    return "";
  }

  function endRun(reason) {
    if (state.mode !== "playing") {
      return;
    }

    if (reason === "ground") {
      bird.y = HEIGHT - GROUND - BIRD_H * 0.42;
    } else if (reason === "ceiling") {
      bird.y = BIRD_H * 0.42;
    }

    addSparks(bird.x, bird.y, 18, "#e76645");
    setMode("gameover");
    playSound("hit");

    window.setTimeout(() => {
      playerName.focus();
      playerName.select();
    }, 80);
  }

  function addSparks(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      sparks.push({
        x,
        y,
        vx: -90 + Math.random() * 180,
        vy: -160 + Math.random() * 120,
        r: 2 + Math.random() * 3,
        life: 0.35 + Math.random() * 0.28,
        color,
      });
    }
  }

  function draw() {
    drawBackground();
    pipes.forEach(drawPipe);
    drawGround();
    drawSparks();
    drawBird();

    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(30, 38, 48, 0.15)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#76d8ec");
    sky.addColorStop(0.58, "#b9ecdf");
    sky.addColorStop(1, "#f6d887");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    clouds.forEach((cloud) => {
      cloudPuff(cloud.x, cloud.y, cloud.r);
    });

    ctx.fillStyle = "rgba(47, 95, 131, 0.2)";
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 140 - state.wind * 18) % (WIDTH + 160)) - 80;
      drawHill(x, HEIGHT - GROUND - 26, 118, 54);
    }
  }

  function cloudPuff(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y + 3, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x - r * 0.85, y + 4, r * 0.68, 0, Math.PI * 2);
    ctx.arc(x + r * 0.15, y - r * 0.45, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHill(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y - h, x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipe(pipe) {
    const pipeColor = `rgb(${35 + pipe.shade * 80}, ${132 + pipe.shade * 60}, ${90 + pipe.shade * 35})`;
    drawPipeSection(pipe.x, 0, PIPE_W, pipe.top, true, pipeColor);
    drawPipeSection(pipe.x, pipe.bottom, PIPE_W, HEIGHT - GROUND - pipe.bottom, false, pipeColor);
  }

  function drawPipeSection(x, y, w, h, flip, color) {
    if (h <= 0) {
      return;
    }

    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, "#0f5b42");
    grad.addColorStop(0.28, color);
    grad.addColorStop(0.72, "#51b873");
    grad.addColorStop(1, "#0b4937");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(x + 12, y, 8, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(x + w - 12, y, 8, h);

    const capH = 18;
    const capY = flip ? y + h - capH : y;
    ctx.fillStyle = "#17664a";
    ctx.fillRect(x - 7, capY, w + 14, capH);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(x + 7, capY + 3, w * 0.36, 4);
  }

  function drawGround() {
    const y = HEIGHT - GROUND;
    ctx.fillStyle = "#87653f";
    ctx.fillRect(0, y, WIDTH, GROUND);

    const grass = ctx.createLinearGradient(0, y, 0, y + 24);
    grass.addColorStop(0, "#2d965f");
    grass.addColorStop(1, "#187246");
    ctx.fillStyle = grass;
    ctx.fillRect(0, y, WIDTH, 24);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    for (let x = -40 + ((state.wind * 70) % 40); x < WIDTH; x += 40) {
      ctx.fillRect(x, y + 6, 22, 3);
    }
  }

  function drawSparks() {
    sparks.forEach((spark) => {
      ctx.globalAlpha = Math.max(0, spark.life / 0.55);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    ctx.fillStyle = "#e76645";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_W * 0.54, BIRD_H * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f1bd42";
    ctx.beginPath();
    ctx.ellipse(-5, 3, BIRD_W * 0.48, BIRD_H * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff7db";
    ctx.beginPath();
    ctx.ellipse(9, -8, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e2630";
    ctx.beginPath();
    ctx.arc(12, -8, 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffdf65";
    ctx.beginPath();
    ctx.moveTo(17, -2);
    ctx.lineTo(32, 3);
    ctx.lineTo(17, 8);
    ctx.closePath();
    ctx.fill();

    const wingY = 3 + bird.wing * 9;
    ctx.fillStyle = "#c84239";
    ctx.beginPath();
    ctx.ellipse(-8, wingY, 11, 6, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function loadLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
        .map((entry) => ({ name: cleanName(entry.name), score: Math.max(0, Math.floor(entry.score)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  function persistLeaderboard() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
  }

  function renderLeaderboard() {
    leaderboardEl.innerHTML = "";

    if (!leaderboard.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No scores yet.";
      leaderboardEl.appendChild(li);
      return;
    }

    leaderboard.forEach((entry) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      const name = document.createElement("span");
      const score = document.createElement("span");
      row.className = "leader-row";
      name.className = "leader-name";
      score.className = "leader-score";
      name.textContent = entry.name;
      score.textContent = String(entry.score);
      row.append(name, score);
      li.appendChild(row);
      leaderboardEl.appendChild(li);
    });
  }

  function saveScore() {
    if (state.saved) {
      return;
    }

    leaderboard.push({
      name: cleanName(playerName.value),
      score: state.score,
    });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    persistLeaderboard();
    renderLeaderboard();
    state.saved = true;
    state.best = leaderboard[0] ? leaderboard[0].score : 0;
    scoreForm.hidden = true;
    overlayText.textContent = `Saved ${state.score} point${state.score === 1 ? "" : "s"}.`;
    updateStateText();
  }

  function cleanName(name) {
    const cleaned = String(name || "")
      .replace(/[^\w .-]/g, "")
      .trim()
      .slice(0, 12);
    return cleaned || "Pilot";
  }

  function ensureAudio() {
    if (state.muted || audioCtx) {
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }

  function playSound(type) {
    if (state.muted || !audioCtx) {
      return;
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const out = audioCtx.createGain();
    out.connect(audioCtx.destination);
    out.gain.setValueAtTime(0.0001, now);

    if (type === "flap") {
      tone(now, 190, 390, 0.11, "triangle", out);
      out.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    } else if (type === "score") {
      tone(now, 520, 680, 0.09, "sine", out);
      tone(now + 0.08, 680, 860, 0.1, "sine", out);
      out.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    } else if (type === "hit") {
      tone(now, 150, 72, 0.25, "sawtooth", out);
      out.gain.exponentialRampToValueAtTime(0.24, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    } else if (type === "pause") {
      tone(now, 300, 210, 0.12, "square", out);
      out.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    } else {
      tone(now, 330, 440, 0.12, "sine", out);
      out.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    }

    window.setTimeout(() => out.disconnect(), 420);
  }

  function tone(start, from, to, duration, shape, output) {
    const osc = audioCtx.createOscillator();
    osc.type = shape;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    osc.connect(output);
    osc.start(start);
    osc.stop(start + duration);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
