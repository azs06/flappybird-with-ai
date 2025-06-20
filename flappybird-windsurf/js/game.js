class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bird = new Bird(this.canvas);
        this.pipes = [];
        this.score = 0;
        this.bestScore = parseInt(Utils.getHighScore()) || 0;
        this.gameOver = false;
        this.animationId = null;
        this.lastPipeTime = 0;
        this.pipeInterval = 2000; // ms between pipes
        this.gameStarted = false;
        
        // UI Elements
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.finalScoreDisplay = document.getElementById('finalScore');
        this.bestScoreDisplay = document.getElementById('bestScore');
        this.restartButton = document.getElementById('restartButton');
        
        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.restart = this.restart.bind(this);
        
        // Event listeners
        this.canvas.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeyPress);
        this.restartButton.addEventListener('click', this.restart);
        
        // Initial setup
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start the game loop
        this.lastTime = 0;
        this.gameLoop(0);
    }
    
    resizeCanvas() {
        // Keep the game at a fixed aspect ratio
        const scale = Math.min(
            window.innerWidth / 320,
            window.innerHeight / 480
        );
        
        this.canvas.style.width = `${320 * scale}px`;
        this.canvas.style.height = `${480 * scale}px`;
    }
    
    handleClick() {
        if (!this.gameStarted) {
            this.startGame();
        } else if (!this.gameOver) {
            this.bird.jump();
        }
    }
    
    handleKeyPress(e) {
        if ((e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') && !this.gameOver) {
            e.preventDefault();
            if (!this.gameStarted) {
                this.startGame();
            } else {
                this.bird.jump();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            this.restart();
        }
    }
    
    startGame() {
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.startScreen.classList.add('hidden');
            this.scoreDisplay.style.display = 'block';
            this.reset();
        }
    }
    
    reset() {
        this.bird = new Bird(this.canvas);
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.lastPipeTime = 0;
        this.updateScore();
    }
    
    restart() {
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        this.gameStarted = false;
        this.scoreDisplay.style.display = 'none';
    }
    
    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }
    
    addPipe() {
        const pipeX = this.canvas.width;
        const gap = 120;
        const minHeight = 50;
        const maxHeight = this.canvas.height - minHeight - gap;
        const height = Utils.getRandomInt(minHeight, maxHeight);
        
        // Create top and bottom pipes with the same gap
        this.pipes.push(new Pipe(this.canvas, pipeX, true));
        this.pipes.push(new Pipe(this.canvas, pipeX, false));
    }
    
    updatePipes(deltaTime) {
        this.lastPipeTime += deltaTime;
        
        // Add new pipes at intervals
        if (this.lastPipeTime >= this.pipeInterval) {
            this.addPipe();
            this.lastPipeTime = 0;
            
            // Increase difficulty as score increases
            this.pipeInterval = Math.max(1000, 2000 - (this.score * 50));
        }
        
        // Update pipes and check for scoring
        let nextPipePair = false;
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.update();
            
            // Check if bird passed a pipe pair
            if (!pipe.passed && !pipe.isTop && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                if (i % 2 === 1) { // Only count once per pipe pair
                    this.score++;
                    this.updateScore();
                    // Play score sound here if needed
                }
            }
            
            // Check for collision with bird
            if (Utils.checkCollision(this.bird.getBounds(), pipe.getBounds())) {
                this.gameOver = true;
            }
            
            // Remove off-screen pipes
            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameOver || !this.gameStarted) return;
        
        // Update bird
        const birdHitGround = this.bird.update();
        if (birdHitGround) {
            this.endGame();
            return;
        }
        
        // Update pipes
        this.updatePipes(deltaTime);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pipes
        this.pipes.forEach(pipe => pipe.draw());
        
        // Draw bird
        this.bird.draw();
        
        // Draw ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
    }
    
    endGame() {
        this.gameOver = true;
        this.gameStarted = false;
        
        // Update high score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            Utils.setHighScore(this.bestScore);
        }
        
        // Show game over screen
        this.finalScoreDisplay.textContent = this.score;
        this.bestScoreDisplay.textContent = this.bestScore;
        this.gameOverScreen.classList.remove('hidden');
        this.scoreDisplay.style.display = 'none';
        
        // Play game over sound here if needed
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.draw();
        
        if (!this.gameOver || !this.gameStarted) {
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
}

// Start the game when the page loads
window.onload = () => {
    const game = new Game();
};
