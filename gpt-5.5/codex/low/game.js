(function () {
  "use strict";

  const WIDTH = 400;
  const HEIGHT = 600;
  const GROUND = 72;
  const BIRD_X = 92;
  const BIRD_R = 15;
  const GRAVITY = 980;
  const FLAP = -325;
  const PIPE_W = 64;
  const PIPE_GAP_START = 170;
  const PIPE_GAP_MIN = 128;
  const PIPE_INTERVAL = 1.35;
  const STORE_KEY = "flap-lab-gpt-55-low-leaderboard-v1";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const statusText = document.getElementById("statusText");
  const scoreText = document.getElementById("scoreText");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlayKicker");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayCopy = document.getElementById("overlayCopy");
  const mainButton = document.getElementById("mainButton");
  const restartButton = document.getElementById("restartButton");
  const pauseButton = document.getElementById("pauseButton");
  const soundButton = document.getElementById("soundButton");
  const scoreForm = document.getElementById("scoreForm");
  const playerName = document.getElementById("playerName");
  const leaderboardEl = document.getElementById("leaderboard");
  const clearButton = document.getElementById("clearButton");

  const state = {
    mode: "ready",
    score: 0,
    elapsed: 0,
    pipeTimer: 0,
    last: 0,
    muted: false,
    saved: false,
  };

  const bird = {
    x: BIRD_X,
    y: HEIGHT * 0.42,
    vy: 0,
    tilt: 0,
    wing: 0,
  };

  let pipes = [];
  let puffs = [];
  let leaderboard = loadLeaderboard();
  let audioContext = null;

  function init() {
    canvas.tabIndex = 0;
    resizeCanvas();
    resetRun();
    renderLeaderboard();
    setMode("ready");
    bindEvents();
    requestAnimationFrame(loop);
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);

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

    restartButton.addEventListener("click", startRun);
    pauseButton.addEventListener("click", togglePause);

    soundButton.addEventListener("click", () => {
      state.muted = !state.muted;
      soundButton.setAttribute("aria-pressed", String(state.muted));
      soundButton.textContent = state.muted ? "Muted" : "Sound";
      if (!state.muted) {
        playSound("score");
      }
    });

    scoreForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveScore();
    });

    clearButton.addEventListener("click", () => {
      if (leaderboard.length && window.confirm("Clear the leaderboard?")) {
        leaderboard = [];
        saveLeaderboard();
        renderLeaderboard();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.mode === "playing") {
        pauseRun();
      }
    });
  }

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetRun() {
    state.score = 0;
    state.elapsed = 0;
    state.pipeTimer = 0.55;
    state.saved = false;
    bird.y = HEIGHT * 0.42;
    bird.vy = 0;
    bird.tilt = 0;
    bird.wing = 0;
    pipes = [];
    puffs = [];
    playerName.value = "";
    scoreText.textContent = "0";
  }

  function startRun() {
    resetRun();
    ensureAudio();
    setMode("playing");
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
    bird.tilt = -0.42;
    bird.wing = 1;
    puffs.push({ x: bird.x - 12, y: bird.y + 10, age: 0 });
    playSound("flap");
  }

  function setMode(mode) {
    state.mode = mode;
    pauseButton.disabled = mode !== "playing" && mode !== "paused";
    pauseButton.textContent = mode === "paused" ? "Resume" : "Pause";
    overlay.hidden = mode === "playing";
    scoreForm.hidden = true;
    restartButton.hidden = true;

    if (mode === "ready") {
      statusText.textContent = "Ready";
      overlayKicker.textContent = "Ready";
      overlayTitle.textContent = "Flap Lab";
      overlayCopy.textContent = "Click, tap, or press Space to flap through the pipes.";
      mainButton.textContent = "Start";
    } else if (mode === "paused") {
      statusText.textContent = "Paused";
      overlayKicker.textContent = "Paused";
      overlayTitle.textContent = "Paused";
      overlayCopy.textContent = "Press P, Escape, or the button to resume.";
      mainButton.textContent = "Resume";
    } else if (mode === "gameover") {
      statusText.textContent = "Game over";
      overlayKicker.textContent = "Game Over";
      overlayTitle.textContent = state.score + " point" + (state.score === 1 ? "" : "s");
      overlayCopy.textContent = "Save your score and start another run.";
      mainButton.textContent = "Restart";
      restartButton.hidden = false;
      if (state.score > 0 && !state.saved) {
        scoreForm.hidden = false;
        playerName.focus();
      }
    } else {
      statusText.textContent = "Flying";
    }
  }

  function loop(time) {
    const dt = Math.min(0.033, (time - state.last) / 1000 || 0);
    state.last = time;

    if (state.mode === "playing") {
      update(dt);
    } else {
      updateIdle(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    state.elapsed += dt;
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.tilt = Math.min(0.9, bird.tilt + dt * 2.7);
    bird.wing = Math.max(0, bird.wing - dt * 4);

    const speed = Math.min(215, 142 + state.score * 4);
    state.pipeTimer -= dt;
    if (state.pipeTimer <= 0) {
      addPipe();
      state.pipeTimer = PIPE_INTERVAL;
    }

    for (const pipe of pipes) {
      pipe.x -= speed * dt;
      if (!pipe.passed && pipe.x + PIPE_W < bird.x - BIRD_R) {
        pipe.passed = true;
        state.score += 1;
        scoreText.textContent = String(state.score);
        playSound("score");
      }
    }
    pipes = pipes.filter((pipe) => pipe.x > -PIPE_W - 8);

    for (const puff of puffs) {
      puff.age += dt;
      puff.x -= speed * 0.4 * dt;
    }
    puffs = puffs.filter((puff) => puff.age < 0.45);

    if (bird.y - BIRD_R < 0 || bird.y + BIRD_R > HEIGHT - GROUND || hitsPipe()) {
      endRun();
    }
  }

  function updateIdle(dt) {
    bird.wing = (Math.sin(performance.now() / 145) + 1) / 2;
    if (state.mode === "ready") {
      bird.y = HEIGHT * 0.42 + Math.sin(performance.now() / 420) * 8;
      bird.tilt = Math.sin(performance.now() / 550) * 0.12;
    }
    for (const puff of puffs) {
      puff.age += dt;
    }
    puffs = puffs.filter((puff) => puff.age < 0.45);
  }

  function addPipe() {
    const gap = Math.max(PIPE_GAP_MIN, PIPE_GAP_START - state.score * 2);
    const topMin = 58;
    const topMax = HEIGHT - GROUND - gap - 82;
    const top = topMin + Math.random() * Math.max(1, topMax - topMin);
    pipes.push({ x: WIDTH + 12, top, gap, passed: false });
  }

  function hitsPipe() {
    for (const pipe of pipes) {
      const closestX = clamp(bird.x, pipe.x, pipe.x + PIPE_W);
      const inTop = circleRect(closestX, clamp(bird.y, 0, pipe.top), pipe.x, 0, PIPE_W, pipe.top);
      const bottomY = pipe.top + pipe.gap;
      const inBottom = circleRect(
        closestX,
        clamp(bird.y, bottomY, HEIGHT - GROUND),
        pipe.x,
        bottomY,
        PIPE_W,
        HEIGHT - GROUND - bottomY
      );
      if (inTop || inBottom) {
        return true;
      }
    }
    return false;
  }

  function circleRect(cx, cy, rx, ry, rw, rh) {
    const dx = bird.x - cx;
    const dy = bird.y - cy;
    return dx * dx + dy * dy < BIRD_R * BIRD_R && rw > 0 && rh > 0 && rx < WIDTH + PIPE_W && ry < HEIGHT;
  }

  function endRun() {
    if (state.mode !== "playing") {
      return;
    }
    playSound("crash");
    setMode("gameover");
  }

  function draw() {
    drawBackground();
    pipes.forEach(drawPipe);
    drawGround();
    drawPuffs();
    drawBird();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#7fd6eb");
    sky.addColorStop(0.72, "#c8f0df");
    sky.addColorStop(1, "#f7d180");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    cloud(48, 82, 1);
    cloud(286, 126, 0.78);
    cloud(182, 42, 0.55);

    ctx.fillStyle = "rgba(54, 130, 126, 0.22)";
    for (let i = 0; i < 5; i += 1) {
      const x = i * 96 - ((state.elapsed * 18) % 96);
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT - GROUND);
      ctx.lineTo(x + 52, HEIGHT - GROUND - 70 - i * 3);
      ctx.lineTo(x + 106, HEIGHT - GROUND);
      ctx.closePath();
      ctx.fill();
    }
  }

  function cloud(x, y, scale) {
    ctx.beginPath();
    ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
    ctx.arc(x + 20 * scale, y - 9 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.arc(x + 48 * scale, y, 17 * scale, 0, Math.PI * 2);
    ctx.rect(x - 5 * scale, y, 58 * scale, 18 * scale);
    ctx.fill();
  }

  function drawPipe(pipe) {
    const bottomY = pipe.top + pipe.gap;
    pipeSegment(pipe.x, 0, PIPE_W, pipe.top, true);
    pipeSegment(pipe.x, bottomY, PIPE_W, HEIGHT - GROUND - bottomY, false);
  }

  function pipeSegment(x, y, w, h, flip) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, "#257a3f");
    grad.addColorStop(0.5, "#5fca58");
    grad.addColorStop(1, "#1e6a39");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x + 10, y, 8, h);
    ctx.strokeStyle = "rgba(18,72,43,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    const capY = flip ? y + h - 16 : y;
    ctx.fillStyle = "#4cb84e";
    ctx.fillRect(x - 7, capY, w + 14, 16);
    ctx.strokeRect(x - 7, capY, w + 14, 16);
  }

  function drawGround() {
    ctx.fillStyle = "#d99544";
    ctx.fillRect(0, HEIGHT - GROUND, WIDTH, GROUND);
    ctx.fillStyle = "#68b957";
    ctx.fillRect(0, HEIGHT - GROUND, WIDTH, 14);
    ctx.fillStyle = "rgba(120,72,29,0.22)";
    for (let x = -40; x < WIDTH + 40; x += 34) {
      const sx = x - ((state.elapsed * 142) % 34);
      ctx.fillRect(sx, HEIGHT - GROUND + 28, 20, 5);
    }
  }

  function drawPuffs() {
    for (const puff of puffs) {
      const alpha = 1 - puff.age / 0.45;
      ctx.fillStyle = "rgba(255,255,255," + alpha * 0.7 + ")";
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, 8 + puff.age * 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.tilt);

    ctx.fillStyle = "#f4b43c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(99,62,19,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffd86b";
    ctx.beginPath();
    ctx.ellipse(-7, 2, 10, 8, bird.wing * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(10, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef6c36";
    ctx.beginPath();
    ctx.moveTo(17, -1);
    ctx.lineTo(31, 4);
    ctx.lineTo(17, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function ensureAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playSound(type) {
    if (state.muted) {
      return;
    }
    ensureAudio();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const settings = {
      flap: [520, 0.07, "sine", 0.06],
      score: [880, 0.11, "triangle", 0.07],
      crash: [120, 0.22, "sawtooth", 0.08],
      pause: [260, 0.08, "square", 0.035],
    }[type] || [440, 0.08, "sine", 0.04];

    osc.type = settings[2];
    osc.frequency.setValueAtTime(settings[0], now);
    if (type === "crash") {
      osc.frequency.exponentialRampToValueAtTime(60, now + settings[1]);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings[3], now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[1]);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + settings[1] + 0.02);
  }

  function saveScore() {
    const name = (playerName.value || "Player").trim().slice(0, 12) || "Player";
    leaderboard.push({ name, score: state.score, date: Date.now() });
    leaderboard.sort((a, b) => b.score - a.score || a.date - b.date);
    leaderboard = leaderboard.slice(0, 10);
    saveLeaderboard();
    renderLeaderboard();
    state.saved = true;
    scoreForm.hidden = true;
  }

  function loadLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch (error) {
      return [];
    }
  }

  function saveLeaderboard() {
    localStorage.setItem(STORE_KEY, JSON.stringify(leaderboard));
  }

  function renderLeaderboard() {
    leaderboardEl.innerHTML = "";
    if (!leaderboard.length) {
      const li = document.createElement("li");
      li.textContent = "No scores yet";
      leaderboardEl.appendChild(li);
      return;
    }
    for (const entry of leaderboard) {
      const li = document.createElement("li");
      li.textContent = entry.name;
      const score = document.createElement("span");
      score.textContent = entry.score;
      li.appendChild(score);
      leaderboardEl.appendChild(li);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  init();
})();
