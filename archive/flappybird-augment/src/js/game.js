// 🎮 Flappy Bird Clone - Main Game Class
// Handles game loop, state management, and coordination between systems

import { CANVAS, PERFORMANCE, GAME_STATES, CONTROLS, SCORING, DEBUG, BACKGROUND, GROUND, COLORS } from './constants.js';
import { Bird } from './bird.js';
import { PipeManager } from './pipes.js';
import { AudioManager } from './audio.js';
import { Physics } from './physics.js';

export class Game {
    constructor() {
        // Core game elements
        this.canvas = null;
        this.ctx = null;
        this.gameState = GAME_STATES.MENU;
        
        // Game objects
        this.bird = null;
        this.pipeManager = null;
        this.audioManager = null;
        this.physics = null;

        // Background scrolling
        this.backgroundOffset = 0;
        this.groundOffset = 0;
        
        // Game loop variables
        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        this.animationId = null;
        
        // Game state
        this.score = 0;
        this.highScore = 0;
        this.gameStarted = false;
        this.gameEnded = false;
        
        // UI elements
        this.ui = {};
        
        // Input handling
        this.inputHandlers = new Map();
        
        // Performance monitoring
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;

        // Performance optimization
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.backgroundNeedsRedraw = true;
        
        // Bind methods to maintain context
        this.gameLoop = this.gameLoop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }
    
