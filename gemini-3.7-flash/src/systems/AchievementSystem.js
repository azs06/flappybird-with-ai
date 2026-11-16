// ============================================================================
// AchievementSystem.js - Trophies, In-game Notifications & Unlock Progression
// ============================================================================

export class AchievementSystem {
  constructor(saveManager, soundEngine = null, particleSystem = null) {
    this.saveManager = saveManager;
    this.soundEngine = soundEngine;
    this.particleSystem = particleSystem;

    this.achievements = [
      {
        id: 'first_flight',
        title: 'First Steps',
        desc: 'Take your first wing flap',
        icon: '🪶',
        rewardGems: 15,
        check: (stats) => stats.totalFlaps >= 1
      },
      {
        id: 'bronze_pilot',
        title: 'Bronze Aviator',
        desc: 'Score 10 points in any mode',
        icon: '🥉',
        rewardGems: 25,
        check: (stats, highScores) => Math.max(...Object.values(highScores)) >= 10
      },
      {
        id: 'silver_pilot',
        title: 'Silver Ace',
        desc: 'Score 25 points in any mode',
        icon: '🥈',
        rewardGems: 50,
        check: (stats, highScores) => Math.max(...Object.values(highScores)) >= 25
      },
      {
        id: 'gold_pilot',
        title: 'Golden Legend',
        desc: 'Score 50 points in any mode',
        icon: '🥇',
        rewardGems: 100,
        check: (stats, highScores) => Math.max(...Object.values(highScores)) >= 50
      },
      {
        id: 'diamond_god',
        title: 'Sky Sovereign',
        desc: 'Score 100 points in any mode',
        icon: '💎',
        rewardGems: 250,
        check: (stats, highScores) => Math.max(...Object.values(highScores)) >= 100
      },
      {
        id: 'daredevil',
        title: 'Close Call',
        desc: 'Perform 5 near-miss grazes in a run',
        icon: '⚡',
        rewardGems: 35,
        check: (stats) => stats.runGrazes >= 5
      },
      {
        id: 'graze_master',
        title: 'Adrenaline Addict',
        desc: 'Perform 25 total near-miss grazes',
        icon: '🔥',
        rewardGems: 75,
        check: (stats) => stats.totalGrazes >= 25
      },
      {
        id: 'boss_slayer',
        title: 'Titan Destroyer',
        desc: 'Defeat the AERO-TITAN X Boss',
        icon: '🐉',
        rewardGems: 150,
        check: (stats) => stats.bossesDefeated >= 1
      },
      {
        id: 'rich_bird',
        title: 'Treasure Hunter',
        desc: 'Accumulate 100 total gems',
        icon: '💰',
        rewardGems: 60,
        check: (stats) => stats.totalGems >= 100
      },
      {
        id: 'gravity_bender',
        title: 'Upside Down',
        desc: 'Score 15 points in Gravity Flip mode',
        icon: '🔄',
        rewardGems: 70,
        check: (stats, highScores) => (highScores.gravity || 0) >= 15
      },
      {
        id: 'speed_demon',
        title: 'Warp Velocity',
        desc: 'Score 20 points in Hyper Speed mode',
        icon: '🚀',
        rewardGems: 90,
        check: (stats, highScores) => (highScores.hyper || 0) >= 20
      },
      {
        id: 'fashion_icon',
        title: 'Aviary Collector',
        desc: 'Unlock 3 different bird skins',
        icon: '👑',
        rewardGems: 100,
        check: (stats, highScores, unlockedSkins) => (unlockedSkins || []).length >= 3
      }
    ];

    this.activeToasts = [];
  }

  checkAll(runtimeStats = {}) {
    const data = this.saveManager.data;
    const combinedStats = { ...data.stats, ...runtimeStats };

    for (const ach of this.achievements) {
      if (!data.achievementsUnlocked.includes(ach.id)) {
        if (ach.check(combinedStats, data.highScores, data.unlockedSkins)) {
          this.unlock(ach);
        }
      }
    }
  }

  unlock(ach) {
    this.saveManager.data.achievementsUnlocked.push(ach.id);
    this.saveManager.addGems(ach.rewardGems);
    this.saveManager.save();

    // Trigger Toast Notification
    this.showToast(ach);

    if (this.soundEngine) {
      this.soundEngine.playLevelUp();
    }
  }

  showToast(ach) {
    const toast = {
      title: ach.title,
      desc: ach.desc,
      icon: ach.icon,
      reward: ach.rewardGems,
      life: 180, // ~3 seconds
      anim: 0
    };
    this.activeToasts.push(toast);
  }

  update(dt = 1) {
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const t = this.activeToasts[i];
      t.life -= dt;
      if (t.life < 20) {
        t.anim = t.life / 20;
      } else {
        t.anim = Math.min(1, t.anim + 0.1 * dt);
      }
      if (t.life <= 0) {
        this.activeToasts.splice(i, 1);
      }
    }
  }

  renderToasts(ctx, width) {
    if (this.activeToasts.length === 0) return;

    ctx.save();
    let y = 30;

    for (const t of this.activeToasts) {
      const boxW = 280;
      const boxH = 48;
      const x = (width - boxW) / 2;

      ctx.save();
      ctx.globalAlpha = t.anim;
      ctx.translate(x, y - (1 - t.anim) * 20);

      // Toast background card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.icon, 24, boxH / 2);

      // Title & Reward
      ctx.font = '700 10px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(t.title, 48, 18);

      // Description
      ctx.font = '600 11px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${t.desc} (+${t.reward} 💎)`, 48, 34);

      ctx.restore();
      y += boxH + 10;
    }

    ctx.restore();
  }
}
