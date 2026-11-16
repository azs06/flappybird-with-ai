// ============================================================================
// Boss.js - Epic Multi-Phase Boss Encounters (AERO-TITAN X)
// ============================================================================

export class Boss {
  constructor() {
    this.active = false;
    this.name = 'AERO-TITAN X';
    this.maxHp = 25;
    this.hp = 25;

    this.x = 500;
    this.targetX = 320;
    this.y = 250;
    this.targetY = 250;
    this.width = 90;
    this.height = 70;

    // State machine
    this.state = 'intro'; // 'intro', 'hover', 'charging_laser', 'firing_laser', 'firing_missiles', 'defeated'
    this.stateTimer = 0;
    this.hoverTime = 0;

    // Attack cooldowns
    this.attackCycle = 0;
    this.laserChargeTime = 60; // 1 sec
    this.laserFireTime = 40;
    this.laserY = 0;
    this.laserThickness = 28;

    // Boss projectiles (Missiles / Energy Orbs)
    this.missiles = [];

    // Boss collectibles (e.g. ammo/rockets for player to collect and shoot back)
    this.bossCollectibles = [];

    // Visuals
    this.flashRed = 0;
    this.defeatedTimer = 0;
  }

  spawn() {
    this.active = true;
    this.hp = this.maxHp;
    this.x = 480;
    this.y = 250;
    this.targetX = 310;
    this.state = 'intro';
    this.stateTimer = 90;
    this.missiles = [];
    this.bossCollectibles = [];
    this.defeatedTimer = 0;
  }

  takeDamage(amount, soundEngine, particleSystem) {
    if (!this.active || this.state === 'defeated') return;

    this.hp -= amount;
    this.flashRed = 1.0;

    if (soundEngine) soundEngine.playHit();
    if (particleSystem) {
      particleSystem.emitSparkles(this.x, this.y, '#f43f5e', 10);
      particleSystem.addFloatingText(`-${amount}`, this.x - 20, this.y - 15, '#f43f5e', 14);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.triggerDefeat(soundEngine, particleSystem);
    }
  }

  triggerDefeat(soundEngine, particleSystem) {
    this.state = 'defeated';
    this.defeatedTimer = 120;
    if (soundEngine) {
      soundEngine.playExplosion(1.8);
      soundEngine.playLevelUp();
    }
    if (particleSystem) {
      particleSystem.emitFireworks(this.x, this.y);
      particleSystem.addFloatingText('BOSS DEFEATED! +500', 210, 200, '#fbbf24', 16);
    }
  }

