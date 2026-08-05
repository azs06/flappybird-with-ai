export type InputIntent = {
  flapPressed: boolean;
  pausePressed: boolean;
  mutePressed: boolean;
};

/**
 * Collects discrete intents each frame. Edge-triggered so holding space
 * does not spam flaps.
 */
export class Input {
  private flapQueued = false;
  private pauseQueued = false;
  private muteQueued = false;
  private bound = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const k = e.code;
    if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') {
      e.preventDefault();
      this.flapQueued = true;
    } else if (k === 'KeyP' || k === 'Escape') {
      e.preventDefault();
      this.pauseQueued = true;
    } else if (k === 'KeyM') {
      e.preventDefault();
      this.muteQueued = true;
    }
  };

  private readonly onPointer = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('button, a, input, .overlay-panel')) return;
    this.flapQueued = true;
  };

  bind(canvas: HTMLElement, touchZone: HTMLElement): void {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointer);
    touchZone.addEventListener('pointerdown', this.onPointer);
  }

  unbind(canvas: HTMLElement, touchZone: HTMLElement): void {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener('keydown', this.onKeyDown);
    canvas.removeEventListener('pointerdown', this.onPointer);
    touchZone.removeEventListener('pointerdown', this.onPointer);
  }

  /** Call once per frame after reading. */
  consume(): InputIntent {
    const intent: InputIntent = {
      flapPressed: this.flapQueued,
      pausePressed: this.pauseQueued,
      mutePressed: this.muteQueued,
    };
    this.flapQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;
    return intent;
  }

  /** External UI buttons can queue a flap (start/retry feel). */
  queueFlap(): void {
    this.flapQueued = true;
  }
}
