// Pipe class for Flappy Bird game obstacles
class Pipe {
    constructor(canvasWidth, canvasHeight) {
        this.width = 80; // Width of the pipe
        this.gap = 200; // Gap between top and bottom pipe for bird to pass through
        this.x = canvasWidth; // Start at the right edge of canvas
        this.minHeight = 100; // Minimum height for top pipe
        this.maxHeight = canvasHeight - this.gap - this.minHeight; // Maximum height for top pipe
        this.topHeight = Math.floor(Math.random() * (this.maxHeight - this.minHeight + 1)) + this.minHeight;
        this.speed = 3; // Speed at which pipes move left
        this.passed = false; // Whether the bird has passed this pipe (for scoring)
    }

    update() {
        this.x -= this.speed; // Move pipe to the left
    }

    draw(ctx) {
        if (assets.images.pipe.complete) {
            // Draw top pipe (inverted)
            ctx.drawImage(assets.images.pipe, this.x, 0, this.width, this.topHeight, this.x, 0, this.width, this.topHeight);
            // Draw bottom pipe
            ctx.drawImage(assets.images.pipe, this.x, 0, this.width, this.topHeight, this.x, this.topHeight + this.gap, this.width, ctx.canvas.height - (this.topHeight + this.gap));
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = 'green';
            // Top pipe
            ctx.fillRect(this.x, 0, this.width, this.topHeight);
            // Bottom pipe
            ctx.fillRect(this.x, this.topHeight + this.gap, this.width, ctx.canvas.height - (this.topHeight + this.gap));
        }
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// Function to manage pipe generation at intervals
function generatePipes(pipes, canvasWidth, canvasHeight, pipeInterval) {
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvasWidth - pipeInterval) {
        pipes.push(new Pipe(canvasWidth, canvasHeight));
    }
    // Remove pipes that are off-screen
    pipes = pipes.filter(pipe => !pipe.isOffScreen());
    return pipes;
}
