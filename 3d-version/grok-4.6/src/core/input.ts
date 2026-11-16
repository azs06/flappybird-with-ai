export class Input {
  flapQueued = false;
  pausePressed = false;
  mutePressed = false;
  private bound = false;

  attach(target: HTMLElement): void {
    if (this.bound) return;
    this.bound = true;

    const onFlap = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a, input, [data-ui]")) return;
      this.flapQueued = true;
      e.preventDefault();
    };

    target.addEventListener("pointerdown", onFlap);
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        this.flapQueued = true;
        e.preventDefault();
      } else if (e.code === "KeyP" || e.code === "Escape") {
        this.pausePressed = true;
      } else if (e.code === "KeyM") {
        this.mutePressed = true;
      }
    });
  }

  consumeFlap(): boolean {
    const v = this.flapQueued;
    this.flapQueued = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  consumeMute(): boolean {
    const v = this.mutePressed;
    this.mutePressed = false;
    return v;
  }
}

export const input = new Input();
