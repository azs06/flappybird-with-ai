/**
 * CYBER FLAP - Core Game Logic & Audio Synthesis
 */

// 1. SOUND SYNTHESIS ENGINE (Web Audio API)
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.volume = 0.5;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playFlap() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);

    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playScore() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Arpeggio chime (B5 -> E6)
    osc1.frequency.setValueAtTime(987.77, now);
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);

    gain1.gain.setValueAtTime(this.volume * 0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(this.volume * 0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.1);
    
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  }

  playCrash() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(240, now);
    osc1.frequency.linearRampToValueAtTime(30, now + 0.45);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(190, now);
    osc2.frequency.linearRampToValueAtTime(20, now + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    gainNode.gain.setValueAtTime(this.volume * 0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  playClick() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.03);

    gainNode.gain.setValueAtTime(this.volume * 0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playFanfare() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const duration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * duration);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(this.volume * 0.25, now + idx * duration);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * duration + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + 0.18);
    });
  }
}

const synth = new SoundSynth();

// 2. SKIN DATABASE
const SKINS = [
  {
    id: 'cyber_blue',
    name: 'NEON WAVE',
    primaryColor: '#00f3ff',
    secondaryColor: '#0f52ba',
    glowColor: 'rgba(0, 243, 255, 0.6)',
    eyeColor: '#ffffff',
    beakColor: '#ff007f',
    wingColor: '#ffffff',
    desc: 'Standard agility model. Stable gravity dampeners.'
  },
  {
    id: 'laser_crimson',
    name: 'LASER RED',
    primaryColor: '#ff007f',
    secondaryColor: '#800020',
    glowColor: 'rgba(255, 0, 127, 0.6)',
    eyeColor: '#ffffff',
    beakColor: '#ffb703',
    wingColor: '#ffb703',
    desc: 'Experimental speed prototype. Unstable vertical thrusters.'
  },
  {
    id: 'emerald_matrix',
    name: 'TOXIC VIGIL',
    primaryColor: '#39ff14',
    secondaryColor: '#006400',
    glowColor: 'rgba(57, 255, 20, 0.6)',
    eyeColor: '#000000',
    beakColor: '#ffffff',
    wingColor: '#39ff14',
    desc: 'Tactical scouting unit. Fitted with nano-particle jets.'
  },
  {
    id: 'legend_gold',
    name: 'MATRIX LORD',
    primaryColor: '#ffb703',
    secondaryColor: '#e65c00',
    glowColor: 'rgba(255, 183, 3, 0.6)',
    eyeColor: '#ffffff',
    beakColor: '#ff007f',
    wingColor: '#ffffff',
    desc: 'Championship gold build. Leaves a glowing star trail.'
  }
];

let currentSkinIndex = 0;

// 3. CORE PHYSICS CONSTANTS
const PHYSICS = {
  gravity: 0.34,
  jumpStrength: -6.8,
  maxFallSpeed: 10,
  terminalUpSpeed: -8,
  birdRadius: 14,
  pipeWidth: 80,
  initialGap: 160,
  minGap: 110,
  initialSpeed: 2.6,
  maxSpeed: 4.8,
  groundHeight: 60
};

// 4. GAME STATES
const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover'
};

// 5. RUNTIME STATE VARIABLES
let gameState = STATES.MENU;
let score = 0;
let bestScore = 0;
let currentSkin = SKINS[0];

// Game Objects
let bird = {
  x: 100,
  y: 300,
  velocity: 0,
  rotation: 0,
  wingOffset: 0
};

let pipes = [];
let particles = [];
let stars = [];
let farBuildings = [];
let nearBuildings = [];

// Scrolling and Frame variables
let bgScrollX = 0;
let frameCount = 0;
let nextPipeFrame = 0;
let shakeTime = 0;
let shakeIntensity = 0;

// Leaderboard Default Initials & Storage Key
const LEADERBOARD_KEY = 'cyber_flap_leaderboard';
let leaderboard = [];

// DOM References
let canvas, ctx;
let skinPreviewCanvas, skinPreviewCtx;
let skinPreviewAnimationId = null;

