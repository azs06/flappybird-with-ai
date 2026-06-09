(() => {
  'use strict';

  const WIDTH = 420;
  const HEIGHT = 640;
  const GROUND_HEIGHT = 88;
  const FLOOR_Y = HEIGHT - GROUND_HEIGHT;
  const TAU = Math.PI * 2;

  const GRAVITY = 1525;
  const FLAP_VELOCITY = -455;
  const MAX_FALL_SPEED = 710;
  const PIPE_WIDTH = 76;
  const PIPE_CAP_HEIGHT = 29;
  const PIPE_CAP_OVERHANG = 9;
  const PIPE_SPACING = 286;
  const BASE_SPEED = 168;
  const SPEED_GAIN = 4.8;
  const MAX_SPEED_BONUS = 92;
  const STARTING_GAP = 174;
  const MIN_GAP = 126;

  const STORAGE_KEY = 'flappy-orbit-pi-xhigh-leaderboard-v1';
  const LAST_NAME_KEY = 'flappy-orbit-pi-xhigh-last-name';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreValue = document.getElementById('scoreValue');
  const bestValue = document.getElementById('bestValue');
  const stateBadge = document.getElementById('stateBadge');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const muteButton = document.getElementById('muteButton');
  const clearScoresButton = document.getElementById('clearScoresButton');
  const leaderboardList = document.getElementById('leaderboard');

  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrap = (value, span) => ((value % span) + span) % span;

  let state = 'ready';
  let score = 0;
  let worldX = 0;
  let pipeTimer = 0;
  let pipes = [];
  let particles = [];
  let leaderboard = loadLeaderboard();
  let awaitingScoreName = false;
  let lastTime = performance.now();

  const stars = Array.from({ length: 58 }, () => ({
    x: random(8, WIDTH - 8),
    y: random(18, FLOOR_Y * 0.58),
    radius: random(0.7, 2.1),
    phase: random(0, TAU),
    twinkle: random(0.35, 0.95)
  }));

  const clouds = [
    { x: 38, y: 112, scale: 0.82, speed: 0.18, alpha: 0.62 },
    { x: 220, y: 74, scale: 0.58, speed: 0.14, alpha: 0.48 },
    { x: 354, y: 154, scale: 0.96, speed: 0.22, alpha: 0.54 },
    { x: 510, y: 98, scale: 0.72, speed: 0.17, alpha: 0.50 }
  ];

  let bird = createBird();

  const sound = {
    context: null,
    muted: false,

    ensure() {
      if (this.muted) return null;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') this.context.resume();
      return this.context;
    },

    tone(frequency, duration, options = {}) {
      const audio = this.ensure();
      if (!audio) return;

      const start = audio.currentTime + (options.delay || 0);
      const end = start + duration;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const peak = options.volume ?? 0.06;

      oscillator.type = options.type || 'sine';
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
      if (options.to) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), end);
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.04);
    },

    noise(duration = 0.2, volume = 0.06) {
      const audio = this.ensure();
      if (!audio) return;

      const sampleCount = Math.max(1, Math.floor(audio.sampleRate * duration));
      const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < sampleCount; i += 1) {
        const fade = 1 - i / sampleCount;
        data[i] = (Math.random() * 2 - 1) * fade * fade;
      }

      const source = audio.createBufferSource();
      const gain = audio.createGain();
      const start = audio.currentTime;
      source.buffer = buffer;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(gain).connect(audio.destination);
      source.start(start);
      source.stop(start + duration);
    },

    flap() {
      this.tone(440, 0.075, { type: 'triangle', volume: 0.055, to: 720 });
      this.tone(190, 0.06, { type: 'sine', volume: 0.025, to: 120 });
    },

    score() {
      this.tone(660, 0.1, { type: 'sine', volume: 0.052 });
      this.tone(880, 0.13, { type: 'triangle', volume: 0.045, delay: 0.07 });
      this.tone(1180, 0.12, { type: 'sine', volume: 0.034, delay: 0.14 });
    },

    crash() {
      this.noise(0.24, 0.09);
      this.tone(150, 0.22, { type: 'sawtooth', volume: 0.07, to: 55 });
      this.tone(74, 0.34, { type: 'square', volume: 0.035, delay: 0.04, to: 35 });
    }
  };

  function createBird() {
    return {
      x: 108,
      y: 278,
      baseY: 278,
      radius: 18,
      velocityY: 0,
      rotation: 0,
      flapPulse: 0
    };
  }

  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function currentSpeed() {
    return BASE_SPEED + Math.min(score * SPEED_GAIN, MAX_SPEED_BONUS);
  }

  function currentGap() {
    return Math.max(MIN_GAP, STARTING_GAP - score * 1.7);
  }

  function resetRound() {
    score = 0;
    worldX = 0;
    pipeTimer = 1.05;
    pipes = [];
    particles = [];
    bird = createBird();
  }

  function beginGame() {
    if (awaitingScoreName) return;

    sound.ensure();
    resetRound();
    state = 'playing';
    flapBird(true);
    updateUi();
    canvas.focus({ preventScroll: true });
  }

  function flapBird(skipStateCheck = false) {
    if (!skipStateCheck) {
      if (awaitingScoreName) return;
      sound.ensure();
      if (state === 'ready' || state === 'gameover') {
        beginGame();
        return;
      }
      if (state !== 'playing') return;
    }

    bird.velocityY = FLAP_VELOCITY;
    bird.flapPulse = 1;
    spawnFlapParticles();
    sound.flap();
  }

  function togglePause() {
    sound.ensure();
    if (state === 'playing') {
      state = 'paused';
    } else if (state === 'paused') {
      state = 'playing';
    }
    updateUi();
  }

  function endGame(reason) {
    if (state !== 'playing') return;

    state = 'gameover';
    if (reason === 'ground') {
      bird.y = FLOOR_Y - bird.radius;
      bird.velocityY = 0;
    } else if (reason === 'ceiling') {
      bird.y = bird.radius;
      bird.velocityY = 190;
    } else {
      bird.velocityY = Math.max(145, bird.velocityY);
    }
    bird.rotation = 1.25;
    awaitingScoreName = true;

    spawnCrashParticles(reason);
    sound.crash();
    updateUi();

    const finalScore = score;
    window.setTimeout(() => promptForScore(finalScore), 320);
  }

  function promptForScore(finalScore) {
    const previousName = safeRead(LAST_NAME_KEY) || 'ACE';
    let enteredName = window.prompt(
      `Game over! You scored ${finalScore}.\nEnter your pilot name for the Top 10 leaderboard:`,
      previousName
    );

    if (enteredName === null) enteredName = previousName || 'PLAYER';
    const pilot = normalizeName(enteredName);
    awaitingScoreName = false;
    safeWrite(LAST_NAME_KEY, pilot);
    addLeaderboardEntry(pilot, finalScore);
    updateUi();
  }

  function update(dt, time) {
    if (state === 'playing') {
      updatePlaying(dt);
    } else if (state === 'ready') {
      worldX += 24 * dt;
      bird.y = bird.baseY + Math.sin(time * 3.4) * 7;
      bird.rotation = Math.sin(time * 2.2) * 0.08;
      bird.flapPulse = Math.max(0, bird.flapPulse - dt * 2.6);
    } else if (state === 'gameover') {
      updateGameOver(dt);
    }

    updateParticles(dt);
  }

  function updatePlaying(dt) {
    const speed = currentSpeed();
    worldX += speed * dt;

    bird.velocityY = clamp(bird.velocityY + GRAVITY * dt, -760, MAX_FALL_SPEED);
    bird.y += bird.velocityY * dt;
    bird.rotation = clamp(bird.velocityY / 610, -0.58, 1.3);
    bird.flapPulse = Math.max(0, bird.flapPulse - dt * 3.8);

    pipeTimer -= dt;
    if (pipeTimer <= 0) {
      spawnPipe();
      pipeTimer += Math.max(0.92, PIPE_SPACING / currentSpeed());
    }

    for (const pipe of pipes) {
      pipe.x -= speed * dt;

      if (!pipe.scored && pipe.x + pipe.width + PIPE_CAP_OVERHANG < bird.x - bird.radius) {
        pipe.scored = true;
        score += 1;
        spawnScoreParticles(pipe.x + pipe.width, pipe.gapTop + pipe.gap / 2);
        sound.score();
        updateUi();
      }
    }

    pipes = pipes.filter((pipe) => pipe.x + pipe.width > -34);

    if (bird.y - bird.radius <= 0) {
      endGame('ceiling');
      return;
    }

    if (bird.y + bird.radius >= FLOOR_Y) {
      endGame('ground');
      return;
    }

    for (const pipe of pipes) {
      const bottomY = pipe.gapTop + pipe.gap;
      const collisionRadius = bird.radius - 2;
      const topHit = circleRectCollision(bird.x, bird.y, collisionRadius, pipe.x, 0, pipe.width, pipe.gapTop);
      const topCapHit = circleRectCollision(
        bird.x,
        bird.y,
        collisionRadius,
        pipe.x - PIPE_CAP_OVERHANG,
        Math.max(0, pipe.gapTop - PIPE_CAP_HEIGHT),
        pipe.width + PIPE_CAP_OVERHANG * 2,
        Math.min(PIPE_CAP_HEIGHT, pipe.gapTop)
      );
      const bottomHit = circleRectCollision(bird.x, bird.y, collisionRadius, pipe.x, bottomY, pipe.width, FLOOR_Y - bottomY);
      const bottomCapHit = circleRectCollision(
        bird.x,
        bird.y,
        collisionRadius,
        pipe.x - PIPE_CAP_OVERHANG,
        bottomY,
        pipe.width + PIPE_CAP_OVERHANG * 2,
        Math.min(PIPE_CAP_HEIGHT, FLOOR_Y - bottomY)
      );
      if (topHit || topCapHit || bottomHit || bottomCapHit) {
        endGame('pipe');
        return;
      }
    }
  }

  function updateGameOver(dt) {
    if (bird.y + bird.radius < FLOOR_Y) {
      bird.velocityY = clamp(bird.velocityY + GRAVITY * dt, -760, MAX_FALL_SPEED);
      bird.y += bird.velocityY * dt;
      bird.rotation = clamp(bird.rotation + dt * 2.6, -0.58, 1.55);
    } else {
      bird.y = FLOOR_Y - bird.radius;
      bird.velocityY = 0;
    }
  }

  function spawnPipe() {
    const gap = currentGap();
    const minGapTop = 68;
    const maxGapTop = FLOOR_Y - gap - 76;
    const gapTop = Math.round(random(minGapTop, maxGapTop));
    pipes.push({
      x: WIDTH + 20,
      width: PIPE_WIDTH,
      gapTop,
      gap,
      scored: false,
      hueShift: random(-10, 12)
    });
  }

  function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function spawnFlapParticles() {
    for (let i = 0; i < 9; i += 1) {
      particles.push({
        x: bird.x - random(12, 24),
        y: bird.y + random(-6, 10),
        vx: random(-82, -24),
        vy: random(-28, 46),
        radius: random(1.8, 4.4),
        life: random(0.22, 0.38),
        maxLife: 0.38,
        gravity: -8,
        color: 'rgba(255, 255, 255, 0.85)'
      });
    }
  }

  function spawnScoreParticles(x, y) {
    const colors = ['#55f1ff', '#ffd166', '#73f59a', '#ff8cc6', '#ffffff'];
    for (let i = 0; i < 22; i += 1) {
      particles.push({
        x,
        y,
        vx: random(-115, 115),
        vy: random(-150, -28),
        radius: random(2.2, 5),
        life: random(0.48, 0.86),
        maxLife: 0.86,
        gravity: 250,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function spawnCrashParticles(reason) {
    const burst = reason === 'ground' ? 18 : 30;
    const colors = ['#ff5c7c', '#ffd166', '#ffffff', '#55f1ff'];
    for (let i = 0; i < burst; i += 1) {
      particles.push({
        x: bird.x + random(-12, 16),
        y: bird.y + random(-14, 14),
        vx: random(-170, 150),
        vy: random(-190, 80),
        radius: random(2.2, 6),
        life: random(0.42, 0.9),
        maxLife: 0.9,
        gravity: 420,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function updateParticles(dt) {
    particles = particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) return false;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return true;
    });
  }

  function draw(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground(time);
    drawPipes();
    drawBird(time);
    drawGround();
    drawParticles();
    drawScore();
  }

  function drawBackground(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    sky.addColorStop(0, '#14194a');
    sky.addColorStop(0.38, '#1c4f8f');
    sky.addColorStop(0.78, '#61c5d6');
    sky.addColorStop(1, '#9be7d6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, FLOOR_Y);

    drawStars(time);
    drawPlanet(time);
    drawClouds();
    drawHillLayer(455, 74, 120, 0.16, 'rgba(36, 73, 128, 0.72)');
    drawHillLayer(500, 54, 96, 0.31, 'rgba(30, 111, 121, 0.72)');
  }

  function drawStars(time) {
    ctx.save();
    for (const star of stars) {
      const alpha = 0.18 + Math.sin(time * star.twinkle + star.phase) * 0.12 + star.twinkle * 0.34;
      ctx.globalAlpha = clamp(alpha, 0.08, 0.82);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlanet(time) {
    const bob = Math.sin(time * 0.55) * 3;
    ctx.save();
    ctx.translate(326, 86 + bob);
    ctx.shadowColor = 'rgba(255, 209, 102, 0.55)';
    ctx.shadowBlur = 28;
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
    glow.addColorStop(0, '#ffe9a9');
    glow.addColorStop(0.45, '#ffd166');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = 5;
    ctx.rotate(-0.18);
    ctx.beginPath();
    ctx.ellipse(0, 4, 66, 17, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawClouds() {
    for (const cloud of clouds) {
      const x = wrap(cloud.x - worldX * cloud.speed + 100, WIDTH + 220) - 110;
      drawCloud(x, cloud.y, cloud.scale, cloud.alpha);
    }
  }

  function drawCloud(x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f4fbff';
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * scale, 14 * scale, 0, 0, TAU);
    ctx.ellipse(x + 22 * scale, y - 9 * scale, 26 * scale, 19 * scale, 0, 0, TAU);
    ctx.ellipse(x + 48 * scale, y, 34 * scale, 16 * scale, 0, 0, TAU);
    ctx.ellipse(x + 12 * scale, y + 7 * scale, 38 * scale, 15 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawHillLayer(baseY, amplitude, step, parallax, color) {
    const offset = -wrap(worldX * parallax, step);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(offset - step, FLOOR_Y);
    ctx.lineTo(offset - step, baseY);

    for (let x = offset - step; x <= WIDTH + step; x += step) {
      const peak = baseY - amplitude * (0.65 + 0.25 * Math.sin((x + worldX * 0.03) * 0.035));
      ctx.quadraticCurveTo(x + step * 0.5, peak, x + step, baseY);
    }

    ctx.lineTo(WIDTH + step, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPipes() {
    for (const pipe of pipes) {
      const bottomY = pipe.gapTop + pipe.gap;
      drawPipeSegment(pipe.x, 0, pipe.width, pipe.gapTop, true, pipe.hueShift);
      drawPipeSegment(pipe.x, bottomY, pipe.width, FLOOR_Y - bottomY, false, pipe.hueShift);
    }
  }

  function drawPipeSegment(x, y, width, height, isTop, hueShift) {
    if (height <= 0) return;

    const capHeight = PIPE_CAP_HEIGHT;
    const capY = isTop ? Math.max(y, y + height - capHeight) : y;
    const greenA = hueShift > 0 ? '#4bf098' : '#37df7f';
    const greenB = hueShift > 0 ? '#168a58' : '#0d6f49';

    ctx.save();
    ctx.shadowColor = 'rgba(4, 11, 24, 0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;

    const bodyGradient = ctx.createLinearGradient(x, 0, x + width, 0);
    bodyGradient.addColorStop(0, '#0a5c3d');
    bodyGradient.addColorStop(0.22, greenA);
    bodyGradient.addColorStop(0.62, '#24bd71');
    bodyGradient.addColorStop(1, greenB);
    ctx.fillStyle = bodyGradient;
    roundedRectPath(x, y, width, height, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 10, y + 8, 7, Math.max(0, height - 16));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x + width - 12, y + 6, 6, Math.max(0, height - 12));

    const capGradient = ctx.createLinearGradient(x - PIPE_CAP_OVERHANG, 0, x + width + PIPE_CAP_OVERHANG, 0);
    capGradient.addColorStop(0, '#087144');
    capGradient.addColorStop(0.2, '#72ffad');
    capGradient.addColorStop(0.6, '#31d67c');
    capGradient.addColorStop(1, '#0d6b45');
    ctx.fillStyle = capGradient;
    roundedRectPath(x - PIPE_CAP_OVERHANG, capY, width + PIPE_CAP_OVERHANG * 2, capHeight, 9);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, capY + 6);
    ctx.lineTo(x + width + 1, capY + 6);
    ctx.stroke();

    ctx.restore();
  }

  function drawBird(time) {
    const wingBeat = Math.sin(time * 19) * 0.25 - bird.flapPulse * 0.75;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    ctx.shadowColor = 'rgba(255, 209, 102, 0.42)';
    ctx.shadowBlur = 18;

    ctx.fillStyle = '#f05f72';
    ctx.beginPath();
    ctx.moveTo(-17, 2);
    ctx.lineTo(-33, -9);
    ctx.lineTo(-28, 10);
    ctx.closePath();
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(-8, -8, 4, 2, 4, 30);
    bodyGradient.addColorStop(0, '#fff4a5');
    bodyGradient.addColorStop(0.5, '#ffd166');
    bodyGradient.addColorStop(1, '#ff9f4a');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 1, 24, 20, 0, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(38, 3);
    ctx.lineTo(18, 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 35, 31, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(21, 4);
    ctx.lineTo(35, 3);
    ctx.stroke();

    ctx.save();
    ctx.rotate(wingBeat);
    ctx.fillStyle = '#ff7891';
    ctx.beginPath();
    ctx.ellipse(-7, 7, 14, 8, -0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 8, 3.4, -0.25, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -7, 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#091326';
    ctx.beginPath();
    ctx.arc(11.5, -7, 2.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(12.6, -8.5, 1.1, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawGround() {
    const tile = 34;
    const offset = -wrap(worldX, tile);

    ctx.save();
    const dirt = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
    dirt.addColorStop(0, '#6cdb65');
    dirt.addColorStop(0.18, '#44a35f');
    dirt.addColorStop(0.2, '#8d6034');
    dirt.addColorStop(1, '#4b2d24');
    ctx.fillStyle = dirt;
    ctx.fillRect(0, FLOOR_Y, WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, FLOOR_Y + 3, WIDTH, 3);

    for (let x = offset - tile; x < WIDTH + tile; x += tile) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
      ctx.beginPath();
      ctx.moveTo(x, FLOOR_Y + 18);
      ctx.lineTo(x + tile * 0.5, FLOOR_Y + 10);
      ctx.lineTo(x + tile, FLOOR_Y + 18);
      ctx.lineTo(x + tile, FLOOR_Y + 26);
      ctx.lineTo(x, FLOOR_Y + 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(x + 6, FLOOR_Y + 43, 16, 5);
      ctx.fillRect(x + 20, FLOOR_Y + 64, 22, 5);
    }

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (0.5 + alpha * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawScore() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 52px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(4, 10, 25, 0.62)';
    ctx.strokeText(String(score), WIDTH / 2, 78);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(score), WIDTH / 2, 78);
    ctx.restore();
  }

  function roundedRectPath(x, y, width, height, radius) {
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

  function updateUi() {
    const best = Math.max(getBestScore(), score);
    scoreValue.textContent = String(score);
    bestValue.textContent = String(best);

    const labels = {
      ready: 'Ready',
      playing: 'Flying',
      paused: 'Paused',
      gameover: 'Crashed'
    };
    stateBadge.textContent = labels[state];

    pauseButton.disabled = !(state === 'playing' || state === 'paused');
    pauseButton.textContent = state === 'paused' ? 'Resume' : 'Pause';
    startButton.disabled = awaitingScoreName;
    startButton.textContent = state === 'ready' ? 'Start' : state === 'gameover' ? 'Play Again' : 'Restart';
    muteButton.textContent = sound.muted ? 'Muted' : 'Sound On';
    muteButton.setAttribute('aria-pressed', String(sound.muted));

    if (state === 'playing') {
      overlay.classList.add('hidden');
    } else {
      overlay.classList.remove('hidden');
      if (state === 'ready') {
        overlayTitle.textContent = 'Ready for takeoff?';
        overlayText.textContent = 'Press Space, tap, or click the canvas to flap through the first gate.';
      } else if (state === 'paused') {
        overlayTitle.textContent = 'Paused in orbit';
        overlayText.textContent = 'Press P or the Resume button when you are ready to keep flying.';
      } else if (state === 'gameover') {
        overlayTitle.textContent = 'Orbit lost!';
        overlayText.textContent = awaitingScoreName
          ? `Final score: ${score}. Enter your pilot name in the prompt to save your run.`
          : `Final score: ${score}. Press R or Play Again for another run.`;
      }
    }
  }

  function safeRead(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // localStorage may be disabled; the game still works without persistence.
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function normalizeName(name) {
    const clean = String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ._-]/gi, '')
      .slice(0, 12)
      .toUpperCase();
    return clean || 'PLAYER';
  }

  function loadLeaderboard() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => ({
          name: normalizeName(entry.name),
          score: Number.isFinite(Number(entry.score)) ? Math.max(0, Math.floor(Number(entry.score))) : 0,
          date: Number(entry.date) || 0
        }))
        .sort(sortScores)
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  function sortScores(a, b) {
    return b.score - a.score || a.date - b.date;
  }

  function saveLeaderboard() {
    safeWrite(STORAGE_KEY, JSON.stringify(leaderboard));
  }

  function getBestScore() {
    return leaderboard.length ? leaderboard[0].score : 0;
  }

  function addLeaderboardEntry(name, finalScore) {
    leaderboard.push({
      name: normalizeName(name),
      score: Math.max(0, Math.floor(finalScore)),
      date: Date.now()
    });
    leaderboard.sort(sortScores);
    leaderboard = leaderboard.slice(0, 10);
    saveLeaderboard();
    renderLeaderboard();
  }

  function renderLeaderboard() {
    leaderboardList.innerHTML = '';

    if (!leaderboard.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-board';
      empty.textContent = 'No flights logged yet. Be the first pilot on the board!';
      leaderboardList.appendChild(empty);
      return;
    }

    for (const entry of leaderboard) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const points = document.createElement('span');

      name.className = 'pilot';
      points.className = 'points';
      name.textContent = entry.name;
      points.textContent = String(entry.score);

      item.append(name, points);
      leaderboardList.appendChild(item);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt, now / 1000);
    draw(now / 1000);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    flapBird();
  });

  startButton.addEventListener('click', beginGame);
  pauseButton.addEventListener('click', togglePause);

  muteButton.addEventListener('click', () => {
    sound.muted = !sound.muted;
    if (!sound.muted) sound.ensure();
    updateUi();
  });

  clearScoresButton.addEventListener('click', () => {
    if (!leaderboard.length) return;
    const clear = window.confirm('Clear all saved Flappy Orbit scores?');
    if (!clear) return;
    leaderboard = [];
    safeRemove(STORAGE_KEY);
    renderLeaderboard();
    updateUi();
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === ' ' || key === 'arrowup' || key === 'w') {
      event.preventDefault();
      flapBird();
    } else if (key === 'p') {
      event.preventDefault();
      togglePause();
    } else if (key === 'escape') {
      if (state === 'playing' || state === 'paused') {
        event.preventDefault();
        togglePause();
      }
    } else if (key === 'r') {
      event.preventDefault();
      beginGame();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') {
      state = 'paused';
      updateUi();
    }
  });

  window.addEventListener('resize', setupCanvas);

  setupCanvas();
  renderLeaderboard();
  updateUi();
  requestAnimationFrame(loop);
})();
