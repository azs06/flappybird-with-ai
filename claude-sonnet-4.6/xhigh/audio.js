'use strict';

class AudioEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._ready = false;
  }

  // Lazy-init: browsers require a user gesture before creating AudioContext
  _init() {
    if (this._ready) return true;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.72;
      this._master.connect(this._ctx.destination);
      this._ready = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  _resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  }

  _out(node) {
    node.connect(this._master);
  }

  // ── Flap: soft wing whoosh + tonal sweep ────────
  playFlap() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;

    // Noise burst shaped like a wing beat
    const sr = this._ctx.sampleRate;
    const len = Math.floor(sr * 0.1);
    const buf = this._ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = i < len * 0.15
        ? i / (len * 0.15)
        : 1 - (i - len * 0.15) / (len * 0.85);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const bpf = this._ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 900;
    bpf.Q.value = 0.6;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(bpf); bpf.connect(g); this._out(g);
    src.start(t);

    // Tonal sweep down
    const osc = this._ctx.createOscillator();
    const og = this._ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.09);
    og.gain.setValueAtTime(0.07, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(og); this._out(og);
    osc.start(t); osc.stop(t + 0.09);
  }

  // ── Score: bright ascending arpeggio ────────────
  playScore() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const s = t + i * 0.065;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.08, s + 0.01);
      g.gain.setValueAtTime(0.08, s + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.13);
      osc.connect(g); this._out(g);
      osc.start(s); osc.stop(s + 0.13);
    });
  }

  // ── Hit: low crunch noise + thud ────────────────
  playHit() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;

    const sr = this._ctx.sampleRate;
    const len = Math.floor(sr * 0.09);
    const buf = this._ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const lpf = this._ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 280;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(lpf); lpf.connect(g); this._out(g);
    src.start(t);

    // Low thud
    const osc = this._ctx.createOscillator();
    const og = this._ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.13);
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(og); this._out(og);
    osc.start(t); osc.stop(t + 0.13);
  }

  // ── Die: descending wah then ground bounce ───────
  playDie() {
    if (!this._init()) return;
    this._resume();
    const t = this._ctx.currentTime;

    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.6);
    g.gain.setValueAtTime(0.22, t);
    g.gain.setValueAtTime(0.22, t + 0.38);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g); this._out(g);
    osc.start(t); osc.stop(t + 0.6);
  }

  // ── Soft UI beep (menu interactions) ────────────
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
