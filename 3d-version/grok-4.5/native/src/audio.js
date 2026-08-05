/** Lightweight procedural audio via Web Audio API — no external assets. */

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      this.enabled = false;
      return;
    }
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone({ freq = 440, type = "sine", duration = 0.15, gain = 0.2, slide = 0, delay = 0 }) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  flap() {
    this.tone({ freq: 420, type: "triangle", duration: 0.1, gain: 0.18, slide: 180 });
    this.tone({ freq: 680, type: "sine", duration: 0.08, gain: 0.08, slide: 120, delay: 0.02 });
  }

  score() {
    this.tone({ freq: 660, type: "sine", duration: 0.1, gain: 0.14 });
    this.tone({ freq: 880, type: "triangle", duration: 0.14, gain: 0.1, delay: 0.07 });
    this.tone({ freq: 1175, type: "sine", duration: 0.16, gain: 0.08, delay: 0.14 });
  }

  crash() {
    this.tone({ freq: 180, type: "sawtooth", duration: 0.28, gain: 0.12, slide: -120 });
    this.tone({ freq: 90, type: "square", duration: 0.35, gain: 0.08, slide: -40, delay: 0.04 });
  }

  ui() {
    this.tone({ freq: 520, type: "sine", duration: 0.08, gain: 0.1 });
    this.tone({ freq: 780, type: "triangle", duration: 0.1, gain: 0.08, delay: 0.04 });
  }

  tick() {
    this.tone({ freq: 300, type: "sine", duration: 0.06, gain: 0.08 });
  }

  go() {
    this.tone({ freq: 520, type: "triangle", duration: 0.12, gain: 0.12 });
    this.tone({ freq: 780, type: "sine", duration: 0.16, gain: 0.1, delay: 0.05 });
  }
}
