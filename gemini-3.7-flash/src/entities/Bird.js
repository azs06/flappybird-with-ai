// ============================================================================
// Bird.js - Physics, Animations, 5 Unlockable Skins, and VFX Trails
// ============================================================================

export class Bird {
  constructor(x = 100, y = 280) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;

    // Physics
    this.vy = 0;
    this.gravity = 0.32;
    this.jumpStrength = -6.8;
    this.terminalVelocity = 9.5;
    this.radius = 16;
    this.rotation = 0;
    this.targetRotation = 0;
    this.inverted = false; // For Gravity Flip mode

    // Squash & Stretch
    this.scaleX = 1;
    this.scaleY = 1;

    // Animation
    this.wingAngle = 0;
    this.wingSpeed = 0.25;
    this.flapTimer = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.propellerAngle = 0;

    // Active Skin
    this.skin = 'classic'; // 'classic', 'cyber', 'fire', 'steam', 'cosmic'

    // Powerup states
    this.hasShield = false;
    this.shieldHits = 0;
    this.isGhost = false;
    this.ghostTimer = 0;
    this.hasBlaster = false;
    this.blasterTimer = 0;
    this.hasMagnet = false;
    this.magnetTimer = 0;
    this.magnetRadius = 140;

    // Active Projectiles fired by player
    this.projectiles = [];

