class FlappyBird {
    constructor() {
        this.gameArea = document.getElementById('game-area');
        this.bird = document.getElementById('bird');
        this.scoreElement = document.getElementById('score');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.startScreen = document.getElementById('start-screen');

        this.birdY = 285; // Center the bird vertically (300 - 15 for half bird height)
        this.birdVelocity = 0;
        this.gravity = 0.5; // Slightly less gravity for smoother gameplay
        this.jumpStrength = -10; // Slightly less jump strength to balance
        this.score = 0;
        this.gameRunning = false;
        this.gameOver = false;
        this.pipes = [];
        this.pipeGap = 150;
        this.pipeWidth = 60;
        this.pipeSpeed = 6; // Increased speed for better gameplay
        this.lastPipeTime = 0;
        this.pipeInterval = 1800; // Slightly faster pipe generation

        // Initialize audio context (will be activated on first user interaction)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.audioContext = null;
        }

        this.init();
    }

    init() {
        this.bindEvents();
        this.showStartScreen();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });

        document.addEventListener('click', () => {
            this.handleInput();
        });

        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });
    }

    handleInput() {
        // Resume audio context on first interaction (required by some browsers)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (!this.gameRunning && !this.gameOver) {
            this.startGame();
        } else if (this.gameRunning) {
            this.flap();
        } else if (this.gameOver) {
            this.restart();
        }
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('hidden');
    }

    startGame() {
        this.gameRunning = true;
        this.gameOver = false;
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.resetGame();
        // Start the game loop
        this.gameLoop();
    }

    resetGame() {
        this.birdY = 285; // Center the bird vertically (300 - 15 for half bird height)
        this.birdVelocity = 0;
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.pipes.forEach(pipe => {
            if (pipe.top && pipe.top.parentNode) pipe.top.remove();
            if (pipe.bottom && pipe.bottom.parentNode) pipe.bottom.remove();
        });
        this.pipes = [];
        this.lastPipeTime = Date.now();
        this.updateBirdPosition();
    }

    flap() {
        this.birdVelocity = this.jumpStrength;
        this.bird.classList.add('flap');
        setTimeout(() => this.bird.classList.remove('flap'), 200);
        this.playSound('flap');
    }

    updateBirdPosition() {
        this.bird.style.top = this.birdY + 'px';
    }

    createPipe() {
        const topHeight = Math.random() * 200 + 50;
        const bottomHeight = 600 - topHeight - this.pipeGap;

        const topPipe = document.createElement('div');
        topPipe.className = 'pipe top';
        topPipe.style.height = topHeight + 'px';
        topPipe.style.right = '-60px'; // Start off-screen to the right

        const bottomPipe = document.createElement('div');
        bottomPipe.className = 'pipe bottom';
        bottomPipe.style.height = bottomHeight + 'px';
        bottomPipe.style.right = '-60px'; // Start off-screen to the right

        this.gameArea.appendChild(topPipe);
        this.gameArea.appendChild(bottomPipe);

        this.pipes.push({ top: topPipe, bottom: bottomPipe, x: 400, topHeight, bottomHeight, passed: false });
    }

    updatePipes() {
        this.pipes.forEach((pipe, index) => {
            pipe.x -= this.pipeSpeed;
            const rightPosition = (400 - pipe.x) + 'px';
            pipe.top.style.right = rightPosition;
            pipe.bottom.style.right = rightPosition;

            // Check collision
            if (this.checkCollision(pipe)) {
                this.endGame();
            }

            // Check scoring
            if (!pipe.passed && pipe.x + this.pipeWidth < 50) {
                pipe.passed = true;
                this.score++;
                this.scoreElement.textContent = this.score;
                this.playSound('score');
            }

            // Remove off-screen pipes
            if (pipe.x < -this.pipeWidth) {
                pipe.top.remove();
                pipe.bottom.remove();
                this.pipes.splice(index, 1);
            }
        });
    }

    checkCollision(pipe) {
        const birdLeft = 50; // Bird's left position (fixed)
        const birdRight = 80; // Bird's right position (birdLeft + bird width)
        const birdTop = this.birdY;
        const birdBottom = this.birdY + 30; // Bird height

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + this.pipeWidth;

        // Check if bird overlaps with pipe horizontally
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check if bird hits top or bottom pipe
            if (birdTop < pipe.topHeight || birdBottom > (600 - pipe.bottomHeight)) {
                return true;
            }
        }

        return false;
    }

    gameLoop() {
        if (!this.gameRunning) return;

        // Update bird physics
        this.birdVelocity += this.gravity;
        this.birdY += this.birdVelocity;
        this.updateBirdPosition();

        // Check ground/ceiling collision
        if (this.birdY <= 0 || this.birdY >= 570) {
            this.endGame();
            return;
        }

        // Create new pipes
        const now = Date.now();
        if (now - this.lastPipeTime > this.pipeInterval) {
            this.createPipe();
            this.lastPipeTime = now;
        }

        // Update pipes
        this.updatePipes();

        // Continue the loop
        requestAnimationFrame(() => this.gameLoop());
    }

    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        this.finalScoreElement.textContent = 'Score: ' + this.score;
        this.gameOverScreen.classList.remove('hidden');
        this.playSound('gameOver');
    }

    restart() {
        this.gameOver = false;
        this.startGame();
    }

    playSound(type) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        switch (type) {
            case 'flap':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
            case 'score':
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
                break;
            case 'gameOver':
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
                break;
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FlappyBird();
});
