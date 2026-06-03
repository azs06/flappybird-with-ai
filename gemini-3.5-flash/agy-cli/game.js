/**
 * Cyber-Flappy Arcade: Main Game Engine
 */

// Skins Definitions
const SKINS = {
    cyber_bird: {
        name: "Cyber Bird",
        desc: "Classic cybernetic yellow flyer",
        color: "#ffe600",
        eyeColor: "#00f0ff",
        wingColor: "#ff9900",
        particleColor: "#ffe600",
        particleType: "spark",
        rgb: "255, 230, 0"
    },
    cyber_eagle: {
        name: "Neon Eagle",
        desc: "High-voltage tactical falcon",
        color: "#00f0ff",
        eyeColor: "#ff007f",
        wingColor: "#0055ff",
        particleColor: "#00f0ff",
        particleType: "ring",
        rgb: "0, 240, 255"
    },
    fire_phoenix: {
        name: "Fire Phoenix",
        desc: "Rises from the ashes with flame trails",
        color: "#ff3c00",
        eyeColor: "#ffe600",
        wingColor: "#ffbb00",
        particleColor: "#ff7700",
        particleType: "fire",
        rgb: "255, 60, 0"
    },
    void_glider: {
        name: "Void Glider",
        desc: "Stealth ship powered by dark matter",
        color: "#bd00ff",
        eyeColor: "#39ff14",
        wingColor: "#660099",
        particleColor: "#bd00ff",
        particleType: "portal",
        rgb: "189, 0, 255"
    }
};

