class Pipe {
    constructor(canvas, x, isTop = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 50;
        this.x = x;
        this.isTop = isTop;
        this.passed = false;
        this.gap = 120; // Gap between top and bottom pipes
        this.speed = 2;
        
        // Randomize pipe height
        const minHeight = 50;
        const maxHeight = canvas.height - minHeight - this.gap;
        this.height = Utils.getRandomInt(minHeight, maxHeight);
        
        // Set y position based on if it's a top or bottom pipe
        if (isTop) {
            this.y = 0;
        } else {
            this.y = this.height + this.gap;
            this.height = canvas.height - this.y;
        }
        
        // No image loading, using canvas drawing
    }
    
    update() {
        this.x -= this.speed;
        
        // Reset pipe position when it goes off screen
        if (this.x < -this.width) {
            this.x = this.canvas.width;
            this.passed = false;
            
            // Randomize height for the new position
            const minHeight = 50;
            const maxHeight = this.canvas.height - minHeight - this.gap;
            const newHeight = Utils.getRandomInt(minHeight, maxHeight);
            
            if (this.isTop) {
                this.height = newHeight;
            } else {
                this.y = newHeight + this.gap;
                this.height = this.canvas.height - this.y;
            }
        }
    }
    
    draw() {
        // Draw pipe body
        this.ctx.fillStyle = '#2ecc71';
        
        // Draw pipe with gradient for better visual
        const gradient = this.ctx.createLinearGradient(
            this.x, 0, 
            this.x + this.width, 0
        );
        
        if (this.isTop) {
            // Top pipe
            gradient.addColorStop(0, '#2ecc71');
            gradient.addColorStop(1, '#27ae60');
            
            // Pipe body
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Pipe rim
            this.ctx.fillStyle = '#27ae60';
            this.ctx.fillRect(this.x - 5, this.y + this.height - 10, this.width + 10, 10);
            
            // Pipe cap
            this.ctx.fillStyle = '#16a085';
            this.ctx.fillRect(this.x - 5, this.y + this.height - 15, this.width + 10, 5);
        } else {
            // Bottom pipe
            gradient.addColorStop(0, '#27ae60');
            gradient.addColorStop(1, '#2ecc71');
            
            // Pipe body
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Pipe rim
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(this.x - 5, this.y, this.width + 10, 10);
            
            // Pipe cap
            this.ctx.fillStyle = '#1abc9c';
            this.ctx.fillRect(this.x - 5, this.y + 10, this.width + 10, 5);
        }
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    isOffScreen() {
        return this.x < -this.width;
    }
}
