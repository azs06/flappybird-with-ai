// audio.js — procedural Web Audio: flap, score chime, hit, ambient drone

export class SFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('spark_muted') === '1';
    this.master = null;
    this.ambientNodes = null;
    this._unlocked = false;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
  }

  unlock() {
    this._ensure();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._unlocked = true;
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('spark_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _env(gain, t0, a, d, s, r, peak = 1) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t0 + a + d);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
  }

  flap() {
    this._ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.14);
    f.type = 'lowpass';
    f.frequency.value = 1200;
    this._env(g, t, 0.01, 0.05, 0.3, 0.1, 0.35);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t);
    o.stop(t + 0.22);

    // soft noise whoosh
    const n = this._noise(0.12);
    if (n) {
      const ng = this.ctx.createGain();
      const bf = this.ctx.createBiquadFilter();
      bf.type = 'bandpass';
      bf.frequency.value = 800;
      bf.Q.value = 0.7;
      this._env(ng, t, 0.005, 0.04, 0.2, 0.08, 0.12);
      n.connect(bf); bf.connect(ng); ng.connect(this.master);
      n.start(t);
      n.stop(t + 0.15);
    }
  }

  score() {
    this._ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const t0 = t + i * 0.05;
      this._env(g, t0, 0.01, 0.08, 0.4, 0.25, 0.22);
      o.connect(g); g.connect(this.master);
      o.start(t0);
      o.stop(t0 + 0.4);
    });
  }

  hit() {
    this._ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    this._env(g, t, 0.005, 0.1, 0.4, 0.3, 0.4);
    o.connect(g); g.connect(this.master);
    o.start(t);
    o.stop(t + 0.5);

    const n = this._noise(0.4);
    if (n) {
      const ng = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(2000, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.35);
      this._env(ng, t, 0.005, 0.08, 0.5, 0.3, 0.35);
      n.connect(f); f.connect(ng); ng.connect(this.master);
      n.start(t);
      n.stop(t + 0.45);
    }
  }

  swoosh() {
    this._ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this._noise(0.35);
    if (!n) return;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.2);
    f.Q.value = 0.8;
    this._env(g, t, 0.02, 0.12, 0.3, 0.15, 0.18);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t);
    n.stop(t + 0.4);
  }

  startAmbient() {
    this._ensure();
    if (!this.ctx || this.ambientNodes) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const drones = [55, 82.5, 110];
    const nodes = [];

    drones.forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.04 - i * 0.01, t + 1.5);
      lfo.frequency.value = 0.08 + i * 0.03;
      lfoG.gain.value = 0.008;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      o.connect(g);
      g.connect(this.master);
      o.start();
      lfo.start();
      nodes.push(o, lfo, g);
    });

    // High airy shimmer
    const shim = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    shim.type = 'sine';
    shim.frequency.value = 880;
    sg.gain.value = 0.008;
    shim.connect(sg);
    sg.connect(this.master);
    shim.start();
    nodes.push(shim, sg);

    this.ambientNodes = nodes;
  }

  stopAmbient() {
    if (!this.ambientNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambientNodes.forEach((n) => {
      if (n.gain) {
        try {
          n.gain.cancelScheduledValues(t);
          n.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        } catch (_) { /* ignore */ }
      }
      if (n.stop) {
        try { n.stop(t + 0.7); } catch (_) { /* ignore */ }
      }
    });
    this.ambientNodes = null;
  }

  _noise(duration) {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
}
