// CyberFlap // Neon Horizon Game Code

// Sound Manager using Web Audio API
class CyberAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playFlap() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    // Sweeping frequency upward quickly
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playScore() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Coin chime: C5 then E5
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setValueAtTime(0.1, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  playCollision() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Synth Explosion: low frequency sweep + noise crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    // Add white noise puff for the crunch
    try {
      const bufferSize = this.ctx.sampleRate * 0.35; // 0.35 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(600, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + 0.36);
    } catch (e) {
      // Fallback if buffer creation fails
    }
  }
}

const audio = new CyberAudio();

// Set up Canvases
const starsCanvas = document.getElementById('bg-stars-canvas');
const starsCtx = starsCanvas.getContext('2d');

const cityCanvas = document.getElementById('bg-city-canvas');
const cityCtx = cityCanvas.getContext('2d');

const gameCanvas = document.getElementById('game-canvas');
const ctx = gameCanvas.getContext('2d');

// Game constants and state variables
let width, height;
function resizeCanvases() {
  const container = document.getElementById('game-container');
  width = container.clientWidth;
  height = container.clientHeight;

  starsCanvas.width = width;
  starsCanvas.height = height;

  cityCanvas.width = width;
  cityCanvas.height = height;

  gameCanvas.width = width;
  gameCanvas.height = height;
}

window.addEventListener('resize', () => {
  resizeCanvases();
  // Redraw backgrounds static elements if game is not running
  drawStars();
  drawCity();
});

// Setup initially
resizeCanvases();

// Game State Enum
const STATES = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  LEADERBOARD: 'leaderboard'
};
let gameState = STATES.START;

// Gameplay Parameters
const GRAVITY = 0.45;
const JUMP_STRENGTH = -7.5;
const MAX_FALL_SPEED = 10;
const PIPE_SPEED = 2.8;
const PIPE_SPAWN_INTERVAL = 110; // frames between pipes
const PIPE_GAP = 145; // size of hole
const MIN_PIPE_HEIGHT = 80;

// Game Entities
let bird = {
  x: 0,
  y: 0,
  radius: 16,
  velocity: 0,
  angle: 0,
  flap() {
    this.velocity = JUMP_STRENGTH;
    audio.playFlap();
  }
};

let pipes = [];
let particles = []; // jet engine particles & explosion particles
let score = 0;
let frameCount = 0;
let groundOffset = 0;
let lastTime = 0;

// Parallax background variables
let stars = [];
let buildings = [];

// Initialize stars
function initStars() {
  stars = [];
  const numStars = 60;
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * (height * 0.7),
      size: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.15 + 0.05,
      alpha: Math.random() * 0.8 + 0.2,
      sparkleSpeed: Math.random() * 0.03 + 0.01,
      sparkleDir: Math.random() > 0.5 ? 1 : -1
    });
  }
}

// Initialize city
function initCity() {
  buildings = [];
  const numBuildings = 12;
  const buildWidth = width / 6;
  for (let i = 0; i <= numBuildings; i++) {
    buildings.push({
      x: i * buildWidth * 0.9,
      width: buildWidth * (Math.random() * 0.4 + 0.8),
      height: Math.random() * (height * 0.3) + height * 0.1,
      speed: 0.4,
      windowRows: Math.floor(Math.random() * 4) + 3,
      windowCols: Math.floor(Math.random() * 2) + 2,
      lightStatus: Array.from({length: 15}, () => Math.random() > 0.4)
    });
  }
}

// Background Drawing Functions
function updateAndDrawStars() {
  starsCtx.fillStyle = '#030008';
  starsCtx.fillRect(0, 0, width, height);

  stars.forEach(star => {
    if (gameState === STATES.PLAYING) {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = width;
        star.y = Math.random() * (height * 0.7);
      }
    }

    // Sparkle effect
    star.alpha += star.sparkleSpeed * star.sparkleDir;
    if (star.alpha > 0.95) {
      star.alpha = 0.95;
      star.sparkleDir = -1;
    } else if (star.alpha < 0.2) {
      star.alpha = 0.2;
      star.sparkleDir = 1;
    }

    starsCtx.fillStyle = `rgba(0, 240, 255, ${star.alpha})`;
    starsCtx.beginPath();
    starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    starsCtx.fill();
  });
}

