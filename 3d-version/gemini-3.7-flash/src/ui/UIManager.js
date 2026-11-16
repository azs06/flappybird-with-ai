import { SKINS, HATS, TRAILS, THEMES, CAMERA_MODES } from '../game/constants.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // Elements
    this.scoreDisplay = document.getElementById('score-display');
    this.comboBadge = document.getElementById('combo-badge');
    this.coinCounter = document.getElementById('coin-counter');
    this.powerupsContainer = document.getElementById('active-powerups');
    this.nearMissBanner = document.getElementById('near-miss-banner');

    this.menuOverlay = document.getElementById('menu-overlay');
    this.readyOverlay = document.getElementById('ready-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.wardrobeOverlay = document.getElementById('wardrobe-overlay');
    this.settingsOverlay = document.getElementById('settings-overlay');

    this.btnCam3rd = document.getElementById('btn-cam-3rd');
    this.btnCamSide = document.getElementById('btn-cam-side');
    this.btnCam1st = document.getElementById('btn-cam-1st');

    this.shopItemsContainer = document.getElementById('shop-items-container');
    this.currentShopTab = 'skins';

    this.initEventListeners();
  }

  initEventListeners() {
    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.game.setReady();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.game.setReady();
    });

    document.getElementById('btn-wardrobe').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.openWardrobe();
    });

    document.getElementById('btn-wardrobe-hud').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.openWardrobe();
    });

    document.getElementById('btn-gameover-wardrobe').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.openWardrobe();
    });

    document.getElementById('btn-close-wardrobe').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.closeWardrobe();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.openSettings();
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      this.game.soundSynth.playClick();
      this.closeSettings();
    });

    document.getElementById('btn-mute').addEventListener('click', () => {
      this.game.toggleMute();
    });

    document.getElementById('btn-theme').addEventListener('click', () => {
      this.game.cycleTheme();
    });

    // Camera selectors
    [this.btnCam3rd, this.btnCamSide, this.btnCam1st].forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        this.game.cameraSystem.setMode(CAMERA_MODES[mode]);
        this.updateCameraButtons(CAMERA_MODES[mode]);
        this.game.soundSynth.playClick();
      });
    });

    // Wardrobe Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentShopTab = e.currentTarget.getAttribute('data-tab');
        this.renderShop();
        this.game.soundSynth.playClick();
      });
    });

    // Audio Sliders
    document.getElementById('slider-sfx').addEventListener('input', (e) => {
      this.game.soundSynth.setSfxVolume(parseFloat(e.target.value));
    });

    document.getElementById('slider-music').addEventListener('input', (e) => {
      this.game.soundSynth.setMusicVolume(parseFloat(e.target.value));
    });

    document.getElementById('select-theme').addEventListener('change', (e) => {
      this.game.setTheme(e.target.value);
    });
  }

  updateScore(score) {
    this.scoreDisplay.textContent = score;
    this.scoreDisplay.classList.add('score-bump');
    setTimeout(() => {
      this.scoreDisplay.classList.remove('score-bump');
    }, 120);
  }

  updateCombo(combo) {
    if (combo > 1) {
      this.comboBadge.textContent = `COMBO x${combo}`;
      this.comboBadge.classList.add('active');
    } else {
      this.comboBadge.classList.remove('active');
    }
  }

  updateCoins(coins) {
    this.coinCounter.textContent = coins;
  }

  updateCameraButtons(mode) {
    this.btnCam3rd.classList.toggle('active', mode === CAMERA_MODES.THIRD_PERSON);
    this.btnCamSide.classList.toggle('active', mode === CAMERA_MODES.SIDE_VIEW);
    this.btnCam1st.classList.toggle('active', mode === CAMERA_MODES.FIRST_PERSON);
  }

  showNearMiss() {
    this.nearMissBanner.classList.add('show');
    setTimeout(() => {
      this.nearMissBanner.classList.remove('show');
    }, 800);
  }

  updatePowerups(activePowerups) {
    this.powerupsContainer.innerHTML = '';
    for (let key in activePowerups) {
      const pup = activePowerups[key];
      if (pup && pup.timer > 0) {
        const div = document.createElement('div');
        div.className = 'powerup-pill';
        div.innerHTML = `
          <span>${pup.icon}</span>
          <span>${pup.name}</span>
          <div class="powerup-progress" style="width: ${(pup.timer / pup.duration) * 100}%; background: #${pup.color.toString(16).padStart(6, '0')}"></div>
        `;
        this.powerupsContainer.appendChild(div);
      }
    }
  }

  showMenu() {
    this.hideAllScreens();
    this.menuOverlay.classList.add('active');
  }

  showReady() {
    this.hideAllScreens();
    this.readyOverlay.classList.add('active');
  }

  showPlaying() {
    this.hideAllScreens();
  }

  showGameOver(summary) {
    this.hideAllScreens();
    document.getElementById('stat-score').textContent = summary.score;
    document.getElementById('stat-high').textContent = summary.highScore;
    document.getElementById('stat-combo').textContent = `x${summary.maxCombo}`;
    document.getElementById('stat-coins').textContent = `+${summary.coinsEarned}`;

    if (summary.isNewRecord) {
      document.getElementById('gameover-title').textContent = 'NEW HIGH SCORE!';
      document.getElementById('gameover-subtitle').textContent = 'LEGENDARY FLIGHT!';
    } else {
      document.getElementById('gameover-title').textContent = 'GAME OVER';
      document.getElementById('gameover-subtitle').textContent = 'FLIGHT COMPLETE';
    }

    this.gameoverOverlay.classList.add('active');
  }

  openWardrobe() {
    this.renderShop();
    this.wardrobeOverlay.classList.add('active');
  }

  closeWardrobe() {
    this.wardrobeOverlay.classList.remove('active');
  }

  openSettings() {
    this.settingsOverlay.classList.add('active');
  }

  closeSettings() {
    this.settingsOverlay.classList.remove('active');
  }

  hideAllScreens() {
    this.menuOverlay.classList.remove('active');
    this.readyOverlay.classList.remove('active');
    this.gameoverOverlay.classList.remove('active');
    this.wardrobeOverlay.classList.remove('active');
    this.settingsOverlay.classList.remove('active');
  }

  renderShop() {
    this.shopItemsContainer.innerHTML = '';
    const scoreMgr = this.game.scoreManager;

    if (this.currentShopTab === 'skins') {
      SKINS.forEach(skin => {
        const isOwned = scoreMgr.unlockedSkins.includes(skin.id);
        const isEquipped = this.game.bird.currentSkin.id === skin.id;

        const card = document.createElement('div');
        card.className = `shop-card ${isEquipped ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="shop-card-icon" style="background: #${skin.bodyColor.toString(16).padStart(6, '0')};">🐦</div>
          <div class="shop-card-name">${skin.name}</div>
          <div class="shop-card-status ${isEquipped ? 'status-equipped' : (isOwned ? 'status-owned' : 'status-buy')}">
            ${isEquipped ? 'EQUIPPED' : (isOwned ? 'EQUIP' : `🟡 ${skin.price}`)}
          </div>
        `;

        card.addEventListener('click', () => {
          if (isOwned) {
            this.game.bird.setSkin(skin.id);
            this.renderShop();
            this.game.soundSynth.playClick();
          } else {
            if (scoreMgr.unlockSkin(skin.id, skin.price)) {
              this.game.bird.setSkin(skin.id);
              this.renderShop();
              this.game.soundSynth.playCoin();
            }
          }
        });

        this.shopItemsContainer.appendChild(card);
      });

    } else if (this.currentShopTab === 'hats') {
      HATS.forEach(hat => {
        const isOwned = scoreMgr.unlockedHats.includes(hat.id);
        const isEquipped = this.game.bird.currentHat === hat.id;

        const icons = { none: '🚫', tophat: '🎩', goggles: '🥽', crown: '👑', viking: '🪖' };

        const card = document.createElement('div');
        card.className = `shop-card ${isEquipped ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="shop-card-icon">${icons[hat.id] || '🎩'}</div>
          <div class="shop-card-name">${hat.name}</div>
          <div class="shop-card-status ${isEquipped ? 'status-equipped' : (isOwned ? 'status-owned' : 'status-buy')}">
            ${isEquipped ? 'EQUIPPED' : (isOwned ? 'EQUIP' : `🟡 ${hat.price}`)}
          </div>
        `;

        card.addEventListener('click', () => {
          if (isOwned) {
            this.game.bird.setHat(hat.id);
            this.renderShop();
            this.game.soundSynth.playClick();
          } else {
            if (scoreMgr.unlockHat(hat.id, hat.price)) {
              this.game.bird.setHat(hat.id);
              this.renderShop();
              this.game.soundSynth.playCoin();
            }
          }
        });

        this.shopItemsContainer.appendChild(card);
      });

    } else if (this.currentShopTab === 'trails') {
      TRAILS.forEach(trail => {
        const isOwned = scoreMgr.unlockedTrails.includes(trail.id);
        const isEquipped = this.game.currentTrailId === trail.id;

        const icons = { sparkles: '✨', rainbow: '🌈', plasma: '⚡', fire: '🔥', stars: '⭐' };

        const card = document.createElement('div');
        card.className = `shop-card ${isEquipped ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="shop-card-icon">${icons[trail.id] || '✨'}</div>
          <div class="shop-card-name">${trail.name}</div>
          <div class="shop-card-status ${isEquipped ? 'status-equipped' : (isOwned ? 'status-owned' : 'status-buy')}">
            ${isEquipped ? 'EQUIPPED' : (isOwned ? 'EQUIP' : `🟡 ${trail.price}`)}
          </div>
        `;

        card.addEventListener('click', () => {
          if (isOwned) {
            this.game.setTrail(trail.id);
            this.renderShop();
            this.game.soundSynth.playClick();
          } else {
            if (scoreMgr.unlockTrail(trail.id, trail.price)) {
              this.game.setTrail(trail.id);
              this.renderShop();
              this.game.soundSynth.playCoin();
            }
          }
        });

        this.shopItemsContainer.appendChild(card);
      });
    }
  }
}
