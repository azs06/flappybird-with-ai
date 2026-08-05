export type InputIntent = "flap" | "start" | "restart";

type Listener = (intent: InputIntent) => void;

/**
 * Unified desktop + mobile input.
 * Space / click / tap all produce flap; UI buttons fire start/restart separately.
 */
export class Input {
  private listeners = new Set<Listener>();
  private bound = false;
  private canvas: HTMLElement | null = null;

  /** Consume pending flap once per frame from polling path. */
  private flapQueued = false;

  bind(canvas: HTMLElement): void {
    if (this.bound) return;
    this.bound = true;
    this.canvas = canvas;

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    // Prevent double-tap zoom / pull-to-refresh fighting the game.
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
  }

  unbind(): void {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("pointerdown", this.onPointerDown);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(intent: InputIntent): void {
    if (intent === "flap") this.flapQueued = true;
    for (const l of this.listeners) l(intent);
  }

  /** Returns true once if a flap was requested since last poll. */
  consumeFlap(): boolean {
    if (!this.flapQueued) return false;
    this.flapQueued = false;
    return true;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === " ") {
      e.preventDefault();
      this.emit("flap");
    } else if (e.code === "Enter" || e.code === "KeyR") {
      this.emit("restart");
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Let UI buttons handle themselves.
    if (target.closest("button") || target.closest("a")) return;

    // Only flap when interacting with canvas or overlays that aren't buttons.
    const onCanvas = this.canvas?.contains(target) || target.id === "game-canvas";
    const onOverlay = target.closest(".overlay") != null;
    if (onCanvas || onOverlay || target.id === "ui-root" || target.closest("#ui-root")) {
      if (e.cancelable) e.preventDefault();
      this.emit("flap");
    }
  };
}

export const input = new Input();
