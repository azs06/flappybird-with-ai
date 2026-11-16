// ============================================================================
// PipeManager.js - Obstacles, Moving Gates, Collectibles, Powerups & Graze Detection
// ============================================================================

export class PipeManager {
  constructor() {
    this.pipes = [];
    this.collectibles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 110; // Frames between spawns
    this.pipeWidth = 56;
    this.pipeGap = 135;
    this.speed = 2.4;
    this.baseSpeed = 2.4;
    this.totalPipesSpawned = 0;
    this.groundHeight = 110;
  }

  reset() {
    this.pipes = [];
    this.collectibles = [];
    this.spawnTimer = 0;
    this.speed = this.baseSpeed;
    this.totalPipesSpawned = 0;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  update(dt = 1, bird, soundEngine = null, particleSystem = null, themeInfo = null) {
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPipePair();
    }

    // Update Pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= this.speed * dt;

      // Moving pipe oscillation
      if (pipe.type === 'moving') {
        pipe.movePhase += 0.04 * dt;
        pipe.topHeight = pipe.baseTopHeight + Math.sin(pipe.movePhase) * 35;
        pipe.bottomY = pipe.topHeight + pipe.gap;
      }

      // Check Graze / Close-Call Bonus
      if (!pipe.grazed && !pipe.passed && bird) {
        const isNearX = bird.x > pipe.x - 10 && bird.x < pipe.x + this.pipeWidth + 10;
        if (isNearX) {
          const nearTop = Math.abs(bird.y - pipe.topHeight) < 22;
          const nearBottom = Math.abs(bird.y - pipe.bottomY) < 22;

          if (nearTop || nearBottom) {
            pipe.grazed = true;
            if (soundEngine) soundEngine.playGraze();
            if (particleSystem) {
              particleSystem.emitSparkles(bird.x, bird.y, '#f59e0b', 8);
              particleSystem.addFloatingText('+50 GRAZE!', bird.x, bird.y - 18, '#fbbf24', 12);
            }
            if (bird.onGraze) bird.onGraze();
          }
        }
      }

      // Check if bird passed pipe for score
      if (!pipe.passed && bird && pipe.x + this.pipeWidth < bird.x) {
        pipe.passed = true;
        if (bird.onScore) bird.onScore(pipe);
      }

      // Remove offscreen pipes
      if (pipe.x < -this.pipeWidth - 40) {
        this.pipes.splice(i, 1);
      }
    }

    // Update Collectibles & Powerups
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.x -= this.speed * dt;
      c.animTimer += 0.05 * dt;
      c.floatOffset = Math.sin(c.animTimer) * 5;

      // Magnet attraction logic
      if (bird && bird.hasMagnet && c.type === 'coin') {
        const dx = bird.x - c.x;
        const dy = bird.y - (c.y + c.floatOffset);
        const dist = Math.hypot(dx, dy);

        if (dist < bird.magnetRadius && dist > 0) {
          const pull = (1 - dist / bird.magnetRadius) * 6;
          c.x += (dx / dist) * pull * dt;
          c.y += (dy / dist) * pull * dt;
        }
      }

      // Collect item check
      if (bird) {
        const itemY = c.y + c.floatOffset;
        const dist = Math.hypot(bird.x - c.x, bird.y - itemY);

        if (dist < bird.radius + c.radius) {
          // Collected!
          this.handleItemPickup(c, bird, soundEngine, particleSystem);
          this.collectibles.splice(i, 1);
          continue;
        }
      }

      // Remove offscreen collectibles
      if (c.x < -40) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  handleItemPickup(item, bird, soundEngine, particleSystem) {
    if (item.type === 'coin') {
      if (soundEngine) soundEngine.playCoin();
      if (particleSystem) {
        particleSystem.emitSparkles(item.x, item.y, '#ffd700', 14);
        particleSystem.addFloatingText('+10 GEM', item.x, item.y - 12, '#fde047', 12);
      }
      if (bird.onCoin) bird.onCoin(10);
    } else if (item.type === 'shield') {
      bird.hasShield = true;
      if (soundEngine) soundEngine.playPowerup('shield');
      if (particleSystem) {
        particleSystem.emitShockwave(item.x, item.y, '#38bdf8', 45);
        particleSystem.addFloatingText('SHIELD UP!', item.x, item.y - 14, '#38bdf8', 13);
      }
    } else if (item.type === 'blaster') {
      bird.hasBlaster = true;
      bird.blasterTimer = 360; // 6 seconds
      if (soundEngine) soundEngine.playPowerup('blaster');
      if (particleSystem) {
        particleSystem.emitShockwave(item.x, item.y, '#0284c7', 45);
        particleSystem.addFloatingText('BLASTER!', item.x, item.y - 14, '#0284c7', 13);
      }
    } else if (item.type === 'ghost') {
      bird.isGhost = true;
      bird.ghostTimer = 220; // ~3.5 seconds
      if (soundEngine) soundEngine.playPowerup('ghost');
      if (particleSystem) {
        particleSystem.emitShockwave(item.x, item.y, '#c084fc', 45);
        particleSystem.addFloatingText('GHOST PHASE!', item.x, item.y - 14, '#c084fc', 13);
      }
    } else if (item.type === 'magnet') {
      bird.hasMagnet = true;
      bird.magnetTimer = 360; // 6 seconds
      if (soundEngine) soundEngine.playPowerup('magnet');
      if (particleSystem) {
        particleSystem.emitShockwave(item.x, item.y, '#fbbf24', 45);
        particleSystem.addFloatingText('MAGNET!', item.x, item.y - 14, '#fbbf24', 13);
      }
    } else if (item.type === 'slowmo') {
      if (bird.onSlowMo) bird.onSlowMo();
      if (soundEngine) soundEngine.playPowerup('slowmo');
      if (particleSystem) {
        particleSystem.emitShockwave(item.x, item.y, '#818cf8', 50);
        particleSystem.addFloatingText('TIME WARP!', item.x, item.y - 14, '#818cf8', 13);
      }
    }
  }

