import type { SimulationEvent } from "../simulation/types";

export class SoundEngine {
  private context: AudioContext | null = null;

  handleEvents(events: SimulationEvent[]): void {
    if (events.length === 0) {
      return;
    }

    this.ensureContext();

    for (const event of events) {
      if (event.type === "flap") {
        this.tone(420, 0.035, "triangle", 0.055);
      }

      if (event.type === "score") {
        this.tone(720, 0.08, "sine", 0.075);
      }

      if (event.type === "crash") {
        this.tone(130, 0.16, "sawtooth", 0.08);
      }
    }
  }

  private ensureContext(): void {
    if (this.context !== null) {
      if (this.context.state === "suspended") {
        void this.context.resume();
      }
      return;
    }

    this.context = new AudioContext();
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (this.context === null) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.025);
  }
}
