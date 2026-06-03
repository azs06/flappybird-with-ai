// 🎮 Flappy Bird Clone - Bird Class
// Handles bird physics, animation, and rendering

import { BIRD, CANVAS, GROUND, DEBUG, COLORS } from './constants.js';

export class Bird {
    constructor() {
        // Position and movement
        this.x = BIRD.START_X;
        this.y = BIRD.START_Y;
        this.velocityY = 0;
        this.rotation = 0;
        
        // Dimensions
        this.width = BIRD.WIDTH;
        this.height = BIRD.HEIGHT;
        
        // Animation state
        this.currentFrame = BIRD.IDLE_FRAME;
        this.animationTime = 0;
        this.isFlapping = false;
        this.flapStartTime = 0;
        
        // Physics state
        this.isGrounded = false;
        this.isDead = false;
        
        // Visual effects
        this.trail = [];
        this.maxTrailLength = 5;
        
        console.log('🐦 Bird created');
    }
    
    // Reset bird to initial state
    reset() {
        this.x = BIRD.START_X;
        this.y = BIRD.START_Y;
        this.velocityY = 0;
        this.rotation = 0;
        this.currentFrame = BIRD.IDLE_FRAME;
        this.animationTime = 0;
        this.isFlapping = false;
        this.flapStartTime = 0;
        this.isGrounded = false;
        this.isDead = false;
        this.trail = [];
        
        console.log('🐦 Bird reset');
    }
    
    // Make the bird jump
    jump() {
        if (this.isDead) return;
        
        this.velocityY = BIRD.JUMP_VELOCITY;
        this.isFlapping = true;
        this.flapStartTime = Date.now();
        this.isGrounded = false;
        
        // Add trail point for visual effect
        this.addTrailPoint();
        
        console.log('🐦 Bird jumped');
    }
    
    // Update bird physics and animation
    update(deltaTime) {
        if (this.isDead) return;
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Apply gravity
        this.velocityY += BIRD.GRAVITY * (deltaTime / 16.67); // Normalize to 60fps
        
        // Apply terminal velocity
        if (this.velocityY > BIRD.TERMINAL_VELOCITY) {
            this.velocityY = BIRD.TERMINAL_VELOCITY;
        }
        
        // Update position
        this.y += this.velocityY * (deltaTime / 16.67);
        
        // Update rotation based on velocity
        this.updateRotation();
        
        // Check bounds
        this.checkBounds();
        
        // Update trail
        this.updateTrail();
    }
    
    // Update bird animation
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime;
        
        // Handle flap animation
        if (this.isFlapping) {
            const flapElapsed = Date.now() - this.flapStartTime;
            
            if (flapElapsed < BIRD.FLAP_DURATION) {
                // Animate through flap frames
                const progress = flapElapsed / BIRD.FLAP_DURATION;
                this.currentFrame = Math.floor(progress * BIRD.FLAP_FRAMES);
            } else {
                // End flap animation
                this.isFlapping = false;
                this.currentFrame = BIRD.IDLE_FRAME;
            }
        } else {
            // Idle animation - subtle bob
            const bobSpeed = 0.003;
            const bobAmount = 2;
            this.currentFrame = BIRD.IDLE_FRAME + Math.sin(this.animationTime * bobSpeed) * bobAmount;
        }
    }
    
    // Update bird rotation based on velocity
    updateRotation() {
        // Calculate rotation based on vertical velocity
        const velocityFactor = this.velocityY / BIRD.TERMINAL_VELOCITY;
        this.rotation = velocityFactor * BIRD.MAX_ROTATION;
        
        // Clamp rotation
        this.rotation = Math.max(-BIRD.MAX_ROTATION, Math.min(BIRD.MAX_ROTATION, this.rotation));
    }
    
    // Check and handle boundary collisions
    checkBounds() {
        // Ground collision
        const groundY = GROUND.Y_POSITION;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            this.rotation = 0;
        }
        
        // Ceiling collision
        if (this.y <= 0) {
            this.y = 0;
            this.velocityY = 0;
        }
        
        // Side boundaries (keep bird in view)
        if (this.x < 0) {
            this.x = 0;
        } else if (this.x + this.width > CANVAS.WIDTH) {
            this.x = CANVAS.WIDTH - this.width;
        }
    }
    
    // Add trail point for visual effects
    addTrailPoint() {
        this.trail.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            time: Date.now(),
            alpha: 1.0
        });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }
    
    // Update trail points
    updateTrail() {
        const currentTime = Date.now();
        
        // Update trail point alpha and remove old points
        this.trail = this.trail.filter(point => {
            const age = currentTime - point.time;
            point.alpha = Math.max(0, 1 - (age / 500)); // Fade over 500ms
            return point.alpha > 0;
        });
    }
    
    // Render the bird
    render(ctx) {
        ctx.save();
        
        // Render trail first (behind bird)
        this.renderTrail(ctx);
        
        // Move to bird center for rotation
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);
        
        // Render bird body
        this.renderBirdBody(ctx);
        
        // Render debug info if enabled
        if (DEBUG.SHOW_HITBOXES) {
            this.renderDebugInfo(ctx);
        }
        
        ctx.restore();
    }
    
    // Render bird body (simple colored rectangle for now)
    renderBirdBody(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Bird body (main color)
        ctx.fillStyle = COLORS.ACCENT; // Orange color
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // Bird wing (darker shade)
        ctx.fillStyle = '#e67e22'; // Darker orange
        ctx.fillRect(-halfWidth + 5, -halfHeight + 5, this.width - 10, this.height - 10);
        
        // Bird eye
        ctx.fillStyle = COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(halfWidth - 8, -halfHeight + 6, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupil
        ctx.fillStyle = COLORS.BLACK;
        ctx.beginPath();
        ctx.arc(halfWidth - 7, -halfHeight + 6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#f39c12'; // Yellow-orange
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth + 8, -2);
        ctx.lineTo(halfWidth + 8, 2);
        ctx.closePath();
        ctx.fill();
        
        // Flap effect (when flapping)
        if (this.isFlapping) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Render trail effect
    renderTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            ctx.globalAlpha = point.alpha * 0.5;
            
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render debug information
    renderDebugInfo(ctx) {
        // Reset transformation for debug rendering
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Render hitbox
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Render center point
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Render velocity vector
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY + this.velocityY * 5);
        ctx.stroke();
        
        // Render physics info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x + this.width + 5, this.y, 120, 60);
        
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`VelY: ${this.velocityY.toFixed(2)}`, this.x + this.width + 8, this.y + 12);
        ctx.fillText(`Rot: ${this.rotation.toFixed(1)}°`, this.x + this.width + 8, this.y + 24);
        ctx.fillText(`Ground: ${this.isGrounded}`, this.x + this.width + 8, this.y + 36);
        ctx.fillText(`Flap: ${this.isFlapping}`, this.x + this.width + 8, this.y + 48);
    }
    
    // Get bird bounding box for collision detection
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Get bird center point
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
    
    // Kill the bird (stop physics)
    kill() {
        this.isDead = true;
        this.isFlapping = false;
        console.log('💀 Bird died');
    }
    
    // Check if bird is alive
    isAlive() {
        return !this.isDead;
    }
    
    // Get bird state for debugging
    getState() {
        return {
            position: { x: this.x, y: this.y },
            velocity: this.velocityY,
            rotation: this.rotation,
            isFlapping: this.isFlapping,
            isGrounded: this.isGrounded,
            isDead: this.isDead,
            currentFrame: this.currentFrame
        };
    }
}