    // Initialize the game
    async init() {
        try {
            console.log('🎮 Initializing Flappy Bird Clone...');
            
            // Get canvas and context
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.canvas || !this.ctx) {
                throw new Error('Failed to get canvas or 2D context');
            }
            
            // Initialize UI references
            this.initUI();
            
            // Load high score
            this.loadHighScore();
            
            // Initialize game systems
            await this.initSystems();

            // Initialize performance optimizations
            this.initPerformanceOptimizations();

            // Set up event listeners
            this.setupEventListeners();
            
            // Set initial game state
            this.setState(GAME_STATES.MENU);
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError('Failed to initialize game: ' + error.message);
        }
    }
    
    // Initialize UI element references
    initUI() {
        this.ui = {
            // Screens
            startScreen: document.getElementById('startScreen'),
            gameHUD: document.getElementById('gameHUD'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            pauseScreen: document.getElementById('pauseScreen'),
            loadingScreen: document.getElementById('loadingScreen'),
            
            // Buttons
            startButton: document.getElementById('startButton'),
            restartButton: document.getElementById('restartButton'),
            menuButton: document.getElementById('menuButton'),
            pauseButton: document.getElementById('pauseButton'),
            resumeButton: document.getElementById('resumeButton'),
            pauseMenuButton: document.getElementById('pauseMenuButton'),
            muteButton: document.getElementById('muteButton'),
            
            // Score displays
            currentScore: document.getElementById('currentScore'),
            finalScore: document.getElementById('finalScore'),
            bestScore: document.getElementById('bestScore'),
            highScoreValue: document.getElementById('highScoreValue'),
            
            // Debug elements
            fpsCounter: document.getElementById('fpsCounter'),
            deltaTime: document.getElementById('deltaTime'),
            objectCount: document.getElementById('objectCount')
        };
    }
    
    // Initialize game systems
    async initSystems() {
        // Initialize audio manager
        this.audioManager = new AudioManager();
        await this.audioManager.init();
        
        // Initialize physics system
        this.physics = new Physics();
        
        // Initialize bird
        this.bird = new Bird();
        
        // Initialize pipe manager
        this.pipeManager = new PipeManager();
        
        console.log('🔧 Game systems initialized');
    }

    // Initialize performance optimizations
    initPerformanceOptimizations() {
        // Create offscreen canvas for background rendering
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = CANVAS.WIDTH;
        this.offscreenCanvas.height = CANVAS.HEIGHT;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        console.log('⚡ Performance optimizations initialized');
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Button event listeners
        this.ui.startButton?.addEventListener('click', () => this.startGame());
        this.ui.restartButton?.addEventListener('click', () => this.restartGame());
        this.ui.menuButton?.addEventListener('click', () => this.goToMenu());
        this.ui.pauseButton?.addEventListener('click', () => this.pauseGame());
        this.ui.resumeButton?.addEventListener('click', () => this.resumeGame());
        this.ui.pauseMenuButton?.addEventListener('click', () => this.goToMenu());
        this.ui.muteButton?.addEventListener('click', () => this.toggleMute());
        
        // Input event listeners
        document.addEventListener('keydown', this.handleInput);
        this.canvas.addEventListener('click', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput);
        
        // Window event listeners
        window.addEventListener('resize', this.handleResize);
        
        console.log('🎯 Event listeners set up');
    }
    
    // Handle input events
    handleInput(event) {
        event.preventDefault();
        
        const isJumpInput = (
            event.type === 'keydown' && event.code === CONTROLS.JUMP_KEY ||
            event.type === 'click' ||
            event.type === 'touchstart'
        );
        
        if (isJumpInput) {
            switch (this.gameState) {
                case GAME_STATES.MENU:
                    this.startGame();
                    break;
                case GAME_STATES.PLAYING:
                    this.bird?.jump();
                    this.audioManager?.playSound('jump');
                    break;
                case GAME_STATES.GAME_OVER:
                    this.restartGame();
                    break;
            }
        }
        
        // Handle pause key
        if (event.type === 'keydown' && event.code === CONTROLS.PAUSE_KEY) {
            if (this.gameState === GAME_STATES.PLAYING) {
                this.pauseGame();
            } else if (this.gameState === GAME_STATES.PAUSED) {
                this.resumeGame();
            }
        }
    }
    
    // Game state management
    setState(newState) {
        this.gameState = newState;
        this.updateUI();
        console.log(`🎮 Game state changed to: ${newState}`);
    }
    
    // Update UI based on current state
    updateUI() {
        // Hide all screens
        Object.values(this.ui).forEach(element => {
            if (element && element.classList && element.classList.contains('screen')) {
                element.classList.remove('active');
            }
        });
        
        // Show appropriate screen
        switch (this.gameState) {
            case GAME_STATES.MENU:
                this.ui.startScreen?.classList.add('active');
                this.ui.highScoreValue && (this.ui.highScoreValue.textContent = this.highScore);
                break;
            case GAME_STATES.PLAYING:
                this.ui.gameHUD?.classList.add('active');
                break;
            case GAME_STATES.GAME_OVER:
                this.ui.gameOverScreen?.classList.add('active');
                this.ui.finalScore && (this.ui.finalScore.textContent = this.score);
                this.ui.bestScore && (this.ui.bestScore.textContent = this.highScore);
                break;
            case GAME_STATES.PAUSED:
                this.ui.pauseScreen?.classList.add('active');
                break;
        }
    }
    
    // Game control methods
    startGame() {
        this.resetGame();
        this.setState(GAME_STATES.PLAYING);
        this.startGameLoop();
        console.log('🚀 Game started');
    }
    
    restartGame() {
        this.startGame();
    }
    
    pauseGame() {
        if (this.gameState === GAME_STATES.PLAYING) {
            this.setState(GAME_STATES.PAUSED);
            this.stopGameLoop();
        }
    }
    
    resumeGame() {
        if (this.gameState === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAYING);
            this.startGameLoop();
        }
    }
    
    goToMenu() {
        this.stopGameLoop();
        this.setState(GAME_STATES.MENU);
    }
    
    endGame() {
        this.gameEnded = true;
        this.stopGameLoop();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        this.setState(GAME_STATES.GAME_OVER);
        this.audioManager?.playSound('hit');
        
        console.log(`💀 Game over! Score: ${this.score}, High Score: ${this.highScore}`);
    }
    
    // Reset game state
    resetGame() {
        this.score = 0;
        this.gameStarted = false;
        this.gameEnded = false;

        // Reset game objects
        this.bird?.reset();
        this.pipeManager?.reset();

        // Reset background scrolling
        this.backgroundOffset = 0;
        this.groundOffset = 0;

        // Update score display
        this.updateScore();
    }
    
    // Score management
    updateScore() {
        this.ui.currentScore && (this.ui.currentScore.textContent = this.score);
    }
    
    addScore(points = SCORING.POINTS_PER_PIPE) {
        this.score += points;
        this.updateScore();
        this.audioManager?.playSound('score');
        console.log(`🎯 Score: ${this.score}`);
    }
    
    // High score persistence
    loadHighScore() {
        try {
            const saved = localStorage.getItem(SCORING.HIGH_SCORE_KEY);
            this.highScore = saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            console.warn('Failed to load high score:', error);
            this.highScore = 0;
        }
    }
    
    saveHighScore() {
        try {
            localStorage.setItem(SCORING.HIGH_SCORE_KEY, this.highScore.toString());
        } catch (error) {
            console.warn('Failed to save high score:', error);
        }
    }
    
    // Audio control
    toggleMute() {
        this.audioManager?.toggleMute();
        const icon = this.ui.muteButton?.querySelector('.audio-icon');
        if (icon) {
            icon.textContent = this.audioManager?.isMuted ? '🔇' : '🔊';
        }
    }
    
    // Game loop management
    startGameLoop() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animationId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    stopGameLoop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // Main game loop
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = Math.min(currentTime - this.lastTime, PERFORMANCE.MAX_DELTA_TIME);
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        // Update game state
        if (this.gameState === GAME_STATES.PLAYING) {
            this.update(this.deltaTime);
        }
        
        // Render game
        this.render();
        
        // Continue loop
        this.animationId = requestAnimationFrame(this.gameLoop);
    }
    
    // Update game logic
    update(deltaTime) {
        // Update background scrolling
        this.updateBackground(deltaTime);

        // Update bird
        this.bird?.update(deltaTime);

        // Update pipes
        this.pipeManager?.update(deltaTime);

        // Check collisions
        this.checkCollisions();

        // Check scoring
        this.checkScoring();
    }

    // Update background scrolling
    updateBackground(deltaTime) {
        const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps

        // Update background offset (slower parallax)
        this.backgroundOffset -= BACKGROUND.SCROLL_SPEED * normalizedDelta;
        if (this.backgroundOffset <= -CANVAS.WIDTH) {
            this.backgroundOffset = 0;
        }

        // Update ground offset (matches pipe speed)
        this.groundOffset -= GROUND.SPEED * normalizedDelta;
        if (this.groundOffset <= -CANVAS.WIDTH) {
            this.groundOffset = 0;
        }
    }
    
    // Render game
    render() {
        // Clear canvas
        this.ctx.fillStyle = CANVAS.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

        // Render background layers (optimized)
        this.renderBackgroundOptimized();

        // Render game objects
        this.pipeManager?.render(this.ctx);
        this.bird?.render(this.ctx);

        // Render ground
        this.renderGround();

        // Render debug info if enabled
        if (DEBUG.SHOW_FPS) {
            this.renderDebugInfo();
        }
    }

    // Optimized background rendering with caching
    renderBackgroundOptimized() {
        // Only redraw background if needed
        if (this.backgroundNeedsRedraw && this.offscreenCtx) {
            this.renderBackgroundToOffscreen();
            this.backgroundNeedsRedraw = false;
        }

        // Draw cached background
        if (this.offscreenCanvas) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        } else {
            // Fallback to direct rendering
            this.renderBackground();
        }
    }

    // Render background to offscreen canvas
    renderBackgroundToOffscreen() {
        const ctx = this.offscreenCtx;

        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98D8E8');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

        // Static clouds (non-scrolling for performance)
        this.renderStaticClouds(ctx);
    }

    // Render static clouds for background cache
    renderStaticClouds(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

        const clouds = [
            { x: 50, y: 80 },
            { x: 200, y: 60 },
            { x: 320, y: 90 },
            { x: 150, y: 120 }
        ];

        clouds.forEach(cloud => {
            this.renderCloudStatic(ctx, cloud.x, cloud.y);
        });
    }

    // Render static cloud
    renderCloudStatic(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.6;

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 15, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Render scrolling background
    renderBackground() {
        // Sky gradient (static)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(1, '#98D8E8'); // Lighter blue

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

        // Clouds (parallax scrolling)
        this.renderClouds();
    }

    // Render scrolling clouds
    renderClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        const cloudOffset = this.backgroundOffset * 0.5; // Slower than background
        const cloudSpacing = 150;
        const cloudCount = Math.ceil(CANVAS.WIDTH / cloudSpacing) + 2;

        for (let i = -1; i < cloudCount; i++) {
            const x = (i * cloudSpacing + cloudOffset) % (CANVAS.WIDTH + cloudSpacing);
            const y = 50 + Math.sin(i * 0.5) * 30; // Varying heights

            this.renderCloud(x, y);
        }
    }

    // Render individual cloud
    renderCloud(x, y) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;

        // Simple cloud shape using circles
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y - 15, 15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    // Render scrolling ground
    renderGround() {
        const groundY = GROUND.Y_POSITION;
        const groundHeight = GROUND.HEIGHT;

        // Ground base
        this.ctx.fillStyle = COLORS.GROUND;
        this.ctx.fillRect(0, groundY, CANVAS.WIDTH, groundHeight);

        // Ground texture (repeating pattern)
        this.ctx.fillStyle = '#d4b86a'; // Darker ground color
        const patternWidth = 40;
        const patternCount = Math.ceil(CANVAS.WIDTH / patternWidth) + 2;

        for (let i = -1; i < patternCount; i++) {
            const x = (i * patternWidth + this.groundOffset) % (CANVAS.WIDTH + patternWidth);

            // Simple grass pattern
            this.ctx.fillRect(x, groundY, 2, 10);
            this.ctx.fillRect(x + 10, groundY + 5, 2, 8);
            this.ctx.fillRect(x + 20, groundY + 2, 2, 12);
            this.ctx.fillRect(x + 30, groundY + 7, 2, 6);
        }

        // Ground border
        this.ctx.strokeStyle = '#c0a062';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(CANVAS.WIDTH, groundY);
        this.ctx.stroke();
    }
    
    // Collision detection
    checkCollisions() {
        if (!this.bird || this.gameEnded) return;
        
        const birdBounds = this.bird.getBounds();
        
        // Check ground collision
        if (this.physics.checkGroundCollision(birdBounds)) {
            this.endGame();
            return;
        }
        
        // Check ceiling collision
        if (this.physics.checkCeilingCollision(birdBounds)) {
            this.endGame();
            return;
        }
        
        // Check pipe collisions
        const pipes = this.pipeManager?.getPipes() || [];
        for (const pipe of pipes) {
            if (this.physics.checkPipeCollision(birdBounds, pipe.getBounds())) {
                this.endGame();
                return;
            }
        }
    }
    
    // Score checking
    checkScoring() {
        if (!this.bird || this.gameEnded) return;
        
        const pipes = this.pipeManager?.getPipes() || [];
        for (const pipe of pipes) {
            if (pipe.canScore && this.bird.x > pipe.x + pipe.width) {
                pipe.canScore = false;
                this.addScore();
            }
        }
    }
    
    // Performance monitoring
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // Update debug display
            if (this.ui.fpsCounter) {
                this.ui.fpsCounter.textContent = this.fps;
            }
            if (this.ui.deltaTime) {
                this.ui.deltaTime.textContent = Math.round(this.deltaTime);
            }
        }
    }
    
    // Debug rendering
    renderDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, 150, 80);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`FPS: ${this.fps}`, 15, 25);
        this.ctx.fillText(`Delta: ${Math.round(this.deltaTime)}ms`, 15, 40);
        this.ctx.fillText(`State: ${this.gameState}`, 15, 55);
        this.ctx.fillText(`Score: ${this.score}`, 15, 70);
    }
    
    // Utility methods
    hideLoadingScreen() {
        const loadingScreen = this.ui.loadingScreen;
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    showError(message) {
        console.error('Game Error:', message);
        const errorScreen = document.getElementById('errorScreen');
        if (errorScreen) {
            errorScreen.style.display = 'flex';
            const errorContent = errorScreen.querySelector('.error-content p');
            if (errorContent) {
                errorContent.textContent = message;
            }
        }
    }
    
    handleResize() {
        // Handle window resize if needed
        // Canvas scaling is handled by CSS
    }
    
    handleVisibilityChange(visible) {
        if (!visible && this.gameState === GAME_STATES.PLAYING) {
            this.pauseGame();
        }
    }
}
