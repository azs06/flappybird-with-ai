/**
 * Input handling module
 * Manages keyboard and mouse/touch input for game control
 */
class InputHandler {
    constructor() {
        this.keys = {};
        this.touches = {};
        this.mouseClicks = 0;
        
        // Bind event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('touchstart', this.handleTouchStart.bind(this));
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Prevent spacebar from scrolling the page
        window.addEventListener('keydown', function(e) {
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
            }
        });
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keydown event
     */
    handleKeyDown(event) {
        this.keys[event.key] = true;
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - The keyup event
     */
    handleKeyUp(event) {
        this.keys[event.key] = false;
    }

    /**
     * Handle mousedown events
     * @param {MouseEvent} event - The mousedown event
     */
    handleMouseDown(event) {
        this.mouseClicks++;
    }

    /**
     * Handle mouseup events
     * @param {MouseEvent} event - The mouseup event
     */
    handleMouseUp(event) {
        // Any mouseup handling if needed
    }

    /**
     * Handle touchstart events
     * @param {TouchEvent} event - The touchstart event
     */
    handleTouchStart(event) {
        Array.from(event.changedTouches).forEach(touch => {
            this.touches[touch.identifier] = true;
        });
        
        // Prevent default behavior to avoid scrolling
        event.preventDefault();
    }

    /**
     * Handle touchend events
     * @param {TouchEvent} event - The touchend event
     */
    handleTouchEnd(event) {
        Array.from(event.changedTouches).forEach(touch => {
            delete this.touches[touch.identifier];
        });
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key - The key to check
     * @returns {boolean} True if the key is pressed
     */
    isKeyPressed(key) {
        return this.keys[key] === true;
    }

    /**
     * Check if the spacebar is currently pressed
     * @returns {boolean} True if the spacebar is pressed
     */
    isSpacebarPressed() {
        return this.isKeyPressed(' ');
    }

    /**
     * Check if there is any active touch
     * @returns {boolean} True if there is an active touch
     */
    isTouching() {
        return Object.keys(this.touches).length > 0;
    }

    /**
     * Get and reset the mouse click counter
     * @returns {number} The number of mouse clicks since last check
     */
    getAndResetMouseClicks() {
        const clicks = this.mouseClicks;
        this.mouseClicks = 0;
        return clicks;
    }

    /**
     * Check if any flap action is happening (spacebar, mouse, or touch)
     * @returns {boolean} True if a flap action is detected
     */
    isFlapping() {
        return this.isSpacebarPressed() || 
               this.getAndResetMouseClicks() > 0 ||
               this.isTouching();
    }

    /**
     * Reset all input states
     */
    reset() {
        this.keys = {};
        this.touches = {};
        this.mouseClicks = 0;
    }
}

// Create a global input handler
const Input = new InputHandler();
