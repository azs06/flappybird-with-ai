// Bird class for Flappy Bird game
class Bird {
    constructor() {
        this.x = 100; // Fixed x position
        this.y = 300; // Starting y position (middle of canvas height)
        this.width = 34; // Approximate width of bird sprite
        this.height = 24; // Approximate height of bird sprite
        this.velocity = 0;
        this.gravity = 0.5; // Gravity pulling the bird down
        this.jumpStrength = -10; // Upward velocity when flapping
        this.isDead = false;
    }

    update() {
        if (!this.isDead) {
            this.velocity += this.gravity;
            this.y += this.velocity;
            
            // Boundary check: prevent bird from going above canvas
            if (this.y < 0) {
                this.y = 0;
                this.velocity = 0;
            }
        }
    }

    draw(ctx) {
        if (assets.images.bird.complete) {
            ctx.drawImage(assets.images.bird, this.x, this.y, this.width, this.height);
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = 'yellow';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    flap() {
        if (!this.isDead) {
            this.velocity = this.jumpStrength;
            // Play flap sound if available
            // if (assets.sounds.flap.src) {
            //     assets.sounds.flap.play();
            // }
        }
    }

    checkCollision(pipes, groundY) {
        // Check collision with ground
        if (this.y + this.height >= groundY) {
            this.isDead = true;
            return true;
        }

        // Check collision with pipes
        for (let pipe of pipes) {
            if (
                this.x < pipe.x + pipe.width &&
                this.x + this.width > pipe.x &&
                (this.y < pipe.topHeight || this.y + this.height > pipe.topHeight + pipe.gap)
            ) {
                this.isDead = true;
                return true;
            }
        }
        return false;
    }
}
