import { CONFIG } from '../game/config.js';

// Fully procedural WebAudio SFX — no external assets. The audio-generator
// credential (ELEVENLABS_API_KEY) is MISSING on this machine, so synthesized
// cues cover flap / score / death / milestone / UI plus a soft wind bed.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.windGain = null;
    this.muted = localStorage.getItem(CONFIG.storageKeys.muted) === '1';
  }

  // Must be called from a user gesture (autoplay policy).
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this._startWind();
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem(CONFIG.storageKeys.muted, m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  _noiseBuffer(seconds = 1) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(2.5);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.55;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.028;
    src.connect(filter).connect(this.windGain).connect(this.master);
    src.start();
    // Slow swell so the wind feels alive.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.014;
    lfo.connect(lfoGain).connect(this.windGain.gain);
    lfo.start();
  }

  _blip({ type = 'sine', from = 440, to = from, dur = 0.12, vol = 0.25, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', when = 0, slideTo = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.min(dur + 0.1, 1));
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  flap() {
    this._blip({ type: 'triangle', from: 520, to: 920, dur: 0.09, vol: 0.22 });
    this._noise({ dur: 0.08, vol: 0.1, freq: 2400, q: 0.8, slideTo: 900 });
  }

  score() {
    this._blip({ type: 'sine', from: 659, to: 659, dur: 0.09, vol: 0.22 });
    this._blip({ type: 'sine', from: 988, to: 988, dur: 0.16, vol: 0.22, when: 0.07 });
    this._blip({ type: 'sine', from: 1976, to: 2637, dur: 0.2, vol: 0.08, when: 0.07 });
  }

  nearMiss() {
    this._noise({ dur: 0.22, vol: 0.16, freq: 700, q: 0.6, slideTo: 2400 });
  }

  milestone() {
    this._noise({ dur: 0.5, vol: 0.14, freq: 500, q: 0.5, slideTo: 3200 });
    this._blip({ type: 'sine', from: 523, to: 1047, dur: 0.4, vol: 0.14 });
  }

  hit() {
    this._noise({ dur: 0.28, vol: 0.5, freq: 300, q: 0.4, type: 'lowpass' });
    this._blip({ type: 'sine', from: 160, to: 42, dur: 0.42, vol: 0.5 });
  }

  thud() {
    this._noise({ dur: 0.16, vol: 0.4, freq: 190, q: 0.5, type: 'lowpass' });
    this._blip({ type: 'sine', from: 95, to: 38, dur: 0.3, vol: 0.42 });
  }

  click() {
    this._blip({ type: 'square', from: 880, to: 660, dur: 0.05, vol: 0.08 });
  }
}