function drawStars() {
  // Static stars when not playing
  starsCtx.fillStyle = '#030008';
  starsCtx.fillRect(0, 0, width, height);
  stars.forEach(star => {
    starsCtx.fillStyle = `rgba(0, 240, 255, ${star.alpha})`;
    starsCtx.beginPath();
    starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    starsCtx.fill();
  });
}

function updateAndDrawCity() {
  cityCtx.clearRect(0, 0, width, height);

  // Drawing the ground gradient base in city canvas to blend layers
  const gradient = cityCtx.createLinearGradient(0, height * 0.6, 0, height);
  gradient.addColorStop(0, 'rgba(3, 0, 8, 0)');
  gradient.addColorStop(1, '#0e041d');
  cityCtx.fillStyle = gradient;
  cityCtx.fillRect(0, height * 0.6, width, height * 0.4);

  buildings.forEach(b => {
    if (gameState === STATES.PLAYING) {
      b.x -= b.speed;
      if (b.x + b.width < 0) {
        b.x = width;
        b.height = Math.random() * (height * 0.3) + height * 0.1;
      }
    }

    // Draw building base silhouette
    const buildGrad = cityCtx.createLinearGradient(b.x, height - b.height - 100, b.x, height);
    buildGrad.addColorStop(0, 'rgba(15, 10, 35, 0.95)');
    buildGrad.addColorStop(1, 'rgba(5, 2, 12, 0.98)');
    
    cityCtx.fillStyle = buildGrad;
    cityCtx.strokeStyle = 'rgba(255, 0, 127, 0.1)';
    cityCtx.lineWidth = 1;
    cityCtx.fillRect(b.x, height - b.height - 100, b.width, b.height + 100);
    cityCtx.strokeRect(b.x, height - b.height - 100, b.width, b.height + 100);

    // Draw Glowing Windows
    const wWidth = 4;
    const wHeight = 6;
    const paddingX = (b.width - (b.windowCols * wWidth)) / (b.windowCols + 1);
    const paddingY = (b.height - (b.windowRows * wHeight)) / (b.windowRows + 1);

    for (let r = 0; r < b.windowRows; r++) {
      for (let c = 0; c < b.windowCols; c++) {
        const index = r * b.windowCols + c;
        if (b.lightStatus[index % b.lightStatus.length]) {
          cityCtx.fillStyle = Math.random() > 0.99 && gameState === STATES.PLAYING
            ? 'rgba(0, 240, 255, 0.8)' 
            : 'rgba(255, 234, 0, 0.55)'; // Cyber yellow window glow
          
          const wx = b.x + paddingX + c * (wWidth + paddingX);
          const wy = (height - b.height - 80) + paddingY + r * (wHeight + paddingY);
          
          if (wy < height - 105) {
            cityCtx.fillRect(wx, wy, wWidth, wHeight);
          }
        }
      }
    }
  });
}

function drawCity() {
  updateAndDrawCity(); // Draw statically (or just re-render once)
}

// Particle Class
class Particle {
  constructor(x, y, color, type = 'exhaust') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type; // 'exhaust', 'score', or 'explosion'
    
