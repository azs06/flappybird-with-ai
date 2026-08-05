// audio.js — every sound is synthesized with the Web Audio API at play
// time: no audio files. Flaps are a bright filtered shimmer, scores are
// bell plucks on a whole-tone scale (the ambiguous, glassy scale Debussy
// used for shimmering water and light), the crash is glass noise plus a
// scatter of tiny high pitched shard-clicks, and a soft sub-bass drone with
// a slow LFO hums underneath flight like a struck singing bowl.

const WHOLE_TONE = [261.63, 293.66, 329.63, 369.99, 415.3, 466.16]; // C whole-tone

export class SFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('prism.muted') === '1';
    this.ambientTimer = null;
    this.drone = null;
  }

  // AudioContext can only start after a user gesture — call from any input.
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      // a glassy feedback delay so plucks ring like struck crystal
      this.echo = this.ctx.createDelay(0.6);
      this.echo.delayTime.value = 0.34;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.34;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.22;
      this.echo.connect(fb).connect(this.echo);
      this.echo.connect(wet).connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('prism.muted', this.muted ? '1' : '0');
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

  // a bell: fundamental sine + a quiet detuned fifth for shimmer, both decaying
  bell(freq, { gain = 0.16, duration = 1.0, echo = true } = {}) {
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    g.connect(this.master);
    if (echo) g.connect(this.echo);

    const fundamental = this.ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, t);
    fundamental.connect(g);
    fundamental.start(t);
    fundamental.stop(t + duration);

    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 1.5, t);
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.35;
    shimmer.connect(shimmerGain).connect(g);
    shimmer.start(t);
    shimmer.stop(t + duration);
  }

  flap() {
    this.ensure();
    this.noise({ duration: 0.16, freqFrom: 3200, freqTo: 900, gain: 0.45, type: 'highpass', q: 0.7 });
  }

  score() {
    this.ensure();
    const root = WHOLE_TONE[Math.floor(Math.random() * 3) + 2];
    this.bell(root, { gain: 0.17, duration: 0.55 });
    setTimeout(() => this.ctx && this.bell(root * 2, { gain: 0.1, duration: 0.7 }), 65);
  }

  hit() {
    this.ensure();
    this.noise({ duration: 0.4, freqFrom: 4500, freqTo: 200, gain: 0.85, type: 'bandpass', q: 1.4 });
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.45);
    // a scatter of tiny shard-clicks, like the bird's facets tinkling apart
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        this.bell(1200 + Math.random() * 1800, { gain: 0.05, duration: 0.15, echo: false });
      }, i * 28);
    }
  }

  swoosh() {
    this.ensure();
    this.noise({ duration: 0.5, freqFrom: 400, freqTo: 2200, gain: 0.22, q: 2 });
  }

  buildDrone() {
    const root = this.ctx.createOscillator();
    root.type = 'sine';
    root.frequency.value = 98;
    const fifth = this.ctx.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.value = 98 * 1.5;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain).connect(filter.frequency);
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    root.connect(filter);
    fifth.connect(filter);
    filter.connect(gain).connect(this.master);
    root.start(); fifth.start(); lfo.start();
    this.drone = { gain };
  }

  // sparse ambient bell plucks plus a soft sustained drone while flying
  startAmbient() {
    this.ensure();
    if (!this.drone) this.buildDrone();
    this.drone.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.drone.gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 1.2);
    if (this.ambientTimer) return;
    const note = () => {
      if (!this.muted && this.ctx.state === 'running') {
        const f = WHOLE_TONE[Math.floor(Math.random() * WHOLE_TONE.length)];
        this.bell(f / 2, { gain: 0.045, duration: 1.8 });
      }
      this.ambientTimer = setTimeout(note, 1500 + Math.random() * 2200);
    };
    this.ambientTimer = setTimeout(note, 700);
  }

  stopAmbient() {
    if (this.drone) this.drone.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
  }
}
