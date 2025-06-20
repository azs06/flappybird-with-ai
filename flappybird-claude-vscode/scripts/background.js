/**
 * Background class
 * Manages the game background with parallax scrolling effect
 */
class Background {
    /**
     * Create a new Background instance
     * @param {number} width - Width of the canvas
     * @param {number} height - Height of the canvas
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // Background layers and their speeds
        this.layers = [
            { y: this.height - 70, height: 70, speed: 1.1, x: 0, color: '#DED895' }, // Ground (increased from 0.9)
            { y: 0, height: this.height - 70, speed: 0.22, x: 0, color: '#70C5CE' }  // Sky (increased from 0.18)
        ];
        
        // Clouds parameters
        this.clouds = [];
        this.generateClouds();
    }

    /**
     * Generate random clouds for the background
     */
    generateClouds() {
        const numberOfClouds = 3 + Math.floor(Math.random() * 3); // 3-5 clouds
        
        for (let i = 0; i < numberOfClouds; i++) {
            this.clouds.push({
                x: Math.random() * this.width,
                y: 20 + Math.random() * 100,
                width: 60 + Math.random() * 40,
                height: 30 + Math.random() * 20,
                speed: 0.5 + Math.random() * 0.5 // Increased cloud speed to match faster game pace
            });
        }
    }

    /**
     * Update the background (move layers for parallax effect)
     */
    update() {
        // Update background layers
        this.layers.forEach(layer => {
            layer.x -= layer.speed;
            if (layer.x <= -this.width) {
                layer.x = 0;
            }
        });
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.width;
                cloud.y = 20 + Math.random() * 100;
            }
        });
    }

    /**
     * Draw the background on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        // Draw sky
        const skyLayer = this.layers[1];
        ctx.fillStyle = skyLayer.color;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw clouds
        ctx.fillStyle = '#FFFFFF';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
            ctx.ellipse(cloud.x + cloud.width / 4, cloud.y - cloud.height / 4, cloud.width / 3, cloud.height / 2, 0, 0, Math.PI * 2);
            ctx.ellipse(cloud.x - cloud.width / 4, cloud.y - cloud.height / 5, cloud.width / 4, cloud.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw ground (repeating)
        const groundLayer = this.layers[0];
        ctx.fillStyle = groundLayer.color;
        
        // Draw ground at current position
        ctx.fillRect(groundLayer.x, groundLayer.y, this.width, groundLayer.height);
        
        // Draw repeated ground to ensure continuous scrolling
        ctx.fillRect(groundLayer.x + this.width, groundLayer.y, this.width, groundLayer.height);
        
        // Draw ground details (small lines)
        ctx.strokeStyle = '#85AA59';
        ctx.lineWidth = 2;
        
        const lineSpacing = 20;
        const lineCount = Math.ceil(this.width / lineSpacing) + 1;
        
        for (let i = 0; i < lineCount; i++) {
            const x = (i * lineSpacing + groundLayer.x) % this.width;
            ctx.beginPath();
            ctx.moveTo(x, groundLayer.y + 10);
            ctx.lineTo(x, groundLayer.y + groundLayer.height - 10);
            ctx.stroke();
        }
    }

    /**
     * Reset the background state
     */
    reset() {
        this.layers.forEach(layer => {
            layer.x = 0;
        });
        
        this.clouds = [];
        this.generateClouds();
    }

    /**
     * Get the ground height for collision detection
     * @returns {number} The Y position of the ground
     */
    getGroundY() {
        return this.layers[0].y;
    }
}
