class Bird {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.width = 34;
        this.height = 24;
        this.gravity = 0.5;
        this.velocity = 0;
        this.jump = -8;
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
    }

    flap() {
        this.velocity = this.jump;
    }

    draw(ctx) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw wing
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(this.x - 5, this.y - 2, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Pipe {
    constructor(canvas, x) {
        this.canvas = canvas;
        this.x = x;
        this.width = 52;
        this.gap = 150;
        this.speed = 2;
        
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
        this.bottomY = this.topHeight + this.gap;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        // Top pipe
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        
        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, this.width, this.canvas.height - this.bottomY);
        
        // Pipe caps
        ctx.fillStyle = '#27AE60';
        ctx.fillRect(this.x - 3, this.topHeight - 20, this.width + 6, 20);
        ctx.fillRect(this.x - 3, this.bottomY, this.width + 6, 20);
    }

    collidesWith(bird) {
        return (
            bird.x + bird.width / 2 > this.x &&
            bird.x - bird.width / 2 < this.x + this.width &&
            (bird.y - bird.height / 2 < this.topHeight ||
             bird.y + bird.height / 2 > this.bottomY)
        );
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 360;
        this.canvas.height = 640;

        this.bird = new Bird(this.canvas);
        this.pipes = [];
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.gameOver = false;
        this.gameStarted = false;

        this.setupEventListeners();
        this.showStartScreen();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (!this.gameStarted) {
                    this.startGame();
                } else if (!this.gameOver) {
                    this.bird.flap();
                }
            }
        });

        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            } else if (!this.gameOver) {
                this.bird.flap();
            }
        });

        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('restart-button').addEventListener('click', () => this.startGame());
    }

    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.pipes = [];
        this.bird = new Bird(this.canvas);
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        this.update();
    }

    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
    }

    showGameOver() {
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-score').textContent = this.score;
    }

    update() {
        if (this.gameOver) return;

        // Update bird
        this.bird.update();

        // Create new pipes
        if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.canvas.width - 200) {
            this.pipes.push(new Pipe(this.canvas, this.canvas.width));
        }

        // Update pipes and check collisions
        this.pipes = this.pipes.filter(pipe => {
            pipe.update();
            
            // Check collision
            if (pipe.collidesWith(this.bird)) {
                this.gameOver = true;
                this.showGameOver();
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('highScore', this.highScore);
                    document.getElementById('high-score').textContent = `High Score: ${this.highScore}`;
                }
                return true;
            }

            // Update score
            if (pipe.x + pipe.width < this.bird.x - this.bird.width / 2 && !pipe.passed) {
                pipe.passed = true;
                this.score++;
                document.getElementById('score').textContent = this.score;
            }

            return pipe.x > -pipe.width;
        });

        // Check if bird hits boundaries
        if (this.bird.y < 0 || this.bird.y > this.canvas.height) {
            this.gameOver = true;
            this.showGameOver();
            return;
        }

        this.draw();
        requestAnimationFrame(() => this.update());
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#70C5CE';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.arc(100 + i * 120, 100, 30, 0, Math.PI * 2);
            this.ctx.arc(130 + i * 120, 100, 30, 0, Math.PI * 2);
            this.ctx.arc(115 + i * 120, 80, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx));

        // Draw bird
        this.bird.draw(this.ctx);

        // Draw ground
        this.ctx.fillStyle = '#DED895';
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};