    if (type === 'exhaust') {
      this.vx = -Math.random() * 2 - 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.alpha = 1;
      this.size = Math.random() * 3 + 2;
      this.decay = Math.random() * 0.04 + 0.02;
    } else if (type === 'explosion') {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.size = Math.random() * 4 + 2;
      this.decay = Math.random() * 0.02 + 0.015;
    } else { // score sparks
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.size = Math.random() * 2.5 + 1;
      this.decay = Math.random() * 0.05 + 0.03;
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    if (this.type === 'explosion') {
      this.vy += 0.08; // gravity for explosion sparks
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Reset Game State to start fresh
function resetGame() {
  bird.x = width * 0.25;
  bird.y = height * 0.45;
  bird.velocity = 0;
  bird.angle = 0;
  
  pipes = [];
  particles = [];
  score = 0;
  frameCount = 0;
  groundOffset = 0;
  
  document.getElementById('hud-score').textContent = '0';
  document.getElementById('high-score-form').classList.add('hidden');
}

// Spawn Pipe
function spawnPipe() {
  const gapPosition = Math.random() * (height - PIPE_GAP - MIN_PIPE_HEIGHT * 2 - 100) + MIN_PIPE_HEIGHT;
  pipes.push({
    x: width,
    topHeight: gapPosition,
    bottomY: gapPosition + PIPE_GAP,
    passed: false,
    width: 65
  });
}

// Game Update Logic
function updateGame() {
  frameCount++;

  // 1. Bird Physics
  bird.velocity += GRAVITY;
  if (bird.velocity > MAX_FALL_SPEED) bird.velocity = MAX_FALL_SPEED;
  bird.y += bird.velocity;

  // Rotation target calculation based on velocity
  const targetAngle = Math.min(Math.max(bird.velocity * 0.08, -0.6), 0.7);
  bird.angle += (targetAngle - bird.angle) * 0.2;

  // Flap Exhaust particles
  if (frameCount % 2 === 0) {
    // Engine offset coordinates based on angle
    const ox = bird.x - 12 * Math.cos(bird.angle);
    const oy = bird.y - 12 * Math.sin(bird.angle);
    const color = Math.random() > 0.5 ? 'var(--neon-magenta)' : 'var(--neon-cyan)';
    particles.push(new Particle(ox, oy, color, 'exhaust'));
  }

  // 2. Ceil/Floor Boundaries
  const groundY = height - 100;
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0.5; // push down gently
  }
  if (bird.y + bird.radius >= groundY) {
    triggerGameOver();
    return;
  }

  // 3. Move & Collision of Pipes
  if (frameCount % PIPE_SPAWN_INTERVAL === 0) {
    spawnPipe();
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const pipe = pipes[i];
    pipe.x -= PIPE_SPEED;

    // Check score passing
    if (!pipe.passed && pipe.x + pipe.width / 2 < bird.x) {
      pipe.passed = true;
      score++;
      document.getElementById('hud-score').textContent = score;
      audio.playScore();
      
      // Spawn scoring spark particles at the pass point
      for (let s = 0; s < 12; s++) {
        particles.push(new Particle(pipe.x + pipe.width + 10, bird.y, 'var(--neon-yellow)', 'score'));
      }
    }

    // Collision Detection
    // Simple robust circular vs rectangular overlapping check
    const checkColl = (rectX, rectY, rectW, rectH) => {
      const closestX = Math.max(rectX, Math.min(bird.x, rectX + rectW));
      const closestY = Math.max(rectY, Math.min(bird.y, rectY + rectH));
      const distX = bird.x - closestX;
      const distY = bird.y - closestY;
      const distanceSquared = (distX * distX) + (distY * distY);
      return distanceSquared < (bird.radius * bird.radius);
    };

    const hitTop = checkColl(pipe.x, 0, pipe.width, pipe.topHeight);
    const hitBottom = checkColl(pipe.x, pipe.bottomY, pipe.width, groundY - pipe.bottomY);

    if (hitTop || hitBottom) {
      triggerGameOver();
      return;
    }

    // Remove offscreen pipes
    if (pipe.x + pipe.width < 0) {
      pipes.splice(i, 1);
    }
  }

  // 4. Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // 5. Scroll Ground Grid
  groundOffset = (groundOffset - PIPE_SPEED) % 30;
}

// Trigger Game Over Sequence
function triggerGameOver() {
  gameState = STATES.GAMEOVER;
  audio.playCollision();

  // Create explosion particles around the bird
  for (let i = 0; i < 35; i++) {
    const color = Math.random() > 0.5 ? 'var(--neon-magenta)' : (Math.random() > 0.5 ? 'var(--neon-cyan)' : 'var(--neon-yellow)');
    particles.push(new Particle(bird.x, bird.y, color, 'explosion'));
  }

  // Wait a small bit before sliding up game over overlay
  setTimeout(() => {
    showOverlayScreen('game-over-menu');
    
    // Set score elements
    document.getElementById('final-score').textContent = score;
    const highScores = getLeaderboard();
    const isNewHighScore = highScores.length < 10 || score > highScores[highScores.length - 1].score;
    
    const best = highScores.length > 0 ? Math.max(highScores[0].score, score) : score;
    document.getElementById('best-score').textContent = best;

    if (isNewHighScore && score > 0) {
      document.getElementById('high-score-form').classList.remove('hidden');
      document.getElementById('player-name').value = '';
      document.getElementById('player-name').focus();
    } else {
      document.getElementById('high-score-form').classList.add('hidden');
    }
  }, 400);
}

// Drawing Entities on Canvas
function drawGame() {
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Pipes
  pipes.forEach(pipe => {
    // Upper pipe gradient
    const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    topGrad.addColorStop(0, '#0e041d');
    topGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.9)');
    topGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.9)');
    topGrad.addColorStop(1, '#0e041d');

    // Drawing pipe shafts
    ctx.fillStyle = topGrad;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
    ctx.strokeRect(pipe.x, -2, pipe.width, pipe.topHeight + 2);

    // Lower pipe gradient
    const bottomGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    bottomGrad.addColorStop(0, '#0e041d');
    bottomGrad.addColorStop(0.3, 'rgba(255, 0, 127, 0.9)');
    bottomGrad.addColorStop(0.7, 'rgba(255, 0, 127, 0.9)');
    bottomGrad.addColorStop(1, '#0e041d');

    const bottomHeight = height - 100 - pipe.bottomY;
    ctx.fillStyle = bottomGrad;
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
    ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight);
    ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight + 2);

