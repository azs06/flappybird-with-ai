/** Procedural mixer. ElevenLabs was unavailable; this is the ship path. */
export class GameAudio {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private started = false;

  unlock(): void {
    if (this.started) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      return;
    }
    this.started = true;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3.2;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.startWind();
  }

  setMuted(v: boolean): void {
    this.muted = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.04);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setWind(amount: number): void {
    if (!this.wind || !this.ctx) return;
    this.wind.gain.setTargetAtTime(0.02 + amount * 0.07, this.ctx.currentTime, 0.2);
  }

  flap(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const noise = this.noise(0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(620, t);
    bp.frequency.exponentialRampToValueAtTime(240, t + 0.11);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    noise.connect(bp);
    bp.connect(g);
    g.connect(master);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.08, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(og);
    og.connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
    window.setTimeout(() => noise.disconnect(), 200);
  }

  score(perfect: boolean): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const notes = perfect ? [784, 988, 1175] : [659, 880];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const g = ctx.createGain();
      const start = t + i * 0.045;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(perfect ? 0.16 : 0.11, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  die(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.52);
    const noise = this.noise(0.28);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(master);
    window.setTimeout(() => noise.disconnect(), 400);
  }

  ui(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  private startWind(): void {
    if (!this.ctx || !this.master) return;
    const noise = this.noise(60 * 60);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    noise.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    this.wind = g;
  }

  private noise(seconds: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.35;
      data[i] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.start();
    return src;
  }
}

export const audio = new GameAudio();
