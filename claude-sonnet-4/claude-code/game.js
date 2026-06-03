class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.scoreElement = document.getElementById('score');
        this.finalScoreElement = document.getElementById('finalScore');
        this.bestScoreElement = document.getElementById('bestScore');
        
        this.gameState = 'START';
        this.score = 0;
        this.bestScore = localStorage.getItem('flappyBirdBest') || 0;
        
        this.bird = {
            x: 100,
            y: this.canvas.height / 2,
            width: 34,
            height: 26,
            velocity: 0,
            gravity: 0.6,
            jumpStrength: -12,
            color: '#FFD700'
        };
        
        this.pipes = [];
        this.pipeWidth = 80;
        this.pipeGap = 200;
        this.pipeSpeed = 3;
        
        this.ground = {
            x: 0,
            y: this.canvas.height - 50,
            width: this.canvas.width,
            height: 50
        };
        
        this.setupEventListeners();
        this.updateBestScore();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });
        
        this.canvas.addEventListener('click', () => this.handleInput());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
    }
    
    handleInput() {
        if (this.gameState === 'START') {
            this.startGame();
        } else if (this.gameState === 'PLAYING') {
            this.bird.velocity = this.bird.jumpStrength;
        } else if (this.gameState === 'GAME_OVER') {
            this.restartGame();
        }
    }
    
    startGame() {
        this.gameState = 'PLAYING';
        this.startScreen.classList.add('hidden');
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.addPipe();
    }
    
    restartGame() {
        this.gameState = 'PLAYING';
        this.gameOverScreen.classList.add('hidden');
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.addPipe();
    }
    
    addPipe() {
        const minHeight = 50;
        const maxHeight = this.canvas.height - this.ground.height - this.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - this.ground.height - (topHeight + this.pipeGap),
            passed: false
        });
    }
    
    updateBird() {
        if (this.gameState !== 'PLAYING') return;
        
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }
        
        if (this.bird.y + this.bird.height > this.ground.y) {
            this.gameOver();
        }
    }
    
    updatePipes() {
        if (this.gameState !== 'PLAYING') return;
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;
            
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.scoreElement.textContent = this.score;
            }
            
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
            
            if (this.checkCollision(pipe)) {
                this.gameOver();
            }
        }
        
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.canvas.width - 300) {
            this.addPipe();
        }
    }
    
    checkCollision(pipe) {
        if (this.bird.x < pipe.x + this.pipeWidth &&
            this.bird.x + this.bird.width > pipe.x) {
            if (this.bird.y < pipe.topHeight ||
                this.bird.y + this.bird.height > pipe.bottomY) {
                return true;
            }
        }
        return false;
    }
    
    gameOver() {
        this.gameState = 'GAME_OVER';
        this.finalScoreElement.textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBirdBest', this.bestScore);
        }
        
        this.updateBestScore();
        this.gameOverScreen.classList.remove('hidden');
    }
    
    updateBestScore() {
        this.bestScoreElement.textContent = this.bestScore;
    }
    
    drawBird() {
        this.ctx.fillStyle = this.bird.color;
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);
        
        this.ctx.fillStyle = '#FF4500';
        this.ctx.fillRect(this.bird.x + this.bird.width - 8, this.bird.y + 8, 8, 6);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.bird.x + 20, this.bird.y + 6, 4, 4);
    }
    
    drawPipes() {
        this.ctx.fillStyle = '#228B22';
        
        this.pipes.forEach(pipe => {
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
            
            this.ctx.fillStyle = '#32CD32';
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, this.pipeWidth + 10, 30);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY, this.pipeWidth + 10, 30);
            this.ctx.fillStyle = '#228B22';
        });
    }
    
    drawGround() {
        this.ctx.fillStyle = '#DEB887';
        this.ctx.fillRect(this.ground.x, this.ground.y, this.ground.width, this.ground.height);
        
        this.ctx.fillStyle = '#CD853F';
        for (let x = 0; x < this.canvas.width; x += 20) {
            this.ctx.fillRect(x, this.ground.y, 2, this.ground.height);
        }
    }
    
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#98FB98');
        gradient.addColorStop(1, '#90EE90');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 5; i++) {
            const x = (Date.now() * 0.01 + i * 150) % (this.canvas.width + 100) - 100;
            const y = 50 + i * 30;
            this.ctx.fillRect(x, y, 60, 20);
            this.ctx.fillRect(x + 80, y, 40, 20);
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.drawPipes();
        this.drawBird();
        this.drawGround();
    }
    
    gameLoop() {
        this.updateBird();
        this.updatePipes();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new FlappyBird();
});