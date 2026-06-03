const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');

// Game variables
let birdY = 256;
let birdVelocity = 0;
const gravity = 0.5;
const jumpStrength = -8;
let pipes = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;

// Bird properties
const birdX = 50;
const birdWidth = 20;
const birdHeight = 20;

// Pipe properties
const pipeWidth = 52;
const pipeGap = 100;
const pipeSpeed = 2;
const pipeSpawnRate = 120; // frames

let frameCount = 0;

highScoreEl.innerText = highScore;

function resetGame() {
    birdY = 256;
    birdVelocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    frameCount = 0;
    currentScoreEl.innerText = score;
    gameLoop();
}

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '48px serif';
        ctx.fillText('Game Over', 50, 256);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            highScoreEl.innerText = highScore;
        }
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bird
    birdVelocity += gravity;
    birdY += birdVelocity;
    ctx.fillStyle = 'yellow';
    ctx.fillRect(birdX, birdY, birdWidth, birdHeight);

    // Pipes
    if (frameCount % pipeSpawnRate === 0) {
        const pipeY = Math.random() * (canvas.height - pipeGap - 100) + 50;
        pipes.push({ x: canvas.width, y: pipeY, scored: false });
    }

    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= pipeSpeed;

        // Draw pipes
        ctx.fillStyle = 'green';
        ctx.fillRect(pipes[i].x, 0, pipeWidth, pipes[i].y);
        ctx.fillRect(pipes[i].x, pipes[i].y + pipeGap, pipeWidth, canvas.height - pipes[i].y - pipeGap);

        // Collision detection
        if (
            birdX < pipes[i].x + pipeWidth &&
            birdX + birdWidth > pipes[i].x &&
            (birdY < pipes[i].y || birdY + birdHeight > pipes[i].y + pipeGap)
        ) {
            gameOver = true;
        }

        // Score
        if (!pipes[i].scored && pipes[i].x + pipeWidth < birdX) {
            score++;
            pipes[i].scored = true;
            currentScoreEl.innerText = score;
        }
    }

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);

    // Ground collision
    if (birdY + birdHeight > canvas.height) {
        gameOver = true;
    }

    frameCount++;
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameOver) {
            resetGame();
        } else {
            birdVelocity = jumpStrength;
        }
    }
});

gameLoop();