    // Neon Caps
    const capHeight = 16;
    const capOverlap = 4;
    // Top Cap
    ctx.fillStyle = '#0f0724';
    ctx.fillRect(pipe.x - capOverlap, pipe.topHeight - capHeight, pipe.width + (capOverlap * 2), capHeight);
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.strokeRect(pipe.x - capOverlap, pipe.topHeight - capHeight, pipe.width + (capOverlap * 2), capHeight);
    
    // Bottom Cap
    ctx.fillStyle = '#0f0724';
    ctx.fillRect(pipe.x - capOverlap, pipe.bottomY, pipe.width + (capOverlap * 2), capHeight);
    ctx.strokeStyle = 'var(--neon-magenta)';
    ctx.strokeRect(pipe.x - capOverlap, pipe.bottomY, pipe.width + (capOverlap * 2), capHeight);
  });

  // 2. Draw Particles
  particles.forEach(p => p.draw());

  // 3. Draw Bird (Cyber Jet Ship)
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);

  // Glowing effect
  ctx.shadowColor = 'var(--neon-cyan)';
  ctx.shadowBlur = 12;

  // Jet Body (Triangle Cyber glider)
  ctx.fillStyle = '#100b26';
  ctx.strokeStyle = 'var(--neon-cyan)';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  // Nose tip
  ctx.moveTo(18, 0);
  // Bottom tail wing
  ctx.lineTo(-12, 10);
  // Engine thrust center indentation
  ctx.lineTo(-8, 0);
  // Top tail wing
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glass Cockpit canopy
  ctx.fillStyle = 'rgba(255, 234, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'var(--neon-yellow)';
  ctx.beginPath();
  ctx.moveTo(6, -3);
  ctx.lineTo(13, 0);
  ctx.lineTo(6, 3);
  ctx.lineTo(1, 0);
  ctx.closePath();
  ctx.fill();

  // Wing highlights / energy lines
  ctx.strokeStyle = 'var(--neon-magenta)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-2, -4);
  ctx.moveTo(-6, 4);
  ctx.lineTo(-2, 4);
  ctx.stroke();

  ctx.restore();

  // 4. Draw Neon Grid Floor (Ground)
  const groundY = height - 100;
  ctx.save();
  // Solid backing
  ctx.fillStyle = '#0a0316';
  ctx.fillRect(0, groundY, width, 100);

  // Top Neon Line (Ceiling border of ground)
  ctx.shadowColor = 'var(--neon-cyan)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'var(--neon-cyan)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  // Scrolling Grid lines (vertical perspective)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)'; // neon magenta grid lines
  ctx.lineWidth = 1.5;
  
  // Perspective floor grid
  const cols = 18;
  const colSpacing = width / cols;
  const vanishX = width / 2;
  const vanishY = groundY - 150; // vanishing point above ground for vertical angle effect

  for (let i = -5; i <= cols + 5; i++) {
    const gridX = i * colSpacing + groundOffset;
    ctx.beginPath();
    ctx.moveTo(gridX, height);
    // Draw perspective lines pointing to a point slightly above horizon
    const dirX = gridX - vanishX;
    const endX = vanishX + dirX * 0.45;
    ctx.lineTo(endX, groundY);
    ctx.stroke();
  }

  // Horizontal perspective lines
  const groundHeights = [0, 8, 20, 36, 56, 80, 100];
  groundHeights.forEach(h => {
    ctx.beginPath();
    ctx.moveTo(0, groundY + h);
    ctx.lineTo(width, groundY + h);
    ctx.stroke();
  });

  ctx.restore();
}

