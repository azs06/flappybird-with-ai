class Bird {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 34;
        this.height = 24;
        this.x = 50;
        this.y = canvas.height / 2 - this.height / 2;
        this.velocity = 0;
        this.gravity = 0.5;
        this.lift = -10;
        this.rotation = 0;
        this.frames = 0;
        this.wingState = 0;
        this.wingDirection = 1;
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));
        
        // Keep bird within canvas bounds
        if (this.y > this.canvas.height - this.height) {
            this.y = this.canvas.height - this.height;
            this.velocity = 0;
            return true; // Game over
        }
        
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
        
        return false; // Game continues
    }

    jump() {
        this.velocity = this.lift;
        this.frames = 0;
        // Play jump sound here if needed
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        this.ctx.rotate(this.rotation);
        
        // Animate wings
        this.wingState += 0.1 * this.wingDirection;
        if (this.wingState > 1) this.wingDirection = -1;
        if (this.wingState < -1) this.wingDirection = 1;
        
        // Body
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wing (animated)
        this.ctx.fillStyle = '#FFC000';
        this.ctx.beginPath();
        const wingY = Math.sin(this.wingState) * 2;
        this.ctx.ellipse(-this.width/4, wingY, this.width/3, this.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(this.width/4, -this.height/4, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Beak
        this.ctx.fillStyle = '#FF8C00';
        this.ctx.beginPath();
        this.ctx.moveTo(this.width/2, 0);
        this.ctx.lineTo(this.width/2 + 5, -5);
        this.ctx.lineTo(this.width/2 + 10, 0);
        this.ctx.lineTo(this.width/2 + 5, 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eye highlight
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.arc(this.width/4 + 1, -this.height/4 - 1, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
