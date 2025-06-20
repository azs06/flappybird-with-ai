// Main game logic for Flappy Bird
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startButton = document.getElementById('start');
const restartButton = document.getElementById('restart');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');

// Game constants
const GROUND_Y = canvas.height - 50; // Ground level for collision
const PIPE_INTERVAL = 400; // Distance between pipe spawns

// Game variables
let gameState = 'start'; // Possible states: 'start', 'playing', 'gameover'
let bird;
let pipes = [];
let score = 0;
let highScore = localStorage.getItem('flappyBirdHighScore') || 0;
highScoreElement.textContent = `High Score: ${highScore}`;

// Initialize game
function init() {
    console.log("Game initialization started.");
    bird = new Bird();
    pipes = [];
    score = 0;
    scoreElement.textContent = `Score: ${score}`;
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    console.log("Starting game loop.");
    gameLoop();
}

// Game loop
function gameLoop() {
    if (gameState === 'playing') {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Update game state
function update() {
    bird.update();
    
    // Update and generate pipes
    pipes = generatePipes(pipes, canvas.width, canvas.height, PIPE_INTERVAL);
    pipes.forEach(pipe => pipe.update());
    
    // Check for collisions
    if (bird.checkCollision(pipes, GROUND_Y)) {
        gameOver();
        // Play hit sound if available
        // if (assets.sounds.hit.src) {
        //     assets.sounds.hit.play();
        // }
    }
    
    // Update score
    pipes.forEach(pipe => {
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = `Score: ${score}`;
            // Play point sound if available
            // if (assets.sounds.point.src) {
            //     assets.sounds.point.play();
            // }
        }
    });
}

// Render game elements
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (assets.images.background.complete) {
        ctx.drawImage(assets.images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw pipes
    pipes.forEach(pipe => pipe.draw(ctx));
    
    // Draw ground
    if (assets.images.ground.complete) {
        ctx.drawImage(assets.images.ground, 0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    } else {
        ctx.fillStyle = 'brown';
        ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    }
    
    // Draw bird
    bird.draw(ctx);
}

// Handle game over
function gameOver() {
    gameState = 'gameover';
    gameOverScreen.style.display = 'flex';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyBirdHighScore', highScore);
        highScoreElement.textContent = `High Score: ${highScore}`;
    }
}

// Event listeners for user input
window.addEventListener('click', () => {
    if (gameState === 'playing') {
        bird.flap();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === 'playing') {
        bird.flap();
    }
});

// Start and restart buttons
startButton.addEventListener('click', init);
restartButton.addEventListener('click', init);

// Debug: Log to check if script is running
console.log("Game script loaded.");

// Check if assets are loaded before starting (optional enhancement)
console.log("Checking if images are loaded...");
if (areImagesLoaded()) {
    console.log("Assets loaded, ready to start.");
} else {
    console.log("Assets not fully loaded, proceeding with placeholders.");
}

// Force start the game even if assets aren't loaded
window.onload = () => {
    console.log("Window loaded, ensuring game can start.");
};

// Initially show start screen
startScreen.style.display = 'flex';
console.log("Start screen should be visible.");
