// 🎮 Flappy Bird Clone - Pipe System
// Handles pipe generation, movement, and rendering

import { PIPES, CANVAS, GROUND, DEBUG, COLORS } from './constants.js';

// Individual Pipe class
class Pipe {
    constructor(x, topHeight, bottomHeight) {
        this.x = x;
        this.width = PIPES.WIDTH;
        
        // Top pipe
        this.topHeight = topHeight;
        this.topY = 0;
        
        // Bottom pipe
        this.bottomHeight = bottomHeight;
        this.bottomY = CANVAS.HEIGHT - this.bottomHeight;
        
        // Scoring
        this.canScore = true;
        this.hasScored = false;
        
        // Visual effects
        this.highlight = false;
        this.highlightTime = 0;
    }
    
    // Update pipe position
    update(deltaTime) {
        // Move pipe left
        this.x -= PIPES.SPEED * (deltaTime / 16.67); // Normalize to 60fps
        
        // Update highlight effect
        if (this.highlight) {
            this.highlightTime += deltaTime;
            if (this.highlightTime > 500) { // 500ms highlight
                this.highlight = false;
                this.highlightTime = 0;
            }
        }
    }
    
    // Render the pipe
    render(ctx) {
        ctx.save();
        
        // Pipe color with highlight effect
        let pipeColor = COLORS.PIPE_GREEN;
        if (this.highlight) {
            const intensity = Math.sin(this.highlightTime * 0.01) * 0.3 + 0.7;
            pipeColor = `rgba(92, 184, 92, ${intensity})`;
        }
        
        // Top pipe
        this.renderPipeSegment(ctx, this.x, this.topY, this.width, this.topHeight, pipeColor, true);
        
        // Bottom pipe
        this.renderPipeSegment(ctx, this.x, this.bottomY, this.width, this.bottomHeight, pipeColor, false);
        
        // Debug rendering
        if (DEBUG.SHOW_HITBOXES) {
            this.renderDebugInfo(ctx);
        }
        
        ctx.restore();
    }
    
    // Render individual pipe segment
    renderPipeSegment(ctx, x, y, width, height, color, isTop) {
        // Main pipe body
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        
        // Pipe border
        ctx.strokeStyle = '#4a7c59'; // Darker green
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Pipe cap (wider section at the end)
        const capHeight = 20;
        const capWidth = width + 8;
        const capX = x - 4;
        
        if (isTop) {
            // Top pipe cap at bottom
            const capY = y + height - capHeight;
            ctx.fillStyle = color;
            ctx.fillRect(capX, capY, capWidth, capHeight);
            ctx.strokeRect(capX, capY, capWidth, capHeight);
        } else {
            // Bottom pipe cap at top
            const capY = y;
            ctx.fillStyle = color;
            ctx.fillRect(capX, capY, capWidth, capHeight);
            ctx.strokeRect(capX, capY, capWidth, capHeight);
        }
        
        // Pipe texture (simple lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < height; i += 10) {
            ctx.beginPath();
            ctx.moveTo(x + 2, y + i);
            ctx.lineTo(x + width - 2, y + i);
            ctx.stroke();
        }
    }
    
    // Render debug information
    renderDebugInfo(ctx) {
        // Top pipe hitbox
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.topY, this.width, this.topHeight);
        
        // Bottom pipe hitbox
        ctx.strokeRect(this.x, this.bottomY, this.width, this.bottomHeight);
        
        // Gap area
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.topHeight, this.width, PIPES.GAP_SIZE);
        
        // Score zone
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        const scoreX = this.x + this.width / 2 - PIPES.SCORE_ZONE / 2;
        ctx.strokeRect(scoreX, 0, PIPES.SCORE_ZONE, CANVAS.HEIGHT);
        
        // Pipe info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x, this.topHeight + PIPES.GAP_SIZE / 2 - 20, 80, 40);
        
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`X: ${Math.round(this.x)}`, this.x + 2, this.topHeight + PIPES.GAP_SIZE / 2 - 8);
        ctx.fillText(`Score: ${this.canScore}`, this.x + 2, this.topHeight + PIPES.GAP_SIZE / 2 + 4);
    }
    
    // Get bounding boxes for collision detection
    getBounds() {
        return [
            // Top pipe
            {
                x: this.x,
                y: this.topY,
                width: this.width,
                height: this.topHeight
            },
            // Bottom pipe
            {
                x: this.x,
                y: this.bottomY,
                width: this.width,
                height: this.bottomHeight
            }
        ];
    }
    
    // Check if pipe is off-screen
    isOffScreen() {
        return this.x + this.width < 0;
    }
    
    // Trigger highlight effect
    triggerHighlight() {
        this.highlight = true;
        this.highlightTime = 0;
    }
}

