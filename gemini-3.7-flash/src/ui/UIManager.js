// ============================================================================
// UIManager.js - HUD, Modals, Aviary Locker, Themes, Stats, Achievements & Share
// ============================================================================

export class UIManager {
  constructor(game) {
    this.game = game;
    this.activeModal = null; // null, 'aviary', 'themes', 'achievements', 'stats', 'settings'
    this.previewBirdAnim = 0;

    this.skinData = [
      { id: 'classic', name: 'Sunny Flappy', desc: 'The timeless yellow legend', cost: 0, icon: '🐥' },
      { id: 'cyber', name: 'Mecha Falcon', desc: 'Plasma jet thrusters & laser shield', cost: 60, icon: '🤖' },
      { id: 'fire', name: 'Phoenix Ignis', desc: 'Ember trail & blazing crest', cost: 120, icon: '🔥' },
      { id: 'steam', name: 'Aeronaut Steampunk', desc: 'Brass propeller & goggles', cost: 180, icon: '⚙️' },
      { id: 'cosmic', name: 'Cosmic Phantom', desc: 'Orbital nebula void sphere', cost: 250, icon: '🌌' }
    ];

    this.themeData = [
      { id: 'sunset', name: 'Sunset Meadow', desc: 'Rolling hills & cherry blossoms', icon: '🌅' },
      { id: 'cyber', name: 'Cyber Neon 2084', desc: 'Synthwave skyline & grid', icon: '🌆' },
      { id: 'storm', name: 'Storm Spire', desc: 'Lightning strikes & gothic castle', icon: '⛈️' },
      { id: 'cosmic', name: 'Cosmic Nebula', desc: 'Deep space & starlight dust', icon: '✨' }
    ];
  }

  openModal(modalId) {
    this.activeModal = modalId;
    if (this.game.soundEngine) this.game.soundEngine.playButton();
  }

  closeModal() {
    this.activeModal = null;
    if (this.game.soundEngine) this.game.soundEngine.playButton();
  }

  handleClick(mouseX, mouseY) {
    // If modal is open, modal handler takes precedence
    if (this.activeModal) {
      this.handleModalClick(mouseX, mouseY);
      return true;
    }
    return false;
  }

  handleModalClick(x, y) {
    const w = this.game.renderer.virtualWidth;
    const h = this.game.renderer.virtualHeight;

    // Close button (Top right of modal card)
    const cardW = 360;
    const cardH = 480;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    const closeBtnX = cardX + cardW - 36;
    const closeBtnY = cardY + 12;
    if (x >= closeBtnX && x <= closeBtnX + 28 && y >= closeBtnY && y <= closeBtnY + 28) {
      this.closeModal();
      return;
    }

    if (this.activeModal === 'aviary') {
      this.handleAviaryClick(cardX, cardY, x, y);
    } else if (this.activeModal === 'themes') {
      this.handleThemesClick(cardX, cardY, x, y);
    } else if (this.activeModal === 'settings') {
      this.handleSettingsClick(cardX, cardY, x, y);
    }
  }

