// Game constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GRAVITY = 0.5;
const FLAP = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_INTERVAL = 90; // frames
const BIRD_RADIUS = 20;
const GROUND_HEIGHT = 80;

// UI elements
const restartBtn = document.getElementById('restartBtn');
const gameOverScreen = document.getElementById('gameOver');
const scoreDiv = document.getElementById('score');
const finalScore = document.getElementById('finalScore');

// Game variables
let bird, pipes, score, frame, gameOver, animationId, gameStarted;

// Start button area (canvas coordinates)
const startBtnRect = {
  x: canvas.width / 2 - 80,
  y: canvas.height / 2 + 20,
  width: 160,
  height: 48
};

function resetGame() {
  bird = {
    x: 80,
    y: canvas.height / 2,
    velocity: 0,
    radius: BIRD_RADIUS
  };
  pipes = [];
  score = 0;
  frame = 0;
  gameOver = false;
  scoreDiv.textContent = score;
  gameOverScreen.classList.add('hidden');
}

function drawBird() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffeb3b';
  ctx.shadowColor = '#fbc02d';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.strokeStyle = '#fbc02d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // Eye
  ctx.beginPath();
  ctx.arc(bird.x + 8, bird.y - 6, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  // Beak
  ctx.beginPath();
  ctx.moveTo(bird.x + bird.radius, bird.y);
  ctx.lineTo(bird.x + bird.radius + 10, bird.y - 5);
  ctx.lineTo(bird.x + bird.radius + 10, bird.y + 5);
  ctx.closePath();
  ctx.fillStyle = '#ff9800';
  ctx.fill();
}

function drawPipes() {
  ctx.fillStyle = '#4caf50';
  pipes.forEach(pipe => {
    // Top pipe
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
    // Bottom pipe
    ctx.fillRect(pipe.x, pipe.bottom, PIPE_WIDTH, canvas.height - pipe.bottom - GROUND_HEIGHT);
  });
}

function drawGround() {
  ctx.fillStyle = '#deaa5b';
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
}

function drawScore() {
  scoreDiv.textContent = score;
}

function updateBird() {
  bird.velocity += GRAVITY;
  bird.y += bird.velocity;
}

function updatePipes() {
  if (frame % PIPE_INTERVAL === 0) {
    const top = Math.random() * (canvas.height - PIPE_GAP - GROUND_HEIGHT - 80) + 40;
    pipes.push({
      x: canvas.width,
      top: top,
      bottom: top + PIPE_GAP,
      passed: false
    });
  }
  pipes.forEach(pipe => {
    pipe.x -= 3;
  });
  // Remove off-screen pipes
  if (pipes.length && pipes[0].x + PIPE_WIDTH < 0) {
    pipes.shift();
  }
}

function checkCollision() {
  // Ground or ceiling
  if (bird.y + bird.radius > canvas.height - GROUND_HEIGHT || bird.y - bird.radius < 0) {
    return true;
  }
  // Pipes
  for (let pipe of pipes) {
    if (
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH &&
      (bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.bottom)
    ) {
      return true;
    }
  }
  return false;
}

function updateScore() {
  pipes.forEach(pipe => {
    if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
      score++;
      pipe.passed = true;
      drawScore();
    }
  });
}

function showGameOver() {
  gameOverScreen.classList.remove('hidden');
  finalScore.textContent = `Score: ${score}`;
}

function drawStartScreen() {
  // Overlay
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  // Title
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 60);

  // Instructions
  ctx.font = '20px Arial';
  ctx.fillStyle = '#ffe082';
  ctx.fillText('Press Space or Tap/Click to Flap', canvas.width / 2, canvas.height / 2 - 20);

  // Start Button
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(startBtnRect.x, startBtnRect.y, startBtnRect.width, startBtnRect.height, 12);
  ctx.fillStyle = '#ffcc00';
  ctx.shadowColor = '#333';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('Start Game', canvas.width / 2, startBtnRect.y + 34);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawPipes();
  drawBird();
  updateBird();
  updatePipes();
  updateScore();
  if (checkCollision()) {
    gameOver = true;
    showGameOver();
    gameStarted = false;
    return;
  }
  frame++;
  animationId = requestAnimationFrame(gameLoop);
}

function flap() {
  if (!gameOver && gameStarted) {
    bird.velocity = FLAP;
  }
}

function handleStartButtonClick(x, y) {
  // Check if (x, y) is inside the start button rect
  return (
    x >= startBtnRect.x &&
    x <= startBtnRect.x + startBtnRect.width &&
    y >= startBtnRect.y &&
    y <= startBtnRect.y + startBtnRect.height
  );
}

// Event listeners
window.addEventListener('keydown', e => {
  if (!gameStarted) {
    if (e.code === 'Space') {
      startGame();
    }
    return;
  }
  if (e.code === 'Space') {
    flap();
    if (gameOver) {
      resetGame();
      gameOverScreen.classList.add('hidden');
      gameStarted = true;
      animationId = requestAnimationFrame(gameLoop);
    }
  }
});
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (!gameStarted) {
    if (handleStartButtonClick(x, y)) {
      startGame();
    }
    return;
  }
  flap();
  if (gameOver) {
    resetGame();
    gameOverScreen.classList.add('hidden');
    gameStarted = true;
    animationId = requestAnimationFrame(gameLoop);
  }
});
canvas.addEventListener('touchstart', e => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (!gameStarted) {
    if (handleStartButtonClick(x, y)) {
      startGame();
    }
    return;
  }
  flap();
  if (gameOver) {
    resetGame();
    gameOverScreen.classList.add('hidden');
    gameStarted = true;
    animationId = requestAnimationFrame(gameLoop);
  }
});
restartBtn.addEventListener('click', () => {
  resetGame();
  gameOverScreen.classList.add('hidden');
  gameStarted = true;
  animationId = requestAnimationFrame(gameLoop);
});

function startGame() {
  resetGame();
  gameStarted = true;
  animationId = requestAnimationFrame(gameLoop);
}

// On load, show start screen and do not start game
function showStartCanvasScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawStartScreen();
}

gameStarted = false;
showStartCanvasScreen(); 