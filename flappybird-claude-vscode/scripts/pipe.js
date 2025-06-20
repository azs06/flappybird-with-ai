/**
 * Pipe class
 * Represents a pair of pipes (top and bottom) that the bird must navigate through
 */
class Pipe {
    /**
     * Create a new Pipe instance
     * @param {number} x - X position of the pipe
     * @param {number} canvasHeight - Height of the game canvas
     * @param {number} gapSize - Size of the gap between top and bottom pipes
     */
    constructor(x, canvasHeight, gapSize) {
        this.x = x;
        this.width = 60;
        this.canvasHeight = canvasHeight;
        
        // Randomize the gap size between 140-180px for varied difficulty
        const minGapSize = 140;
        const maxGapSize = 180;
        this.gapSize = gapSize || (minGapSize + Math.floor(Math.random() * (maxGapSize - minGapSize)));
        
        this.speed = 1.8; // Increased speed for more challenge (was 1.5)
        this.scored = false;
        
        // Calculate random gap position
        this.generateRandomGap();
    }

    /**
     * Generate a random position for the gap between pipes
     */
    generateRandomGap() {
        // Set a fixed range for the gap to appear (middle 60% of the screen)
        const minY = Math.floor(this.canvasHeight * 0.2); // 20% from top
        const maxY = Math.floor(this.canvasHeight * 0.8) - this.gapSize; // 20% from bottom - gap size
        
        // Ensure we have a valid range (at least 50px)
        if (maxY - minY < 50) {
            // Default to center if we can't fit a proper gap
            this.gapY = (this.canvasHeight - this.gapSize) / 2;
        } else {
            // Generate a random position in the valid range
            this.gapY = minY + Math.floor(Math.random() * (maxY - minY));
        }
    }

    /**
     * Update the pipe's position
     */
    update() {
        this.x -= this.speed;
    }

    /**
     * Draw the pipe on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        // Draw top pipe
        ctx.fillStyle = '#75C147'; // Green color similar to Flappy Bird
        ctx.fillRect(this.x, 0, this.width, this.gapY);
        
        // Draw bottom pipe
        ctx.fillRect(this.x, this.gapY + this.gapSize, this.width, 
                   this.canvasHeight - (this.gapY + this.gapSize));
        
        // Draw pipe caps (slightly darker green)
        const capHeight = 25;
        ctx.fillStyle = '#558B2F';
        
        // Top pipe cap
        ctx.fillRect(this.x - 5, this.gapY - capHeight, this.width + 10, capHeight);
        
        // Bottom pipe cap
        ctx.fillRect(this.x - 5, this.gapY + this.gapSize, this.width + 10, capHeight);
    }

    /**
     * Check if the pipe is off-screen and can be recycled
     * @returns {boolean} True if the pipe is off-screen
     */
    isOffScreen() {
        return this.x + this.width < 0;
    }

    /**
     * Reset the pipe to a new position
     * @param {number} x - New X position for the pipe
     */
    reset(x) {
        this.x = x;
        this.generateRandomGap();
        this.scored = false;
    }

    /**
     * Get the coordinates for collision detection
     * @returns {Object} Object with top and bottom pipe coordinates
     */
    getCollisionRects() {
        return {
            topPipe: {
                x: this.x,
                y: 0,
                width: this.width,
                height: this.gapY
            },
            bottomPipe: {
                x: this.x,
                y: this.gapY + this.gapSize,
                width: this.width,
                height: this.canvasHeight - (this.gapY + this.gapSize)
            }
        };
    }
}

/**
 * PipeManager class
 * Manages multiple pipes, their creation, and recycling
 */
class PipeManager {
    /**
     * Create a new PipeManager instance
     * @param {number} canvasWidth - Width of the game canvas
     * @param {number} canvasHeight - Height of the game canvas
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.pipes = [];
        
        // Base horizontal distance between pipes with randomization
        this.minPipeGap = 280;
        this.maxPipeGap = 380;
        
        // No fixed pipeGap anymore - we'll randomize it when adding each pipe
        this.pipeSpawnInterval = 160; // Reduced interval for more frequent pipes (was 180)
        this.timeSinceLastPipe = 0;
    }

    /**
     * Initialize pipes
     */
    init() {
        // Clear any existing pipes
        this.pipes = [];
        
        // Add initial pipes after a delay to give player time to prepare
        this.timeSinceLastPipe = this.pipeSpawnInterval - 60; // Start with a pipe after a short delay
    }

    /**
     * Add a new pipe to the game
     */
    addNewPipe() {
        // Randomize pipe's horizontal position for varied difficulty
        const randomGap = this.minPipeGap + Math.floor(Math.random() * (this.maxPipeGap - this.minPipeGap));
        
        // For the first pipe, place it further away to give player time to prepare
        const pipeX = this.pipes.length === 0 
            ? this.canvasWidth + 100 
            : this.canvasWidth + 50;
            
        // Create a new pipe with randomized gap size (the Pipe constructor handles this)
        const newPipe = new Pipe(pipeX, this.canvasHeight);
        this.pipes.push(newPipe);
        
        // Keep track of the most recently added pipe's position and gap
        this.lastPipeX = pipeX;
        this.lastPipeGap = randomGap;
    }

    /**
     * Update all pipes
     */
    update() {
        // Update existing pipes
        for (let i = 0; i < this.pipes.length; i++) {
            this.pipes[i].update();
            
            // Remove pipes that are off screen
            if (this.pipes[i].isOffScreen()) {
                this.pipes.splice(i, 1);
                i--;
            }
        }
        
        // Add new pipes at intervals
        this.timeSinceLastPipe++;
        if (this.timeSinceLastPipe >= this.pipeSpawnInterval) {
            this.addNewPipe();
            this.timeSinceLastPipe = 0;
        }
    }

    /**
     * Draw all pipes on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        this.pipes.forEach(pipe => pipe.draw(ctx));
    }

    /**
     * Reset the pipe manager
     */
    reset() {
        this.pipes = [];
        this.timeSinceLastPipe = 0;
        this.addNewPipe();
    }

    /**
     * Get all pipes for collision detection
     * @returns {Array} Array of pipes
     */
    getPipes() {
        return this.pipes;
    }
}
