/**
 * Tiny procedural audio bus — no external assets required.
 * WebAudio oscillators + noise bursts for flap / score / crash / ambience.
 */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private musicNodes: OscillatorNode[] = [];
  private musicStarted = false;
  private unlocked = false;

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyGains();
  }

  isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') {
      try {
        await Promise.race([
          ctx.resume(),
          new Promise<void>((r) => setTimeout(r, 300)),
        ]);
      } catch {
        /* autoplay policy */
      }
    }
    // Mark unlocked even if still suspended so gameplay never blocks on audio.
    this.unlocked = true;
    if (ctx.state === 'running' && !this.musicStarted) {
      this.startAmbience();
    }
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyGains();
    }
    return this.ctx;
  }

  private applyGains(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    const m = this.muted ? 0 : 1;
    this.master.gain.value = m * 0.85;
    this.musicGain.gain.value = 0.22;
    this.sfxGain.gain.value = 0.7;
  }

  private startAmbience(): void {
    if (!this.ctx || !this.musicGain || this.musicStarted) return;
    this.musicStarted = true;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Soft drifting pads
    const notes = [110, 138.59, 164.81, 220];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = notes[i]!;
      g.gain.value = 0.04 + i * 0.01;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.08 + i * 0.03;
      lfoG.gain.value = 6 + i * 2;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      lfo.start(now);
      this.musicNodes.push(osc, lfo);
    }
  }

  flap(): void {
    this.blip(520, 780, 0.07, 'square', 0.12);
  }

  score(): void {
    this.blip(660, 990, 0.1, 'triangle', 0.18);
    this.blip(990, 1320, 0.08, 'sine', 0.12, 0.05);
  }

  crash(): void {
    const ctx = this.ensure();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);

    this.blip(180, 60, 0.2, 'sawtooth', 0.25);
  }

  whoosh(): void {
    this.blip(240, 120, 0.15, 'sine', 0.08);
  }

  private blip(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
  ): void {
    const ctx = this.ensure();
    if (!this.sfxGain) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
}
