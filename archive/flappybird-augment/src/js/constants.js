// 🎮 Flappy Bird Clone - Game Constants
// Technical specifications and game settings

// Canvas and Display Settings
export const CANVAS = {
    WIDTH: 400,
    HEIGHT: 600,
    BACKGROUND_COLOR: '#70c5ce'
};

// Performance Settings
export const PERFORMANCE = {
    TARGET_FPS: 60,
    FRAME_TIME: 1000 / 60, // 16.67ms per frame
    MAX_DELTA_TIME: 50 // Maximum delta time to prevent large jumps
};

// Bird Physics Constants
export const BIRD = {
    // Position and Size
    START_X: 100,
    START_Y: 300,
    WIDTH: 34,
    HEIGHT: 24,
    
    // Physics
    GRAVITY: 0.5,           // pixels/frame²
    JUMP_VELOCITY: -8,      // pixels/frame (negative = upward)
    TERMINAL_VELOCITY: 8,   // maximum fall speed
    MAX_ROTATION: 90,       // degrees
    ROTATION_SPEED: 3,      // degrees per frame
    
    // Animation
    FLAP_DURATION: 200,     // milliseconds
    FLAP_FRAMES: 3,         // number of animation frames
    IDLE_FRAME: 1           // default frame when not flapping
};

// Pipe System Constants
export const PIPES = {
    WIDTH: 52,
    GAP_SIZE: 120,          // pixels between top and bottom pipe
    SPEED: 2,               // pixels/frame (scrolling speed)
    SPAWN_DISTANCE: 200,    // pixels between pipe pairs
    MIN_HEIGHT: 50,         // minimum pipe height
    MAX_HEIGHT: 400,        // maximum pipe height
    SCORE_ZONE: 26          // width of scoring zone (pipe width / 2)
};

// Ground and Background
export const GROUND = {
    HEIGHT: 112,
    SPEED: 2,               // matches pipe speed
    Y_POSITION: 488         // CANVAS.HEIGHT - GROUND.HEIGHT
};

export const BACKGROUND = {
    SCROLL_SPEED: 0.5,      // slower than foreground for parallax effect
    CLOUD_SPEED: 0.2        // even slower for distant clouds
};

// Game States
export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    PAUSED: 'paused'
};

// Input Controls
export const CONTROLS = {
    JUMP_KEY: 'Space',
    PAUSE_KEY: 'Escape',
    RESTART_KEY: 'Enter',
    TOUCH_ENABLED: true,
    MIN_TOUCH_TARGET: 44    // minimum touch target size (px)
};

// Scoring System
export const SCORING = {
    POINTS_PER_PIPE: 1,
    HIGH_SCORE_KEY: 'flappybird_highscore', // localStorage key
    SCORE_DISPLAY_DURATION: 1000 // milliseconds to show score popup
};

// Audio Settings
export const AUDIO = {
    MASTER_VOLUME: 0.7,
    SFX_VOLUME: 0.8,
    MUSIC_VOLUME: 0.3,
    SOUNDS: {
        JUMP: 'jump.wav',
        SCORE: 'score.wav',
        HIT: 'hit.wav',
        SWOOSH: 'swoosh.wav'
    }
};

// Visual Effects
export const EFFECTS = {
    PARTICLE_COUNT: 10,
    PARTICLE_LIFE: 1000,    // milliseconds
    SCREEN_SHAKE_DURATION: 300,
    SCREEN_SHAKE_INTENSITY: 5,
    FADE_DURATION: 500      // milliseconds for transitions
};

// Responsive Design Breakpoints
export const BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
};

// Colors (CSS color values)
export const COLORS = {
    PRIMARY: '#70c5ce',     // sky blue
    SECONDARY: '#5dade2',   // darker blue
    ACCENT: '#f39c12',      // orange
    TEXT: '#2c3e50',        // dark blue-gray
    WHITE: '#ffffff',
    BLACK: '#000000',
    GROUND: '#decc87',      // sandy yellow
    PIPE_GREEN: '#5cb85c',  // pipe color
    SCORE_GOLD: '#f1c40f'   // score highlight
};

// Development and Debug Settings
export const DEBUG = {
    SHOW_HITBOXES: false,
    SHOW_FPS: false,
    SHOW_PHYSICS_INFO: false,
    LOG_COLLISIONS: false,
    INVINCIBLE_MODE: false
};

// Browser Compatibility
export const BROWSER_SUPPORT = {
    REQUIRED_FEATURES: [
        'requestAnimationFrame',
        'localStorage',
        'addEventListener',
        'Canvas2D'
    ],
    FALLBACK_ENABLED: true
};

// Performance Optimization Settings
export const OPTIMIZATION = {
    OBJECT_POOLING: true,
    DIRTY_RECTANGLE_RENDERING: false, // Simple implementation doesn't need this
    PRELOAD_ASSETS: true,
    COMPRESS_AUDIO: true
};

// Game Balance (for fine-tuning difficulty)
export const BALANCE = {
    DIFFICULTY_INCREASE_RATE: 0,    // 0 = no increase, keeps game simple
    PIPE_FREQUENCY_MIN: 1.5,        // seconds between pipes (minimum)
    PIPE_FREQUENCY_MAX: 2.5,        // seconds between pipes (maximum)
    SCORE_MULTIPLIER: 1             // for potential score bonuses
};