  update(dt = 1, bird, soundEngine = null, particleSystem = null) {
    if (!this.active) return;

    // Flash decay
    if (this.flashRed > 0) this.flashRed -= 0.08 * dt;

    // Hover bobbing animation
    this.hoverTime += 0.04 * dt;
    const hoverOffset = Math.sin(this.hoverTime) * 20;

    if (this.state === 'intro') {
      this.x += (this.targetX - this.x) * 0.05 * dt;
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'hover';
        this.stateTimer = 100;
      }
    } else if (this.state === 'hover') {
      // Track player bird altitude gently
      if (bird) {
        this.targetY = bird.y;
      }
      this.y += (this.targetY + hoverOffset - this.y) * 0.04 * dt;
      this.stateTimer -= dt;

      // Spawn player ammo pickups so player can shoot boss even if no blaster
      if (Math.random() < 0.015 && this.bossCollectibles.length < 2) {
        this.bossCollectibles.push({
          x: 420,
          y: Math.random() * 380 + 80,
          type: 'blaster',
          radius: 12
        });
      }

      if (this.stateTimer <= 0) {
        // Choose next attack
        this.attackCycle++;
        if (this.attackCycle % 2 === 1) {
          // Start Laser Attack
          this.state = 'charging_laser';
          this.stateTimer = this.laserChargeTime;
          this.laserY = this.y;
          if (soundEngine) soundEngine.playBossWarning();
        } else {
          // Launch Missiles
          this.state = 'firing_missiles';
          this.stateTimer = 60;
          this.launchMissiles(soundEngine, particleSystem);
        }
      }
    } else if (this.state === 'charging_laser') {
      this.stateTimer -= dt;
      if (particleSystem && Math.random() < 0.5) {
        particleSystem.emit({
          x: this.x - 25,
          y: this.laserY,
          count: 2,
          size: 4,
          color: '#ef4444',
          blendMode: 'lighter'
        });
      }
      if (this.stateTimer <= 0) {
        this.state = 'firing_laser';
        this.stateTimer = this.laserFireTime;
        if (soundEngine) soundEngine.playBossLaser();
      }
    } else if (this.state === 'firing_laser') {
      this.stateTimer -= dt;

      if (particleSystem) {
        particleSystem.emit({
          x: Math.random() * this.x,
          y: this.laserY + (Math.random() - 0.5) * this.laserThickness,
          count: 1,
          size: 3,
          color: '#fca5a5',
          blendMode: 'lighter'
        });
      }

      // Check collision with bird during laser fire
      if (bird && !bird.isGhost) {
        const inLaserBeam = Math.abs(bird.y - this.laserY) < (this.laserThickness / 2 + bird.radius - 4) && bird.x < this.x;
        if (inLaserBeam) {
          if (bird.onBossHit) bird.onBossHit();
        }
      }

      if (this.stateTimer <= 0) {
        this.state = 'hover';
        this.stateTimer = 120;
      }
    } else if (this.state === 'firing_missiles') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'hover';
        this.stateTimer = 100;
      }
    } else if (this.state === 'defeated') {
      this.defeatedTimer -= dt;
      this.y += 1.5 * dt;
      this.x += 0.5 * dt;

      if (particleSystem && Math.random() < 0.6) {
        particleSystem.emitExplosion(
          this.x + (Math.random() - 0.5) * 60,
          this.y + (Math.random() - 0.5) * 40,
          '#f59e0b',
          8
        );
      }

      if (this.defeatedTimer <= 0) {
        this.active = false;
      }
    }

    // Update Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Gentle homing toward bird
      if (bird && m.x > bird.x) {
        const dy = bird.y - m.y;
        m.vy += Math.sign(dy) * 0.08 * dt;
      }

      // Smoke trail
      if (particleSystem && Math.random() < 0.4) {
        particleSystem.emitSteam(m.x + 8, m.y, 1);
      }

      // Collision with bird
      if (bird && !bird.isGhost) {
        const dist = Math.hypot(bird.x - m.x, bird.y - m.y);
        if (dist < bird.radius + m.radius) {
          this.missiles.splice(i, 1);
          if (soundEngine) soundEngine.playExplosion(0.8);
          if (particleSystem) particleSystem.emitExplosion(m.x, m.y, '#f97316', 15);
          if (bird.onBossHit) bird.onBossHit();
          continue;
        }
      }

      // Remove offscreen missiles
      if (m.x < -30) {
        this.missiles.splice(i, 1);
      }
    }

    // Update Boss Collectibles
    for (let i = this.bossCollectibles.length - 1; i >= 0; i--) {
      const c = this.bossCollectibles[i];
      c.x -= 2.0 * dt;
      if (bird) {
        const dist = Math.hypot(bird.x - c.x, bird.y - c.y);
        if (dist < bird.radius + c.radius) {
          bird.hasBlaster = true;
          bird.blasterTimer = 300;
          if (soundEngine) soundEngine.playPowerup('blaster');
          if (particleSystem) {
            particleSystem.emitShockwave(c.x, c.y, '#38bdf8', 40);
            particleSystem.addFloatingText('BLASTER LOADED!', c.x, c.y - 12, '#38bdf8', 12);
          }
          this.bossCollectibles.splice(i, 1);
          continue;
        }
      }
      if (c.x < -30) {
        this.bossCollectibles.splice(i, 1);
      }
    }

    // Check player projectiles hitting boss
    if (bird && bird.projectiles) {
      for (let i = bird.projectiles.length - 1; i >= 0; i--) {
        const p = bird.projectiles[i];
        if (p.x > this.x - this.width / 2 && p.x < this.x + this.width / 2 &&
            p.y > this.y - this.height / 2 && p.y < this.y + this.height / 2) {
          bird.projectiles.splice(i, 1);
          this.takeDamage(2, soundEngine, particleSystem);
        }
      }
    }
  }

  launchMissiles(soundEngine, particleSystem) {
    [-15, 15].forEach((yOffset) => {
      this.missiles.push({
        x: this.x - 20,
        y: this.y + yOffset,
        vx: -3.8,
        vy: (yOffset / 15) * 0.8,
        radius: 8
      });
    });
    if (soundEngine) soundEngine.playLaser();
    if (particleSystem) particleSystem.emitShockwave(this.x - 20, this.y, '#f97316', 25);
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();

    // Render Laser Warning Guide
    if (this.state === 'charging_laser') {
      const alpha = (Math.sin(Date.now() * 0.03) * 0.5 + 0.5) * 0.7;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, this.laserY);
      ctx.lineTo(this.x - 20, this.laserY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Render Firing Laser Beam
    if (this.state === 'firing_laser') {
      // Outer Glow
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(0, this.laserY - this.laserThickness / 2 - 4, this.x - 20, this.laserThickness + 8);

      // Core Laser
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.fillRect(0, this.laserY - this.laserThickness / 4, this.x - 20, this.laserThickness / 2);
      ctx.shadowBlur = 0;
    }

    // Render Missiles
    for (const m of this.missiles) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fill();

      // Thruster flame
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(14, 0);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Render Boss Collectibles
    for (const c of this.bossCollectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔫', 0, 0);
      ctx.restore();
    }

    // Render Boss Body (AERO-TITAN X Mech)
    ctx.translate(this.x, this.y);

    if (this.flashRed > 0) {
      ctx.fillStyle = '#fee2e2';
    } else {
      ctx.fillStyle = '#1e1b4b';
    }

    // Main Mech Chassis
    ctx.beginPath();
    ctx.moveTo(35, -25);
    ctx.lineTo(-30, -35);
    ctx.lineTo(-45, 0);
    ctx.lineTo(-30, 35);
    ctx.lineTo(35, 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Glowing Optical Eye / Core
    ctx.fillStyle = this.state === 'charging_laser' || this.state === 'firing_laser' ? '#ef4444' : '#06b6d4';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-22, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wing Fin Plating
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(10, -25);
    ctx.lineTo(25, -45);
    ctx.lineTo(-10, -30);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(10, 25);
    ctx.lineTo(25, 45);
    ctx.lineTo(-10, 30);
    ctx.closePath();
    ctx.fill();

    // Twin Thrusters on rear
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(35, -15, 8 + Math.random() * 4, 6);
    ctx.fillRect(35, 9, 8 + Math.random() * 4, 6);

    ctx.restore();
  }

  renderHealthBar(ctx, width) {
    if (!this.active || this.state === 'defeated') return;

    ctx.save();
    const barWidth = 240;
    const barHeight = 12;
    const barX = (width - barWidth) / 2;
    const barY = 22;

    // Boss Name
    ctx.font = '700 11px "Press Start 2P", sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠️ ${this.name} ⚠️`, width / 2, barY - 6);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Health Fill
    const pct = Math.max(0, this.hp / this.maxHp);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    fillGrad.addColorStop(0, '#f43f5e');
    fillGrad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX, barY, barWidth * pct, barHeight);

    ctx.restore();
  }
}
