/**
 * Bird class
 * Represents the player-controlled bird in the game
 */
class Bird {
    /**
     * Create a new Bird instance
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of the bird
     * @param {number} height - Height of the bird
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocity = 0;
        this.gravity = 0.35; // Increased gravity (was 0.3)
        this.flapStrength = -5.5; // Stronger flap (was -5) to match increased speed
        this.maxVelocity = 7; // Increased max falling speed (was 6)
        this.rotation = 0;
        this.animationFrame = 0;
        this.animationCounter = 0;
        this.dead = false;
    }

    /**
     * Make the bird flap upward
     */
    flap() {
        if (!this.dead) {
            this.velocity = this.flapStrength;
            // Play flap sound
            Assets.playSound('flap');
        }
    }

    /**
     * Update the bird's position and state
     */
    update() {
        // Apply gravity
        this.velocity += this.gravity;
        
        // Limit maximum falling speed
        if (this.velocity > this.maxVelocity) {
            this.velocity = this.maxVelocity;
        }
        
        this.y += this.velocity;

        // Update rotation based on velocity
        this.rotation = this.velocity * 2;
        if (this.rotation > 90) this.rotation = 90;
        if (this.rotation < -25) this.rotation = -25;

        // Update animation frame
        if (this.animationCounter % 10 === 0) {
            this.animationFrame = (this.animationFrame + 1) % 3;
        }
        this.animationCounter++;

        // Keep the bird within canvas bounds
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    /**
     * Draw the bird on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        ctx.save();
        
        // Translate to bird center for rotation
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Draw the bird
        // For now, draw a simple colored rectangle as a placeholder
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Later will draw the actual sprite with animation:
        // const birdImage = Assets.getImage('bird');
        // ctx.drawImage(
        //     birdImage,
        //     this.animationFrame * birdWidth, 0, birdWidth, birdHeight,
        //     -this.width / 2, -this.height / 2, this.width, this.height
        // );
        
        ctx.restore();
    }

    /**
     * Reset the bird to its initial state
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.rotation = 0;
        this.animationFrame = 0;
        this.animationCounter = 0;
        this.dead = false;
    }
}
