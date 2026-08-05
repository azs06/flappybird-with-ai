/**
 * Procedural Web Audio SFX — no external assets required.
 * Unlock on first user gesture.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  muted = false;

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.unlocked = true;
    this.ambient();
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "sine",
    gain = 0.2,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noiseBurst(dur: number, gain = 0.12, hp = 400): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.now();
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  flap(): void {
    this.tone(520, 0.09, "triangle", 0.14, 780);
    this.tone(780, 0.07, "sine", 0.06, 980);
  }

  score(): void {
    this.tone(660, 0.08, "sine", 0.12);
    this.tone(990, 0.12, "triangle", 0.1, 1320);
  }

  hit(): void {
    this.noiseBurst(0.18, 0.2, 180);
    this.tone(140, 0.22, "sawtooth", 0.12, 50);
  }

  whoosh(): void {
    this.noiseBurst(0.12, 0.06, 900);
  }

  ui(): void {
    this.tone(440, 0.06, "sine", 0.08);
    this.tone(660, 0.1, "triangle", 0.07);
  }

  private ambient(): void {
    if (!this.ctx || !this.master || this.muted) return;
    // Soft drifting pad.
    const t0 = this.now();
    const makePad = (freq: number, type: OscillatorType, gain: number) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      lfo.type = "sine";
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      lfoGain.gain.value = freq * 0.004;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      g.gain.value = gain;
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t0);
      lfo.start(t0);
    };
    makePad(110, "sine", 0.018);
    makePad(165, "triangle", 0.01);
  }
}

export const audio = new GameAudio();
