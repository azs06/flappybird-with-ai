// audio.js — every sound is synthesized with the Web Audio API at play time:
// no audio files. Flaps are filtered noise (paper rustle), scores and the
// ambient loop are koto-ish plucks on a pentatonic scale, the crash is a
// noise thud with a falling sine.

const PENTATONIC = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33]; // D minor penta

export class SFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('paperwing.muted') === '1';
    this.ambientTimer = null;
  }

  // AudioContext can only start after a user gesture — call from any input.
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      // a touch of feedback delay makes the plucks feel like open air
      this.echo = this.ctx.createDelay(0.5);
      this.echo.delayTime.value = 0.28;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.3;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.25;
      this.echo.connect(fb).connect(this.echo);
      this.echo.connect(wet).connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('paperwing.muted', this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  noise({ duration, freqFrom, freqTo, gain, type = 'bandpass', q = 1 }) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freqFrom, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  pluck(freq, { gain = 0.18, duration = 0.9, echo = true } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    // a koto pluck dips very slightly flat as it decays
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.master);
    if (echo) g.connect(this.echo);
    osc.start(t);
    osc.stop(t + duration);
  }

  flap() {
    this.ensure();
    // paper rustle: a quick bright noise sweep
    this.noise({ duration: 0.14, freqFrom: 2400, freqTo: 500, gain: 0.5, q: 0.8 });
  }

  score() {
    this.ensure();
    const root = PENTATONIC[Math.floor(Math.random() * 3) + 2];
    this.pluck(root, { gain: 0.16, duration: 0.5 });
    setTimeout(() => this.ctx && this.pluck(root * 1.5, { gain: 0.12, duration: 0.6 }), 70);
  }

  hit() {
    this.ensure();
    this.noise({ duration: 0.35, freqFrom: 900, freqTo: 80, gain: 0.9, type: 'lowpass', q: 2 });
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  swoosh() {
    this.ensure();
    this.noise({ duration: 0.5, freqFrom: 300, freqTo: 1800, gain: 0.25, q: 2 });
  }

  // Sparse ambient plucks while flying — more texture than melody.
  startAmbient() {
    this.ensure();
    if (this.ambientTimer) return;
    const note = () => {
      if (!this.muted && this.ctx.state === 'running') {
        const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        this.pluck(f / 2, { gain: 0.05, duration: 1.6 });
      }
      this.ambientTimer = setTimeout(note, 1400 + Math.random() * 2200);
    };
    this.ambientTimer = setTimeout(note, 800);
  }

  stopAmbient() {
    clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
  }
}