    // Shield animation
    this.shieldAngle = 0;
    this.shieldPulse = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vy = 0;
    this.rotation = 0;
    this.targetRotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.hasShield = false;
    this.shieldHits = 0;
    this.isGhost = false;
    this.ghostTimer = 0;
    this.hasBlaster = false;
    this.blasterTimer = 0;
    this.hasMagnet = false;
    this.magnetTimer = 0;
    this.projectiles = [];
    this.inverted = false;
  }

  flap(soundEngine = null, particleSystem = null) {
    const dir = this.inverted ? -1 : 1;
    this.vy = this.jumpStrength * dir;
    this.targetRotation = this.inverted ? 0.45 : -0.45;

    // Squash and stretch
    this.scaleX = 0.82;
    this.scaleY = 1.25;
    this.flapTimer = 10;

    // Play procedural flap sound
    if (soundEngine) {
      const pitch = this.skin === 'cyber' ? 1.3 : (this.skin === 'fire' ? 1.1 : 1.0);
      soundEngine.playFlap(pitch);
    }

    // Particle Burst on flap
    if (particleSystem) {
      if (this.skin === 'classic') {
        particleSystem.emitFeathers(this.x - 8, this.y + (this.inverted ? -8 : 8), '#fde047', 4);
      } else if (this.skin === 'cyber') {
        particleSystem.emitPlasmaTrail(this.x - 12, this.y, '#38bdf8', 6);
      } else if (this.skin === 'fire') {
        particleSystem.emitFireFlames(this.x - 10, this.y, 6);
      } else if (this.skin === 'steam') {
        particleSystem.emitSteam(this.x - 12, this.y, 4);
      } else if (this.skin === 'cosmic') {
        particleSystem.emitSparkles(this.x - 8, this.y, '#c084fc', 5);
      }
    }

    // Fire Blaster projectile if active
    if (this.hasBlaster) {
      this.fireBlaster(soundEngine, particleSystem);
    }
  }

  fireBlaster(soundEngine, particleSystem) {
    this.projectiles.push({
      x: this.x + 18,
      y: this.y - 4,
      vx: 11,
      vy: 0,
      size: 6,
      color: '#38bdf8',
      life: 80
    });
    this.projectiles.push({
      x: this.x + 18,
      y: this.y + 4,
      vx: 11,
      vy: 0,
      size: 6,
      color: '#38bdf8',
      life: 80
    });

    if (soundEngine) soundEngine.playLaser();
    if (particleSystem) {
      particleSystem.emitShockwave(this.x + 18, this.y, '#38bdf8', 16);
    }
  }

  update(dt = 1, soundEngine = null, particleSystem = null) {
    const dir = this.inverted ? -1 : 1;

    // Apply gravity
    this.vy += this.gravity * dir * dt;
    if (Math.abs(this.vy) > this.terminalVelocity) {
      this.vy = this.terminalVelocity * Math.sign(this.vy);
    }

    this.y += this.vy * dt;

    // Smooth rotation interpolation
    if (dir === 1) {
      if (this.vy > 1.5) {
        this.targetRotation = Math.min(Math.PI / 2.2, this.targetRotation + 0.04 * dt);
      }
    } else {
      if (this.vy < -1.5) {
        this.targetRotation = Math.max(-Math.PI / 2.2, this.targetRotation - 0.04 * dt);
      }
    }
    this.rotation += (this.targetRotation - this.rotation) * 0.15 * dt;

    // Squash & Stretch decay back to 1.0
    this.scaleX += (1.0 - this.scaleX) * 0.12 * dt;
    this.scaleY += (1.0 - this.scaleY) * 0.12 * dt;

    // Wing flapping cycle
    if (this.flapTimer > 0) {
      this.flapTimer -= dt;
      this.wingAngle = Math.sin(Date.now() * 0.035) * 0.8;
    } else {
      this.wingAngle = Math.sin(Date.now() * 0.015) * 0.3;
    }

    // Steampunk propeller
    this.propellerAngle += 0.4 * dt;

    // Blinking eye
    this.blinkTimer += dt;
    if (this.blinkTimer > 160) {
      this.isBlinking = true;
      if (this.blinkTimer > 172) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Continuous particle trail
    if (particleSystem && Math.random() < 0.35) {
      if (this.skin === 'cyber') {
        particleSystem.emitPlasmaTrail(this.x - 12, this.y, '#06b6d4', 2);
      } else if (this.skin === 'fire') {
        particleSystem.emitFireFlames(this.x - 10, this.y, 2);
      } else if (this.skin === 'steam') {
        particleSystem.emitSteam(this.x - 14, this.y, 1);
      } else if (this.skin === 'cosmic') {
        particleSystem.emitSparkles(this.x - 10, this.y, '#e879f9', 2);
      }
    }

    // Power-up timers
    if (this.isGhost) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.isGhost = false;
        if (particleSystem) particleSystem.emitShockwave(this.x, this.y, '#a855f7', 35);
      }
    }

    if (this.hasBlaster) {
      this.blasterTimer -= dt;
      if (this.blasterTimer <= 0) {
        this.hasBlaster = false;
      }
    }

    if (this.hasMagnet) {
      this.magnetTimer -= dt;
      if (this.magnetTimer <= 0) {
        this.hasMagnet = false;
      }
    }

    // Shield rotation
    if (this.hasShield) {
      this.shieldAngle += 0.04 * dt;
      this.shieldPulse = Math.sin(Date.now() * 0.008) * 3;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.life -= dt;
      if (particleSystem && Math.random() < 0.4) {
        particleSystem.emit({
          x: proj.x,
          y: proj.y,
          count: 1,
          size: 3,
          color: proj.color,
          decay: 0.08,
          blendMode: 'lighter'
        });
      }
      if (proj.life <= 0 || proj.x > 500) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);

    if (this.isGhost) {
      ctx.globalAlpha = 0.55;
    }

    // Render Skin
    if (this.skin === 'classic') {
      this.renderClassicSkin(ctx);
    } else if (this.skin === 'cyber') {
      this.renderCyberSkin(ctx);
    } else if (this.skin === 'fire') {
      this.renderFireSkin(ctx);
    } else if (this.skin === 'steam') {
      this.renderSteamSkin(ctx);
    } else if (this.skin === 'cosmic') {
      this.renderCosmicSkin(ctx);
    }

    // Render Blaster mount if active
    if (this.hasBlaster) {
      this.renderBlasterCannons(ctx);
    }

    ctx.restore();

    // Render Shield Bubble
    if (this.hasShield) {
      this.renderShieldBubble(ctx);
    }

    // Render Magnet waves
    if (this.hasMagnet) {
      this.renderMagnetWaves(ctx);
    }

    // Render Projectiles
    this.renderProjectiles(ctx);
  }

  // --------------------------------------------------------------------------
  // SKIN 1: CLASSIC SUNNY FLAPPY
  // --------------------------------------------------------------------------
  renderClassicSkin(ctx) {
    // Body (Round Gold)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly (Soft Cream White)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-3, 6, 9, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(20, 2);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cheek Blush
    ctx.fillStyle = 'rgba(248, 113, 113, 0.6)';
    ctx.beginPath();
    ctx.arc(3, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pupil
    if (!this.isBlinking) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Eye highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(9, -7.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blinking slit
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -6);
      ctx.lineTo(11, -6);
      ctx.stroke();
    }

    // Wing
    ctx.save();
    ctx.translate(-5, 0);
    ctx.rotate(this.wingAngle);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SKIN 2: MECHA-FALCON (CYBER)
  // --------------------------------------------------------------------------
  renderCyberSkin(ctx) {
    // Metal hull
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-16, -10);
    ctx.lineTo(10, -10);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 12);
    ctx.lineTo(-14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cyan glowing visor
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.fillRect(4, -6, 12, 4);
    ctx.shadowBlur = 0;

    // Jet thruster port on rear
    ctx.fillStyle = '#475569';
    ctx.fillRect(-18, -4, 4, 8);

    // Jet flame
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-26 - Math.random() * 6, 0);
    ctx.lineTo(-18, 4);
    ctx.closePath();
    ctx.fill();

    // Carbon fiber wing
    ctx.save();
    ctx.translate(-4, 0);
    ctx.rotate(this.wingAngle * 0.8);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-4, -12);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SKIN 3: PHOENIX IGNIS (FIRE)
  // --------------------------------------------------------------------------
  renderFireSkin(ctx) {
    // Flaming body
    const fireGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
    fireGrad.addColorStop(0, '#fef08a');
    fireGrad.addColorStop(0.5, '#f97316');
    fireGrad.addColorStop(1, '#dc2626');

    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Fiery Crown Crest
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-12, -24 + Math.sin(Date.now() * 0.02) * 3);
    ctx.lineTo(-2, -16);
    ctx.lineTo(4, -22 + Math.cos(Date.now() * 0.02) * 3);
    ctx.lineTo(8, -14);
    ctx.closePath();
    ctx.fill();

    // Glowing Beak
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(20, 2);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();

    // Fiery Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(7, -6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Flame Wing
    ctx.save();
    ctx.translate(-4, 0);
    ctx.rotate(this.wingAngle);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-15, -12, -8, -16);
    ctx.quadraticCurveTo(-4, -6, 6, 0);
    ctx.fill();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SKIN 4: STEAMPUNK AERONAUT
  // --------------------------------------------------------------------------
  renderSteamSkin(ctx) {
    // Brass body
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aviator Leather Cap
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(0, -4, 16, Math.PI, Math.PI * 2);
    ctx.fill();

    // Brass Goggles with Green Glass Lens
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(6, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glass reflection
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.arc(7, -7, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(8, -1);
    ctx.lineTo(19, 2);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();

    // Spinning Propeller Tail
    ctx.save();
    ctx.translate(-16, 0);
    ctx.rotate(this.propellerAngle);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -10, 4, 20);
    ctx.restore();

    // Mechanical Gear Wing
    ctx.save();
    ctx.translate(-4, 0);
    ctx.rotate(this.wingAngle * 0.7);
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SKIN 5: COSMIC PHANTOM
  // --------------------------------------------------------------------------
  renderCosmicSkin(ctx) {
    // Ethereal Void Sphere
    const voidGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
    voidGrad.addColorStop(0, '#ffffff');
    voidGrad.addColorStop(0.3, '#c084fc');
    voidGrad.addColorStop(0.8, '#7e22ce');
    voidGrad.addColorStop(1, '#3b0764');

    ctx.fillStyle = voidGrad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Orbiting Cosmic Rings
    ctx.save();
    ctx.rotate(Date.now() * 0.003);
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Glowing Star Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // POWER-UP AURAS & PROJECTILES
  // --------------------------------------------------------------------------
  renderBlasterCannons(ctx) {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(2, -18, 12, 4);
    ctx.fillRect(2, 14, 12, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(12, -19, 4, 6);
    ctx.fillRect(12, 13, 4, 6);
  }

  renderShieldBubble(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const r = this.radius + 12 + this.shieldPulse;

    // Glowing Energy Field
    const grad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(147, 197, 253, 0.8)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Shield Nodes
    ctx.rotate(this.shieldAngle);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const nx = Math.cos(a) * r;
      const ny = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  renderMagnetWaves(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = (Date.now() * 0.005) % 1;
    ctx.strokeStyle = `rgba(251, 191, 36, ${1 - pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 25 + pulse * (this.magnetRadius - 25), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderProjectiles(ctx) {
    ctx.save();
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
