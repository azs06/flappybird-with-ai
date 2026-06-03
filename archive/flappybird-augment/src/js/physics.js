// 🎮 Flappy Bird Clone - Physics System
// Handles collision detection and physics calculations

import { CANVAS, GROUND, DEBUG } from './constants.js';

export class Physics {
    constructor() {
        // Physics constants are imported from constants.js
    }
    
    // AABB (Axis-Aligned Bounding Box) collision detection
    checkAABBCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }
    
    // Check collision with ground
    checkGroundCollision(birdBounds) {
        const groundY = GROUND.Y_POSITION;
        const collision = birdBounds.y + birdBounds.height >= groundY;
        
        if (DEBUG.LOG_COLLISIONS && collision) {
            console.log('Ground collision detected');
        }
        
        return collision;
    }
    
    // Check collision with ceiling
    checkCeilingCollision(birdBounds) {
        const collision = birdBounds.y <= 0;
        
        if (DEBUG.LOG_COLLISIONS && collision) {
            console.log('Ceiling collision detected');
        }
        
        return collision;
    }
    
    // Check collision with pipe
    checkPipeCollision(birdBounds, pipeBounds) {
        const collision = this.checkAABBCollision(birdBounds, pipeBounds);
        
        if (DEBUG.LOG_COLLISIONS && collision) {
            console.log('Pipe collision detected');
        }
        
        return collision;
    }
    
    // Check if bird is within canvas bounds
    checkCanvasBounds(birdBounds) {
        return {
            left: birdBounds.x >= 0,
            right: birdBounds.x + birdBounds.width <= CANVAS.WIDTH,
            top: birdBounds.y >= 0,
            bottom: birdBounds.y + birdBounds.height <= CANVAS.HEIGHT
        };
    }
    
    // Apply gravity to velocity
    applyGravity(velocity, gravity, deltaTime) {
        return velocity + (gravity * deltaTime / 16.67); // Normalize to 60fps
    }
    
    // Apply terminal velocity limit
    applyTerminalVelocity(velocity, terminalVelocity) {
        return Math.min(velocity, terminalVelocity);
    }
    
    // Calculate rotation based on velocity
    calculateRotation(velocity, maxRotation) {
        // Normalize velocity to rotation range
        const normalizedVelocity = Math.max(-8, Math.min(8, velocity));
        return (normalizedVelocity / 8) * maxRotation;
    }
    
    // Linear interpolation for smooth animations
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Distance between two points
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Check if point is inside rectangle
    pointInRect(pointX, pointY, rect) {
        return (
            pointX >= rect.x &&
            pointX <= rect.x + rect.width &&
            pointY >= rect.y &&
            pointY <= rect.y + rect.height
        );
    }
    
    // Get overlap area between two rectangles
    getOverlapArea(rect1, rect2) {
        const overlapX = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
        const overlapY = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
        return overlapX * overlapY;
    }
    
    // Check if object is completely off-screen (for cleanup)
    isOffScreen(bounds, margin = 50) {
        return (
            bounds.x + bounds.width < -margin ||
            bounds.x > CANVAS.WIDTH + margin ||
            bounds.y + bounds.height < -margin ||
            bounds.y > CANVAS.HEIGHT + margin
        );
    }
    
    // Render debug collision boxes
    renderDebugBounds(ctx, bounds, color = 'red') {
        if (!DEBUG.SHOW_HITBOXES) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.restore();
    }
    
    // Render debug physics info
    renderDebugPhysics(ctx, object, x = 10, y = 100) {
        if (!DEBUG.SHOW_PHYSICS_INFO) return;
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, 200, 100);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`X: ${Math.round(object.x)}`, x + 5, y + 15);
        ctx.fillText(`Y: ${Math.round(object.y)}`, x + 5, y + 30);
        ctx.fillText(`VelY: ${Math.round(object.velocityY * 100) / 100}`, x + 5, y + 45);
        ctx.fillText(`Rot: ${Math.round(object.rotation)}°`, x + 5, y + 60);
        ctx.restore();
    }
}