  handleAviaryClick(cardX, cardY, x, y) {
    const save = this.game.saveManager;
    let startY = cardY + 65;

    for (let i = 0; i < this.skinData.length; i++) {
      const skin = this.skinData[i];
      const itemY = startY + i * 74;
      const btnX = cardX + 250;
      const btnY = itemY + 12;
      const btnW = 90;
      const btnH = 34;

      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        if (save.isSkinUnlocked(skin.id)) {
          // Select skin
          save.data.selectedSkin = skin.id;
          this.game.bird.skin = skin.id;
          save.save();
          if (this.game.soundEngine) this.game.soundEngine.playButton();
        } else {
          // Buy skin
          if (save.spendGems(skin.cost)) {
            save.unlockSkin(skin.id);
            save.data.selectedSkin = skin.id;
            this.game.bird.skin = skin.id;
            save.save();
            if (this.game.soundEngine) this.game.soundEngine.playLevelUp();
            this.game.particleSystem.emitFireworks(cardX + 180, itemY + 20);
          } else {
            if (this.game.soundEngine) this.game.soundEngine.playHit();
            this.game.particleSystem.addFloatingText('NOT ENOUGH GEMS!', cardX + 180, itemY + 20, '#ef4444', 12);
          }
        }
        return;
      }
    }
  }

  handleThemesClick(cardX, cardY, x, y) {
    const save = this.game.saveManager;
    let startY = cardY + 70;

    for (let i = 0; i < this.themeData.length; i++) {
      const th = this.themeData[i];
      const itemY = startY + i * 90;
      const btnX = cardX + 250;
      const btnY = itemY + 20;
      const btnW = 90;
      const btnH = 34;

      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        save.data.selectedTheme = th.id;
        this.game.themeManager.setTheme(th.id);
        save.save();
        if (this.game.soundEngine) this.game.soundEngine.playButton();
        return;
      }
    }
  }

  handleSettingsClick(cardX, cardY, x, y) {
    const save = this.game.saveManager;
    const settings = save.data.settings;

    // Toggle Music
    if (x >= cardX + 240 && x <= cardX + 320 && y >= cardY + 80 && y <= cardY + 115) {
      settings.musicEnabled = !settings.musicEnabled;
      this.game.soundEngine.setMusicEnabled(settings.musicEnabled);
      save.save();
      if (this.game.soundEngine) this.game.soundEngine.playButton();
    }

    // Toggle CRT Scanlines
    if (x >= cardX + 240 && x <= cardX + 320 && y >= cardY + 140 && y <= cardY + 175) {
      settings.crtEnabled = !settings.crtEnabled;
      this.game.renderer.crtEnabled = settings.crtEnabled;
      save.save();
      if (this.game.soundEngine) this.game.soundEngine.playButton();
    }

    // Toggle Ghost
    if (x >= cardX + 240 && x <= cardX + 320 && y >= cardY + 200 && y <= cardY + 235) {
      settings.ghostEnabled = !settings.ghostEnabled;
      this.game.ghostReplay.enabled = settings.ghostEnabled;
      save.save();
      if (this.game.soundEngine) this.game.soundEngine.playButton();
    }

    // Cycle Particle Density
    if (x >= cardX + 240 && x <= cardX + 320 && y >= cardY + 260 && y <= cardY + 295) {
      settings.particleDensity = settings.particleDensity >= 1.5 ? 0.5 : (settings.particleDensity + 0.5);
      this.game.particleSystem.setDensity(settings.particleDensity);
      save.save();
      if (this.game.soundEngine) this.game.soundEngine.playButton();
    }
  }

  renderHUD(ctx, width, height) {
    ctx.save();

    // 1. Current Score (Big Glowing Center)
    ctx.font = '800 38px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${this.game.score}`, width / 2 + 2, 72);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(`${this.game.score}`, width / 2, 70);
    ctx.shadowBlur = 0;

    // 2. Combo Multiplier
    if (this.game.combo > 1) {
      ctx.font = '700 13px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${this.game.combo}`, width / 2, 100);
      ctx.shadowBlur = 0;
    }

    // 3. Mode Badge (Top Left)
    ctx.font = '700 9px "Press Start 2P", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(16, 16, 130, 26);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 130, 26);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(this.game.mode.toUpperCase(), 24, 33);

    // 4. Gems Balance (Top Right)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(width - 120, 16, 104, 26);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(width - 120, 16, 104, 26);

    ctx.fillStyle = '#fde047';
    ctx.fillText(`💎 ${this.game.saveManager.data.gems}`, width - 24, 33);

    // 5. Active Power-ups Bar (Bottom left of HUD)
    this.renderPowerupBadges(ctx, width, height);

    ctx.restore();
  }

  renderPowerupBadges(ctx, width, height) {
    const bird = this.game.bird;
    if (!bird) return;

    let badgeX = 20;
    const badgeY = height - 140;

    if (bird.hasShield) {
      this.drawPowerupIcon(ctx, badgeX, badgeY, '🛡️', '#38bdf8', 1.0);
      badgeX += 45;
    }
    if (bird.hasBlaster) {
      const pct = Math.max(0, bird.blasterTimer / 360);
      this.drawPowerupIcon(ctx, badgeX, badgeY, '🔫', '#0284c7', pct);
      badgeX += 45;
    }
    if (bird.isGhost) {
      const pct = Math.max(0, bird.ghostTimer / 220);
      this.drawPowerupIcon(ctx, badgeX, badgeY, '👻', '#c084fc', pct);
      badgeX += 45;
    }
    if (bird.hasMagnet) {
      const pct = Math.max(0, bird.magnetTimer / 360);
      this.drawPowerupIcon(ctx, badgeX, badgeY, '🧲', '#f59e0b', pct);
      badgeX += 45;
    }
  }

  drawPowerupIcon(ctx, x, y, emoji, color, pct) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Progress Ring
    if (pct < 1.0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  }

  renderModals(ctx, width, height) {
    if (!this.activeModal) return;

    ctx.save();
    // Backdrop blur overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(0, 0, width, height);

    const cardW = 360;
    const cardH = 480;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    // Modal Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Close Button (X)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cardX + cardW - 22, cardY + 22, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', cardX + cardW - 22, cardY + 22);

    if (this.activeModal === 'aviary') {
      this.renderAviaryModal(ctx, cardX, cardY, cardW, cardH);
    } else if (this.activeModal === 'themes') {
      this.renderThemesModal(ctx, cardX, cardY, cardW, cardH);
    } else if (this.activeModal === 'achievements') {
      this.renderAchievementsModal(ctx, cardX, cardY, cardW, cardH);
    } else if (this.activeModal === 'stats') {
      this.renderStatsModal(ctx, cardX, cardY, cardW, cardH);
    } else if (this.activeModal === 'settings') {
      this.renderSettingsModal(ctx, cardX, cardY, cardW, cardH);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // MODAL 1: AVIARY (SKINS)
  // --------------------------------------------------------------------------
  renderAviaryModal(ctx, cx, cy, cw, ch) {
    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'left';
    ctx.fillText('🦜 AVIARY LOCKER', cx + 24, cy + 36);

    const save = this.game.saveManager;
    let itemY = cy + 65;

    for (const skin of this.skinData) {
      const isSelected = save.data.selectedSkin === skin.id;
      const isUnlocked = save.isSkinUnlocked(skin.id);

      // Item Box
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx + 16, itemY, cw - 32, 64, 10);
      ctx.fill();
      ctx.stroke();

      // Skin Icon
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skin.icon, cx + 42, itemY + 32);

      // Name & Description
      ctx.textAlign = 'left';
      ctx.font = '700 11px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(skin.name, cx + 70, itemY + 24);

      ctx.font = '500 10px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(skin.desc, cx + 70, itemY + 44);

      // Action Button
      const btnX = cx + 250;
      const btnY = itemY + 14;
      const btnW = 86;
      const btnH = 34;

      if (isSelected) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.font = '700 9px "Press Start 2P", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('EQUIPPED', btnX + btnW / 2, btnY + 21);
      } else if (isUnlocked) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.font = '700 9px "Press Start 2P", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT', btnX + btnW / 2, btnY + 21);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.font = '700 9px "Press Start 2P", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(`💎 ${skin.cost}`, btnX + btnW / 2, btnY + 21);
      }

      itemY += 74;
    }
  }

  // --------------------------------------------------------------------------
  // MODAL 2: THEMES
  // --------------------------------------------------------------------------
  renderThemesModal(ctx, cx, cy, cw, ch) {
    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('🌄 REALM THEMES', cx + 24, cy + 36);

    const save = this.game.saveManager;
    let itemY = cy + 65;

    for (const th of this.themeData) {
      const isSelected = save.data.selectedTheme === th.id;

      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx + 16, itemY, cw - 32, 80, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(th.icon, cx + 46, itemY + 40);

      ctx.textAlign = 'left';
      ctx.font = '700 11px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(th.name, cx + 78, itemY + 30);

      ctx.font = '500 11px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(th.desc, cx + 78, itemY + 54);

      const btnX = cx + 250;
      const btnY = itemY + 22;
      const btnW = 86;
      const btnH = 34;

      if (isSelected) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.font = '700 9px "Press Start 2P", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('ACTIVE', btnX + btnW / 2, btnY + 21);
      } else {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.font = '700 9px "Press Start 2P", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('APPLY', btnX + btnW / 2, btnY + 21);
      }

      itemY += 92;
    }
  }

  // --------------------------------------------------------------------------
  // MODAL 3: ACHIEVEMENTS
  // --------------------------------------------------------------------------
  renderAchievementsModal(ctx, cx, cy, cw, ch) {
    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 ACHIEVEMENTS', cx + 24, cy + 36);

    const achs = this.game.achievementSystem.achievements;
    const unlocked = this.game.saveManager.data.achievementsUnlocked;
    let itemY = cy + 60;

    for (let i = 0; i < Math.min(6, achs.length); i++) {
      const a = achs[i];
      const isDone = unlocked.includes(a.id);

      ctx.fillStyle = isDone ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.4)';
      ctx.strokeStyle = isDone ? '#f59e0b' : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx + 16, itemY, cw - 32, 58, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.icon, cx + 42, itemY + 29);

      ctx.textAlign = 'left';
      ctx.font = '700 9px "Press Start 2P", sans-serif';
      ctx.fillStyle = isDone ? '#fbbf24' : '#64748b';
      ctx.fillText(a.title, cx + 70, itemY + 22);

      ctx.font = '500 10px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(a.desc, cx + 70, itemY + 40);

      // Status
      ctx.font = '700 9px "Press Start 2P", sans-serif';
      ctx.textAlign = 'right';
      if (isDone) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('DONE', cx + cw - 28, itemY + 32);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`+${a.rewardGems}💎`, cx + cw - 28, itemY + 32);
      }

      itemY += 66;
    }
  }

  // --------------------------------------------------------------------------
  // MODAL 4: STATS
  // --------------------------------------------------------------------------
  renderStatsModal(ctx, cx, cy, cw, ch) {
    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'left';
    ctx.fillText('📊 FLIGHT STATS', cx + 24, cy + 36);

    const stats = this.game.saveManager.data.stats;
    const rows = [
      ['Total Flaps', stats.totalFlaps],
      ['High Score (Classic)', this.game.saveManager.getHighScore('classic')],
      ['High Score (Boss)', this.game.saveManager.getHighScore('boss')],
      ['High Score (Gravity)', this.game.saveManager.getHighScore('gravity')],
      ['Total Gems Collected', stats.totalGems],
      ['Near-Miss Grazes', stats.totalGrazes],
      ['Bosses Defeated', stats.bossesDefeated],
      ['Games Played', stats.gamesPlayed]
    ];

    let itemY = cy + 70;
    for (const [label, val] of rows) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.fillRect(cx + 16, itemY, cw - 32, 38);

      ctx.font = '600 12px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(label, cx + 28, itemY + 24);

      ctx.font = '700 11px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}`, cx + cw - 28, itemY + 24);

      itemY += 46;
    }
  }

  // --------------------------------------------------------------------------
  // MODAL 5: SETTINGS
  // --------------------------------------------------------------------------
  renderSettingsModal(ctx, cx, cy, cw, ch) {
    ctx.font = '700 14px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('⚙️ GAME SETTINGS', cx + 24, cy + 36);

    const s = this.game.saveManager.data.settings;

    const toggles = [
      { label: 'Dynamic BGM Synth', val: s.musicEnabled ? 'ON' : 'OFF', color: s.musicEnabled ? '#10b981' : '#64748b' },
      { label: 'CRT Scanline Filter', val: s.crtEnabled ? 'ON' : 'OFF', color: s.crtEnabled ? '#10b981' : '#64748b' },
      { label: 'Ghost Replay (PB)', val: s.ghostEnabled ? 'ON' : 'OFF', color: s.ghostEnabled ? '#10b981' : '#64748b' },
      { label: 'VFX Particle Density', val: `${s.particleDensity}x`, color: '#38bdf8' }
    ];

    let itemY = cy + 70;
    for (const t of toggles) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.fillRect(cx + 16, itemY, cw - 32, 46);

      ctx.font = '600 12px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(t.label, cx + 28, itemY + 28);

      // Button
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.roundRect(cx + 240, itemY + 8, 80, 30, 6);
      ctx.fill();

      ctx.font = '700 9px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(t.val, cx + 280, itemY + 26);

      itemY += 60;
    }
  }
}
