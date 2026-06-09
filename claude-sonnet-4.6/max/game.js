'use strict';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const W = 480, H = 640;
const GROUND_H   = 80;
const BIRD_X     = 90;
const BIRD_R     = 17;
const GRAVITY    = 0.44;
const JUMP_VEL   = -9.5;
const BASE_SPEED = 2.8;
const PIPE_W     = 58;
const BASE_GAP   = 158;
const MIN_GAP    = 108;
const PIPE_MS    = 1650;
const MTN_W      = 960;
const LS_BEST    = 'flappy_max_best';
const LS_BOARD   = 'flappy_max_lb_v1';
const MAX_SCORES = 10;
const COMBO_WINDOW = 1900; // ms — window to chain a combo

const S = { MENU: 0, PLAYING: 1, PAUSED: 2, DYING: 3, GAMEOVER: 4 };

// ── 4-phase sky themes (score thresholds) ─────────────────
// Each theme blends smoothly into the next over 6 score points.
const THEMES = [
  {
    name: 'day',
    at: 0,
    skyTop: [22, 105, 186], skyMid: [98, 184, 238], skyBot: [182, 226, 255],
    mtnFar: [120, 102, 188, 0.36], mtnNear: [50, 108, 40, 0.52],
    pipeHL: '#66BB6A', pipeDk: '#1B5E20', pipeMid: '#4CAF50',
    stars: false, moon: false,
  },
  {
    name: 'golden',
    at: 8,
    skyTop: [186, 66, 16], skyMid: [240, 155, 72], skyBot: [255, 212, 140],
    mtnFar: [140, 82, 60, 0.44], mtnNear: [80, 55, 20, 0.58],
    pipeHL: '#A1887F', pipeDk: '#3E2723', pipeMid: '#795548',
    stars: false, moon: false,
  },
  {
    name: 'dusk',
    at: 18,
    skyTop: [44, 22, 80], skyMid: [148, 56, 130], skyBot: [255, 140, 80],
    mtnFar: [80, 40, 100, 0.55], mtnNear: [30, 20, 60, 0.7],
    pipeHL: '#78909C', pipeDk: '#263238', pipeMid: '#546E7A',
    stars: true, moon: false,
  },
  {
    name: 'night',
    at: 30,
    skyTop: [8, 10, 28], skyMid: [20, 30, 70], skyBot: [35, 55, 100],
    mtnFar: [20, 15, 50, 0.8], mtnNear: [10, 8, 25, 0.9],
    pipeHL: '#5C6BC0', pipeDk: '#0D1B4A', pipeMid: '#3949AB',
    stars: true, moon: true,
  },
];

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const rand  = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const lerpC = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], clamp(t, 0, 1))));