// Pipe Manager class
export class PipeManager {
    constructor() {
        this.pipes = [];
        this.lastPipeX = CANVAS.WIDTH;
        this.pipeCount = 0;
        
        console.log('🏗️ Pipe Manager created');
    }
    
    // Reset pipe system
    reset() {
        this.pipes = [];
        this.lastPipeX = CANVAS.WIDTH;
        this.pipeCount = 0;
        
        console.log('🏗️ Pipes reset');
    }
    
    // Update all pipes
    update(deltaTime) {
        // Update existing pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.update(deltaTime);
            
            // Remove off-screen pipes
            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
                console.log('🗑️ Removed off-screen pipe');
            }
        }
        
        // Generate new pipes
        this.generatePipes();
    }
    
    // Generate new pipes when needed
    generatePipes() {
        // Check if we need a new pipe
        const shouldGenerate = this.pipes.length === 0 || 
                              this.lastPipeX <= CANVAS.WIDTH - PIPES.SPAWN_DISTANCE;
        
        if (shouldGenerate) {
            this.createPipe();
        }
    }
    
    // Create a new pipe pair
    createPipe() {
        const x = this.pipes.length === 0 ? CANVAS.WIDTH : this.lastPipeX + PIPES.SPAWN_DISTANCE;
        
        // Generate random pipe heights
        const { topHeight, bottomHeight } = this.generatePipeHeights();
        
        // Create new pipe
        const pipe = new Pipe(x, topHeight, bottomHeight);
        this.pipes.push(pipe);
        
        this.lastPipeX = x;
        this.pipeCount++;
        
        console.log(`🏗️ Created pipe #${this.pipeCount} at x=${x}`);
    }
    
    // Generate random pipe heights with consistent gap
    generatePipeHeights() {
        const groundY = GROUND.Y_POSITION;
        const availableHeight = groundY - PIPES.GAP_SIZE;
        
        // Ensure minimum heights
        const minTopHeight = PIPES.MIN_HEIGHT;
        const maxTopHeight = availableHeight - PIPES.MIN_HEIGHT;
        
        // Generate random top height
        const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
        
        // Calculate bottom height
        const bottomHeight = groundY - (topHeight + PIPES.GAP_SIZE);
        
        return { topHeight, bottomHeight };
    }
    
    // Render all pipes
    render(ctx) {
        // Render pipes from back to front
        for (const pipe of this.pipes) {
            pipe.render(ctx);
        }
        
        // Render debug info
        if (DEBUG.SHOW_HITBOXES) {
            this.renderDebugInfo(ctx);
        }
    }
    
    // Render debug information
    renderDebugInfo(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, CANVAS.HEIGHT - 100, 150, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`Pipes: ${this.pipes.length}`, 15, CANVAS.HEIGHT - 85);
        ctx.fillText(`Total: ${this.pipeCount}`, 15, CANVAS.HEIGHT - 70);
        ctx.fillText(`Last X: ${Math.round(this.lastPipeX)}`, 15, CANVAS.HEIGHT - 55);
        ctx.fillText(`Next: ${Math.round(this.lastPipeX + PIPES.SPAWN_DISTANCE)}`, 15, CANVAS.HEIGHT - 40);
    }
    
    // Get all pipes for collision detection
    getPipes() {
        return this.pipes;
    }
    
    // Get pipe count
    getPipeCount() {
        return this.pipes.length;
    }
    
    // Get total pipes created
    getTotalPipesCreated() {
        return this.pipeCount;
    }
    
    // Highlight pipes (for visual effects)
    highlightNearestPipe(birdX) {
        for (const pipe of this.pipes) {
            if (pipe.x > birdX - 50 && pipe.x < birdX + 50) {
                pipe.triggerHighlight();
                break;
            }
        }
    }
    
    // Get nearest pipe to bird
    getNearestPipe(birdX) {
        let nearestPipe = null;
        let minDistance = Infinity;
        
        for (const pipe of this.pipes) {
            const distance = Math.abs(pipe.x - birdX);
            if (distance < minDistance && pipe.x > birdX) {
                minDistance = distance;
                nearestPipe = pipe;
            }
        }
        
        return nearestPipe;
    }
    
    // Clear all pipes
    clear() {
        this.pipes = [];
        this.lastPipeX = CANVAS.WIDTH;
        console.log('🧹 All pipes cleared');
    }
}
