import * as THREE from 'three';

/** Lightweight camera / world shake with decay. */
export class ScreenShake {
  private trauma = 0;
  private readonly offset = new THREE.Vector3();
  private time = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): THREE.Vector3 {
    this.time += dt;
    if (this.trauma <= 0.001) {
      this.trauma = 0;
      this.offset.set(0, 0, 0);
      return this.offset;
    }
    const shake = this.trauma * this.trauma;
    const t = this.time * 42;
    this.offset.set(
      Math.sin(t * 1.7) * shake * 0.22,
      Math.cos(t * 2.1) * shake * 0.18,
      Math.sin(t * 1.3) * shake * 0.08,
    );
    this.trauma = Math.max(0, this.trauma - dt * 2.8);
    return this.offset;
  }

  reset(): void {
    this.trauma = 0;
    this.offset.set(0, 0, 0);
  }
}
