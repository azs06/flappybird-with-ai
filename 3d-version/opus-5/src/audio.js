/**
 * Procedural sound. No audio files, no loading, no CORS.
 *
 * Every effect is synthesised from oscillators and a shared noise buffer.
 * Browsers block AudioContext until a user gesture, so `unlock()` is called
 * from the first input event rather than at construction.
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('fb3d.muted') === '1';
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    // 2 s of white noise, reused by every noise-based effect.
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._startWind();
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('fb3d.muted', m ? '1' : '0');
    if (this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  get t() {
    return this.ctx.currentTime;
  }

  _noise(dur, { freq = 1200, q = 1, type = 'bandpass', gain = 0.3, sweep = null } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = freq;
    flt.Q.value = q;
    if (sweep) flt.frequency.exponentialRampToValueAtTime(sweep, this.t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.t);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    src.connect(flt).connect(g).connect(this.master);
    src.start();
    src.stop(this.t + dur + 0.02);
  }

  _tone(freq, dur, { type = 'sine', gain = 0.22, to = null, delay = 0, attack = 0.006 } = {}) {
    const t0 = this.t + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  // ── Wind bed: a filtered noise loop whose volume tracks flight speed ──────
  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 420;
    flt.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(flt).connect(this.windGain).connect(this.master);
    src.start();
    this.windFilter = flt;
  }

  /** @param {number} intensity 0..1 */
  wind(intensity) {
    if (!this.ctx || !this.windGain) return;
    this.windGain.gain.setTargetAtTime(intensity * 0.16, this.t, 0.25);
    this.windFilter.frequency.setTargetAtTime(320 + intensity * 520, this.t, 0.3);
  }

  flap() {
    if (!this.ctx) return;
    this._noise(0.16, { freq: 900, sweep: 260, q: 1.4, gain: 0.24 });
    this._tone(220, 0.13, { type: 'triangle', to: 420, gain: 0.1 });
  }

  score() {
    if (!this.ctx) return;
    this._tone(880, 0.09, { type: 'square', gain: 0.09 });
    this._tone(1320, 0.13, { type: 'square', gain: 0.07, delay: 0.06 });
  }

  gem() {
    if (!this.ctx) return;
    // Rising major arpeggio — reads as "reward" almost universally.
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      this._tone(f, 0.16, { type: 'triangle', gain: 0.11, delay: i * 0.045 })
    );
  }

  milestone() {
    if (!this.ctx) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._tone(f, 0.3, { type: 'sawtooth', gain: 0.07, delay: i * 0.07 })
    );
  }

  hit() {
    if (!this.ctx) return;
    this._noise(0.3, { freq: 260, sweep: 60, q: 0.8, gain: 0.5, type: 'lowpass' });
    this._tone(150, 0.28, { type: 'square', to: 48, gain: 0.28 });
  }

  splat() {
    if (!this.ctx) return;
    this._noise(0.4, { freq: 500, sweep: 90, q: 0.5, gain: 0.4, type: 'lowpass' });
    this._tone(90, 0.45, { type: 'sawtooth', to: 35, gain: 0.22 });
  }

  die() {
    if (!this.ctx) return;
    [660, 520, 415, 300].forEach((f, i) =>
      this._tone(f, 0.28, { type: 'triangle', gain: 0.13, delay: i * 0.11 })
    );
  }
}
