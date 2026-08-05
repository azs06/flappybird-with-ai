export class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  private tone(opts: {
    type: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    vol: number;
    delay?: number;
    curve?: number;
  }): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private noise(opts: { dur: number; vol: number; from: number; to?: number; q?: number; delay?: number }): void {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.muted) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = opts.q ?? 1;
    filter.frequency.setValueAtTime(opts.from, t0);
    if (opts.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(10, opts.to), t0 + opts.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  flap(): void {
    this.tone({ type: 'triangle', from: 520, to: 880, dur: 0.09, vol: 0.16 });
    this.noise({ dur: 0.08, vol: 0.1, from: 900, to: 2200 });
  }

  score(): void {
    this.tone({ type: 'sine', from: 988, dur: 0.09, vol: 0.18 });
    this.tone({ type: 'sine', from: 1319, dur: 0.14, vol: 0.18, delay: 0.07 });
  }

  hit(): void {
    this.noise({ dur: 0.16, vol: 0.4, from: 1400, to: 120, q: 0.7 });
    this.tone({ type: 'square', from: 180, to: 55, dur: 0.2, vol: 0.22 });
  }

  die(): void {
    this.tone({ type: 'sawtooth', from: 640, to: 110, dur: 0.55, vol: 0.16, delay: 0.12 });
  }

  swoosh(): void {
    this.noise({ dur: 0.28, vol: 0.12, from: 350, to: 1600 });
  }

  medal(): void {
    this.tone({ type: 'sine', from: 784, dur: 0.1, vol: 0.14 });
    this.tone({ type: 'sine', from: 1047, dur: 0.1, vol: 0.14, delay: 0.09 });
    this.tone({ type: 'sine', from: 1568, dur: 0.22, vol: 0.14, delay: 0.18 });
  }
}
