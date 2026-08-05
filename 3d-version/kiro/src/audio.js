/**
 * Procedural sound effects — no audio assets, everything is synthesised with
 * the WebAudio API. The context is created lazily on the first user gesture so
 * browsers don't block it with autoplay policies.
 */
export class SoundKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 0.4);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  get #ready() {
    return this.ctx && !this.muted;
  }

  #tone({ type = 'sine', from, to, duration, gain = 0.4, delay = 0, curve = 'exp' }) {
    if (!this.#ready) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
      else osc.frequency.linearRampToValueAtTime(to, t0 + duration);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  #noise({ duration = 0.12, gain = 0.3, filterFrom = 2400, filterTo = 400, delay = 0 }) {
    if (!this.#ready || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(filterFrom, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t0 + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  flap() {
    this.#noise({ duration: 0.13, gain: 0.22, filterFrom: 1100, filterTo: 320 });
    this.#tone({ type: 'triangle', from: 320, to: 620, duration: 0.11, gain: 0.16 });
  }

  score(n = 1) {
    // Every 10th point gets a brighter arpeggio.
    const base = 660 * (n % 10 === 0 ? 1.5 : 1);
    this.#tone({ type: 'square', from: base, to: base, duration: 0.07, gain: 0.13 });
    this.#tone({ type: 'square', from: base * 1.5, to: base * 1.5, duration: 0.1, gain: 0.12, delay: 0.07 });
    if (n % 10 === 0) {
      this.#tone({ type: 'square', from: base * 2, to: base * 2, duration: 0.14, gain: 0.11, delay: 0.15 });
    }
  }

  hit() {
    this.#noise({ duration: 0.2, gain: 0.5, filterFrom: 1800, filterTo: 120 });
    this.#tone({ type: 'sawtooth', from: 180, to: 60, duration: 0.22, gain: 0.3 });
  }

  die() {
    this.#tone({ type: 'triangle', from: 520, to: 90, duration: 0.55, gain: 0.22, delay: 0.08 });
    this.#tone({ type: 'sine', from: 260, to: 45, duration: 0.6, gain: 0.16, delay: 0.08 });
  }

  thud() {
    this.#noise({ duration: 0.16, gain: 0.35, filterFrom: 500, filterTo: 80 });
    this.#tone({ type: 'sine', from: 110, to: 40, duration: 0.18, gain: 0.25 });
  }

  swoosh() {
    this.#noise({ duration: 0.3, gain: 0.16, filterFrom: 300, filterTo: 2200 });
  }
}
