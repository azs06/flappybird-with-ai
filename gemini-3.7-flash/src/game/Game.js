// ============================================================================
// Game.js - Core Game Loop, State Machine, Modes, Input & Game Logic
// ============================================================================

import { Renderer } from '../graphics/Renderer.js';
import { ThemeManager } from '../graphics/ThemeManager.js';
import { ParticleSystem } from '../graphics/ParticleSystem.js';
import { Bird } from '../entities/Bird.js';
import { PipeManager } from '../entities/PipeManager.js';
import { Boss } from '../entities/Boss.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { SaveManager } from '../systems/SaveManager.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { GhostReplay } from '../systems/GhostReplay.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'MENU'; // 'MENU', 'GET_READY', 'PLAYING', 'BOSS_BATTLE', 'GAME_OVER', 'PAUSED'
    this.mode = 'classic'; // 'classic', 'boss', 'gravity', 'hyper', 'zen'

    // Subsystems
    this.renderer = new Renderer(canvas);
    this.themeManager = new ThemeManager();
    this.particleSystem = new ParticleSystem();
    this.soundEngine = new SoundEngine();
    this.saveManager = new SaveManager();
    this.achievementSystem = new AchievementSystem(this.saveManager, this.soundEngine, this.particleSystem);
    this.ghostReplay = new GhostReplay();
    this.uiManager = new UIManager(this);

    // Entities
    this.bird = new Bird(100, 280);
    this.pipeManager = new PipeManager();
    this.boss = new Boss();

    // Gameplay metrics
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runGrazes = 0;
    this.runFlaps = 0;
    this.runCoins = 0;
    this.runStartTime = 0;
    this.isNewHighScore = false;
    this.medalEarned = null;

    // Slow-mo / Bullet time
    this.slowMoTimer = 0;
    this.timeScale = 1.0;

    // Ready state hover
    this.hoverTime = 0;

    // Bind entity callbacks
    this.setupCallbacks();

    // Load saved settings & selections
    this.applySavedSettings();

    // Main animation loop
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  applySavedSettings() {
    const data = this.saveManager.data;
    if (data.selectedSkin) this.bird.skin = data.selectedSkin;
    if (data.selectedTheme) this.themeManager.setTheme(data.selectedTheme);
    if (data.settings) {
      this.soundEngine.setMasterVolume(data.settings.masterVolume);
      this.soundEngine.setSfxVolume(data.settings.sfxVolume);
      this.soundEngine.setMusicVolume(data.settings.musicVolume);
      this.soundEngine.setMusicEnabled(data.settings.musicEnabled);
      this.renderer.crtEnabled = data.settings.crtEnabled;
      this.particleSystem.setDensity(data.settings.particleDensity);
      this.ghostReplay.enabled = data.settings.ghostEnabled;
    }
  }

  setupCallbacks() {
    this.bird.onScore = () => {
      this.score++;
      this.combo++;
      this.comboTimer = 160;

      this.soundEngine.playScore(this.combo);
      this.particleSystem.emitSparkles(this.bird.x, this.bird.y - 15, '#fbbf24', 6);
      this.particleSystem.addFloatingText(`+${1 * this.combo}`, this.bird.x, this.bird.y - 20, '#fbbf24', 14);

      this.renderer.triggerZoomPulse(1.03);

      // Check Boss Trigger (every 15 pipes in classic mode)
      if (this.mode === 'classic' && this.score > 0 && this.score % 15 === 0 && !this.boss.active) {
        this.startBossBattle();
      }

      this.saveManager.data.stats.totalScore++;
      this.achievementSystem.checkAll({ score: this.score });
    };

    this.bird.onGraze = () => {
      this.runGrazes++;
      this.saveManager.data.stats.totalGrazes++;
      this.score += 2;
      this.combo++;
      this.comboTimer = 180;
      this.achievementSystem.checkAll({ runGrazes: this.runGrazes });
    };

    this.bird.onCoin = (val) => {
      this.runCoins += val;
      this.saveManager.addGems(val);
      this.achievementSystem.checkAll();
    };

    this.bird.onSlowMo = () => {
      this.slowMoTimer = 180; // ~3 seconds
      this.timeScale = 0.5;
      this.renderer.triggerFlash('#818cf8', 0.35);
    };

    this.bird.onBossHit = () => {
      if (this.bird.hasShield) {
        this.bird.hasShield = false;
        this.soundEngine.playShieldHit();
        this.renderer.triggerShake(8, 15);
        this.renderer.triggerFlash('#38bdf8', 0.4);
        this.particleSystem.emitShockwave(this.bird.x, this.bird.y, '#38bdf8', 50);
        this.particleSystem.addFloatingText('SHIELD SHATTERED!', this.bird.x, this.bird.y - 20, '#38bdf8', 12);
      } else {
        this.gameOver();
      }
    };
  }

  setMode(mode) {
    if (['classic', 'boss', 'gravity', 'hyper', 'zen'].includes(mode)) {
      this.mode = mode;
      if (this.soundEngine) {
        this.soundEngine.playButton();
        if (mode === 'boss') this.soundEngine.setMusicMode('boss');
        else if (mode === 'hyper') this.soundEngine.setMusicMode('hyper');
        else if (mode === 'zen') this.soundEngine.setMusicMode('zen');
        else this.soundEngine.setMusicMode('arcade');
      }
    }
  }

  handleAction() {
    if (this.uiManager.activeModal) {
      return; // Modal handles its own interactions
    }

    if (this.state === 'MENU') {
      this.state = 'GET_READY';
      this.bird.reset();
      this.soundEngine.playButton();
    } else if (this.state === 'GET_READY') {
      this.startGame();
    } else if (this.state === 'PLAYING' || this.state === 'BOSS_BATTLE') {
      this.bird.flap(this.soundEngine, this.particleSystem);
      this.runFlaps++;
      this.saveManager.data.stats.totalFlaps++;
      this.achievementSystem.checkAll();
    } else if (this.state === 'GAME_OVER') {
      this.state = 'GET_READY';
      this.bird.reset();
      this.soundEngine.playButton();
    }
  }

  startGame() {
    this.state = this.mode === 'boss' ? 'BOSS_BATTLE' : 'PLAYING';
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runGrazes = 0;
    this.runFlaps = 0;
    this.runCoins = 0;
    this.isNewHighScore = false;
    this.medalEarned = null;
    this.runStartTime = Date.now();

    this.bird.reset();
    this.pipeManager.reset();

    // Mode setup
    if (this.mode === 'gravity') {
      this.bird.inverted = false; // Starts normal, can invert
    } else if (this.mode === 'hyper') {
      this.pipeManager.setSpeed(3.8);
    } else if (this.mode === 'zen') {
      this.pipeManager.setSpeed(1.8);
    }

    if (this.mode === 'boss') {
      this.startBossBattle();
    }

    this.ghostReplay.startRecording();
    this.saveManager.data.stats.gamesPlayed++;
    this.saveManager.save();

    this.soundEngine.startMusic();
    this.bird.flap(this.soundEngine, this.particleSystem);
  }

  startBossBattle() {
    this.state = 'BOSS_BATTLE';
    this.boss.spawn();
    this.soundEngine.setMusicMode('boss');
    this.soundEngine.playBossWarning();
    this.renderer.triggerShake(10, 30);
    this.renderer.triggerFlash('#f43f5e', 0.4);
    this.particleSystem.addFloatingText('⚠️ WARNING: TITAN INCOMING! ⚠️', 210, 180, '#ef4444', 14);
  }

  gameOver() {
    if (this.mode === 'zen') {
      // In Zen mode, player bounces gently instead of dying
      this.bird.vy = -5;
      this.particleSystem.emitSparkles(this.bird.x, this.bird.y, '#38bdf8', 10);
      return;
    }

    this.state = 'GAME_OVER';
    this.soundEngine.playDie();
    this.renderer.triggerShake(14, 25);
    this.renderer.triggerFlash('#ef4444', 0.5);

    this.particleSystem.emitExplosion(this.bird.x, this.bird.y, '#f59e0b', 30);

    // Check High Score
    const isNew = this.saveManager.setHighScore(this.mode, this.score);
    this.isNewHighScore = isNew;

    if (isNew) {
      this.ghostReplay.saveBestRecording();
      this.particleSystem.emitFireworks(210, 200);
      this.soundEngine.playLevelUp();
    }

    // Award Medal
    this.medalEarned = this.calculateMedal(this.score);

    // Update statistics
    this.saveManager.data.stats.totalDeaths++;
    this.saveManager.save();
    this.achievementSystem.checkAll({ score: this.score });
  }

  calculateMedal(score) {
    if (score >= 150) return { name: 'Master Aviator', icon: '👑', color: '#f59e0b' };
    if (score >= 100) return { name: 'Diamond Crown', icon: '💎', color: '#38bdf8' };
    if (score >= 75) return { name: 'Platinum Ace', icon: '💠', color: '#e2e8f0' };
    if (score >= 50) return { name: 'Golden Legend', icon: '🥇', color: '#facc15' };
    if (score >= 25) return { name: 'Silver Ace', icon: '🥈', color: '#94a3b8' };
    if (score >= 10) return { name: 'Bronze Flyer', icon: '🥉', color: '#d97706' };
    return null;
  }

  update(dt = 1) {
    // Slow-mo / Bullet time update
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1.0;
      }
    }

    const effectiveDt = dt * this.timeScale;

    // Theme & Environmental Parallax
    this.themeManager.update(effectiveDt, this.pipeManager.speed);

    // Particle System
    this.particleSystem.update(effectiveDt);

    // Achievements & Toasts
    this.achievementSystem.update(dt);

    // Renderer FX
    this.renderer.update(dt);

    if (this.state === 'GET_READY') {
      this.hoverTime += 0.05 * dt;
      this.bird.y = 280 + Math.sin(this.hoverTime) * 12;
      this.bird.rotation = Math.sin(this.hoverTime) * 0.1;
      this.bird.update(0, this.soundEngine, this.particleSystem);
    } else if (this.state === 'PLAYING' || this.state === 'BOSS_BATTLE') {
      // Combo decay
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 1;
        }
      }

      // Update Bird
      this.bird.update(effectiveDt, this.soundEngine, this.particleSystem);

      // Record Ghost Replay frame
      this.ghostReplay.recordFrame(this.bird);

      // Floor & Ceiling bounds check
      const groundY = this.renderer.virtualHeight - this.pipeManager.groundHeight;
      if (this.bird.y + this.bird.radius >= groundY) {
        this.bird.y = groundY - this.bird.radius;
        if (this.bird.hasShield) {
          this.bird.hasShield = false;
          this.bird.vy = -6;
          this.soundEngine.playShieldHit();
        } else {
          this.gameOver();
        }
      } else if (this.bird.y - this.bird.radius <= 0) {
        this.bird.y = this.bird.radius;
        this.bird.vy = 0;
      }

      // Update Pipes (if not in pure Boss rush mode during intro)
      if (this.state === 'PLAYING' || !this.boss.active) {
        this.pipeManager.update(effectiveDt, this.bird, this.soundEngine, this.particleSystem, this.themeManager.getThemeInfo());
        this.pipeManager.checkProjectileHits(this.bird, this.soundEngine, this.particleSystem);

        // Pipe Collision
        const collision = this.pipeManager.checkCollision(this.bird);
        if (collision) {
          if (this.bird.hasShield) {
            this.bird.hasShield = false;
            collision.hitPipe.isDestroyed = true;
            this.soundEngine.playShieldHit();
            this.soundEngine.playExplosion(0.8);
            this.renderer.triggerShake(8, 15);
            this.renderer.triggerFlash('#38bdf8', 0.4);
            this.particleSystem.emitExplosion(this.bird.x, this.bird.y, '#38bdf8', 25);
            this.particleSystem.addFloatingText('SHIELD SHATTERED!', this.bird.x, this.bird.y - 20, '#38bdf8', 12);
          } else {
            this.gameOver();
          }
        }
      }

      // Update Boss
      if (this.boss.active) {
        this.boss.update(effectiveDt, this.bird, this.soundEngine, this.particleSystem);
        if (this.boss.state === 'defeated' && this.boss.defeatedTimer <= 1) {
          this.score += 15;
          this.saveManager.data.stats.bossesDefeated++;
          this.saveManager.addGems(50);
          this.saveManager.save();
          this.achievementSystem.checkAll({ bossesDefeated: this.saveManager.data.stats.bossesDefeated });
          this.soundEngine.setMusicMode('arcade');
          if (this.mode === 'boss') {
            // Spawn next harder boss in Boss Rush
            setTimeout(() => {
              if (this.state === 'BOSS_BATTLE') this.boss.spawn();
            }, 2000);
          } else {
            this.state = 'PLAYING';
          }
        }
      }
    }
  }

  render() {
    const ctx = this.renderer.ctx;
    const w = this.renderer.virtualWidth;
    const h = this.renderer.virtualHeight;

    this.renderer.beginFrame();

    // 1. Theme Parallax Background
    this.themeManager.renderBackground(ctx, w, h);

    // 2. Pipes & Obstacles
    this.pipeManager.render(ctx, this.themeManager.getThemeInfo(), h);

    // 3. Ground Layer
    this.themeManager.renderGround(ctx, w, h, this.pipeManager.groundHeight);

    // 4. Ghost Replay
    if (this.state === 'PLAYING' || this.state === 'BOSS_BATTLE') {
      const ghostFrame = this.ghostReplay.updatePlayback();
      this.ghostReplay.renderGhost(ctx, ghostFrame);
    }

    // 5. Boss
    if (this.boss.active) {
      this.boss.render(ctx);
      this.boss.renderHealthBar(ctx, w);
    }

    // 6. Player Bird
    if (this.state !== 'GAME_OVER') {
      this.bird.render(ctx);
    }

    // 7. Particle System & Floating texts
    this.particleSystem.render(ctx);

    // 8. HUD & Overlays
    if (this.state === 'PLAYING' || this.state === 'BOSS_BATTLE') {
      this.uiManager.renderHUD(ctx, w, h);
    } else if (this.state === 'MENU') {
      this.renderMenu(ctx, w, h);
    } else if (this.state === 'GET_READY') {
      this.renderGetReady(ctx, w, h);
    } else if (this.state === 'GAME_OVER') {
      this.renderGameOver(ctx, w, h);
    }

    // 9. Achievement Toast Notifications
    this.achievementSystem.renderToasts(ctx, w);

    // 10. Modals
    this.uiManager.renderModals(ctx, w, h);

    this.renderer.endFrame();
  }

  // --------------------------------------------------------------------------
  // SCREENS: MENU, GET_READY, GAME_OVER
  // --------------------------------------------------------------------------
  renderMenu(ctx, width, height) {
    ctx.save();

    // Title Logo
    ctx.font = '800 28px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText('FLAPPY BIRD', width / 2 + 3, 133);
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#ca8a04';
    ctx.shadowBlur = 12;
    ctx.fillText('FLAPPY BIRD', width / 2, 130);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '700 11px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('⚡ TITAN SHOWCASE ⚡', width / 2, 160);

    // Floating Mascot
    ctx.save();
    const mascotY = 230 + Math.sin(Date.now() * 0.005) * 10;
    ctx.translate(width / 2, mascotY);
    ctx.scale(1.4, 1.4);
    this.bird.renderClassicSkin(ctx);
    ctx.restore();

    // Start Button
    const btnW = 240;
    const btnH = 50;
    const btnX = (width - btnW) / 2;
    const btnY = 320;

    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('▶ START GAME', width / 2, btnY + 32);

    // Game Mode Selector Pills
    this.renderModePills(ctx, width, 390);

    // Action Grid Buttons (Aviary, Themes, Achievements, Stats, Settings)
    this.renderMenuActionButtons(ctx, width, 480);

    ctx.restore();
  }

  renderModePills(ctx, width, y) {
    const modes = [
      { id: 'classic', label: 'CLASSIC' },
      { id: 'boss', label: 'BOSS RUSH' },
      { id: 'gravity', label: 'GRAVITY' },
      { id: 'hyper', label: 'HYPER' },
      { id: 'zen', label: 'ZEN' }
    ];

    const pillW = 68;
    const pillH = 26;
    const totalW = modes.length * (pillW + 6) - 6;
    let startX = (width - totalW) / 2;

    for (const m of modes) {
      const isSel = this.mode === m.id;
      ctx.fillStyle = isSel ? '#38bdf8' : 'rgba(15, 23, 42, 0.7)';
      ctx.strokeStyle = isSel ? '#ffffff' : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX, y, pillW, pillH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 7px "Press Start 2P", sans-serif';
      ctx.fillStyle = isSel ? '#0f172a' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, startX + pillW / 2, y + 17);

      startX += pillW + 6;
    }
  }

  renderMenuActionButtons(ctx, width, y) {
    const buttons = [
      { id: 'aviary', icon: '🦜', label: 'SKINS' },
      { id: 'themes', icon: '🌄', label: 'THEMES' },
      { id: 'achievements', icon: '🏆', label: 'TROPHIES' },
      { id: 'stats', icon: '📊', label: 'STATS' },
      { id: 'settings', icon: '⚙️', label: 'CONFIG' }
    ];

    const btnSize = 58;
    const totalW = buttons.length * (btnSize + 10) - 10;
    let startX = (width - totalW) / 2;

    for (const b of buttons) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(startX, y, btnSize, btnSize, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.icon, startX + btnSize / 2, y + 26);

      ctx.font = '700 7px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.label, startX + btnSize / 2, y + 46);

      startX += btnSize + 10;
    }
  }

  renderGetReady(ctx, width, height) {
    ctx.save();
    ctx.font = '800 24px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText('GET READY!', width / 2, 160);
    ctx.shadowBlur = 0;

    // Tap to flap instructions
    ctx.font = '700 12px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('TAP OR SPACE TO FLAP', width / 2, 380);

    // Finger / Tap animation
    const tapPulse = Math.sin(Date.now() * 0.008) * 6;
    ctx.font = '28px sans-serif';
    ctx.fillText('👆', width / 2, 425 + tapPulse);

    ctx.restore();
  }

  renderGameOver(ctx, width, height) {
    ctx.save();

    // Game Over Banner
    ctx.font = '800 26px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', width / 2, 110);
    ctx.shadowBlur = 0;

    // Score Board Card
    const cardW = 320;
    const cardH = 220;
    const cardX = (width - cardW) / 2;
    const cardY = 140;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // Medal Showcase
    if (this.medalEarned) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.beginPath();
      ctx.arc(cardX + 60, cardY + 70, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.medalEarned.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.medalEarned.icon, cardX + 60, cardY + 70);

      ctx.font = '700 8px "Press Start 2P", sans-serif';
      ctx.fillStyle = this.medalEarned.color;
      ctx.fillText(this.medalEarned.name, cardX + 60, cardY + 120);
    } else {
      ctx.font = '700 9px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('NO MEDAL', cardX + 60, cardY + 75);
    }

    // Score & Best
    ctx.textAlign = 'right';
    ctx.font = '700 10px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SCORE', cardX + cardW - 25, cardY + 45);

    ctx.font = '800 24px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.score}`, cardX + cardW - 25, cardY + 75);

    ctx.font = '700 10px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('BEST', cardX + cardW - 25, cardY + 115);

    ctx.font = '800 22px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${this.saveManager.getHighScore(this.mode)}`, cardX + cardW - 25, cardY + 145);

    // New High Score Ribbon
    if (this.isNewHighScore) {
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(cardX + 16, cardY + 165, cardW - 32, 28);
      ctx.font = '800 10px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('★ NEW RECORD! ★', cardX + cardW / 2, cardY + 184);
    }

    // Quick Action Buttons (Retry, Share Card, Menu)
    const btnW = 140;
    const btnH = 44;

    // Retry
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.roundRect(width / 2 - btnW - 10, 385, btnW, btnH, 10);
    ctx.fill();
    ctx.font = '700 11px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 RETRY', width / 2 - btnW / 2 - 10, 412);

    // Menu
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(width / 2 + 10, 385, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏠 MENU', width / 2 + btnW / 2 + 10, 412);

    // Share Score Card Button
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.roundRect((width - 240) / 2, 445, 240, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10px "Press Start 2P", sans-serif';
    ctx.fillText('📸 DOWNLOAD CARD', width / 2, 470);

    ctx.restore();
  }

  handleCanvasClick(x, y) {
    if (this.uiManager.handleClick(x, y)) return;

    if (this.state === 'MENU') {
      // Check Start Button
      const btnW = 240;
      const btnH = 50;
      const btnX = (this.renderer.virtualWidth - btnW) / 2;
      const btnY = 320;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.handleAction();
        return;
      }

      // Check Mode selector pills (y: 390)
      const modes = ['classic', 'boss', 'gravity', 'hyper', 'zen'];
      const pillW = 68;
      const pillH = 26;
      const totalW = modes.length * (pillW + 6) - 6;
      let startX = (this.renderer.virtualWidth - totalW) / 2;

      for (const m of modes) {
        if (x >= startX && x <= startX + pillW && y >= 390 && y <= 390 + pillH) {
          this.setMode(m);
          return;
        }
        startX += pillW + 6;
      }

      // Check Menu Action Buttons (y: 480)
      const buttons = ['aviary', 'themes', 'achievements', 'stats', 'settings'];
      const btnSize = 58;
      const totalActionW = buttons.length * (btnSize + 10) - 10;
      let actionStartX = (this.renderer.virtualWidth - totalActionW) / 2;

      for (const b of buttons) {
        if (x >= actionStartX && x <= actionStartX + btnSize && y >= 480 && y <= 480 + btnSize) {
          this.uiManager.openModal(b);
          return;
        }
        actionStartX += btnSize + 10;
      }
    } else if (this.state === 'GAME_OVER') {
      const w = this.renderer.virtualWidth;
      const btnW = 140;
      const btnH = 44;

      // Retry (width / 2 - btnW - 10, 385)
      if (x >= w / 2 - btnW - 10 && x <= w / 2 - 10 && y >= 385 && y <= 385 + btnH) {
        this.startGame();
        return;
      }

      // Menu (width / 2 + 10, 385)
      if (x >= w / 2 + 10 && x <= w / 2 + btnW + 10 && y >= 385 && y <= 385 + btnH) {
        this.state = 'MENU';
        this.soundEngine.playButton();
        return;
      }

      // Download Score Card ((width - 240) / 2, 445)
      if (x >= (w - 240) / 2 && x <= (w + 240) / 2 && y >= 445 && y <= 485) {
        this.downloadScoreCard();
        return;
      }
    }

    this.handleAction();
  }

  downloadScoreCard() {
    try {
      const link = document.createElement('a');
      link.download = `flappy_score_${this.score}.png`;
      link.href = this.canvas.toDataURL('image/png');
      link.click();
      if (this.soundEngine) this.soundEngine.playLevelUp();
    } catch (e) {
      console.warn('Failed to export canvas', e);
    }
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 16.666, 3.0); // Normalizes to ~1.0 at 60fps
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }
}
