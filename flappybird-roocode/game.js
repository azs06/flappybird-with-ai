// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const PIPE_WIDTH = 52;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 150; // frames between pipes
const GROUND_HEIGHT = 80;
const BG_SCROLL_SPEED = 1;
const GROUND_SCROLL_SPEED = 3;
const BIRD_ANIMATION_SPEED = 5; // frames per flap

// Game state
const states = {
    START: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

// Game variables
let canvas, ctx;
let currentState = states.START;
let bird, pipes, score, frameCount, highScore;
let bgX = 0, groundX = 0;
let birdFrame = 0;
let birdFlapCounter = 0;

// Game assets
const assets = {
    bird: document.getElementById('birdSprite'),
    pipe: document.getElementById('pipeSprite'),
    background: document.getElementById('bgSprite'),
    ground: document.getElementById('groundSprite'),
    jumpSound: document.getElementById('jumpSound'),
    scoreSound: document.getElementById('scoreSound'),
    hitSound: document.getElementById('hitSound')
};

// Check if assets are loaded properly
const assetsLoaded = {
    bird: assets.bird.complete && assets.bird.naturalWidth !== 0,
    pipe: assets.pipe.complete && assets.pipe.naturalWidth !== 0,
    background: assets.background.complete && assets.background.naturalWidth !== 0,
    ground: assets.ground.complete && assets.ground.naturalWidth !== 0
};

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 600;
    
    // Add touch event listener for mobile
    canvas.addEventListener('touchstart', () => {
        if (currentState === states.PLAYING) {
            bird.velocity = JUMP_FORCE;
            playSound('jumpSound');
        } else if (currentState === states.START) {
            currentState = states.PLAYING;
        }
    });
    
    // Initialize game objects
    resetGame();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Reset game to initial state
function resetGame() {
    bird = {
        x: 80,
        y: canvas.height / 2,
        width: 34,
        height: 24,
        velocity: 0
    };
    
    pipes = [];
    score = 0;
    frameCount = 0;
    bgX = 0;
    groundX = 0;
    birdFrame = 0;
    birdFlapCounter = 0;
    highScore = localStorage.getItem('flappyHighScore') || 0;
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    frameCount++;
    
    // Update background scrolling
    bgX = (bgX - BG_SCROLL_SPEED) % canvas.width;
    groundX = (groundX - GROUND_SCROLL_SPEED) % 24;
    
    if (currentState !== states.PLAYING) return;
    
    // Update bird animation
    birdFlapCounter++;
    if (birdFlapCounter >= BIRD_ANIMATION_SPEED) {
        birdFlapCounter = 0;
        birdFrame = (birdFrame + 1) % 3; // 3 animation frames
    }
    
    // Update bird position
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    
    // Generate new pipes
    if (frameCount % PIPE_INTERVAL === 0) {
        generatePipe();
    }
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        
        // Check if bird passed pipe
        if (!pipes[i].passed && bird.x > pipes[i].x + PIPE_WIDTH) {
            pipes[i].passed = true;
            score++;
            playSound('scoreSound');
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('flappyHighScore', highScore);
            }
        }
        
        // Remove off-screen pipes
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
    
    // Check collisions
    if (checkCollisions()) {
        currentState = states.GAME_OVER;
        playSound('hitSound');
    }
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (assetsLoaded.background) {
        ctx.drawImage(assets.background, bgX, 0, canvas.width, canvas.height - GROUND_HEIGHT);
        ctx.drawImage(assets.background, bgX + canvas.width, 0, canvas.width, canvas.height - GROUND_HEIGHT);
    } else {
        // Fallback background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#64b3f4');
        gradient.addColorStop(1, '#c2e59c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw pipes
    pipes.forEach(pipe => {
        if (assetsLoaded.pipe) {
            // Top pipe (flipped)
            ctx.save();
            ctx.translate(pipe.x + PIPE_WIDTH/2, pipe.topHeight);
            ctx.scale(1, -1);
            ctx.drawImage(assets.pipe, -PIPE_WIDTH/2, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.restore();
            
            // Bottom pipe
            ctx.drawImage(assets.pipe, pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height);
        } else {
            // Fallback pipe drawing
            ctx.fillStyle = '#4CAF50';
            // Top pipe
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            // Bottom pipe
            ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height);
        }
    });
    
    // Draw bird
    if (assetsLoaded.bird) {
        ctx.drawImage(
            assets.bird,
            birdFrame * assets.bird.width / 3,
            0,
            assets.bird.width / 3,
            assets.bird.height,
            bird.x - 17,
            bird.y - 12,
            34,
            24
        );
    } else {
        // Fallback bird drawing
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    }
    
    // Draw ground
    if (assetsLoaded.ground) {
        ctx.drawImage(assets.ground, groundX, canvas.height - GROUND_HEIGHT);
        ctx.drawImage(assets.ground, groundX + 24, canvas.height - GROUND_HEIGHT);
    } else {
        // Fallback ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    }
    
    // Draw UI
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = '24px "Press Start 2P", Arial';
    ctx.textAlign = 'center';
    
    // Score with outline
    ctx.strokeText(`${score}`, canvas.width / 2, 50);
    ctx.fillText(`${score}`, canvas.width / 2, 50);
    
    // High score
    ctx.font = '14px "Press Start 2P", Arial';
    ctx.strokeText(`HI: ${highScore}`, canvas.width / 2, 30);
    ctx.fillText(`HI: ${highScore}`, canvas.width / 2, 30);
    
    // Draw game state messages
    if (currentState === states.START) {
        ctx.font = '16px "Press Start 2P", Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText('PRESS SPACE TO START', canvas.width / 2, canvas.height / 2);
        ctx.fillText('PRESS SPACE TO START', canvas.width / 2, canvas.height / 2);
    } else if (currentState === states.GAME_OVER) {
        ctx.font = '16px "Press Start 2P", Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.strokeText('PRESS R TO RESTART', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('PRESS R TO RESTART', canvas.width / 2, canvas.height / 2 + 20);
    }
}

// Generate a new pipe
function generatePipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight - GROUND_HEIGHT;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        passed: false
    });
}

// Check for collisions
function checkCollisions() {
    // Ground collision (using ground height)
    if (bird.y + bird.height > canvas.height - GROUND_HEIGHT) {
        return true;
    }
    
    // Sky collision
    if (bird.y < 0) {
        return true;
    }
    
    // Pipe collision (using rectangle collision for simplicity)
    for (const pipe of pipes) {
        // Top pipe collision
        if (bird.x + bird.width > pipe.x && 
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.y < pipe.topHeight) {
            return true;
        }
        
        // Bottom pipe collision
        if (bird.x + bird.width > pipe.x && 
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.y + bird.height > pipe.topHeight + PIPE_GAP) {
            return true;
        }
    }
    
    return false;
}

// Play sound effect
function playSound(id) {
    if (assets[id]) {
        assets[id].currentTime = 0;
        assets[id].play().catch(e => console.log("Audio play failed:", e));
    }
}

// Handle user input
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (currentState === states.START) {
            currentState = states.PLAYING;
        } else if (currentState === states.PLAYING) {
            bird.velocity = JUMP_FORCE;
            playSound('jumpSound');
        } else if (currentState === states.GAME_OVER) {
            resetGame();
            currentState = states.PLAYING;
        }
    }
    
    if (e.code === 'KeyR' && currentState === states.GAME_OVER) {
        resetGame();
        currentState = states.PLAYING;
    }
});

// Initialize game when page loads
window.onload = init;