// Core Game Loop
function gameLoop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState === STATES.PLAYING) {
    updateGame();
    updateAndDrawStars();
    updateAndDrawCity();
    drawGame();
    requestAnimationFrame(gameLoop);
  } else if (gameState === STATES.GAMEOVER) {
    // Continue running visual rendering of explosion/ground scrolling slightly, then stop
    if (particles.length > 0) {
      // update particles only
      particles.forEach(p => p.update());
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }
      drawGame();
      requestAnimationFrame(gameLoop);
    }
  }
}

// Screen/UI Switcher
function showOverlayScreen(activeId) {
  const cards = document.querySelectorAll('.menu-card');
  cards.forEach(card => {
    if (card.id === activeId) {
      card.classList.remove('hidden');
      // Timeout to trigger transition opacity
      setTimeout(() => card.classList.add('active'), 50);
    } else {
      card.classList.remove('active');
      card.classList.add('hidden');
    }
  });

  const overlay = document.getElementById('ui-overlay');
  if (activeId) {
    overlay.style.pointerEvents = 'auto';
  } else {
    overlay.style.pointerEvents = 'none';
  }
}

// Input Controllers
function handleFlapInput(e) {
  // Prevent default spaces/clicks from scrolling or zooming page
  if (e && e.cancelable) e.preventDefault();

  if (gameState === STATES.PLAYING) {
    bird.flap();
  } else if (gameState === STATES.START) {
    startGame();
  } else if (gameState === STATES.GAMEOVER) {
    // Only allow screen space flap key to restart if score registration form is not active
    const isFormVisible = !document.getElementById('high-score-form').classList.contains('hidden');
    if (!isFormVisible) {
      startGame();
    }
  }
}

// Window Listeners for Inputs
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    handleFlapInput(e);
  }
  if (e.code === 'KeyP') {
    togglePause();
  }
});

// Click / Tap listener on main game window
gameCanvas.addEventListener('mousedown', handleFlapInput);
gameCanvas.addEventListener('touchstart', handleFlapInput, { passive: false });

