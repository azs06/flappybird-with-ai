/**
 * Score management module
 * Handles tracking and displaying the player's score
 */
class ScoreManager {
    /**
     * Create a new ScoreManager instance
     */
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.scoreDisplay = document.getElementById('score-display');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');
    }

    /**
     * Increment the score
     */
    incrementScore() {
        this.score++;
        this.updateScoreDisplay();
        
        // Play score sound
        Assets.playSound('score');
    }

    /**
     * Update the score displays
     */
    updateScoreDisplay() {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = this.score;
        }
    }

    /**
     * Update the final score displays (game over screen)
     */
    updateFinalScoreDisplay() {
        if (this.finalScoreDisplay) {
            this.finalScoreDisplay.textContent = this.score;
        }
        
        if (this.highScoreDisplay) {
            this.highScoreDisplay.textContent = this.highScore;
        }
    }

    /**
     * Reset the score
     */
    reset() {
        this.score = 0;
        this.updateScoreDisplay();
    }

    /**
     * Load the high score from localStorage
     * @returns {number} The high score
     */
    loadHighScore() {
        const highScore = localStorage.getItem('flappyBirdHighScore');
        return highScore ? parseInt(highScore, 10) : 0;
    }

    /**
     * Save the high score to localStorage
     */
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyBirdHighScore', this.highScore.toString());
        }
    }

    /**
     * Get the current score
     * @returns {number} The current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Get the high score
     * @returns {number} The high score
     */
    getHighScore() {
        return this.highScore;
    }

    /**
     * Process game over (save high score and update displays)
     */
    processGameOver() {
        this.saveHighScore();
        this.updateFinalScoreDisplay();
    }
}
