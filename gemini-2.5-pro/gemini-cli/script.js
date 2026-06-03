const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let bird = {
    x: 50,
    y: 150,
    width: 20,
    height: 20,
    gravity: 0.6,
    lift: -15,
    velocity: 0
};

let pipes = [];
let pipeWidth = 20;
let pipeGap = 100;
let pipeLoc = 0;

let score = 0;
let gameOver = false;
let gameStarted = false;

// Game loop
function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over', 75, 200);
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 100, 250);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bird
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

    if (!gameStarted) {
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Press Space to Start', 20, 200);
    } else {
        // Bird physics
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        if (bird.y + bird.height > canvas.height) {
            gameOver = true;
            bird.y = canvas.height - bird.height;
        }
        if (bird.y < 0) {
            bird.y = 0;
            bird.velocity = 0;
        }

        // Pipes
        if (pipeLoc % 150 === 0) {
            let pipeHeight = Math.floor(Math.random() * (canvas.height - pipeGap));
            pipes.push({ x: canvas.width, y: 0, width: pipeWidth, height: pipeHeight, passed: false });
            pipes.push({ x: canvas.width, y: pipeHeight + pipeGap, width: pipeWidth, height: canvas.height - pipeHeight - pipeGap });
        }

        for (let i = 0; i < pipes.length; i++) {
            pipes[i].x -= 2;
            ctx.fillStyle = 'green';
            ctx.fillRect(pipes[i].x, pipes[i].y, pipes[i].width, pipes[i].height);

            if (bird.x < pipes[i].x + pipes[i].width &&
                bird.x + bird.width > pipes[i].x &&
                bird.y < pipes[i].y + pipes[i].height &&
                bird.y + bird.height > pipes[i].y) {
                gameOver = true;
            }

            if (i % 2 === 0 && !pipes[i].passed && pipes[i].x + pipes[i].width < bird.x) {
                pipes[i].passed = true;
                score++;
            }
        }

        // Score
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 10, 20);

        pipeLoc++;
    }

    requestAnimationFrame(gameLoop);
}

// Input
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        if (!gameStarted) {
            gameStarted = true;
        } else {
            bird.velocity = bird.lift;
        }
    }
});

gameLoop();