// Start Gameplay
function startGame() {
  audio.init();
  gameState = STATES.PLAYING;
  document.getElementById('game-hud').classList.remove('hidden');
  showOverlayScreen(null); // clear screens
  resetGame();
  
  // Relaunch loops
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Pause Management
function togglePause() {
  if (gameState === STATES.PLAYING) {
    gameState = STATES.PAUSED;
    showOverlayScreen('pause-menu');
    document.getElementById('game-hud').classList.add('hidden');
  } else if (gameState === STATES.PAUSED) {
    resumeGame();
  }
}

function resumeGame() {
  gameState = STATES.PLAYING;
  showOverlayScreen(null);
  document.getElementById('game-hud').classList.remove('hidden');
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Leaderboard Database Logic
const DEFAULT_LEADERBOARD = [
  { name: 'NEO', score: 42 },
  { name: 'TRINITY', score: 35 },
  { name: 'DECKARD', score: 28 },
  { name: 'V_2077', score: 20 },
  { name: 'CYPHER', score: 15 },
  { name: 'FLY_BY', score: 10 },
  { name: 'GRID_RUN', score: 8 },
  { name: 'ARCADE', score: 5 },
  { name: 'REBOOT', score: 3 },
  { name: 'BEGIN', score: 1 }
];

function getLeaderboard() {
  const data = localStorage.getItem('cyberflap_leaderboard');
  if (!data) {
    localStorage.setItem('cyberflap_leaderboard', JSON.stringify(DEFAULT_LEADERBOARD));
    return DEFAULT_LEADERBOARD;
  }
  return JSON.parse(data);
}

function saveScore(name, scoreVal) {
  let list = getLeaderboard();
  const pilotName = (name || 'PILOT').toUpperCase();
  list.push({ name: pilotName, score: scoreVal });
  // Sort descending
  list.sort((a, b) => b.score - a.score);
  // Keep top 10
  list = list.slice(0, 10);
  localStorage.setItem('cyberflap_leaderboard', JSON.stringify(list));
}

function populateLeaderboardTable() {
  const list = getLeaderboard();
  const tbody = document.getElementById('leaderboard-entries');
  tbody.innerHTML = '';

  list.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    if (idx < 3) {
      tr.classList.add('top-row');
    }
    
    // Formatting rank
    let rankSymbol = `#0${idx + 1}`;
    if (idx === 0) rankSymbol = '🥇 01';
    if (idx === 1) rankSymbol = '🥈 02';
    if (idx === 2) rankSymbol = '🥉 03';

    tr.innerHTML = `
      <td>${rankSymbol}</td>
      <td>${escapeHtml(entry.name)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700;">${entry.score}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// UI Buttons Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
  gameState = STATES.LEADERBOARD;
  populateLeaderboardTable();
  showOverlayScreen('leaderboard-menu');
});

document.getElementById('show-leaderboard-over-btn').addEventListener('click', () => {
  gameState = STATES.LEADERBOARD;
  populateLeaderboardTable();
  showOverlayScreen('leaderboard-menu');
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  gameState = STATES.START;
  showOverlayScreen('start-menu');
});

document.getElementById('resume-btn').addEventListener('click', resumeGame);

document.getElementById('restart-from-pause-btn').addEventListener('click', () => {
  gameState = STATES.START;
  showOverlayScreen('start-menu');
  resetGame();
  drawGame();
});

document.getElementById('restart-btn').addEventListener('click', startGame);

document.getElementById('hud-pause-btn').addEventListener('click', (e) => {
  e.stopPropagation(); // prevent registering a flap clicks
  togglePause();
});

// Record score submission handler
document.getElementById('submit-score-btn').addEventListener('click', () => {
  const input = document.getElementById('player-name');
  const name = input.value.trim().substring(0, 8);
  saveScore(name, score);
  
  document.getElementById('high-score-form').classList.add('hidden');
  // Refresh leaderboard list and view
  gameState = STATES.LEADERBOARD;
  populateLeaderboardTable();
  showOverlayScreen('leaderboard-menu');
});

// Allow press Enter on name field to record
document.getElementById('player-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('submit-score-btn').click();
  }
});

// Initial Parallax & Star field initialization
initStars();
initCity();
updateAndDrawStars();
updateAndDrawCity();

// Draw static gameplay mockup on main canvas initially
resetGame();
drawGame();