// UI Panels
let hud, mainMenu, pauseMenu, gameOverMenu, leaderboardMenu;
// Score display labels
let scoreLabel, bestLabel, finalScoreLabel, finalBestLabel;
// Volume elements
let volumeSlider, muteToggleBtn, volumeIcon;
// Forms
let leaderboardForm, pilotInitialsInput, submitScoreBtn, formError;
// Leaderboard list
let leaderboardBody;

// 6. INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  setupDOMReferences();
  loadPreferences();
  loadLeaderboard();
  initCanvas();
  generateStars();
  initBuildings();
  setupEventListeners();
  
  // Show main menu on load
  transitionToState(STATES.MENU);
  
  // Start general game tick
  requestAnimationFrame(gameLoop);
});

function setupDOMReferences() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  skinPreviewCanvas = document.getElementById('skinPreviewCanvas');
  if (skinPreviewCanvas) {
    skinPreviewCtx = skinPreviewCanvas.getContext('2d');
  }

  // HUD
  hud = document.getElementById('hud');
  scoreLabel = document.getElementById('currentScore');
  bestLabel = document.getElementById('bestScore');

  // Overlays
  mainMenu = document.getElementById('mainMenu');
  pauseMenu = document.getElementById('pauseMenu');
  gameOverMenu = document.getElementById('gameOverMenu');
  leaderboardMenu = document.getElementById('leaderboardMenu');

  // GameOver labels
  finalScoreLabel = document.getElementById('finalScore');
  finalBestLabel = document.getElementById('finalBest');

  // High score registry
  leaderboardForm = document.getElementById('leaderboardForm');
  pilotInitialsInput = document.getElementById('pilotInitials');
  submitScoreBtn = document.getElementById('submitScoreBtn');
  formError = document.getElementById('formError');

  // Leaderboard data
  leaderboardBody = document.getElementById('leaderboardBody');

  // Volume Controls
  volumeSlider = document.getElementById('volumeSlider');
  muteToggleBtn = document.getElementById('muteToggleBtn');
  volumeIcon = document.getElementById('volumeIcon');
}

function loadPreferences() {
  // Volume Slider value
  const savedVol = localStorage.getItem('cyber_flap_volume');
  if (savedVol !== null) {
    const volNum = parseInt(savedVol, 10);
    volumeSlider.value = volNum;
    synth.setVolume(volNum / 100);
  } else {
    synth.setVolume(0.5);
  }

  // Mute preference
  const savedMuted = localStorage.getItem('cyber_flap_muted');
  if (savedMuted === 'true') {
    synth.muted = true;
  }
  updateVolumeIcon();

  // Skin Preference
  const savedSkin = localStorage.getItem('cyber_flap_skin');
  if (savedSkin !== null) {
    const idx = SKINS.findIndex(s => s.id === savedSkin);
    if (idx !== -1) {
      currentSkinIndex = idx;
      currentSkin = SKINS[currentSkinIndex];
    }
  }

  // Best Score preference
  const savedBest = localStorage.getItem('cyber_flap_best');
  if (savedBest !== null) {
    bestScore = parseInt(savedBest, 10);
    updateHUDValues();
  }
}

