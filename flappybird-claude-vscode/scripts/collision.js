/**
 * Collision detection module
 * Handles collision detection between game objects
 */
class CollisionDetector {
    /**
     * Create a new CollisionDetector instance
     */
    constructor() {
        // No initialization needed
    }

    /**
     * Check for collision between the bird and the ground
     * @param {Bird} bird - The bird object
     * @param {number} groundY - The Y position of the ground
     * @returns {boolean} True if there is a collision
     */
    checkGroundCollision(bird, groundY) {
        return bird.y + bird.height >= groundY;
    }

    /**
     * Check for collision between the bird and a pipe
     * @param {Bird} bird - The bird object
     * @param {Pipe} pipe - The pipe object
     * @returns {boolean} True if there is a collision
     */
    checkPipeCollision(bird, pipe) {
        const pipeRects = pipe.getCollisionRects();
        
        // Create a smaller hitbox for the bird (70% of original size)
        // This makes the game more forgiving
        const shrinkFactor = 0.3; // 30% smaller hitbox
        const birdRect = {
            x: bird.x + bird.width * (shrinkFactor / 2),
            y: bird.y + bird.height * (shrinkFactor / 2),
            width: bird.width * (1 - shrinkFactor),
            height: bird.height * (1 - shrinkFactor)
        };
        
        // Check collision with top pipe
        if (this.checkRectCollision(birdRect, pipeRects.topPipe)) {
            return true;
        }
        
        // Check collision with bottom pipe
        if (this.checkRectCollision(birdRect, pipeRects.bottomPipe)) {
            return true;
        }
        
        return false;
    }

    /**
     * Check for collision between the bird and the ceiling (top of screen)
     * @param {Bird} bird - The bird object
     * @returns {boolean} True if there is a collision
     */
    checkCeilingCollision(bird) {
        return bird.y <= 0;
    }

    /**
     * Check for collision between two rectangles
     * @param {Object} rect1 - First rectangle with x, y, width, and height
     * @param {Object} rect2 - Second rectangle with x, y, width, and height
     * @returns {boolean} True if the rectangles collide
     */
    checkRectCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    /**
     * Check if the bird has passed a pipe (for scoring)
     * @param {Bird} bird - The bird object
     * @param {Pipe} pipe - The pipe object
     * @returns {boolean} True if the bird has passed the pipe
     */
    hasBirdPassedPipe(bird, pipe) {
        return !pipe.scored && 
               bird.x > pipe.x + pipe.width;
    }

    /**
     * Check all collisions in the game
     * @param {Bird} bird - The bird object
     * @param {Array} pipes - Array of pipe objects
     * @param {number} groundY - The Y position of the ground
     * @returns {Object} Collision results
     */
    checkCollisions(bird, pipes, groundY) {
        const result = {
            hasCollided: false,
            passedPipe: false,
            collidedPipe: null
        };
        
        // Check ground collision
        if (this.checkGroundCollision(bird, groundY)) {
            result.hasCollided = true;
            return result;
        }
        
        // Check ceiling collision (optional, commented out for now)
        // if (this.checkCeilingCollision(bird)) {
        //     result.hasCollided = true;
        //     return result;
        // }
        
        // Check pipe collisions
        for (const pipe of pipes) {
            // Check for collision
            if (this.checkPipeCollision(bird, pipe)) {
                result.hasCollided = true;
                result.collidedPipe = pipe;
                return result;
            }
            
            // Check if passed pipe (for scoring)
            if (this.hasBirdPassedPipe(bird, pipe)) {
                pipe.scored = true;
                result.passedPipe = true;
            }
        }
        
        return result;
    }
}
