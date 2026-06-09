'use strict';

class AudioEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._ready = false;
    this._windNode = null;
    this._windGain = null;
  }

  _init() {
    if (this._ready) return true;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.72;
      this._master.connect(this._ctx.destination);
      this._ready = true;
      return true;
    } catch { return false; }
  }

  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  }

  _out(node) { node.connect(this._master); }

  // ── Ambient wind (loops while playing) ──────────
  startWind() {
    if (!this._init() || this._windNode) return;
    this._resume();
    const ctx = this._ctx;
    const sr = ctx.sampleRate;
    // 2-second looping noise buffer
    const len = sr * 2;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 320;

    // LFO for gentle volume swell
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);

    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0;
    lfoGain.connect(this._windGain.gain);

    src.connect(lpf);
    lpf.connect(this._windGain);
    this._out(this._windGain);
    src.start();
    lfo.start();
    this._windNode = src;
    this._windLFO = lfo;

    // Fade in
    this._windGain.gain.setTargetAtTime(0.055, ctx.currentTime, 1.2);
  }

  stopWind() {
    if (!this._windGain || !this._windNode) return;
    const t = this._ctx.currentTime;
    this._windGain.gain.setTargetAtTime(0, t, 0.5);
    const n = this._windNode, l = this._windLFO;
    setTimeout(() => { try { n.stop(); l.stop(); } catch {} }, 2000);
    this._windNode = null;
    this._windLFO = null;
    this._windGain = null;
  }

  // ── Flap: layered whoosh + tonal sweep ──────────
  playFlap() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const sr = ctx.sampleRate;

    // Noise burst
    const len = Math.floor(sr * 0.1);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = i < len * 0.15 ? i / (len * 0.15) : 1 - (i - len * 0.15) / (len * 0.85);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 1100; bpf.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(bpf); bpf.connect(g); this._out(g);
    src.start(t);

    // Tonal sweep
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.09);
    og.gain.setValueAtTime(0.065, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(og); this._out(og);
    osc.start(t); osc.stop(t + 0.09);
  }

  // ── Score: ascending arpeggio (speed varies with combo) ──
  playScore(combo = 1) {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const freqs = combo >= 3
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5]  // 5-note fanfare for big combo
      : [523.25, 659.25, 783.99, 1046.5];
    const step = Math.max(0.042, 0.065 - combo * 0.004);
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === freqs.length - 1 ? 'triangle' : 'square';
      osc.frequency.value = freq;
      const s = t + i * step;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.075, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.14);
      osc.connect(g); this._out(g);
      osc.start(s); osc.stop(s + 0.14);
    });
  }

  // ── Milestone fanfare (score 10, 20, 30) ────────
  playMilestone() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const notes = [
      { f: 523, s: 0 }, { f: 659, s: 0.08 }, { f: 784, s: 0.16 },
      { f: 1047, s: 0.24 }, { f: 1319, s: 0.34 }, { f: 1568, s: 0.44 }
    ];
    notes.forEach(({ f, s }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t + s);
      g.gain.linearRampToValueAtTime(0.1, t + s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + s + 0.22);
      osc.connect(g); this._out(g);
      osc.start(t + s); osc.stop(t + s + 0.22);
    });
  }

  // ── Hit: low crunch + thud ───────────────────────
  playHit() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.09);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(lpf); lpf.connect(g); this._out(g);
    src.start(t);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(og); this._out(og);
    osc.start(t); osc.stop(t + 0.14);
  }

  // ── Die: descending wail ─────────────────────────
  playDie() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.65);
    g.gain.setValueAtTime(0.22, t);
    g.gain.setValueAtTime(0.22, t + 0.38);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(g); this._out(g);
    osc.start(t); osc.stop(t + 0.65);
  }

  playBeep(freq = 880, dur = 0.07) {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); this._out(g);
    osc.start(t); osc.stop(t + dur);
  }
}

const audio = new AudioEngine();