function updateVolumeIcon() {
  if (!volumeIcon) return;
  
  if (synth.muted || synth.volume === 0) {
    // Mute SVG
    volumeIcon.innerHTML = `<path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.76-1.02 5.29-2.5 6.03v1.01c2.04-.84 3.5-2.85 3.5-5.04s-1.46-4.2-3.5-5.04v1.01c1.48.74 2.5 3.27 2.5 6.03zM3 9v6h4l5 5V4L7 9H3z"/>
                            <path fill="none" stroke="currentColor" stroke-width="2" d="M18 6l-12 12"/>`;
  } else if (synth.volume < 0.4) {
    // Low Volume SVG
    volumeIcon.innerHTML = `<path fill="currentColor" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>`;
  } else {
    // High Volume SVG
    volumeIcon.innerHTML = `<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
  }
}

function loadLeaderboard() {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (stored) {
    leaderboard = JSON.parse(stored);
  } else {
    // Default initial mock table for retro feel
    leaderboard = [
      { name: 'GEM', score: 45, date: '2026-06-01' },
      { name: 'ANT', score: 38, date: '2026-06-02' },
      { name: 'HAL', score: 30, date: '2026-06-03' },
      { name: 'ADA', score: 25, date: '2026-06-03' },
      { name: 'BOT', score: 20, date: '2026-06-04' },
      { name: 'NEO', score: 15, date: '2026-06-04' },
      { name: 'TRN', score: 12, date: '2026-06-04' },
      { name: 'FLY', score: 8, date: '2026-06-04' },
      { name: 'WNG', score: 5, date: '2026-06-04' },
      { name: 'SYS', score: 2, date: '2026-06-04' }
    ];
    saveLeaderboard();
  }
}

function saveLeaderboard() {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function initCanvas() {
  // Basic rendering checks
  if (canvas) {
    ctx.imageSmoothingEnabled = false;
  }
}

// 7. BACKGROUND GENERATORS
function generateStars() {
  stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - PHYSICS.groundHeight - 100),
      size: 0.8 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.8,
      twinkleSpeed: 0.01 + Math.random() * 0.03,
      angle: Math.random() * Math.PI
    });
  }
}

function initBuildings() {
  farBuildings = [];
  nearBuildings = [];

  // Far layer buildings
  let x = 0;
  while (x < 650) {
    const width = 50 + Math.random() * 60;
    const height = 80 + Math.random() * 120;
    farBuildings.push({ x, width, height });
    x += width - 3;
  }

  // Near layer buildings
  x = 0;
  while (x < 650) {
    const width = 60 + Math.random() * 70;
    const height = 140 + Math.random() * 160;
    
    // Windows details
    const windows = [];
    const rows = Math.floor(height / 20) - 2;
    const cols = Math.floor(width / 16) - 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.45) {
          windows.push({
            rx: 8 + c * 16,
            ry: 20 + r * 20,
            color: Math.random() > 0.35 ? '#00f3ff' : '#ff007f'
          });
        }
      }
    }
    nearBuildings.push({ x, width, height, windows });
    x += width - 3;
  }
}

// 8. EVENT HANDLERS & LISTENERS
function setupEventListeners() {
  // Jump / Action inputs
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleScreenAction);
  canvas.addEventListener('touchstart', handleTouchAction, { passive: false });

  // Main menu button interactions
  document.getElementById('startBtn').addEventListener('click', () => {
    synth.playClick();
    resetGame();
    transitionToState(STATES.PLAYING);
  });

  document.getElementById('leaderboardBtn').addEventListener('click', () => {
    synth.playClick();
    populateLeaderboardTable();
    transitionToState(STATES.LEADERBOARD);
  });

  // Pause actions
  document.getElementById('pauseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    synth.playClick();
    togglePause();
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    synth.playClick();
    togglePause();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    synth.playClick();
    resetGame();
    transitionToState(STATES.PLAYING);
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    synth.playClick();
    transitionToState(STATES.MENU);
  });

  // Game over actions
  document.getElementById('retryBtn').addEventListener('click', () => {
    synth.playClick();
    resetGame();
    transitionToState(STATES.PLAYING);
  });

  document.getElementById('goMenuBtn').addEventListener('click', () => {
    synth.playClick();
    transitionToState(STATES.MENU);
  });

  // High score submission
  submitScoreBtn.addEventListener('click', submitHighScore);
  pilotInitialsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitHighScore();
    }
  });

  // Leaderboard navigation
  document.getElementById('backToMenuBtn').addEventListener('click', () => {
    synth.playClick();
    transitionToState(STATES.MENU);
  });

  // Skin Selector buttons
  document.getElementById('prevSkinBtn').addEventListener('click', () => {
    synth.playClick();
    changeSkin(-1);
  });

  document.getElementById('nextSkinBtn').addEventListener('click', () => {
    synth.playClick();
    changeSkin(1);
  });

  // Volume Slider
  volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    synth.setVolume(val / 100);
    localStorage.setItem('cyber_flap_volume', val);
    updateVolumeIcon();
  });

  muteToggleBtn.addEventListener('click', () => {
    const isMuted = synth.toggleMute();
    localStorage.setItem('cyber_flap_muted', isMuted);
    updateVolumeIcon();
    synth.playClick();
  });

  // Bezel Physical Buttons
  const physicalJumpBtn = document.getElementById('physicalJumpBtn');
  physicalJumpBtn.addEventListener('mousedown', () => {
    // Add down class for animation feel
    physicalJumpBtn.classList.add('active');
    handleJumpInput();
  });
  window.addEventListener('mouseup', () => {
    physicalJumpBtn.classList.remove('active');
  });

  document.getElementById('physicalPauseBtn').addEventListener('click', () => {
    synth.playClick();
    togglePause();
  });
}

function handleKeyDown(e) {
  if (e.key === ' ' || e.key === 'ArrowUp') {
    // Prevent default scrolling behavior
    e.preventDefault();
    handleJumpInput();
  } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    e.preventDefault();
    togglePause();
  }
}

function handleScreenAction(e) {
  if (gameState === STATES.PLAYING) {
    handleJumpInput();
  }
}

function handleTouchAction(e) {
  e.preventDefault();
  if (gameState === STATES.PLAYING) {
    handleJumpInput();
  }
}

function handleJumpInput() {
  if (gameState === STATES.PLAYING) {
    bird.velocity = PHYSICS.jumpStrength;
    synth.playFlap();
    // Add feather/spark propulsion trail
    addParticles(bird.x - 10, bird.y, currentSkin.primaryColor, 5, 'flap');
  }
}

function togglePause() {
  if (gameState === STATES.PLAYING) {
    transitionToState(STATES.PAUSED);
  } else if (gameState === STATES.PAUSED) {
    transitionToState(STATES.PLAYING);
  }
}

function changeSkin(dir) {
  currentSkinIndex = (currentSkinIndex + dir + SKINS.length) % SKINS.length;
  currentSkin = SKINS[currentSkinIndex];
  localStorage.setItem('cyber_flap_skin', currentSkin.id);
  
  // Redraw carousel text
  document.getElementById('skinName').innerText = currentSkin.name;
  document.getElementById('skinDesc').innerText = currentSkin.desc;
  
  // Style carousel names based on skin colors
  const nameEl = document.getElementById('skinName');
  nameEl.style.color = currentSkin.primaryColor;
  nameEl.style.textShadow = `0 0 10px ${currentSkin.glowColor}`;
}

// 9. SKIN PREVIEW LOOP
function startSkinPreview() {
  if (!skinPreviewCanvas) return;
  let frame = 0;
  
  // Update carousel colors initially
  changeSkin(0);
  
  function animate() {
    skinPreviewCtx.clearRect(0, 0, skinPreviewCanvas.width, skinPreviewCanvas.height);
    
    // Draw grid bounds in preview
    skinPreviewCtx.fillStyle = 'rgba(7, 9, 19, 0.4)';
    skinPreviewCtx.fillRect(0, 0, skinPreviewCanvas.width, skinPreviewCanvas.height);
    skinPreviewCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    skinPreviewCtx.strokeRect(0, 0, skinPreviewCanvas.width, skinPreviewCanvas.height);
    
    const hoverY = 40 + Math.sin(frame * 0.1) * 4;
    const wingOffset = Math.sin(frame * 0.25) * 5;
    
    drawBird(skinPreviewCtx, 40, hoverY, 0, wingOffset, currentSkin);
    
    frame++;
    skinPreviewAnimationId = requestAnimationFrame(animate);
  }
  
  if (skinPreviewAnimationId) {
    cancelAnimationFrame(skinPreviewAnimationId);
  }
  animate();
}

function stopSkinPreview() {
  if (skinPreviewAnimationId) {
    cancelAnimationFrame(skinPreviewAnimationId);
    skinPreviewAnimationId = null;
  }
}

// 10. GAME STATE MACHINE TRANSITIONS
function transitionToState(nextState) {
  // Hide all screens
  mainMenu.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  gameOverMenu.classList.add('hidden');
  leaderboardMenu.classList.add('hidden');
  hud.classList.add('hidden');

  // Stop background music or loops if any
  stopSkinPreview();

  switch(nextState) {
    case STATES.MENU:
      gameState = STATES.MENU;
      mainMenu.classList.remove('hidden');
      startSkinPreview();
      break;

    case STATES.PLAYING:
      gameState = STATES.PLAYING;
      hud.classList.remove('hidden');
      break;

    case STATES.PAUSED:
      gameState = STATES.PAUSED;
      hud.classList.remove('hidden');
      pauseMenu.classList.remove('hidden');
      break;

    case STATES.GAMEOVER:
      gameState = STATES.GAMEOVER;
      hud.classList.remove('hidden');
      gameOverMenu.classList.remove('hidden');
      
      // Update score fields
      finalScoreLabel.innerText = score;
      finalBestLabel.innerText = bestScore;
      
      // Show form if eligible for high score leaderboard
      if (checkHighScoreEligibility()) {
        leaderboardForm.classList.remove('hidden');
        pilotInitialsInput.value = '';
        formError.classList.add('hidden');
        pilotInitialsInput.focus();
      } else {
        leaderboardForm.classList.add('hidden');
      }
      break;

    case STATES.LEADERBOARD:
      gameState = STATES.LEADERBOARD;
      leaderboardMenu.classList.remove('hidden');
      break;
  }
}

// 11. PHYSICS RESET AND UPDATES
function resetGame() {
  bird.x = 120;
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  bird.wingOffset = 0;
  
  score = 0;
  updateHUDValues();
  
  pipes = [];
  particles = [];
  frameCount = 0;
  nextPipeFrame = 60; // Spawn first pipe quickly
  shakeTime = 0;
  shakeIntensity = 0;
}

function checkHighScoreEligibility() {
  if (score === 0) return false;
  if (leaderboard.length < 10) return true;
  return score > leaderboard[leaderboard.length - 1].score;
}

function submitHighScore() {
  const initials = pilotInitialsInput.value.trim().toUpperCase();
  if (initials.length !== 3 || !/^[A-Z0-9]{3}$/.test(initials)) {
    formError.classList.remove('hidden');
    synth.playCrash(); // Short buzz/error sound
    return;
  }

  formError.classList.add('hidden');
  synth.playFanfare();

  // Add item
  const today = new Date().toISOString().split('T')[0];
  const newRecord = { name: initials, score: score, date: today };
  
  leaderboard.push(newRecord);
  // Sort high score
  leaderboard.sort((a, b) => b.score - a.score);
  // Limit to top 10
  leaderboard = leaderboard.slice(0, 10);
  
  saveLeaderboard();
  
  // Transition to high scores list and highlight our entry
  populateLeaderboardTable(initials, score);
  leaderboardForm.classList.add('hidden');
  transitionToState(STATES.LEADERBOARD);
}

function populateLeaderboardTable(highlightName = '', highlightScore = -1) {
  leaderboardBody.innerHTML = '';
  
  leaderboard.forEach((entry, idx) => {
    const row = document.createElement('tr');
    
    // Check if this was the newly submitted score to flash/highlight it
    if (entry.name === highlightName && entry.score === highlightScore) {
      row.classList.add('new-record');
    }

    // Rank styling
    let rankText = idx + 1;
    if (idx === 0) rankText = `<span class="rank-gold">1ST</span>`;
    else if (idx === 1) rankText = `<span class="rank-silver">2ND</span>`;
    else if (idx === 2) rankText = `<span class="rank-bronze">3RD</span>`;
    else rankText = `${idx + 1}TH`;

    row.innerHTML = `
      <td class="col-rank">${rankText}</td>
      <td class="col-pilot">${entry.name}</td>
      <td class="col-score">${entry.score}</td>
      <td class="col-date">${entry.date}</td>
    `;
    leaderboardBody.appendChild(row);
  });
}

function updateHUDValues() {
  // Format with leading zeros for arcade feel
  scoreLabel.innerText = String(score).padStart(3, '0');
  bestLabel.innerText = String(bestScore).padStart(3, '0');
}

// 12. RUNTIME COLLISION DETECTION
function checkCollisions() {
  const radius = PHYSICS.birdRadius;
  const groundY = canvas.height - PHYSICS.groundHeight;

  // Collision with ground
  if (bird.y + radius > groundY) {
    return true;
  }
  
  // Collision with ceiling
  if (bird.y - radius < 0) {
    return true;
  }

  // Collision with pipes
  for (let i = 0; i < pipes.length; i++) {
    const p = pipes[i];
    
    // Circle vs Rect formula for top pipe
    const colTop = isCircleIntersectingRect(
      bird.x, bird.y, radius, 
      p.x, 0, PHYSICS.pipeWidth, p.top
    );
    
    // Circle vs Rect formula for bottom pipe
    const colBottom = isCircleIntersectingRect(
      bird.x, bird.y, radius, 
      p.x, p.bottom, PHYSICS.pipeWidth, groundY - p.bottom
    );

    if (colTop || colBottom) {
      return true;
    }
  }
  return false;
}

// Exact collision detection formula
function isCircleIntersectingRect(cx, cy, radius, rx, ry, rw, rh) {
  // Find the closest point on the rectangle to the circle's center
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  // Distance formula
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distanceSquared = (dx * dx) + (dy * dy);

  return distanceSquared < (radius * radius);
}

// Trigger screen shake
function triggerScreenShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeTime = duration;
}

// 13. MAIN GAME LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// A. Update game status
function update() {
  frameCount++;

  // 1. Screenshake decrement
  if (shakeTime > 0) {
    shakeTime--;
  }

  // Menu ambient scroll
  if (gameState === STATES.MENU || gameState === STATES.PLAYING) {
    bgScrollX += 0.5;
  }

  if (gameState !== STATES.PLAYING) {
    // Keep ambient dust floating on screens
    updateParticlesOnly();
    return;
  }

  // 2. Bird Physics
  bird.velocity = Math.min(PHYSICS.maxFallSpeed, bird.velocity + PHYSICS.gravity);
  bird.y += bird.velocity;
  
  // Rotation styling (tilts down when falling, tilts up on flap)
  if (bird.velocity < 0) {
    bird.rotation = Math.max(-0.4, bird.velocity * 0.08);
  } else {
    bird.rotation = Math.min(1.2, bird.velocity * 0.09);
  }
  
  // Wings animation speed proportional to flap/fall speed
  bird.wingOffset = Math.sin(frameCount * (bird.velocity < 0 ? 0.35 : 0.15)) * 5;

  // Star trails for special skins
  if (currentSkin.id === 'legend_gold' && frameCount % 3 === 0) {
    addParticles(bird.x - 12, bird.y + (Math.random() - 0.5) * 5, '#ffb703', 1, 'dust');
  }

  // Ambient stars/dust
  if (frameCount % 4 === 0) {
    stars.forEach(s => {
      s.x -= 0.2;
      if (s.x < 0) s.x = canvas.width;
      s.angle += s.twinkleSpeed;
    });
  }

  // 3. Pipe Spawning & Difficulty
  if (frameCount >= nextPipeFrame) {
    // Dynamic Speed: increases as score increases
    const progressFactor = Math.min(1.0, score / 40);
    const speed = PHYSICS.initialSpeed + progressFactor * (PHYSICS.maxSpeed - PHYSICS.initialSpeed);
    
    // Dynamic Gap Size: shrinks as score increases
    const gap = PHYSICS.initialGap - progressFactor * (PHYSICS.initialGap - PHYSICS.minGap);
    
    const groundY = canvas.height - PHYSICS.groundHeight;
    const minTop = 60;
    const maxTop = groundY - gap - 60;
    const topHeight = minTop + Math.random() * (maxTop - minTop);
    
    // Decide if pipe moves vertically (only at scores >= 15)
    let isMoving = false;
    let vy = 0;
    if (score >= 15 && Math.random() > 0.4) {
      isMoving = true;
      vy = (0.5 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1);
    }

    pipes.push({
      x: canvas.width,
      top: topHeight,
      bottom: topHeight + gap,
      gap: gap,
      speed: speed,
      vy: vy,
      moving: isMoving,
      passed: false
    });

    // Randomize spacing slightly (approx 2.2 to 2.8 seconds intervals)
    const framesInterval = Math.floor(130 - (progressFactor * 30) + (Math.random() - 0.5) * 20);
    nextPipeFrame = frameCount + framesInterval;
  }

  // 4. Update Pipes Positions
  const groundY = canvas.height - PHYSICS.groundHeight;
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= p.speed;

    // Handle vertical pipe movement bounds
    if (p.moving) {
      p.top += p.vy;
      p.bottom += p.vy;
      
      const padding = 60;
      if (p.top < padding || p.bottom > groundY - padding) {
        p.vy = -p.vy;
      }
    }

    // Score Tracking
    if (!p.passed && p.x + PHYSICS.pipeWidth / 2 < bird.x) {
      p.passed = true;
      score++;
      synth.playScore();
      
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('cyber_flap_best', bestScore);
      }
      updateHUDValues();
    }

    // Remove off-screen pipes
    if (p.x + PHYSICS.pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }

  // 5. Update Particle Engines
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // 6. Collision Check
  if (checkCollisions()) {
    triggerScreenShake(8, 25);
    synth.playCrash();
    
    // Explode sparks
    addParticles(bird.x, bird.y, currentSkin.primaryColor, 25, 'crash');
    addParticles(bird.x, bird.y, '#ffffff', 10, 'crash');
    
    transitionToState(STATES.GAMEOVER);
  }
}

// B. Update particle trails in non-play states
function updateParticlesOnly() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// C. Draw everything to canvas
function draw() {
  ctx.save();

  // Screen shake translation
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(dx, dy);
  }

  // 1. Clear background & Gradient Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#060713');
  skyGrad.addColorStop(0.6, '#0f1124');
  skyGrad.addColorStop(1, '#1b1429');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Twinkling Stars
  stars.forEach(s => {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * (0.4 + Math.abs(Math.sin(s.angle)) * 0.6)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Draw Parallax Cityscape
  const groundY = canvas.height - PHYSICS.groundHeight;
  drawCityscape(ctx, canvas.width, canvas.height, groundY);

  // 4. Draw Obstacles (Pipes)
  pipes.forEach(p => {
    drawPipe(ctx, p, groundY);
  });

  // 5. Draw Particle Sparks
  drawParticles(ctx);

  // 6. Draw Grid Ground
  drawGround(ctx, canvas.width, canvas.height, groundY);

  // 7. Draw Player Unit (Bird)
  if (gameState === STATES.PLAYING || gameState === STATES.PAUSED) {
    drawBird(ctx, bird.x, bird.y, bird.rotation, bird.wingOffset, currentSkin);
  } else if (gameState === STATES.GAMEOVER) {
    // Flash bird or crash location
    if (frameCount % 6 < 3) {
      drawBird(ctx, bird.x, bird.y, bird.rotation, bird.wingOffset, currentSkin);
    }
  }

  ctx.restore();
}

// D. Drawing helper functions
function drawCityscape(ctx, width, height, groundY) {
  // Draw Far Buildings (Dark purple silhouettes scrolling slow)
  ctx.fillStyle = '#0a0b16';
  const farOffset = (bgScrollX * 0.15) % 300;
  ctx.save();
  ctx.translate(-farOffset, 0);
  for (let i = 0; i < 3; i++) {
    const currentX = i * 300;
    farBuildings.forEach(b => {
      ctx.fillRect(currentX + b.x, groundY - b.height, b.width, b.height);
    });
  }
  ctx.restore();

  // Draw Near Buildings (Slightly lighter purple with glowing windows, scrolling faster)
  const nearOffset = (bgScrollX * 0.45) % 400;
  ctx.save();
  ctx.translate(-nearOffset, 0);
  for (let i = 0; i < 3; i++) {
    const currentX = i * 400;
    nearBuildings.forEach(b => {
      const bx = currentX + b.x;
      const by = groundY - b.height;
      
      // Building body
      ctx.fillStyle = '#111327';
      ctx.fillRect(bx, by, b.width, b.height);
      
      // Windows drawing
      b.windows.forEach(w => {
        ctx.fillStyle = w.color;
        // Flicker effect: window glow scales periodically
        ctx.globalAlpha = 0.55 + Math.sin(frameCount * 0.04 + bx) * 0.35;
        ctx.fillRect(bx + w.rx, by + w.ry, 5, 8);
      });
      ctx.globalAlpha = 1.0;
    });
  }
  ctx.restore();
}

function drawPipe(ctx, pipe, groundY) {
  ctx.save();

  // Glow shadows
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00f3ff';
  
  // Metallic pipe body colors
  const bodyGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PHYSICS.pipeWidth, 0);
  bodyGrad.addColorStop(0, '#073336');
  bodyGrad.addColorStop(0.35, '#0c5c62');
  bodyGrad.addColorStop(0.65, '#138b94');
  bodyGrad.addColorStop(1, '#073336');

  // Draw Top Pipe
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  // Body (draw up to ceiling)
  ctx.rect(pipe.x + 5, 0, PHYSICS.pipeWidth - 10, pipe.top - 20);
  ctx.fill();
  ctx.stroke();

  // Top lip
  ctx.beginPath();
  ctx.roundRect(pipe.x, pipe.top - 20, PHYSICS.pipeWidth, 20, 4);
  ctx.fill();
  ctx.stroke();

  // Draw Bottom Pipe
  const bottomHeight = groundY - pipe.bottom;
  
  ctx.beginPath();
  // Body (draw down to ground)
  ctx.rect(pipe.x + 5, pipe.bottom + 20, PHYSICS.pipeWidth - 10, bottomHeight - 20);
  ctx.fill();
  ctx.stroke();

  // Bottom lip
  ctx.beginPath();
  ctx.roundRect(pipe.x, pipe.bottom, PHYSICS.pipeWidth, 20, 4);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawGround(ctx, width, height, groundY) {
  // Base ground box
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, groundY, width, height - groundY);

  // Glowing boundary line
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ff007f';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();
  
  // Reset shadows for grid lines
  ctx.shadowBlur = 0;

  // Perspective grids slants
  ctx.strokeStyle = '#43128c';
  ctx.lineWidth = 1.5;
  const gridScroll = (bgScrollX * 1.5) % 30;
  ctx.save();
  ctx.translate(-gridScroll, 0);
  for (let x = -50; x < width + 100; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    // Draw grid perspective slopes downward
    ctx.lineTo(x - 22, height);
    ctx.stroke();
  }
  ctx.restore();

  // Horizontal horizon rings
  const numLines = 5;
  for (let i = 1; i <= numLines; i++) {
    const y = groundY + (i / numLines) * (height - groundY);
    ctx.globalAlpha = i / numLines; // closer is brighter
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

function drawBird(ctx, x, y, rotation, wingOffset, skin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Glow shadow for cyberpunk bird
  ctx.shadowBlur = 18;
  ctx.shadowColor = skin.primaryColor;

  // Body gradient setup
  const radialGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
  radialGrad.addColorStop(0, '#ffffff');
  radialGrad.addColorStop(0.3, skin.primaryColor);
  radialGrad.addColorStop(1, skin.secondaryColor);

  // Draw Body ellipse
  ctx.fillStyle = radialGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clear outer shadows for small details to stay sharp
  ctx.shadowBlur = 0;

  // Eye
  ctx.fillStyle = skin.eyeColor;
  ctx.beginPath();
  ctx.arc(6, -3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(7.5, -3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Beak (Cybernetic beak)
  ctx.fillStyle = skin.beakColor;
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.lineTo(23, 1);
  ctx.lineTo(13, 4);
  ctx.closePath();
  ctx.fill();

  // Wing (flaps up/down dynamically)
  ctx.fillStyle = skin.wingColor;
  ctx.strokeStyle = skin.secondaryColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-5, wingOffset, 8, 5, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function addParticles(x, y, color, count, type) {
  for (let i = 0; i < count; i++) {
    let vx, vy, size, life;
    if (type === 'flap') {
      // sparks shooting backwards
      vx = -2 - Math.random() * 3;
      vy = (Math.random() - 0.5) * 2.5;
      size = 2 + Math.random() * 2;
      life = 15 + Math.random() * 15;
    } else if (type === 'crash') {
      // explosion sparks shooting in all directions
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
      size = 2.5 + Math.random() * 3.5;
      life = 25 + Math.random() * 25;
    } else { // ambient / dust trail
      vx = -1 - Math.random() * 1.5;
      vy = (Math.random() - 0.5) * 0.8;
      size = 1 + Math.random() * 1.5;
      life = 15 + Math.random() * 15;
    }
    particles.push({
      x, y, vx, vy, color, size,
      life, maxLife: life,
      type
    });
  }
}

function drawParticles(ctx) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    
    if (p.type === 'flap' || p.type === 'crash') {
      ctx.shadowBlur = p.size * 2.5;
      ctx.shadowColor = p.color;
    }
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
