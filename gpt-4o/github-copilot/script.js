const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

// Game Variables
let bird = { x: 50, y: 300, width: 30, height: 30, velocity: 0 };
let pipes = [];
let score = 0;
let gameOver = false;
let paused = false;
let gameStarted = false;

const gravity = 0.5;
const jumpStrength = -10;
const pipeWidth = 50;
const pipeGap = 150;
const pipeSpeed = 2;

// Load Assets
const birdImage = new Image();
birdImage.src = 'assets/bird.svg';
const pipeImage = new Image();
pipeImage.src = 'assets/pipe.svg';
const backgroundImage = new Image();
backgroundImage.src = 'assets/background.svg';

// Event Listener for Jump
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!gameStarted || gameOver) {
            restartGame();
        } else if (!paused) {
            bird.velocity = jumpStrength;
        }
    } else if (e.code === 'KeyR') {
        restartGame();
    } else if (e.code === 'KeyP') {
        paused = !paused;
        if (!paused) {
            gameLoop();
        }
    } else if (e.code === 'Space' && !gameStarted) {
        gameContainer.classList.remove('starting');
        welcomeScreen.style.display = 'none';
        restartGame();
    }
});

// Ensure the game does not start automatically on page load
backgroundImage.onload = () => {
    gameContainer.classList.add('starting');
    welcomeScreen.style.display = 'block';

    // Draw initial game screen
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#006400';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Draw initial score
    document.getElementById('score').textContent = '';
};

// Game Loop
function gameLoop() {
    if (gameOver || paused || !gameStarted) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    // Update Bird
    bird.velocity += gravity;
    bird.y += bird.velocity;
    ctx.drawImage(birdImage, bird.x, bird.y, bird.width, bird.height);

    // Update Pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        const pipeHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        pipes.push({ x: canvas.width, y: pipeHeight });
    }

    pipes.forEach((pipe, index) => {
        pipe.x -= pipeSpeed;

        // Top Pipe
        ctx.drawImage(pipeImage, pipe.x, 0, pipeWidth, pipe.y);

        // Bottom Pipe
        ctx.drawImage(pipeImage, pipe.x, pipe.y + pipeGap, pipeWidth, canvas.height - pipe.y - pipeGap);

        // Collision Detection
        if (
            bird.x < pipe.x + pipeWidth &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.y || bird.y + bird.height > pipe.y + pipeGap)
        ) {
            gameOver = true;
        }

        // Remove Off-Screen Pipes
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(index, 1);
            score++;
        }
    });

    // Draw Ground
    ctx.fillStyle = '#000';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Collision with Ground
    if (bird.y + bird.height > canvas.height - 20) {
        gameOver = true;
    }

    // Update Score
    document.getElementById('score').textContent = `Score: ${score}`;

    // Continue Game Loop
    requestAnimationFrame(gameLoop);
}

// Restart Game Function
function restartGame() {
    bird = { x: 50, y: 300, width: 30, height: 30, velocity: 0 };
    pipes = [];
    score = 0;
    gameOver = false;
    paused = false;
    gameStarted = true;
    gameLoop();
}
