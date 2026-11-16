// ============================================================================
// ThemeManager.js - Dynamic Parallax Biomes & Visual Environments
// ============================================================================

export class ThemeManager {
  constructor() {
    this.currentThemeId = 'sunset'; // 'sunset', 'cyber', 'storm', 'cosmic'

    // Environmental state
    this.offset = 0;
    this.lightningTimer = 0;
    this.lightningFlash = 0;
    this.rainDrops = [];
    this.shootingStars = [];
    this.petals = [];
    this.cyberCars = [];
    this.clouds = [];
    this.windmills = [
      { x: 120, y: 380, bladeAngle: 0 },
      { x: 380, y: 390, bladeAngle: 1.5 }
    ];

    this.initEnvironment();
  }

  initEnvironment() {
    // Generate clouds
    this.clouds = [
      { x: 50, y: 80, scale: 1.2, speed: 0.2 },
      { x: 220, y: 140, scale: 0.8, speed: 0.15 },
      { x: 360, y: 60, scale: 1.0, speed: 0.25 },
      { x: 480, y: 110, scale: 0.9, speed: 0.18 }
    ];

    // Generate rain
    this.rainDrops = [];
    for (let i = 0; i < 80; i++) {
      this.rainDrops.push({
        x: Math.random() * 600,
        y: Math.random() * 800,
        speed: 12 + Math.random() * 8,
        length: 12 + Math.random() * 10
      });
    }

    // Generate falling petals
    this.petals = [];
    for (let i = 0; i < 30; i++) {
      this.petals.push({
        x: Math.random() * 600,
        y: Math.random() * 800,
        speedX: 0.8 + Math.random() * 1.2,
        speedY: 1.0 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.05,
        size: 3 + Math.random() * 3
      });
    }

    // Generate cyber cars
    this.cyberCars = [
      { x: -50, y: 250, speed: 2.2, color: '#38bdf8' },
      { x: 500, y: 310, speed: -1.8, color: '#f43f5e' }
    ];

    // Starfield for cosmic & cyber
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * 600,
        y: Math.random() * 600,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3) + 1
      });
    }
  }

  setTheme(themeId) {
    if (['sunset', 'cyber', 'storm', 'cosmic'].includes(themeId)) {
      this.currentThemeId = themeId;
    }
  }

  getThemeInfo() {
    const info = {
      sunset: {
        name: 'Sunset Meadow',
        pipeColor: '#22c55e',
        pipeHighlight: '#86efac',
        pipeShadow: '#15803d',
        pipeCap: '#16a34a',
        groundColor: '#4ade80',
        groundBase: '#b45309'
      },
      cyber: {
        name: 'Cyber Neon 2084',
        pipeColor: '#0f172a',
        pipeHighlight: '#06b6d4',
        pipeShadow: '#020617',
        pipeCap: '#3b82f6',
        groundColor: '#06b6d4',
        groundBase: '#090d16'
      },
      storm: {
        name: 'Storm Spire',
        pipeColor: '#475569',
        pipeHighlight: '#94a3b8',
        pipeShadow: '#1e293b',
        pipeCap: '#334155',
        groundColor: '#334155',
        groundBase: '#1e293b'
      },
      cosmic: {
        name: 'Cosmic Nebula',
        pipeColor: '#581c87',
        pipeHighlight: '#c084fc',
        pipeShadow: '#3b0764',
        pipeCap: '#7e22ce',
        groundColor: '#a855f7',
        groundBase: '#2e1065'
      }
    };
    return info[this.currentThemeId] || info.sunset;
  }

  update(dt = 1, gameSpeed = 2.0) {
    this.offset += gameSpeed * dt;

    // Windmill blades
    for (const wm of this.windmills) {
      wm.bladeAngle += 0.02 * dt;
    }

    // Clouds
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * gameSpeed * dt;
      if (cloud.x < -150) {
        cloud.x = 550;
        cloud.y = 40 + Math.random() * 120;
      }
    }

    // Rain
    if (this.currentThemeId === 'storm') {
      for (const drop of this.rainDrops) {
        drop.y += drop.speed * dt;
        drop.x -= 2 * dt;
        if (drop.y > 750) {
          drop.y = -20;
          drop.x = Math.random() * 600;
        }
      }

      // Lightning
      this.lightningTimer += dt;
      if (this.lightningTimer > 180 + Math.random() * 200) {
        this.lightningTimer = 0;
        this.lightningFlash = 1.0;
      }
      if (this.lightningFlash > 0) {
        this.lightningFlash -= 0.05 * dt;
        if (this.lightningFlash < 0) this.lightningFlash = 0;
      }
    }

    // Cherry Petals
    if (this.currentThemeId === 'sunset') {
      for (const petal of this.petals) {
        petal.x -= petal.speedX * dt;
        petal.y += petal.speedY * dt;
        petal.rotation += petal.vRot * dt;
        if (petal.y > 750 || petal.x < -20) {
          petal.y = -20;
          petal.x = Math.random() * 550 + 50;
        }
      }
    }

    // Cyber Cars
    if (this.currentThemeId === 'cyber') {
      for (const car of this.cyberCars) {
        car.x += car.speed * dt;
        if (car.speed > 0 && car.x > 550) car.x = -60;
        if (car.speed < 0 && car.x < -60) car.x = 550;
      }
    }

    // Shooting Stars
    if (this.currentThemeId === 'cosmic' || this.currentThemeId === 'cyber') {
      if (Math.random() < 0.008) {
        this.shootingStars.push({
          x: Math.random() * 400 + 100,
          y: Math.random() * 200,
          vx: -(4 + Math.random() * 4),
          vy: 2 + Math.random() * 3,
          length: 40 + Math.random() * 30,
          life: 1.0
        });
      }

      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        const ss = this.shootingStars[i];
        ss.x += ss.vx * dt;
        ss.y += ss.vy * dt;
        ss.life -= 0.03 * dt;
        if (ss.life <= 0) {
          this.shootingStars.splice(i, 1);
        }
      }
    }
  }

  renderBackground(ctx, width, height) {
    ctx.save();

    if (this.currentThemeId === 'sunset') {
      this.renderSunset(ctx, width, height);
    } else if (this.currentThemeId === 'cyber') {
      this.renderCyber(ctx, width, height);
    } else if (this.currentThemeId === 'storm') {
      this.renderStorm(ctx, width, height);
    } else if (this.currentThemeId === 'cosmic') {
      this.renderCosmic(ctx, width, height);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 1. SUNSET MEADOW
  // --------------------------------------------------------------------------
  renderSunset(ctx, width, height) {
    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
    skyGrad.addColorStop(0.35, '#701a75'); // Violet crimson
    skyGrad.addColorStop(0.65, '#ea580c'); // Orange
    skyGrad.addColorStop(0.9, '#fef08a'); // Soft golden yellow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Sun
    const sunX = width * 0.75;
    const sunY = height * 0.52;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90);
    sunGrad.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
    sunGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.6)');
    sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Far Mountains Parallax
    ctx.fillStyle = '#581c87';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, height - 120);
    const mtnOffset = (this.offset * 0.1) % 400;
    for (let x = -400; x <= width + 400; x += 150) {
      const peakX = x - mtnOffset;
      ctx.lineTo(peakX, height - 260 - Math.sin(x * 0.01) * 60);
      ctx.lineTo(peakX + 75, height - 120);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Mid Hills Parallax
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(0, height - 100);
    const hillOffset = (this.offset * 0.3) % 500;
    for (let x = -500; x <= width + 500; x += 120) {
      const hX = x - hillOffset;
      ctx.quadraticCurveTo(hX + 60, height - 180, hX + 120, height - 100);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Windmills on hills
    for (const wm of this.windmills) {
      const wx = (wm.x - this.offset * 0.3) % (width + 100);
      const drawX = wx < -50 ? wx + width + 100 : wx;
      this.drawWindmill(ctx, drawX, height - 150, wm.bladeAngle);
    }

    // Clouds
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud.x, cloud.y, cloud.scale, 'rgba(255, 237, 213, 0.7)');
    }

    // Petals
    ctx.fillStyle = '#f472b6';
    for (const p of this.petals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawWindmill(ctx, x, y, angle) {
    ctx.save();
    ctx.fillStyle = '#064e3b';
    // Tower
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 40);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x + 8, y + 40);
    ctx.closePath();
    ctx.fill();

    // Blades
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -22);
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  }

  drawCloud(ctx, x, y, scale, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 18 * scale, y - 8 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.arc(x + 40 * scale, y, 18 * scale, 0, Math.PI * 2);
    ctx.arc(x + 20 * scale, y + 10 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 2. CYBER NEON 2084
  // --------------------------------------------------------------------------
  renderCyber(ctx, width, height) {
    // Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#030712');
    skyGrad.addColorStop(0.5, '#0f172a');
    skyGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Synthwave Sun
    const sunY = height * 0.48;
    const sunGrad = ctx.createLinearGradient(width / 2, sunY - 70, width / 2, sunY + 70);
    sunGrad.addColorStop(0, '#fb7185');
    sunGrad.addColorStop(0.5, '#f43f5e');
    sunGrad.addColorStop(1, '#fbbf24');

    ctx.save();
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width / 2, sunY, 65, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal sun slit cuts
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 7; i++) {
      const slitY = sunY + 5 + i * 8;
      const slitHeight = 2 + i * 0.7;
      ctx.fillRect(width / 2 - 70, slitY, 140, slitHeight);
    }
    ctx.restore();

    // Stars / Grid Points
    for (const s of this.stars) {
      const alpha = 0.3 + 0.7 * Math.sin(Date.now() * s.twinkleSpeed + s.twinklePhase);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Skyscrapers Parallax
    const cityOffset = (this.offset * 0.2) % 180;
    ctx.fillStyle = '#090d16';
    for (let x = -200; x <= width + 200; x += 45) {
      const bX = x - cityOffset;
      const bHeight = 120 + Math.abs(Math.sin(x * 45)) * 140;
      ctx.fillRect(bX, height - 100 - bHeight, 40, bHeight);

      // Windows
      ctx.fillStyle = Math.sin(x) > 0 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(236, 72, 153, 0.6)';
      for (let wy = height - 90 - bHeight; wy < height - 110; wy += 18) {
        ctx.fillRect(bX + 8, wy, 8, 8);
        ctx.fillRect(bX + 24, wy, 8, 8);
      }
      ctx.fillStyle = '#090d16';
    }

    // Flying Cyber Cars
    for (const car of this.cyberCars) {
      ctx.fillStyle = car.color;
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(car.x, car.y, 22, 5);
      ctx.shadowBlur = 0;
    }

    // Shooting Stars
    this.renderShootingStars(ctx);
  }

  // --------------------------------------------------------------------------
  // 3. STORM SPIRE
  // --------------------------------------------------------------------------
  renderStorm(ctx, width, height) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#090a0f');
    skyGrad.addColorStop(0.5, '#1e1b2e');
    skyGrad.addColorStop(1, '#2d2b42');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Lightning Flash effect
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(224, 231, 255, ${this.lightningFlash * 0.8})`;
      ctx.fillRect(0, 0, width, height);

      // Draw lightning bolt
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      let lx = width * 0.4 + (Math.random() - 0.5) * 80;
      let ly = 0;
      ctx.moveTo(lx, ly);
      while (ly < height - 120) {
        lx += (Math.random() - 0.5) * 40;
        ly += 30 + Math.random() * 30;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Gothic Castle Silhouette Parallax
    const castleOffset = (this.offset * 0.15) % 300;
    ctx.fillStyle = '#0b0b12';
    for (let x = -300; x <= width + 300; x += 150) {
      const cX = x - castleOffset;
      // Main tower
      ctx.fillRect(cX, height - 280, 50, 180);
      // Spire cone
      ctx.beginPath();
      ctx.moveTo(cX - 5, height - 280);
      ctx.lineTo(cX + 25, height - 340);
      ctx.lineTo(cX + 55, height - 280);
      ctx.fill();
    }

    // Swirling dark clouds
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud.x, cloud.y + 30, cloud.scale * 1.3, 'rgba(15, 15, 25, 0.85)');
    }

    // Torrential Rain
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const drop of this.rainDrops) {
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 3, drop.y + drop.length);
    }
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 4. COSMIC NEBULA
  // --------------------------------------------------------------------------
  renderCosmic(ctx, width, height) {
    const skyGrad = ctx.createLinearGradient(0, 0, width, height);
    skyGrad.addColorStop(0, '#05010a');
    skyGrad.addColorStop(0.5, '#19082a');
    skyGrad.addColorStop(1, '#0b0217');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Nebula clouds
    const nebGrad = ctx.createRadialGradient(width * 0.3, height * 0.3, 10, width * 0.3, height * 0.3, 180);
    nebGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    nebGrad.addColorStop(0.6, 'rgba(236, 72, 153, 0.1)');
    nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.3, 180, 0, Math.PI * 2);
    ctx.fill();

    // Ringed Planet
    const pX = width * 0.8;
    const pY = height * 0.22;
    ctx.save();
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(pX, pY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Planet Rings
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(pX, pY, 52, 12, -Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Twinkling Starfield
    for (const s of this.stars) {
      const alpha = 0.2 + 0.8 * Math.sin(Date.now() * s.twinkleSpeed + s.twinklePhase);
      ctx.fillStyle = s.layer === 1 ? `rgba(255, 255, 255, ${alpha})` : (s.layer === 2 ? `rgba(192, 132, 252, ${alpha})` : `rgba(103, 232, 249, ${alpha})`);
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Shooting Stars
    this.renderShootingStars(ctx);
  }

  renderShootingStars(ctx) {
    for (const ss of this.shootingStars) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ss.life);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 3, ss.y - ss.vy * 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // GROUND & FOREGROUND SCROLLING
  // --------------------------------------------------------------------------
  renderGround(ctx, width, height, groundHeight = 110) {
    const theme = this.getThemeInfo();
    const gY = height - groundHeight;

    ctx.save();

    if (this.currentThemeId === 'cyber') {
      // 3D Perspective Neon Wireframe Ground
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, gY, width, groundHeight);

      // Glowing top border
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, gY);
      ctx.lineTo(width, gY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Horizontal perspective grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 6; i++) {
        const lineY = gY + (i * i * 3);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(width, lineY);
        ctx.stroke();
      }

      // Vertical moving perspective lines
      const gridOffset = (this.offset * 1.5) % 40;
      for (let x = -40; x <= width + 40; x += 40) {
        const startX = x - gridOffset;
        ctx.beginPath();
        ctx.moveTo(startX, gY);
        ctx.lineTo(startX + (startX - width / 2) * 0.8, height);
        ctx.stroke();
      }
    } else {
      // Natural / Stone / Stardust layered ground
      // Base dirt / stone
      ctx.fillStyle = theme.groundBase;
      ctx.fillRect(0, gY, width, groundHeight);

      // Top grass / crust layer
      ctx.fillStyle = theme.groundColor;
      ctx.fillRect(0, gY, width, 16);

      // Grass / Stone texture tufts
      const tuftOffset = (this.offset) % 24;
      ctx.fillStyle = theme.pipeHighlight;
      for (let x = -24; x <= width + 24; x += 24) {
        const tx = x - tuftOffset;
        ctx.beginPath();
        ctx.moveTo(tx, gY + 16);
        ctx.lineTo(tx + 6, gY + 24);
        ctx.lineTo(tx + 12, gY + 16);
        ctx.fill();
      }

      // Border outline
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gY);
      ctx.lineTo(width, gY);
      ctx.stroke();
    }

    ctx.restore();
  }
}
