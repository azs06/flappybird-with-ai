// ============================================================================
// ParticleSystem.js - High-Performance Pooled Particle & VFX Engine
// ============================================================================

export class ParticleSystem {
  constructor(maxParticles = 600) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.floatingTexts = [];
    this.particleDensity = 1.0; // Adjustable in settings
  }

  setDensity(val) {
    this.particleDensity = Math.max(0.2, Math.min(2.0, val));
  }

  emit(options) {
    if (this.particles.length >= this.maxParticles) return;

    const count = Math.round((options.count || 1) * this.particleDensity);
    for (let i = 0; i < count; i++) {
      const angle = options.angle !== undefined
        ? options.angle + (Math.random() - 0.5) * (options.spread || 0)
        : Math.random() * Math.PI * 2;

      const speed = options.speed !== undefined
        ? options.speed * (0.6 + Math.random() * 0.8)
        : Math.random() * 3 + 1;

      this.particles.push({
        x: options.x + (options.offsetX || 0) + (Math.random() - 0.5) * (options.jitterX || 0),
        y: options.y + (options.offsetY || 0) + (Math.random() - 0.5) * (options.jitterY || 0),
        vx: Math.cos(angle) * speed + (options.vx || 0),
        vy: Math.sin(angle) * speed + (options.vy || 0),
        gravity: options.gravity !== undefined ? options.gravity : 0.05,
        friction: options.friction !== undefined ? options.friction : 0.98,
        size: (options.size || 4) * (0.7 + Math.random() * 0.6),
        endSize: options.endSize !== undefined ? options.endSize : 0,
        color: options.color || '#ffeb3b',
        endColor: options.endColor || null,
        life: 1.0,
        decay: options.decay || (0.015 + Math.random() * 0.02),
        type: options.type || 'circle', // 'circle', 'feather', 'star', 'ring', 'smoke', 'spark', 'rain'
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.1,
        blendMode: options.blendMode || 'source-over' // 'source-over', 'lighter', 'screen'
      });
    }
  }

  emitFeathers(x, y, color = '#fcd34d', count = 5) {
    this.emit({
      x, y,
      count,
      angle: Math.PI * 0.8 + (Math.random() - 0.5) * 0.6,
      speed: 2.5,
      gravity: 0.04,
      friction: 0.96,
      size: 6,
      color,
      type: 'feather',
      decay: 0.02,
      spread: 0.8
    });
  }

  emitPlasmaTrail(x, y, color = '#38bdf8', count = 3) {
    this.emit({
      x, y,
      count,
      angle: Math.PI + (Math.random() - 0.5) * 0.4,
      speed: 4,
      gravity: 0,
      friction: 0.92,
      size: 5,
      endSize: 1,
      color,
      blendMode: 'lighter',
      type: 'spark',
      decay: 0.05
    });
  }

  emitFireFlames(x, y, count = 4) {
    const colors = ['#ff4500', '#ff8c00', '#ffd700'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.emit({
      x, y,
      count,
      angle: Math.PI + (Math.random() - 0.5) * 0.8,
      speed: 3.5,
      gravity: -0.05,
      friction: 0.95,
      size: 7,
      endSize: 2,
      color,
      blendMode: 'lighter',
      type: 'smoke',
      decay: 0.04
    });
  }

  emitSteam(x, y, count = 2) {
    this.emit({
      x, y,
      count,
      angle: Math.PI + (Math.random() - 0.5) * 0.6,
      speed: 1.8,
      gravity: -0.02,
      friction: 0.97,
      size: 6,
      endSize: 12,
      color: 'rgba(230, 230, 230, 0.4)',
      type: 'smoke',
      decay: 0.025
    });
  }

  emitShockwave(x, y, color = '#60a5fa', size = 30) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      gravity: 0, friction: 1,
      size: 5,
      maxSize: size,
      color,
      life: 1.0,
      decay: 0.04,
      type: 'ring',
      blendMode: 'lighter',
      rotation: 0,
      vRot: 0
    });
  }

  emitExplosion(x, y, color = '#ff5722', count = 35) {
    this.emitShockwave(x, y, color, 60);

    // Fiery debris
    this.emit({
      x, y,
      count,
      speed: 6,
      gravity: 0.1,
      friction: 0.94,
      size: 6,
      endSize: 1,
      color,
      blendMode: 'lighter',
      type: 'spark',
      decay: 0.025
    });

    // Dark smoke
    this.emit({
      x, y,
      count: Math.round(count * 0.5),
      speed: 3,
      gravity: -0.02,
      friction: 0.96,
      size: 10,
      endSize: 24,
      color: 'rgba(80, 80, 90, 0.6)',
      type: 'smoke',
      decay: 0.02
    });
  }

  emitSparkles(x, y, color = '#ffd700', count = 12) {
    this.emit({
      x, y,
      count,
      speed: 3.5,
      gravity: 0.02,
      friction: 0.95,
      size: 4,
      color,
      blendMode: 'lighter',
      type: 'star',
      decay: 0.03
    });
  }

  emitFireworks(x, y) {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.emitShockwave(x, y, color, 80);
    this.emit({
      x, y,
      count: 45,
      speed: 7,
      gravity: 0.08,
      friction: 0.96,
      size: 5,
      endSize: 1,
      color,
      blendMode: 'lighter',
      type: 'spark',
      decay: 0.018
    });
  }

  addFloatingText(text, x, y, color = '#ffffff', fontSize = 18, bold = true) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.8,
      life: 1.0,
      decay: 0.022,
      color,
      fontSize,
      bold
    });
  }

  update(dt = 1) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.friction, dt);
      p.vy *= Math.pow(p.friction, dt);
      p.rotation += p.vRot * dt;
      p.life -= p.decay * dt;

      if (p.type === 'ring') {
        p.size += (p.maxSize - p.size) * 0.15 * dt;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.vy *= 0.96;
      ft.life -= ft.decay * dt;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = p.blendMode;
      }

      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const currentSize = p.endSize !== undefined
        ? p.size + (p.endSize - p.size) * (1 - p.life)
        : p.size;

      ctx.fillStyle = p.color;

      if (p.type === 'feather') {
        // Draw soft feather shape
        ctx.beginPath();
        ctx.ellipse(0, 0, currentSize * 1.5, currentSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-currentSize * 1.5, 0);
        ctx.lineTo(currentSize * 1.5, 0);
        ctx.stroke();
      } else if (p.type === 'star') {
        // Draw 4-point star
        ctx.beginPath();
        const s = currentSize;
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 4 * p.life);
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, currentSize), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, currentSize), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, currentSize), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Render floating texts with drop shadow outline
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = `${ft.bold ? '800' : '600'} ${ft.fontSize}px 'Press Start 2P', 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);

      // Fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}
