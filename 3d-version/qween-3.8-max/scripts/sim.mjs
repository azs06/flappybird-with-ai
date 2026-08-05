function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CFG = {
  gravity: -26,
  flapVelocity: 8.6,
  maxFallSpeed: -17,
  birdX: -1.6,
  birdRadius: 0.42,
  groundY: -4.2,
  ceilingY: 5.4,
  worldScroll: 5.6,
  scrollGainPerScore: 0.055,
  scrollMax: 8.2,
  pipeRadius: 0.78,
  pipeSpacing: 6.4,
  firstPipeX: 9,
  gapStart: 4.0,
  gapMin: 3.3,
  gapShrinkPerScore: 0.018,
  gapCenterMin: -1.6,
  gapCenterMax: 2.6,
  pipePoolSize: 7,
  fixedDt: 1 / 120
};

function gapSizeFor(score) {
  return Math.max(CFG.gapMin, CFG.gapStart - score * CFG.gapShrinkPerScore);
}
function scrollSpeedFor(score) {
  return Math.min(CFG.scrollMax, CFG.worldScroll + score * CFG.scrollGainPerScore);
}

class Sim {
  constructor(seed, bot) {
    this.rng = mulberry32(seed);
    this.bot = bot;
    this.lastGap = 0.5;
    this.y = 0.6;
    this.vy = 0;
    this.score = 0;
    this.state = 'ready';
    this.cooldown = 0;
    this.pipes = [];
    for (let i = 0; i < CFG.pipePoolSize; i++) {
      this.pipes.push({ x: CFG.firstPipeX + i * CFG.pipeSpacing, gapCenter: this.nextGapCenter(), gapSize: CFG.gapStart, scored: false });
    }
  }
  nextGapCenter() {
    const lo = CFG.gapCenterMin + 0.4;
    const hi = CFG.gapCenterMax - 0.4;
    let next = lo + this.rng() * (hi - lo);
    const maxJump = Math.min(3.2, Math.max(1.0, 3.2 - (scrollSpeedFor(this.score) - CFG.worldScroll) * 2.2));
    if (Math.abs(next - this.lastGap) > maxJump) {
      next = this.lastGap + Math.sign(next - this.lastGap) * (0.6 + this.rng() * (maxJump - 0.6));
      next = Math.min(hi, Math.max(lo, next));
    }
    this.lastGap = next;
    return next;
  }
  flap() {
    this.vy = CFG.flapVelocity;
  }
  start() {
    this.state = 'playing';
    this.flap();
  }
  nextGateAfter(x) {
    let best = null;
    for (const g of this.pipes) if (g.x > x && (!best || g.x < best.x)) best = g;
    return best;
  }
  step(dt) {
    if (this.state !== 'playing') return;
    this.cooldown -= dt;
    this.bot(this, dt);
    this.vy = Math.max(CFG.maxFallSpeed, this.vy + CFG.gravity * dt);
    this.y += this.vy * dt;
    if (this.y > CFG.ceilingY) {
      this.y = CFG.ceilingY;
      this.vy = Math.min(this.vy, 0);
    }
    if (this.y - CFG.birdRadius <= CFG.groundY) {
      this.state = 'dead';
      this.cause = 'ground';
      return;
    }
    const speed = scrollSpeedFor(this.score);
    for (const gate of this.pipes) {
      gate.x -= speed * dt;
      if (!gate.scored && gate.x < CFG.birdX - CFG.pipeRadius) {
        gate.scored = true;
        this.score++;
      }
      if (Math.abs(gate.x - CFG.birdX) < CFG.pipeRadius + CFG.birdRadius) {
        const gb = gate.gapCenter - gate.gapSize / 2;
        const gt = gate.gapCenter + gate.gapSize / 2;
        if (this.y - CFG.birdRadius < gb || this.y + CFG.birdRadius > gt) {
          this.state = 'dead';
          this.cause = 'pipe';
          return;
        }
      }
    }
    for (const gate of this.pipes) {
      if (gate.x < -11) {
        let maxX = -Infinity;
        for (const g2 of this.pipes) maxX = Math.max(maxX, g2.x);
        gate.x = maxX + CFG.pipeSpacing;
        gate.gapCenter = this.nextGapCenter();
        gate.gapSize = gapSizeFor(this.score);
        gate.scored = false;
      }
    }
  }
  run(maxSeconds) {
    this.start();
    let t = 0;
    while (this.state === 'playing' && t < maxSeconds) {
      this.step(CFG.fixedDt);
      t += CFG.fixedDt;
    }
    return { score: this.score, time: t, cause: this.cause ?? 'timeout', y: this.y };
  }
}

export { Sim, CFG, gapSizeFor, scrollSpeedFor };
