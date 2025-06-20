/**
 * Asset loading and management module
 * Handles loading images and sounds for the game
 */
class AssetManager {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    /**
     * Add an image to be loaded
     * @param {string} name - The name to reference the image by
     * @param {string} src - The source path of the image
     */
    addImage(name, src) {
        this.totalAssets++;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.loadedAssets++;
        };
        this.images[name] = img;
    }

    /**
     * Add a sound to be loaded
     * @param {string} name - The name to reference the sound by
     * @param {string} src - The source path of the sound
     */
    addSound(name, src) {
        this.totalAssets++;
        const sound = new Audio();
        sound.src = src;
        sound.oncanplaythrough = () => {
            this.loadedAssets++;
        };
        this.sounds[name] = sound;
    }

    /**
     * Get a loaded image
     * @param {string} name - The name of the image to get
     * @returns {HTMLImageElement} The loaded image
     */
    getImage(name) {
        return this.images[name];
    }

    /**
     * Play a loaded sound
     * @param {string} name - The name of the sound to play
     */
    playSound(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Error playing sound:', e));
        }
    }

    /**
     * Check if all assets are loaded
     * @returns {boolean} True if all assets are loaded
     */
    isAllLoaded() {
        return this.loadedAssets === this.totalAssets;
    }

    /**
     * Get loading progress as a percentage
     * @returns {number} Loading progress (0-100)
     */
    getLoadingProgress() {
        if (this.totalAssets === 0) return 100;
        return Math.floor((this.loadedAssets / this.totalAssets) * 100);
    }
}

// Create a global assets manager
const Assets = new AssetManager();

// This function will be called when implementing the actual game
// For now it's just a placeholder
function preloadGameAssets() {
    // Will load actual assets when implementing the game
    // Example:
    // Assets.addImage('bird', 'assets/images/bird.png');
    // Assets.addSound('flap', 'assets/sounds/flap.mp3');
}
