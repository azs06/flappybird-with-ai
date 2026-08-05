const STORAGE_KEY = "flappy3d_glm_sound";

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = localStorage.getItem(STORAGE_KEY) !== "off";
    this._unlocked = false;
  }

  unlock() {
    if (this._unlocked) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.5 : 0;
      this.master.connect(this.ctx.destination);
      this._unlocked = true;
    } catch (e) {
      this._unlocked = false;
    }
  }

  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    if (this.master) this.master.gain.value = on ? 0.5 : 0;
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  _now() { return this.ctx.currentTime; }

  _tone({ freq, type = "sine", dur = 0.15, gain = 0.4, slideTo, attack = 0.005, release = 0.08 }) {
    if (!this._unlocked || !this.enabled) return;
    const t = this._now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + release + 0.02);
  }

  _noise({ dur = 0.2, gain = 0.35, filterFreq = 1200, filterType = "lowpass", q = 1 }) {
    if (!this._unlocked || !this.enabled) return;
    const t = this._now();
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  flap() {
    this._tone({ freq: 480, slideTo: 760, type: "triangle", dur: 0.12, gain: 0.32, release: 0.05 });
    this._noise({ dur: 0.06, gain: 0.08, filterFreq: 2600, filterType: "highpass", q: 0.7 });
  }

  score() {
    this._tone({ freq: 660, type: "triangle", dur: 0.09, gain: 0.3, release: 0.05 });
    window.setTimeout(() => this._tone({ freq: 990, type: "triangle", dur: 0.12, gain: 0.3, release: 0.07 }), 70);
  }

  hit() {
    this._noise({ dur: 0.32, gain: 0.5, filterFreq: 700, filterType: "lowpass", q: 2 });
    this._tone({ freq: 180, slideTo: 60, type: "sawtooth", dur: 0.28, gain: 0.4, release: 0.1 });
  }

  pass() {
    this._noise({ dur: 0.18, gain: 0.06, filterFreq: 900, filterType: "bandpass", q: 0.8 });
  }

  swoosh() {
    this._tone({ freq: 300, slideTo: 520, type: "sine", dur: 0.18, gain: 0.18, release: 0.06 });
  }
}

export const audio = new AudioEngine();