function rrect(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function getThemeBlend(score) {
  let idx = 0;
  for (let i = THEMES.length - 1; i >= 0; i--) {
    if (score >= THEMES[i].at) { idx = i; break; }
  }
  const next = Math.min(idx + 1, THEMES.length - 1);
  const a = THEMES[idx], b = THEMES[next];
  const blendRange = 6;
  const t = idx === next ? 0 : clamp((score - a.at) / blendRange, 0, 1);
  return { a, b, t };
}

// ═══════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════
function lbLoad() {
  try { return JSON.parse(localStorage.getItem(LS_BOARD) || '[]'); } catch { return []; }
}
function lbSave(b) {
  try { localStorage.setItem(LS_BOARD, JSON.stringify(b)); } catch {}
}
function lbAdd(name, score) {
  const b = lbLoad();
  b.push({ name: (name || '').trim() || 'Anonymous', score, date: new Date().toLocaleDateString() });
  b.sort((a, z) => z.score - a.score);
  const top = b.slice(0, MAX_SCORES);
  lbSave(top);
  return top;
}

// ═══════════════════════════════════════════════════════════
// STAR
// ═══════════════════════════════════════════════════════════
class Star {
  constructor() { this._reset(rand(0, W)); }

  _reset(x) {
    this.x = x;
    this.y = rand(10, H - GROUND_H - 80);
    this.r = rand(0.7, 2.1);
    this.phase = rand(0, Math.PI * 2);
    this.freq = rand(0.0008, 0.0025);
    this.baseAlpha = rand(0.45, 1.0);
  }

  scroll(spd) {
    this.x -= spd * 0.006;
    if (this.x + this.r < 0) this._reset(W + 2);
  }

  draw(ctx, alpha) {
    if (alpha <= 0.02) return;
    const twinkle = 0.65 + 0.35 * Math.sin(this.phase + performance.now() * this.freq);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,230,${(alpha * this.baseAlpha * twinkle).toFixed(3)})`;
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════
// PARTICLE  (feather / sparkle)
// ═══════════════════════════════════════════════════════════
class Particle {
  constructor(x, y, color, type = 'feather') {
    this.x = x; this.y = y; this.color = color; this.type = type;
    this.vx = rand(-5.5, 5.5);
    this.vy = rand(type === 'sparkle' ? -7 : -9, type === 'sparkle' ? -2 : -1.5);
    this.life = 1;
    this.decay = rand(type === 'sparkle' ? 0.038 : 0.022, type === 'sparkle' ? 0.065 : 0.042);
    this.sz = rand(type === 'sparkle' ? 2 : 3, type === 'sparkle' ? 5 : 9);
    this.rot = rand(0, Math.PI * 2);
    this.rspd = rand(-0.14, 0.14);
  }

  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.3; this.vx *= 0.97;
    this.life -= this.decay; this.rot += this.rspd;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(this.life, 0, 1);
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    ctx.beginPath();
    if (this.type === 'sparkle') {
      // 4-point star
      const s = this.sz, sm = s * 0.38;
      ctx.moveTo(0, -s); ctx.lineTo(sm, -sm); ctx.lineTo(s, 0);
      ctx.lineTo(sm, sm); ctx.lineTo(0, s); ctx.lineTo(-sm, sm);
      ctx.lineTo(-s, 0); ctx.lineTo(-sm, -sm); ctx.closePath();
    } else {
      ctx.ellipse(0, 0, this.sz, this.sz * 0.42, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
// SCORE POPUP  (floating combo / achievement text)
// ═══════════════════════════════════════════════════════════
class ScorePopup {
  constructor(x, y, text, color = '#fff', size = 22) {
    this.x = x; this.y = y; this.text = text; this.color = color; this.size = size;
    this.vy = -1.6;
    this.life = 1.0;
    this.decay = 0.018;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.96;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.min(1, this.life * 2.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = `900 ${this.size}px 'Arial Black', Arial, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
// CLOUD
// ═══════════════════════════════════════════════════════════
class Cloud {
  constructor(x, layer) {
    this.layer = layer;
    this.x = x;
    this.y = rand(40, 210);
    this.sc = layer === 0 ? rand(0.44, 0.82) : rand(0.78, 1.38);
    this.spd = layer === 0 ? 0.27 : 0.56;
    this.op = layer === 0 ? 0.42 : 0.82;
    const n = Math.floor(rand(2, 5));
    this.puffs = Array.from({ length: n }, (_, i) => ({
      x: i * 21 - n * 10.5,
      y: Math.sin(i * 1.45) * 7 - 3,
      r: rand(13, 24),
    }));
  }

  update(gspd) { this.x -= this.spd * (gspd / BASE_SPEED); }
  offscreen()  { return this.x + 220 * this.sc < 0; }

  draw(ctx, tintAlpha = 0) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.sc, this.sc);
    ctx.globalAlpha = this.op;
    // Shadow
    ctx.save(); ctx.translate(5, 9); ctx.globalAlpha = this.op * 0.18;
    this.puffs.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#4a6fa5'; ctx.fill();
    });
    ctx.restore();
    // Body
    this.puffs.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      // Warm tint during golden/dusk
      const col = tintAlpha > 0
        ? `rgb(${Math.round(lerp(255, 255, tintAlpha))},${Math.round(lerp(255, 190, tintAlpha))},${Math.round(lerp(255, 140, tintAlpha))})`
        : '#fff';
      ctx.fillStyle = col;
      ctx.fill();
    });
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
// BIRD
// ═══════════════════════════════════════════════════════════
class Bird {
  constructor() {
    this.x = BIRD_X; this.y = H / 2;
    this.vy = 0; this.rot = 0;
    this.wingAngle = 0; this.flapTimer = 0;
    this.squishX = 1; this.squishY = 1;
    this.trail = [];
    // Blink system
    this.blinkTimer = rand(1.8, 3.5);
    this.blinkOpen = 1; // 1 = open, 0 = closed (lerped)
    // Tail feather
    this.tailAngle = 0;
  }

  flap() {
    this.vy = JUMP_VEL;
    this.flapTimer = 0.26;
    this.wingAngle = -0.82;
    this.squishX = 0.68; this.squishY = 1.32;
  }

