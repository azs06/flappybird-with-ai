document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- Game Constants and Variables ---
    let gameState = 'start'; // 'start', 'playing', 'gameOver'
    let frameCount = 0;
    let score = 0;

    // Bird properties
    const bird = {
        x: 50,
        y: 150,
        width: 34,
        height: 24,
        gravity: 0.4,
        lift: -7,
        velocity: 0
    };

    // Pipe properties
    const pipes = [];
    const pipeWidth = 52;
    const pipeGap = 120;

    // --- Game Functions ---

    /**
     * Resets the game to its initial state.
     */
    function resetGame() {
        bird.y = 150;
        bird.velocity = 0;
        pipes.length = 0; // Clear the pipes array
        score = 0;
        frameCount = 0;
        gameState = 'playing';
    }

    /**
     * The main game loop that updates and draws the game.
     */
    function gameLoop() {
        if (gameState === 'playing') {
            update();
        }
        draw();
        requestAnimationFrame(gameLoop);
    }

    /**
     * Updates the game state (bird position, pipes, etc.).
     */
    function update() {
        frameCount++;

        // Update bird's position
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        // Check for collisions
        if (checkCollisions()) {
            gameState = 'gameOver';
            return;
        }

        // Generate new pipes
        if (frameCount % 90 === 0) {
            generatePipes();
        }

        // Move pipes and check for score
        updatePipes();
    }

    /**
     * Draws everything on the canvas.
     */
    function draw() {
        // Clear canvas with the sky color
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw bird
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

        // Draw pipes
        drawPipes();

        // Draw UI elements based on game state
        drawUI();
    }

    /**
     * Generates a new pair of pipes.
     */
    function generatePipes() {
        const topHeight = Math.random() * (canvas.height - pipeGap - 150) + 50;
        pipes.push({
            x: canvas.width,
            top: topHeight,
            bottom: canvas.height - topHeight - pipeGap,
            passed: false
        });
    }

    /**
     * Updates the position of all pipes and removes off-screen ones.
     */
    function updatePipes() {
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= 2; // Move pipe to the left

            // Check if bird has passed the pipe
            if (!pipes[i].passed && pipes[i].x < bird.x) {
                score++;
                pipes[i].passed = true;
            }

            // Remove pipe if it's off-screen
            if (pipes[i].x + pipeWidth < 0) {
                pipes.splice(i, 1);
            }
        }
    }

    /**
     * Draws all pipes on the canvas.
     */
    function drawPipes() {
        ctx.fillStyle = 'green';
        for (const p of pipes) {
            // Top pipe
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            // Bottom pipe
            ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
        }
    }

    /**
     * Checks for collisions with the ground, ceiling, or pipes.
     * @returns {boolean} - True if a collision occurred, false otherwise.
     */
    function checkCollisions() {
        // Ground and ceiling collision
        if (bird.y + bird.height > canvas.height || bird.y < 0) {
            return true;
        }

        // Pipe collision
        for (const p of pipes) {
            if (
                bird.x < p.x + pipeWidth &&
                bird.x + bird.width > p.x &&
                (bird.y < p.top || bird.y + bird.height > canvas.height - p.bottom)
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Draws the score and game state messages.
     */
    function drawUI() {
        ctx.fillStyle = 'black';
        ctx.font = '24px Arial';

        if (gameState === 'start') {
            ctx.fillText('Click to Start', canvas.width / 2 - 70, canvas.height / 2);
        } else if (gameState === 'playing') {
            ctx.fillText(`Score: ${score}`, 10, 30);
        } else if (gameState === 'gameOver') {
            ctx.fillText('Game Over', canvas.width / 2 - 60, canvas.height / 2 - 40);
            ctx.fillText(`Score: ${score}`, canvas.width / 2 - 45, canvas.height / 2);
            ctx.font = '18px Arial';
            ctx.fillText('Click to Restart', canvas.width / 2 - 65, canvas.height / 2 + 40);
        }
    }

    /**
     * Makes the bird "flap" upwards.
     */
    function flap() {
        bird.velocity = bird.lift;
    }

    // --- Event Listeners ---
    function handleInput() {
        if (gameState === 'start') {
            gameState = 'playing';
        } else if (gameState === 'playing') {
            flap();
        } else if (gameState === 'gameOver') {
            resetGame();
        }
    }

    canvas.addEventListener('click', handleInput);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleInput();
        }
    });

    // --- Start the Game ---
    gameLoop();
});