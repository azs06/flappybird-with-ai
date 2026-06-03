/**
 * Main Game class
 * Manages the overall game state and connects all components
 */
class FlappyBirdGame {
    /**
     * Create a new FlappyBirdGame instance
     */
    constructor() {
        // Get the canvas and its context
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions
        this.canvas.width = 320;
        this.canvas.height = 480;
        
        // Game state
        this.gameState = 'loading'; // loading, title, playing, gameOver
        
        // Game elements
        this.bird = null;
        this.pipeManager = null;
        this.background = null;
        this.collisionDetector = null;
        this.scoreManager = null;
        
        // UI elements
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Initialize the game
        this.init();
    }

    /**
     * Initialize the game
     */
    init() {
        // Preload assets
        preloadGameAssets();
        
        // Create game objects
        this.bird = new Bird(50, 200, 34, 24);
        this.pipeManager = new PipeManager(this.canvas.width, this.canvas.height);
        this.background = new Background(this.canvas.width, this.canvas.height);
        this.collisionDetector = new CollisionDetector();
        this.scoreManager = new ScoreManager();
        
        // Start the game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Bind event listeners for UI elements
     */
    bindEventListeners() {
        // Start button
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Restart button
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Click on canvas to start or flap
        if (this.canvas) {
            this.canvas.addEventListener('click', () => {
                if (this.gameState === 'title') {
                    this.startGame();
                } else if (this.gameState === 'playing') {
                    this.bird.flap();
                }
            });
        }
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and render based on game state
        switch (this.gameState) {
            case 'loading':
                this.handleLoadingState();
                break;
                
            case 'title':
                this.handleTitleState();
                break;
                
            case 'playing':
                this.handlePlayingState();
                break;
                
            case 'gameOver':
                this.handleGameOverState();
                break;
        }
        
        // Continue the game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Handle the loading state
     */
    handleLoadingState() {
        // Draw loading screen
        this.ctx.fillStyle = '#70C5CE';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
        
        // Show progress
        const progress = Assets.getLoadingProgress();
        this.ctx.fillRect(this.canvas.width / 4, this.canvas.height / 2 + 20, 
                         (this.canvas.width / 2) * (progress / 100), 10);
        
        // Move to title screen when assets are loaded
        if (Assets.isAllLoaded()) {
            this.gameState = 'title';
            this.showStartScreen();
        }
    }

    /**
     * Handle the title state
     */
    handleTitleState() {
        // Draw background
        this.background.update();
        this.background.draw(this.ctx);
        
        // Draw bird animation
        this.bird.update();
        this.bird.draw(this.ctx);
        
        // If spacebar is pressed, start the game
        if (Input.isSpacebarPressed()) {
            this.startGame();
        }
    }

    /**
     * Handle the playing state
     */
    handlePlayingState() {
        // Update game elements
        this.background.update();
        
        // Handle bird flapping
        if (Input.isFlapping()) {
            this.bird.flap();
        }
        
        this.bird.update();
        this.pipeManager.update();
        
        // Check for collisions
        const collisionResult = this.collisionDetector.checkCollisions(
            this.bird, 
            this.pipeManager.getPipes(),
            this.background.getGroundY()
        );
        
        // Handle collision
        if (collisionResult.hasCollided) {
            this.gameOver();
        }
        
        // Handle scoring
        if (collisionResult.passedPipe) {
            this.scoreManager.incrementScore();
        }
        
        // Draw game elements
        this.background.draw(this.ctx);
        this.pipeManager.draw(this.ctx);
        this.bird.draw(this.ctx);
    }

    /**
     * Handle the game over state
     */
    handleGameOverState() {
        // Just draw the static scene
        this.background.draw(this.ctx);
        this.pipeManager.draw(this.ctx);
        this.bird.draw(this.ctx);
        
        // If spacebar is pressed, restart the game
        if (Input.isSpacebarPressed()) {
            this.restartGame();
        }
    }

    /**
     * Start the game
     */
    startGame() {
        this.gameState = 'playing';
        this.hideStartScreen();
        
        // Initialize game elements for a new game
        this.bird.reset(80, this.canvas.height / 2 - 25); // Start in the middle of the screen
        this.pipeManager.init();
        this.scoreManager.reset();
    }

    /**
     * Handle game over
     */
    gameOver() {
        this.gameState = 'gameOver';
        this.bird.dead = true;
        
        // Play death sound
        Assets.playSound('hit');
        
        // Process and display score
        this.scoreManager.processGameOver();
        this.showGameOverScreen();
    }

    /**
     * Restart the game
     */
    restartGame() {
        this.hideGameOverScreen();
        this.startGame();
    }

    /**
     * Show the start screen
     */
    showStartScreen() {
        if (this.startScreen) {
            this.startScreen.classList.remove('hidden');
        }
    }

    /**
     * Hide the start screen
     */
    hideStartScreen() {
        if (this.startScreen) {
            this.startScreen.classList.add('hidden');
        }
    }

    /**
     * Show the game over screen
     */
    showGameOverScreen() {
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    /**
     * Hide the game over screen
     */
    hideGameOverScreen() {
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }
    }
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create a new game instance
    const game = new FlappyBirdGame();
});