  update(dt, useGravity) {
    if (useGravity) {
      this.vy += GRAVITY;
      this.vy = clamp(this.vy, -14, 14);
      this.y += this.vy;
      this.rot = lerp(this.rot, clamp(this.vy * 0.073, -0.4, 1.24), 0.14);
    } else {
      this.y = H / 2 + Math.sin(performance.now() * 0.002) * 9;
      this.rot = lerp(this.rot, 0, 0.1);
    }

    if (this.flapTimer > 0) {
      this.flapTimer -= dt;
      this.wingAngle = lerp(this.wingAngle, 0, 0.13);
    } else {
      this.wingAngle = Math.sin(performance.now() * 0.0062) * 0.28;
    }

    // Tail swings opposite to wing / velocity
    this.tailAngle = lerp(this.tailAngle, this.vy * -0.04, 0.12);

    this.squishX = lerp(this.squishX, 1, 0.18);
    this.squishY = lerp(this.squishY, 1, 0.18);

    // Blink
    if (useGravity || true) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkOpen = 0;
        this.blinkTimer = rand(2.0, 4.2);
      }
      this.blinkOpen = lerp(this.blinkOpen, 1, 0.22);
    }

    if (useGravity) {
      this.trail.push({ x: this.x, y: this.y, rot: this.rot });
      if (this.trail.length > 5) this.trail.shift();
    } else {
      this.trail = [];
    }
  }

  hitbox() { return { cx: this.x, cy: this.y, r: BIRD_R * 0.74 }; }

  draw(ctx) {
    // Motion trail
    this.trail.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = (i + 1) / this.trail.length * 0.1;
      ctx.translate(t.x, t.y); ctx.rotate(t.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_R * 0.9, BIRD_R * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD54F'; ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.scale(this.squishX, this.squishY);
    this._body(ctx);
    ctx.restore();
  }

  _body(ctx) {
    const r = BIRD_R;

    // Tail feathers (behind body)
    ctx.save();
    ctx.rotate(this.tailAngle);
    ctx.translate(-r * 0.85, r * 0.08);
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.rotate(i * 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.18, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#FF8F00' : '#E65100';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Drop shadow
    ctx.save(); ctx.translate(2, 4); ctx.globalAlpha = 0.17;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();

    // Wing (animated, behind body)
    ctx.save();
    ctx.rotate(this.wingAngle - 0.1);
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, r * 0.24, r * 0.76, r * 0.32, -0.22, 0, Math.PI * 2);
    const wg = ctx.createRadialGradient(-r * 0.22, r * 0.24, 0, -r * 0.22, r * 0.24, r * 0.76);
    wg.addColorStop(0, '#FF8F00'); wg.addColorStop(1, '#E65100');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();

    // Body
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 1.14);
    bg.addColorStop(0, '#FFEE58'); bg.addColorStop(0.44, '#FFCA28'); bg.addColorStop(1, '#FF8F00');
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#E65100'; ctx.lineWidth = 1.5; ctx.stroke();

    // Belly highlight
    ctx.beginPath(); ctx.ellipse(r * 0.08, r * 0.28, r * 0.42, r * 0.3, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();

    // Eye white
    ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.26, r * 0.37, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#E65100'; ctx.lineWidth = 1; ctx.stroke();

    // Eyelid (blink)
    if (this.blinkOpen < 0.95) {
      const lidH = r * 0.37 * 2 * (1 - this.blinkOpen);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r * 0.38, -r * 0.26, r * 0.37, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#FFCA28';
      ctx.fillRect(r * 0.01, -r * 0.63, r * 0.74, lidH);
      ctx.restore();
    }

    // Pupil
    ctx.beginPath(); ctx.arc(r * 0.48, -r * 0.22, r * 0.19, 0, Math.PI * 2);
    ctx.fillStyle = '#1A237E'; ctx.fill();
    // Shine
    ctx.beginPath(); ctx.arc(r * 0.54, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(r * 0.68, -r * 0.08);
    ctx.lineTo(r * 1.28, -r * 0.12);
    ctx.lineTo(r * 0.68, r * 0.16);
    ctx.closePath();
    const bk = ctx.createLinearGradient(r * 0.68, -r * 0.12, r * 1.28, r * 0.16);
    bk.addColorStop(0, '#FF7043'); bk.addColorStop(1, '#D84315');
    ctx.fillStyle = bk; ctx.fill();
    ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.68, r * 0.04); ctx.lineTo(r * 1.22, r * 0.01);
    ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════
// PIPE
// ═══════════════════════════════════════════════════════════
class Pipe {
  constructor(x, gapY, gap, theme) {
    this.x = x; this.gapY = gapY; this.gap = gap;
    this.theme = theme;
    this.passed = false;
  }

  get topEnd()   { return this.gapY - this.gap / 2; }
  get botStart() { return this.gapY + this.gap / 2; }

  update(spd) { this.x -= spd; }
  offscreen()  { return this.x + PIPE_W < 0; }

  collides(bird) {
    const { cx, cy, r } = bird.hitbox();
    if (cx + r < this.x - 4 || cx - r > this.x + PIPE_W + 4) return false;
    return cy - r < this.topEnd || cy + r > this.botStart;
  }

  draw(ctx, isNight = false) {
    const x = this.x, w = PIPE_W;
    const capW = w + 10, capH = 22;
    const groundY = H - GROUND_H;
    const { pipeHL, pipeDk, pipeMid } = this.theme;

    ctx.save();

    if (isNight) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = pipeHL + 'aa';
    }

    const bodyG = ctx.createLinearGradient(x, 0, x + w, 0);
    bodyG.addColorStop(0, pipeDk);
    bodyG.addColorStop(0.22, pipeHL);
    bodyG.addColorStop(0.62, pipeMid);
    bodyG.addColorStop(1, pipeDk);

    const capG = ctx.createLinearGradient(x - 5, 0, x + capW - 5, 0);
    capG.addColorStop(0, pipeDk);
    capG.addColorStop(0.18, pipeHL);
    capG.addColorStop(0.64, pipeMid);
    capG.addColorStop(1, pipeDk);

    // Top pipe
    if (this.topEnd > 0) {
      ctx.fillStyle = bodyG;
      ctx.fillRect(x, 0, w, Math.max(0, this.topEnd - capH));
      ctx.fillStyle = capG;
      rrect(ctx, x - 5, this.topEnd - capH, capW, capH, [0, 0, 5, 5]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 5, 0, 7, this.topEnd);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x - 5, this.topEnd - 4, capW, 4);
    }

    // Bottom pipe
    if (this.botStart < groundY) {
      ctx.fillStyle = capG;
      rrect(ctx, x - 5, this.botStart, capW, capH, [5, 5, 0, 0]);
      ctx.fill();
      ctx.fillStyle = bodyG;
      ctx.fillRect(x, this.botStart + capH, w, Math.max(0, groundY - this.botStart - capH));
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 5, this.botStart, 7, groundY - this.botStart);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x - 5, this.botStart, capW, 4);
    }

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN GAME
// ═══════════════════════════════════════════════════════════
class FlappyGame {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.state = S.MENU;
    this.score = 0;
    this.displayScore = 0; // animated rolling display
    this.best = parseInt(localStorage.getItem(LS_BEST) || '0');
    this.speed = BASE_SPEED;
    this.gap = BASE_GAP;

