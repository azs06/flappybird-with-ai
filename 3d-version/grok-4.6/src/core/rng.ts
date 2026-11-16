/** Mulberry32 — all gameplay randomness goes through here. */
export class Rng {
  private s: number;

  constructor(seed = 0xA7E110) {
    this.s = seed >>> 0;
  }

  setSeed(seed: number): void {
    this.s = seed >>> 0;
  }

  getSeed(): number {
    return this.s >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  pick<T>(list: readonly T[]): T {
    return list[this.int(0, list.length - 1)]!;
  }

  signed(): number {
    return this.next() * 2 - 1;
  }
}

export const rng = new Rng();