// Particles System
class Particle {
    constructor(x, y, vx, vy, size, color, decay, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.alpha = 1;
        this.decay = decay; // reduction in alpha per frame
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.rotation += this.rotSpeed;
        
        // Add gravity to flame particles
        if (this.type === 'fire') {
            this.vy -= 0.05; // float upwards
            this.vx += (Math.random() - 0.5) * 0.1;
        }
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.type === 'spark') {
            // Square/diamond star
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size/2, 0);
            ctx.lineTo(0, this.size);
            ctx.lineTo(-this.size/2, 0);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'fire') {
            // Small soft circles
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'ring') {
            // Glowing rings
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'portal') {
            // Spinning crosses
            ctx.beginPath();
            ctx.moveTo(-this.size, 0);
            ctx.lineTo(this.size, 0);
            ctx.moveTo(0, -this.size);
            ctx.lineTo(0, this.size);
            ctx.stroke();
        } else {
            // Simple dust circle
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Background Star representation
class Star {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight * 0.7; // Keep stars in top 70%
        this.size = Math.random() * 2;
        this.alpha = Math.random();
        this.fadeSpeed = 0.005 + Math.random() * 0.01;
        this.fadeDir = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
        this.alpha += this.fadeSpeed * this.fadeDir;
        if (this.alpha >= 1) {
            this.alpha = 1;
            this.fadeDir = -1;
        } else if (this.alpha <= 0.1) {
            this.alpha = 0.1;
            this.fadeDir = 1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Background City Building
class Building {
    constructor(x, height, width, color, speed) {
        this.x = x;
        this.height = height;
        this.width = width;
        this.color = color;
        this.speed = speed;
        // Generate random windows
        this.windows = [];
        const winCols = Math.floor(width / 16);
        const winRows = Math.floor(height / 20);
        for (let col = 1; col < winCols; col++) {
            for (let row = 1; row < winRows; row++) {
                if (Math.random() > 0.4) {
                    this.windows.push({
                        dx: col * 16 - 4,
                        dy: row * 20,
                        glowColor: Math.random() > 0.5 ? '#00f0ff' : '#ffe600',
                        active: Math.random() > 0.2
                    });
                }
            }
        }
    }

    update(dx, canvasWidth) {
        this.x -= dx * this.speed;
        if (this.x + this.width < 0) {
            this.x = canvasWidth + Math.random() * 50;
        }
    }

    draw(ctx, canvasHeight) {
        ctx.fillStyle = this.color;
        const yPos = canvasHeight - 80 - this.height; // ground height is 80
        ctx.fillRect(this.x, yPos, this.width, this.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(this.x, yPos, this.width, this.height);

        // Draw windows
        this.windows.forEach(win => {
            if (win.active) {
                ctx.fillStyle = win.glowColor;
                ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 200 + this.x) * 0.2; // Twinkle windows
                ctx.fillRect(this.x + win.dx, yPos + win.dy, 4, 6);
            }
        });
        ctx.globalAlpha = 1.0;
    }
}

// Game Controller
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game specs (fixed logical bounds: 480x640)
        this.width = 480;
        this.height = 640;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.highScore = 0;
        
        // Physics variables
        this.bird = {
            x: 100,
            y: 300,
            radius: 16,
            velocity: 0,
            gravity: 0.42,
            flapForce: -7.6,
            maxFall: 10,
            rotation: 0,
            wingAngle: 0,
            wingSpeed: 0.25,
            skinKey: 'cyber_bird'
        };

        this.pipes = [];
        this.particles = [];
        this.stars = [];
        this.buildings = [];
        
        // Parallax elements
        this.groundX = 0;
        this.basePipeSpeed = 3.0;
        this.pipeSpeed = this.basePipeSpeed;
        this.pipeSpawnInterval = 120; // frames
        this.pipeTimer = 0;
        this.pipeGap = 150;
        
        // Feedback
        this.shakeTimer = 0;
        this.scoreFlash = 0;
        this.scoreColor = '#ffffff';

        // Load leaderboard
        this.leaderboard = [];
        this.loadLeaderboard();

        // Register skins dynamic select
        this.selectedSkin = 'cyber_bird';
        this.initSkinsPanel();

        // Sound references
        this.audioEnabled = false;

        // Initialize background
        this.initBackground();
        
        // Input Listeners
        this.bindEvents();

        // Start Loop
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }

    initBackground() {
        // Init stars
        for (let i = 0; i < 40; i++) {
            this.stars.push(new Star(this.width, this.height));
        }

        // Init buildings for city skyline (back and front layer)
        let x = 0;
        while (x < this.width + 200) {
            const w = 60 + Math.random() * 40;
            const h = 80 + Math.random() * 150;
            this.buildings.push(new Building(x, h, w, '#0d0d1a', 0.15));
            x += w + 20;
        }
        x = 0;
        while (x < this.width + 200) {
            const w = 70 + Math.random() * 50;
            const h = 40 + Math.random() * 90;
            this.buildings.push(new Building(x, h, w, '#131326', 0.3));
            x += w + 40;
        }
    }

    bindEvents() {
        // Space / Up Arrow / Click or Tap
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleAction();
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
            }
            if (e.code === 'KeyM') {
                e.preventDefault();
                this.toggleMute();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            // Check if hud buttons clicked, otherwise flap
            if (e.offsetY < 80 && e.offsetX > this.width - 100) return; // ignore HUD clicks
            this.handleAction();
        });

        this.canvas.addEventListener('touchstart', (e) => {
            // Prevent zooming/scrolling on double tap
            e.preventDefault();
            const touch = e.touches[0];
            const canvasRect = this.canvas.getBoundingClientRect();
            const relativeY = touch.clientY - canvasRect.top;
            const relativeX = touch.clientX - canvasRect.left;
            
            // Scaled coords
            const scaleX = this.width / canvasRect.width;
            const scaleY = this.height / canvasRect.height;
            const clickY = relativeY * scaleY;
            const clickX = relativeX * scaleX;

            if (clickY < 80 && clickX > this.width - 100) return;
            this.handleAction();
        }, { passive: false });

        // HTML HUD Buttons
        document.getElementById('hud-pause').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePause();
        });
        document.getElementById('hud-mute').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        // Overlay buttons
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-restart').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());

        // Leaderboard form submission
        document.getElementById('leaderboard-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('player-name');
            const name = nameInput.value.trim().toUpperCase() || 'PLY';
            this.saveScore(name, this.score);
            document.getElementById('gameover-form-container').classList.add('hidden');
            this.displayLeaderboard();
        });
    }

    initSkinsPanel() {
        const skinsList = document.getElementById('skins-list');
        skinsList.innerHTML = '';
        
        Object.entries(SKINS).forEach(([key, skin]) => {
            const card = document.createElement('div');
            card.className = `skin-card ${key === this.selectedSkin ? 'active' : ''}`;
            card.setAttribute('data-skin', key);
            card.style.setProperty('--skin-color', skin.color);
            card.style.setProperty('--skin-rgb', skin.rgb);
            
            // Build visual representation
            card.innerHTML = `
                <div class="skin-preview" style="border: 2px solid ${skin.color}">
                    <div style="width: 14px; height: 14px; background: ${skin.color}; border-radius: 50%; box-shadow: 0 0 10px ${skin.color}"></div>
                </div>
                <div class="skin-details">
                    <div class="skin-name" style="color: ${skin.color}">${skin.name}</div>
                    <div class="skin-desc">${skin.desc}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                // Audio init
                if (window.sounds) window.sounds.init();
                
                document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedSkin = key;
                this.bird.skinKey = key;
                
                // Update theme properties dynamically on body
                document.documentElement.style.setProperty('--theme-color', skin.color);
                document.documentElement.style.setProperty('--theme-shadow', `0 0 15px ${skin.color}`);
                
                if (window.sounds && this.state === 'START') {
                    window.sounds.playFlap();
                }
            });

            skinsList.appendChild(card);
        });
    }

    handleAction() {
        // Initialize sound context on first user click
        if (window.sounds) window.sounds.init();

        if (this.state === 'START') {
            this.startGame();
        } else if (this.state === 'PLAYING') {
            this.flap();
        } else if (this.state === 'GAMEOVER') {
            // If the leaderboard form is NOT visible, allow quick restart
            if (document.getElementById('gameover-form-container').classList.contains('hidden')) {
                this.resetGame();
            }
        }
    }

    startGame() {
        this.state = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
        this.flap();
    }

    flap() {
        this.bird.velocity = this.bird.flapForce;
        if (window.sounds) window.sounds.playFlap();
        
        // Spawn flap particles
        const skin = SKINS[this.bird.skinKey];
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                this.bird.x - 8,
                this.bird.y + (Math.random() - 0.5) * 10,
                -(1.5 + Math.random() * 2), // blast back
                (Math.random() - 0.5) * 3, // drift up/down
                2 + Math.random() * 3,
                skin.color,
                0.04,
                skin.particleType
            ));
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }

    toggleMute() {
        if (window.sounds) {
            const muted = window.sounds.toggleMute();
            const muteBtns = [document.getElementById('hud-mute'), document.getElementById('btn-mute-txt')];
            muteBtns.forEach(btn => {
                if (!btn) return;
                if (muted) {
                    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
                } else {
                    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
                }
            });
        }
    }

    resetGame() {
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.particles = [];
        this.score = 0;
        this.pipeSpeed = this.basePipeSpeed;
        this.pipeGap = 150;
        this.pipeTimer = 0;
        this.state = 'PLAYING';
        
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('hud-score').innerText = '0';
    }

    loadLeaderboard() {
        try {
            const data = localStorage.getItem('cyber_flappy_leaderboard');
            if (data) {
                this.leaderboard = JSON.parse(data);
            } else {
                // Fun defaults
                this.leaderboard = [
                    { name: 'NEO', score: 100 },
                    { name: 'TRN', score: 75 },
                    { name: 'FLY', score: 50 },
                    { name: 'BOT', score: 35 },
                    { name: 'ACE', score: 20 },
                    { name: 'ZAP', score: 15 },
                    { name: 'CYB', score: 10 },
                    { name: 'ARC', score: 8 },
                    { name: 'RET', score: 5 },
                    { name: 'N00b', score: 2 }
                ];
                this.saveLeaderboard();
            }
            this.highScore = this.leaderboard[0] ? this.leaderboard[0].score : 0;
            document.getElementById('hud-high-score').innerText = this.highScore;
            this.displayLeaderboard();
        } catch (e) {
            console.error("Could not load leaderboard", e);
        }
    }

    saveLeaderboard() {
        try {
            localStorage.setItem('cyber_flappy_leaderboard', JSON.stringify(this.leaderboard));
        } catch (e) {
            console.error("Could not save leaderboard", e);
        }
    }

    displayLeaderboard() {
        const board = document.getElementById('leaderboard-list');
        board.innerHTML = '';

        if (this.leaderboard.length === 0) {
            board.innerHTML = '<div class="leaderboard-empty">No high scores yet!</div>';
            return;
        }

        this.leaderboard.forEach((item, index) => {
            const row = document.createElement('div');
            const isTopThree = index < 3;
            row.className = `leaderboard-item ${isTopThree ? 'top-three' : ''}`;
            
            let rankClass = 'rank-other';
            if (index === 0) rankClass = 'rank-1';
            else if (index === 1) rankClass = 'rank-2';
            else if (index === 2) rankClass = 'rank-3';

            row.innerHTML = `
                <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
                <div class="leaderboard-name">${item.name}</div>
                <div class="leaderboard-score">${item.score}</div>
            `;
            board.appendChild(row);
        });
    }

    checkLeaderboardQualifies(score) {
        if (score <= 0) return false;
        if (this.leaderboard.length < 10) return true;
        return score > this.leaderboard[this.leaderboard.length - 1].score;
    }

    saveScore(name, score) {
        this.leaderboard.push({ name, score });
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10);
        this.saveLeaderboard();
        this.highScore = this.leaderboard[0].score;
        document.getElementById('hud-high-score').innerText = this.highScore;
        this.displayLeaderboard();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.shakeTimer = 20; // 20 frames of screenshake

        if (window.sounds) {
            window.sounds.playCollide();
            setTimeout(() => window.sounds.playGameOver(), 250);
        }

        // Show Game Over UI
        document.getElementById('gameover-screen').classList.remove('hidden');
        document.getElementById('go-final-score').innerText = this.score;

        // Check if player qualifies for leaderboard
        const formContainer = document.getElementById('gameover-form-container');
        if (this.checkLeaderboardQualifies(this.score)) {
            formContainer.classList.remove('hidden');
            document.getElementById('player-name').value = '';
            document.getElementById('player-name').focus();
        } else {
            formContainer.classList.add('hidden');
        }

        // Big visual burst of particles on death!
        const skin = SKINS[this.bird.skinKey];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push(new Particle(
                this.bird.x,
                this.bird.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 4,
                skin.color,
                0.02,
                skin.particleType
            ));
        }
    }

    spawnPipe() {
        // Randomize the height of the gap center, keeping it safe
        const margin = 80;
        const groundHeight = 80;
        const availableHeight = this.height - groundHeight - (margin * 2) - this.pipeGap;
        const gapTop = margin + Math.random() * availableHeight;

        this.pipes.push({
            x: this.width,
            topHeight: gapTop,
            bottomHeight: this.height - groundHeight - gapTop - this.pipeGap,
            passed: false
        });
    }

    updatePhysics() {
        // --- 1. Background Scroll & Stars ---
        this.stars.forEach(s => s.update());
        
        // --- 2. Building Parallax ---
        let deltaX = 0;
        if (this.state === 'PLAYING') {
            deltaX = this.pipeSpeed;
            this.groundX = (this.groundX - this.pipeSpeed) % 24; // repeat grid every 24px
        }
        this.buildings.forEach(b => b.update(deltaX, this.width));

        if (this.state !== 'PLAYING') return;

        // --- 3. Bird Physics ---
        this.bird.velocity += this.bird.gravity;
        if (this.bird.velocity > this.bird.maxFall) {
            this.bird.velocity = this.bird.maxFall;
        }
        this.bird.y += this.bird.velocity;

        // Interpolate bird rotation based on velocity
        // -30deg (-0.5 rad) on flap, 90deg (1.5 rad) on steep fall
        const targetRotation = Math.max(-0.4, Math.min(1.2, this.bird.velocity * 0.1));
        this.bird.rotation += (targetRotation - this.bird.rotation) * 0.15;

        // Wing flapping cycle
        this.bird.wingAngle += this.bird.wingSpeed;

        // Collision with Ceiling and Ground
        const groundY = this.height - 80;
        if (this.bird.y - this.bird.radius < 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0;
        }
        if (this.bird.y + this.bird.radius >= groundY) {
            this.bird.y = groundY - this.bird.radius;
            this.gameOver();
            return;
        }

        // --- 4. Pipes Management ---
        this.pipeTimer++;
        if (this.pipeTimer >= this.pipeSpawnInterval) {
            this.spawnPipe();
            this.pipeTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Collision check
            if (this.checkCollision(this.bird, pipe)) {
                this.gameOver();
                return;
            }

            // Check if passed to increment score
            if (!pipe.passed && pipe.x + 75 / 2 < this.bird.x) {
                pipe.passed = true;
                this.score++;
                
                // Audio chime
                if (window.sounds) window.sounds.playScore();

                document.getElementById('hud-score').innerText = this.score;

                // Progressive difficulty increments
                this.pipeSpeed = this.basePipeSpeed + Math.min(2.5, this.score * 0.08); // speed up slightly
                this.pipeGap = Math.max(118, 150 - Math.min(32, this.score * 1.5));     // shrink gap

                // Trigger HUD score flash
                this.scoreFlash = 12; // 12 frames
                this.scoreColor = SKINS[this.bird.skinKey].color;

                // Spawn score particles
                const skin = SKINS[this.bird.skinKey];
                for (let j = 0; j < 15; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 3;
                    this.particles.push(new Particle(
                        this.bird.x + 20,
                        this.bird.y,
                        Math.cos(angle) * speed + 0.5,
                        Math.sin(angle) * speed,
                        3 + Math.random() * 3,
                        skin.color,
                        0.03,
                        'spark'
                    ));
                }
            }

            // Remove out-of-screen pipes
            if (pipe.x + 80 < 0) {
                this.pipes.splice(i, 1);
            }
        }

        // --- 5. Spawn Trail Particles ---
        const skin = SKINS[this.bird.skinKey];
        if (Math.random() > 0.4) {
            this.particles.push(new Particle(
                this.bird.x - this.bird.radius,
                this.bird.y + (Math.random() - 0.5) * 8,
                -1 - Math.random() * 1.5,
                (Math.random() - 0.5) * 1.5,
                2 + Math.random() * 2,
                skin.particleColor,
                0.03,
                skin.particleType
            ));
        }
    }

    checkCollision(bird, pipe) {
        const pipeWidth = 75;
        const groundHeight = 80;

        // Bounding box for top pipe
        const topBox = {
            left: pipe.x,
            right: pipe.x + pipeWidth,
            top: 0,
            bottom: pipe.topHeight
        };

        // Bounding box for bottom pipe
        const bottomBox = {
            left: pipe.x,
            right: pipe.x + pipeWidth,
            top: this.height - groundHeight - pipe.bottomHeight,
            bottom: this.height - groundHeight
        };

        // Standard Circle-Box Collision check
        return this.circleRectColliding(bird, topBox) || this.circleRectColliding(bird, bottomBox);
    }

    circleRectColliding(circle, rect) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rect.left, Math.min(circle.x, rect.right));
        const closestY = Math.max(rect.top, Math.min(circle.y, rect.bottom));

        // Distance between closest point and circle center
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;

        // If distance is less than circle radius, collision!
        return (dx * dx + dy * dy) < (circle.radius * circle.radius);
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // --- RENDER CODE ---
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Screenshake translate
        this.ctx.save();
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 12 * (this.shakeTimer / 20);
            const dy = (Math.random() - 0.5) * 12 * (this.shakeTimer / 20);
            this.ctx.translate(dx, dy);
            this.shakeTimer--;
        }

        // 1. Draw Space Sky Background
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#040308');
        bgGrad.addColorStop(0.6, '#0b0918');
        bgGrad.addColorStop(1, '#1b1429');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Draw Stars
        this.stars.forEach(s => s.draw(this.ctx));

        // 3. Draw Parallax City Skyline
        this.buildings.forEach(b => b.draw(this.ctx, this.height));

        // 4. Draw Pipes
        this.pipes.forEach(pipe => this.drawPipe(pipe));

        // 5. Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));

        // 6. Draw Bird
        this.drawBird();

        // 7. Draw Cyber Neon Ground grid
        this.drawGround();

        // 8. Visual Screen flash feedback on scoring
        if (this.scoreFlash > 0) {
            this.ctx.fillStyle = this.scoreColor;
            this.ctx.globalAlpha = (this.scoreFlash / 12) * 0.12;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.globalAlpha = 1.0;
            this.scoreFlash--;
        }

        // Restore shake translation
        this.ctx.restore();
    }

    drawBird() {
        const b = this.bird;
        const skin = SKINS[b.skinKey];

        this.ctx.save();
        this.ctx.translate(b.x, b.y);
        this.ctx.rotate(b.rotation);

        // Neon Glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = skin.color;

        // Draw Bird Body
        this.ctx.fillStyle = skin.color;
        this.ctx.beginPath();
        // Cyber bird has a sleek aerodynamic capsule-style body
        this.ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add visual highlights / body detail (panel lines)
        this.ctx.shadowBlur = 0; // disable shadow for interior details
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, b.radius * 0.7, -0.5, Math.PI * 0.8);
        this.ctx.stroke();

        // Draw glowing Eye
        this.ctx.fillStyle = skin.eyeColor;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = skin.eyeColor;
        this.ctx.beginPath();
        // Angry diagonal shape visor eye
        ctxVisor(this.ctx, b.radius * 0.35, -b.radius * 0.25, b.radius * 0.25);
        this.ctx.fill();

        // Draw wing (animated oscillating scale / rotation)
        this.ctx.save();
        this.ctx.translate(-b.radius * 0.3, b.radius * 0.1);
        const flapOffset = Math.sin(b.wingAngle) * 0.45;
        this.ctx.rotate(flapOffset);
        
        // Wing shape
        this.ctx.fillStyle = skin.wingColor;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = skin.wingColor;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.quadraticCurveTo(-b.radius * 0.8, -b.radius * 0.5, -b.radius * 0.9, 0);
        this.ctx.quadraticCurveTo(-b.radius * 0.6, b.radius * 0.5, 0, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Draw Beak (Small glowing cyber horn/beak)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(b.radius * 0.8, -b.radius * 0.25);
        this.ctx.lineTo(b.radius * 1.2, 0);
        this.ctx.lineTo(b.radius * 0.7, b.radius * 0.2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPipe(pipe) {
        const pipeWidth = 75;
        const groundHeight = 80;
        const skin = SKINS[this.bird.skinKey];
        
        // Use active skin's neon theme for pipes as well, matching style!
        const pipeColor = skin.color;
        const pipeGlow = skin.color;

        this.ctx.save();
        
        // Top Pipe
        this.drawSinglePipe(pipe.x, 0, pipeWidth, pipe.topHeight, true, pipeColor, pipeGlow);

        // Bottom Pipe
        const bottomY = this.height - groundHeight - pipe.bottomHeight;
        this.drawSinglePipe(pipe.x, bottomY, pipeWidth, pipe.bottomHeight, false, pipeColor, pipeGlow);

        this.ctx.restore();
    }

    drawSinglePipe(x, y, w, h, isTop, color, glowColor) {
        // Neon Glow effect
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = glowColor;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;

        // Pipe Body
        this.ctx.fillStyle = 'rgba(8, 6, 15, 0.85)';
        this.ctx.beginPath();
        this.ctx.rect(x + 4, y, w - 8, h);
        this.ctx.fill();
        this.ctx.stroke();

        // Pipe Flange (end cap)
        const capHeight = 24;
        const capOffset = isTop ? h - capHeight : 0;
        
        this.ctx.fillStyle = 'rgba(16, 12, 30, 0.95)';
        this.ctx.beginPath();
        this.ctx.rect(x, y + capOffset, w, capHeight);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner glowing stripes on cap to look super techno
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x + 6, y + capOffset + (capHeight/2) - 2, w - 12, 4);

        // Vertical reflection highlight lines inside pipe body
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(x + 12, y, 6, h);
        this.ctx.fillRect(x + 24, y, 2, h);
    }

    drawGround() {
        const groundHeight = 80;
        const y = this.height - groundHeight;

        this.ctx.save();
        
        // Dark Base
        this.ctx.fillStyle = '#050409';
        this.ctx.fillRect(0, y, this.width, groundHeight);

        // Cyber neon horizontal surface line
        const skin = SKINS[this.bird.skinKey];
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = skin.color;
        this.ctx.strokeStyle = skin.color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();

        // Ground grid pattern (vertical lines scrolling left)
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1.5;
        
        // Drawing perspectived grid lines
        for (let i = 0; i < 12; i++) {
            const lineX = (i * 45) + this.groundX;
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, y);
            // Angle perspective outwards to look 3D
            const bottomOffset = (lineX - this.width / 2) * 1.3 + (this.width / 2);
            this.ctx.lineTo(bottomOffset, this.height);
            this.ctx.stroke();
        }

        // Horizontal perspective lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        let hY = y;
        let spacing = 10;
        while (hY < this.height) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, hY);
            this.ctx.lineTo(this.width, hY);
            this.ctx.stroke();
            spacing *= 1.35; // perspective widening
            hY += spacing;
        }

        this.ctx.restore();
    }

    // Main Engine Game Loop
    loop(timestamp) {
        // Delta time not strictly required since physics are framed,
        // but keeping loop structure standard.
        this.updatePhysics();
        this.updateParticles();
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Visor eye helper
function ctxVisor(ctx, x, y, r) {
    // Drawn as a sleek backward leaning parallelogram
    ctx.moveTo(x - r, y - r/2);
    ctx.lineTo(x + r*1.2, y - r/2);
    ctx.lineTo(x + r*0.7, y + r/2);
    ctx.lineTo(x - r*1.5, y + r/2);
    ctx.closePath();
}

// Initialise Game when window loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