    this.bird = new Bird();
    this.pipes = [];
    this.particles = [];
    this.popups = [];
    this.clouds = [];
    this.stars = Array.from({ length: 80 }, () => new Star());

    this.pipeMs     = 0;
    this.groundOff  = 0;
    this.farMtnOff  = 0;
    this.nearMtnOff = 0;
    this.shakeMag   = 0;
    this.flashAlpha = 0;
    this.dyingTimer = 0;

    // Combo tracking
    this.combo       = 0;
    this.lastScoreTs = 0;

    this.farMtnPts  = this._genMtnProfile(7, 80, 185);
    this.nearMtnPts = this._genMtnProfile(5, 55, 140);

    for (let i = 0; i < 5; i++) this.clouds.push(new Cloud(rand(0, W * 1.2), 0));
    for (let i = 0; i < 3; i++) this.clouds.push(new Cloud(rand(0, W * 1.2), 1));

    this._bindEvents();
    this._resize();
    this._lastTs = 0;
    requestAnimationFrame(ts => this._loop(ts));
  }

  _genMtnProfile(numPeaks, minH, maxH) {
    const pts = [{ x: 0, y: H - GROUND_H }];
    for (let i = 0; i < numPeaks; i++) {
      pts.push({ x: (i + 0.22) / numPeaks * MTN_W, y: H - GROUND_H - rand(8, minH * 0.38) });
      pts.push({ x: (i + 0.7)  / numPeaks * MTN_W, y: H - GROUND_H - rand(minH, maxH) });
    }
    pts.push({ x: MTN_W, y: H - GROUND_H });
    return pts;
  }

  _bindEvents() {
    const onInput = e => { e.preventDefault(); this._input(); };
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this._input(); }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if      (this.state === S.PLAYING) this._pause();
        else if (this.state === S.PAUSED)  this._resume();
      }
    });
    this.canvas.addEventListener('click', onInput);
    this.canvas.addEventListener('touchstart', onInput, { passive: false });
    document.getElementById('btn-pause')
      .addEventListener('click', e => { e.stopPropagation(); if (this.state === S.PLAYING) this._pause(); });
    document.getElementById('btn-submit')
      .addEventListener('click', () => this._submitScore());
    document.getElementById('name-input')
      .addEventListener('keydown', e => { if (e.key === 'Enter') this._submitScore(); });
    document.getElementById('btn-play-again')
      .addEventListener('click', () => this._restart());
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    document.getElementById('game-wrapper').style.transform = `scale(${s})`;
  }

  // ── Theme helpers ────────────────────────────────
  _blend() { return getThemeBlend(this.score); }

  _blendThemeProp(key, blend) {
    const { a, b, t } = blend;
    const va = a[key], vb = b[key];
    if (!Array.isArray(va)) return t < 0.5 ? va : vb;
    return lerpC(va, vb, t);
  }

  _starAlpha(blend) {
    const { a, b, t } = blend;
    const sa = a.stars ? 1 : 0, sb = b.stars ? 1 : 0;
    return lerp(sa, sb, t);
  }

  _moonAlpha(blend) {
    const { a, b, t } = blend;
    const ma = a.moon ? 1 : 0, mb = b.moon ? 1 : 0;
    return lerp(ma, mb, t);
  }

  _currentPipeTheme(blend) {
    const { a, b, t } = blend;
    if (t < 0.5) return a;
    return b;
  }

  // ── Input / state transitions ────────────────────
  _input() {
    if (this.state === S.MENU)    { this._startGame(); return; }
    if (this.state === S.PLAYING) { this.bird.flap(); audio.playFlap(); return; }
    if (this.state === S.PAUSED)  { this._resume(); return; }
  }

  _startGame() {
    this.score = 0; this.displayScore = 0;
    this.speed = BASE_SPEED; this.gap = BASE_GAP;
    this.pipes = []; this.particles = []; this.popups = [];
    this.pipeMs = 0; this.combo = 0; this.lastScoreTs = 0;
    this.bird = new Bird();
    this.bird.flap();
    audio.playFlap();
    audio.startWind();
    this.state = S.PLAYING;
    document.getElementById('btn-pause').classList.remove('hidden');
  }

  _pause() {
    this.state = S.PAUSED;
    document.getElementById('btn-pause').classList.add('hidden');
    audio.stopWind();
    audio.playBeep(660, 0.06);
  }

  _resume() {
    this._lastTs = performance.now();
    this.state = S.PLAYING;
    document.getElementById('btn-pause').classList.remove('hidden');
    audio.startWind();
    audio.playBeep(880, 0.06);
  }

  _die() {
    if (this.state !== S.PLAYING) return;
    this.state = S.DYING;
    this.dyingTimer = 1.05;
    this.flashAlpha = 0.7;
    this.shakeMag = 12;
    audio.stopWind();
    audio.playHit();
    setTimeout(() => audio.playDie(), 190);

    // CSS filter spike (chromatic saturation burst)
    this.canvas.style.transition = 'filter 0.05s';
    this.canvas.style.filter = 'saturate(3) contrast(1.4) brightness(1.2)';
    setTimeout(() => {
      this.canvas.style.filter = '';
      this.canvas.style.transition = 'filter 0.35s ease-out';
    }, 60);

    const colors = ['#FFD54F','#FFCA28','#FF8F00','#FF7043','#fff','#FFF9C4'];
    for (let i = 0; i < 28; i++)
      this.particles.push(new Particle(this.bird.x, this.bird.y, colors[i % colors.length], 'feather'));

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(LS_BEST, this.best);
    }
    document.getElementById('btn-pause').classList.add('hidden');
  }

  _showGameOver() {
    this.state = S.GAMEOVER;
    document.getElementById('go-score').textContent = this.score;
    document.getElementById('go-best').textContent = this.best;
    const badge = document.getElementById('new-record-badge');
    if (this.score > 0 && this.score === this.best) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    document.getElementById('modal-gameover').classList.remove('hidden');
    const inp = document.getElementById('name-input');
    inp.value = '';
    setTimeout(() => inp.focus(), 130);
  }

  _submitScore() {
    const name = document.getElementById('name-input').value;
    const board = lbAdd(name, this.score);
    document.getElementById('modal-gameover').classList.add('hidden');
    this._fillLeaderboard(board);
    document.getElementById('modal-leaderboard').classList.remove('hidden');
    audio.playBeep(1046, 0.09);
  }

  _fillLeaderboard(board) {
    const tbody = document.getElementById('lb-body');
    tbody.innerHTML = '';
    const myScore = this.score;
    let myIdx = board.findIndex(e => e.score === myScore);
    board.forEach((entry, i) => {
      const tr = document.createElement('tr');
      if      (i === 0) tr.className = 'rank-gold';
      else if (i === 1) tr.className = 'rank-silver';
      else if (i === 2) tr.className = 'rank-bronze';
      if (i === myIdx) { tr.classList.add('new-entry'); myIdx = -1; }
      const medals = ['🥇','🥈','🥉'];
      const rank = i < 3 ? medals[i] : String(i + 1);
      tr.innerHTML =
        `<td class="td-rank">${rank}</td>` +
        `<td class="td-name left">${this._esc(entry.name)}</td>` +
        `<td class="td-score">${entry.score}</td>` +
        `<td class="td-date">${entry.date || ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  _restart() {
    document.getElementById('modal-gameover').classList.add('hidden');
    document.getElementById('modal-leaderboard').classList.add('hidden');
    this.state = S.MENU;
    this.bird = new Bird();
    this.pipes = []; this.particles = []; this.popups = [];
    this.canvas.style.filter = '';
  }

  _toast(text, color = '#FFD700') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.color = color;
    el.textContent = text;
    const container = document.getElementById('toast-container');
    container.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────
  _update(dt) {
    const playing = this.state === S.PLAYING;
    const dying   = this.state === S.DYING;
    const active  = playing || dying;

    // Parallax scroll
    const spd = active ? (dying ? this.speed * 0.22 : this.speed) : 0.55;
    this.groundOff  = (this.groundOff  + spd)        % (W * 0.28);
    this.farMtnOff  = (this.farMtnOff  + spd * 0.07) % MTN_W;
    this.nearMtnOff = (this.nearMtnOff + spd * 0.21) % MTN_W;

    // Stars scroll
    const starSpd = active ? this.speed : BASE_SPEED * 0.3;
    this.stars.forEach(s => s.scroll(starSpd));

    // Clouds
    const cSpd = active ? this.speed : BASE_SPEED * 0.35;
    this.clouds.forEach(c => c.update(cSpd));
    this.clouds = this.clouds.filter(c => !c.offscreen());
    if (this.clouds.filter(c => c.layer === 0).length < 5) this.clouds.push(new Cloud(W + 70, 0));
    if (this.clouds.filter(c => c.layer === 1).length < 3) this.clouds.push(new Cloud(W + 70, 1));

    this.bird.update(dt, active);

    // Animated score display
    this.displayScore += (this.score - this.displayScore) * 0.18;
    if (Math.abs(this.displayScore - this.score) < 0.5) this.displayScore = this.score;

    if (playing) {
      this.pipeMs += dt * 1000;
      if (this.pipeMs >= PIPE_MS) {
        this.pipeMs -= PIPE_MS;
        const gapY = rand(110, H - GROUND_H - 110);
        const blend = this._blend();
        this.pipes.push(new Pipe(W + PIPE_W, gapY, this.gap, this._currentPipeTheme(blend)));
      }

      this.pipes.forEach(p => p.update(this.speed));
      this.pipes = this.pipes.filter(p => !p.offscreen());

      this.pipes.forEach(p => {
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          this.score++;
          this._onScore();
        }
      });

      const { cx, cy, r } = this.bird.hitbox();
      if (cy + r >= H - GROUND_H || cy - r <= 0) { this._die(); return; }
      for (const p of this.pipes) { if (p.collides(this.bird)) { this._die(); return; } }
    }

    if (dying) {
      const groundY = H - GROUND_H;
      if (this.bird.y + BIRD_R >= groundY) {
        this.bird.y = groundY - BIRD_R;
        this.bird.vy = 0;
      }
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) this._showGameOver();
    }

    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.popups.forEach(p => p.update());
    this.popups = this.popups.filter(p => p.life > 0);

    this.shakeMag  *= 0.84;
    if (this.shakeMag < 0.08) this.shakeMag = 0;
    this.flashAlpha *= 0.8;
  }

  _onScore() {
    // Sparkle particles at pipe gap center
    const pipeObj = this.pipes.find(p => p.passed && p.x + PIPE_W < BIRD_X + 10);
    const px = pipeObj ? pipeObj.x + PIPE_W / 2 : BIRD_X + 40;
    const py = pipeObj ? pipeObj.gapY : H / 2;
    const sparkColors = ['#FFD700','#FFF176','#FFCA28','#fff'];
    for (let i = 0; i < 8; i++)
      this.particles.push(new Particle(px, py, sparkColors[i % sparkColors.length], 'sparkle'));

    // Combo logic
    const now = performance.now();
    if (now - this.lastScoreTs < COMBO_WINDOW) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastScoreTs = now;

    // Milestone toasts & sounds
    const milestones = { 10: 'SCORE 10! 🔥', 20: 'SCORE 20! ⚡', 30: 'NIGHT MODE! 🌙', 50: 'LEGEND! ⭐' };
    if (milestones[this.score]) {
      this._toast(milestones[this.score], '#FFD700');
      audio.playMilestone();
    } else {
      audio.playScore(this.combo);
    }

    if (this.combo >= 3) {
      this.popups.push(new ScorePopup(W / 2, H / 2 - 60, `${this.combo}x COMBO!`, '#FFD700', 28));
      this._toast(`${this.combo}x COMBO!`, '#FFD700');
    } else if (this.combo === 2) {
      this.popups.push(new ScorePopup(W / 2, H / 2 - 60, 'DOUBLE!', '#FF8F00', 24));
    }

    this._scaleDifficulty();
  }

  _scaleDifficulty() {
    const s = this.score;
    if      (s < 6)  { this.speed = BASE_SPEED;        this.gap = BASE_GAP;      }
    else if (s < 12) { this.speed = BASE_SPEED + 0.3;  this.gap = BASE_GAP - 12; }
    else if (s < 20) { this.speed = BASE_SPEED + 0.65; this.gap = BASE_GAP - 22; }
    else if (s < 30) { this.speed = BASE_SPEED + 1.05; this.gap = BASE_GAP - 34; }
    else             { this.speed = BASE_SPEED + 1.4;  this.gap = Math.max(MIN_GAP, BASE_GAP - 46); }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shakeMag > 0.08) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeMag,
        (Math.random() - 0.5) * this.shakeMag
      );
    }

    ctx.clearRect(-16, -16, W + 32, H + 32);

    const blend = this._blend();
    const starAlpha = this._starAlpha(blend);
    const moonAlpha = this._moonAlpha(blend);
    const isNight = starAlpha > 0.5;

    this._rSky(ctx, blend);
    if (starAlpha > 0.02) this._rStars(ctx, starAlpha);
    if (moonAlpha > 0.02) this._rMoon(ctx, moonAlpha);

    const mtnFarColor = this._blendThemeProp('mtnFar', blend);
    const mtnNearColor = this._blendThemeProp('mtnNear', blend);
    const mtnFarStr = `rgba(${mtnFarColor[0]},${mtnFarColor[1]},${mtnFarColor[2]},${mtnFarColor[3]})`;
    const mtnNearStr = `rgba(${mtnNearColor[0]},${mtnNearColor[1]},${mtnNearColor[2]},${mtnNearColor[3]})`;

    // Warm cloud tint during golden hour / dusk
    const warmTint = blend.a.name === 'golden' || blend.a.name === 'dusk' ? blend.t : 0;

    this.clouds.filter(c => c.layer === 0).forEach(c => c.draw(ctx, warmTint));
    this._rMountains(ctx, this.farMtnPts,  this.farMtnOff,  mtnFarStr);
    this._rMountains(ctx, this.nearMtnPts, this.nearMtnOff, mtnNearStr);
    this.clouds.filter(c => c.layer === 1).forEach(c => c.draw(ctx, warmTint));

    this.pipes.forEach(p => p.draw(ctx, isNight));
    this.particles.forEach(p => p.draw(ctx));
    this.bird.draw(ctx);
    this._rGround(ctx);
    this._rHUD(ctx);
    this.popups.forEach(p => p.draw(ctx));

    if (this.state === S.MENU)   this._rStartScreen(ctx);
    if (this.state === S.PAUSED) this._rPauseOverlay(ctx);

    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  _rSky(ctx, blend) {
    const top = this._blendThemeProp('skyTop', blend);
    const mid = this._blendThemeProp('skyMid', blend);
    const bot = this._blendThemeProp('skyBot', blend);
    const g = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
    g.addColorStop(0,    `rgb(${top})`);
    g.addColorStop(0.44, `rgb(${mid})`);
    g.addColorStop(1,    `rgb(${bot})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H - GROUND_H);
  }

  _rStars(ctx, alpha) {
    ctx.save();
    // Subtle nebula haze behind stars
    const ng = ctx.createRadialGradient(W * 0.6, H * 0.25, 20, W * 0.6, H * 0.25, 180);
    ng.addColorStop(0, `rgba(80,40,120,${(alpha * 0.15).toFixed(3)})`);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H - GROUND_H);
    ctx.restore();
    this.stars.forEach(s => s.draw(ctx, alpha));
  }

  _rMoon(ctx, alpha) {
    const mx = W * 0.75, my = 72;
    ctx.save();
    // Glow halo
    const halo = ctx.createRadialGradient(mx, my, 14, mx, my, 44);
    halo.addColorStop(0, `rgba(255,255,200,${(alpha * 0.18).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, 44, 0, Math.PI * 2); ctx.fill();
    // Moon body
    ctx.globalAlpha = alpha;
    const mg = ctx.createRadialGradient(mx - 5, my - 5, 2, mx, my, 18);
    mg.addColorStop(0, '#FFF9E0');
    mg.addColorStop(1, '#E8D870');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, Math.PI * 2); ctx.fill();
    // Craters
    ctx.globalAlpha = alpha * 0.16;
    ctx.fillStyle = '#8B7355';
    [[mx - 5, my + 4, 3], [mx + 6, my - 4, 2], [mx + 2, my + 8, 2]].forEach(([cx, cy, cr]) => {
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  _rMountains(ctx, pts, offset, color) {
    const mod = offset % MTN_W;
    ctx.fillStyle = color;
    for (let rep = -1; rep <= 2; rep++) {
      const dx = rep * MTN_W - mod;
      ctx.save(); ctx.translate(dx, 0);
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(MTN_W, H + 4); ctx.lineTo(0, H + 4); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _rGround(ctx) {
    const gy = H - GROUND_H;
    const gg = ctx.createLinearGradient(0, gy, 0, H);
    gg.addColorStop(0,    '#7CB342');
    gg.addColorStop(0.13, '#558B2F');
    gg.addColorStop(0.14, '#6D4C41');
    gg.addColorStop(1,    '#4E342E');
    ctx.fillStyle = gg;
    ctx.fillRect(0, gy, W, GROUND_H);

    // Scrolling diagonal stripe texture
    const sw = 28, off = this.groundOff % (sw * 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, gy + 14, W, GROUND_H - 14); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = -sw * 2 + off; x < W + sw; x += sw * 2)
      ctx.fillRect(x, gy + 14, sw, GROUND_H - 14);
    ctx.restore();

    // Grass tufts
    ctx.save();
    const tufts = 12;
    for (let i = 0; i < tufts; i++) {
      const tx = ((i / tufts * W) + this.groundOff * 3.5) % W;
      const th = 6 + Math.sin(i * 2.3) * 3;
      ctx.fillStyle = '#9CCC65';
      ctx.beginPath();
      ctx.moveTo(tx - 5, gy + 11);
      ctx.quadraticCurveTo(tx - 2, gy + 11 - th, tx, gy + 11 - th * 0.6);
      ctx.quadraticCurveTo(tx + 2, gy + 11 - th, tx + 5, gy + 11);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#9CCC65'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy + 11); ctx.lineTo(W, gy + 11); ctx.stroke();
  }

  _rHUD(ctx) {
    if (this.state !== S.PLAYING && this.state !== S.DYING) return;
    const disp = Math.floor(this.displayScore);
    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillText(disp, W / 2 + 2, 70);
    ctx.fillStyle = '#fff';
    ctx.fillText(disp, W / 2, 68);

    if (this.best > 0) {
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.46)';
      ctx.textAlign = 'right';
      ctx.fillText(`BEST  ${this.best}`, W - 48, 26);
    }

    // Combo indicator
    if (this.combo >= 2) {
      const age = performance.now() - this.lastScoreTs;
      const fade = clamp(1 - (age - 800) / 600, 0, 1);
      if (fade > 0) {
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`× ${this.combo}`, 24, 26);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  _rStartScreen(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 54px "Arial Black", Impact, sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(0,0,0,0.52)';
    ctx.strokeText('FLAPPY', W / 2, 172);
    ctx.fillStyle = '#f5c518';
    ctx.fillText('FLAPPY', W / 2, 172);

    ctx.strokeText('BIRD', W / 2, 228);
    ctx.fillStyle = '#fff';
    ctx.fillText('BIRD', W / 2, 228);

    // Pulsing prompt
    const pulse = 0.62 + 0.38 * Math.sin(performance.now() * 0.0038);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3;
    ctx.strokeText('TAP  or  SPACE  to  Start', W / 2, H - 162);
    ctx.fillStyle = '#fff';
    ctx.fillText('TAP  or  SPACE  to  Start', W / 2, H - 162);

    ctx.globalAlpha = 0.4;
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('P / ESC = Pause', W / 2, H - 134);
    ctx.restore();

    if (this.best > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      const bx = W / 2, by = H - 94;
      rrect(ctx, bx - 72, by - 22, 144, 38, 11);
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.44)';
      ctx.fillText('BEST', bx, by - 3);
      ctx.font = 'bold 21px Arial, sans-serif';
      ctx.fillStyle = '#f5c518';
      ctx.fillText(this.best, bx, by + 14);
      ctx.restore();
    }
  }

  _rPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center';
    rrect(ctx, W / 2 - 116, H / 2 - 70, 232, 140, 20);
    ctx.fillStyle = 'rgba(8,18,36,0.96)'; ctx.fill();
    ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = 'bold 38px "Arial Black", sans-serif';
    ctx.fillStyle = '#f5c518';
    ctx.fillText('PAUSED', W / 2, H / 2 - 12);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Press P or tap to resume', W / 2, H / 2 + 26);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText(`Score: ${this.score}  |  Best: ${this.best}`, W / 2, H / 2 + 52);
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    if (this.state !== S.GAMEOVER) this._update(dt);
    this._render();
    requestAnimationFrame(ts => this._loop(ts));
  }
}

window.addEventListener('DOMContentLoaded', () => { new FlappyGame(); });