  spawnPipePair() {
    this.totalPipesSpawned++;

    const minTop = 60;
    const maxTop = 650 - this.groundHeight - this.pipeGap - 60;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);

    // Randomize pipe type based on progress
    let type = 'standard';
    if (this.totalPipesSpawned > 6 && Math.random() < 0.3) {
      type = 'moving';
    } else if (this.totalPipesSpawned > 12 && Math.random() < 0.25) {
      type = 'breakable';
    }

    const pipe = {
      x: 440,
      baseTopHeight: topHeight,
      topHeight: topHeight,
      gap: this.pipeGap,
      bottomY: topHeight + this.pipeGap,
      type: type,
      movePhase: Math.random() * Math.PI * 2,
      passed: false,
      grazed: false,
      hp: type === 'breakable' ? 2 : 999,
      isDestroyed: false
    };

    this.pipes.push(pipe);

    // Spawn Collectibles / Powerups inside gap
    this.spawnItemInGap(pipe);
  }

  spawnItemInGap(pipe) {
    const itemX = pipe.x + this.pipeWidth / 2;
    const itemY = pipe.topHeight + pipe.gap / 2;

    const rand = Math.random();

    if (rand < 0.55) {
      // 55% chance of Coin/Gem
      this.collectibles.push({
        type: 'coin',
        x: itemX,
        y: itemY,
        radius: 10,
        animTimer: Math.random() * Math.PI,
        floatOffset: 0
      });
    } else if (rand < 0.65) {
      // 10% Shield
      this.collectibles.push({
        type: 'shield',
        x: itemX,
        y: itemY,
        radius: 12,
        animTimer: 0,
        floatOffset: 0
      });
    } else if (rand < 0.75) {
      // 10% Blaster
      this.collectibles.push({
        type: 'blaster',
        x: itemX,
        y: itemY,
        radius: 12,
        animTimer: 0,
        floatOffset: 0
      });
    } else if (rand < 0.83) {
      // 8% Ghost
      this.collectibles.push({
        type: 'ghost',
        x: itemX,
        y: itemY,
        radius: 12,
        animTimer: 0,
        floatOffset: 0
      });
    } else if (rand < 0.90) {
      // 7% Magnet
      this.collectibles.push({
        type: 'magnet',
        x: itemX,
        y: itemY,
        radius: 12,
        animTimer: 0,
        floatOffset: 0
      });
    } else if (rand < 0.96) {
      // 6% Slow-Mo
      this.collectibles.push({
        type: 'slowmo',
        x: itemX,
        y: itemY,
        radius: 12,
        animTimer: 0,
        floatOffset: 0
      });
    }
  }

  checkCollision(bird) {
    if (!bird || bird.isGhost) return false;

    for (const pipe of this.pipes) {
      if (pipe.isDestroyed) continue;

      const withinX = bird.x + bird.radius - 4 > pipe.x && bird.x - bird.radius + 4 < pipe.x + this.pipeWidth;

      if (withinX) {
        // Hit top pipe
        if (bird.y - bird.radius + 4 < pipe.topHeight) {
          return { hitPipe: pipe, part: 'top' };
        }
        // Hit bottom pipe
        if (bird.y + bird.radius - 4 > pipe.bottomY) {
          return { hitPipe: pipe, part: 'bottom' };
        }
      }
    }
    return false;
  }

  checkProjectileHits(bird, soundEngine, particleSystem) {
    if (!bird || !bird.projectiles || bird.projectiles.length === 0) return;

    for (let pIdx = bird.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = bird.projectiles[pIdx];

      for (const pipe of this.pipes) {
        if (pipe.isDestroyed) continue;

        const withinX = proj.x > pipe.x && proj.x < pipe.x + this.pipeWidth;
        if (withinX) {
          const hitTop = proj.y < pipe.topHeight;
          const hitBottom = proj.y > pipe.bottomY;

          if (hitTop || hitBottom) {
            // Hit pipe
            bird.projectiles.splice(pIdx, 1);
            if (pipe.type === 'breakable') {
              pipe.hp--;
              if (pipe.hp <= 0) {
                pipe.isDestroyed = true;
                if (soundEngine) soundEngine.playExplosion(0.8);
                if (particleSystem) {
                  particleSystem.emitExplosion(pipe.x + this.pipeWidth / 2, hitTop ? pipe.topHeight / 2 : (pipe.bottomY + 100), '#f59e0b', 25);
                  particleSystem.addFloatingText('+100 SMASH!', pipe.x + 20, pipe.topHeight + 40, '#f97316', 14);
                }
              } else {
                if (soundEngine) soundEngine.playShieldHit();
                if (particleSystem) particleSystem.emitSparkles(proj.x, proj.y, '#f97316', 8);
              }
            } else {
              if (soundEngine) soundEngine.playShieldHit();
              if (particleSystem) particleSystem.emitSparkles(proj.x, proj.y, '#38bdf8', 6);
            }
            break;
          }
        }
      }
    }
  }

  render(ctx, themeInfo, virtualHeight = 650) {
    ctx.save();

    // Render Pipes
    for (const pipe of this.pipes) {
      if (pipe.isDestroyed) continue;
      this.renderSinglePipe(ctx, pipe, themeInfo, virtualHeight);
    }

    // Render Collectibles
    for (const c of this.collectibles) {
      this.renderSingleCollectible(ctx, c);
    }

    ctx.restore();
  }

  renderSinglePipe(ctx, pipe, themeInfo, virtualHeight) {
    const w = this.pipeWidth;
    const collarH = 24;
    const collarOver = 4;

    ctx.save();

    // ------------------------------------------------------------------------
    // TOP PIPE
    // ------------------------------------------------------------------------
    // Pipe Body
    const topBodyGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + w, 0);
    topBodyGrad.addColorStop(0, themeInfo.pipeShadow);
    topBodyGrad.addColorStop(0.3, themeInfo.pipeHighlight);
    topBodyGrad.addColorStop(0.7, themeInfo.pipeColor);
    topBodyGrad.addColorStop(1, themeInfo.pipeShadow);

    ctx.fillStyle = topBodyGrad;
    ctx.fillRect(pipe.x, 0, w, pipe.topHeight - collarH);

    // Top Collar Cap
    ctx.fillStyle = topBodyGrad;
    ctx.fillRect(pipe.x - collarOver, pipe.topHeight - collarH, w + collarOver * 2, collarH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x - collarOver, pipe.topHeight - collarH, w + collarOver * 2, collarH);

    // ------------------------------------------------------------------------
    // BOTTOM PIPE
    // ------------------------------------------------------------------------
    const bottomH = virtualHeight - this.groundHeight - pipe.bottomY;

    // Bottom Collar Cap
    ctx.fillRect(pipe.x - collarOver, pipe.bottomY, w + collarOver * 2, collarH);
    ctx.strokeRect(pipe.x - collarOver, pipe.bottomY, w + collarOver * 2, collarH);

    // Bottom Body
    ctx.fillStyle = topBodyGrad;
    ctx.fillRect(pipe.x, pipe.bottomY + collarH, w, bottomH - collarH);

    // Outlines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x, 0, w, pipe.topHeight - collarH);
    ctx.strokeRect(pipe.x, pipe.bottomY + collarH, w, bottomH - collarH);

    // Breakable crack visuals
    if (pipe.type === 'breakable') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pipe.x + 10, pipe.topHeight - collarH - 20);
      ctx.lineTo(pipe.x + 25, pipe.topHeight - collarH - 5);
      ctx.lineTo(pipe.x + 40, pipe.topHeight - collarH - 25);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderSingleCollectible(ctx, c) {
    ctx.save();
    const itemY = c.y + c.floatOffset;
    ctx.translate(c.x, itemY);

    if (c.type === 'coin') {
      // Golden / Diamond Gem
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, -2);
      ctx.lineTo(0, 10);
      ctx.lineTo(-9, -2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner shine
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, -2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-5, -2);
      ctx.closePath();
      ctx.fill();
    } else if (c.type === 'shield') {
      // Shield Icon
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', 0, 1);
    } else if (c.type === 'blaster') {
      // Blaster Laser Icon
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔫', 0, 1);
    } else if (c.type === 'ghost') {
      // Ghost Phase Icon
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👻', 0, 1);
    } else if (c.type === 'magnet') {
      // Magnet Icon
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧲', 0, 1);
    } else if (c.type === 'slowmo') {
      // Time Warp Icon
      ctx.fillStyle = '#818cf8';
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳', 0, 1);
    }

    ctx.restore();
  }
}
