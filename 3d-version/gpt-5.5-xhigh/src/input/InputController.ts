export type GameAction = "flap";

type ActionHandler = (action: GameAction) => void;

export class InputController {
  private readonly disposers: Array<() => void> = [];

  constructor(target: HTMLElement, actionButton: HTMLButtonElement, onAction: ActionHandler) {
    const fire = () => onAction("flap");

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button")) {
        return;
      }

      event.preventDefault();
      fire();
    };

    const onButtonClick = (event: MouseEvent) => {
      event.preventDefault();
      fire();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") {
        return;
      }

      event.preventDefault();
      fire();
    };

    target.addEventListener("pointerdown", onPointerDown);
    actionButton.addEventListener("click", onButtonClick);
    window.addEventListener("keydown", onKeyDown);

    this.disposers.push(
      () => target.removeEventListener("pointerdown", onPointerDown),
      () => actionButton.removeEventListener("click", onButtonClick),
      () => window.removeEventListener("keydown", onKeyDown)
    );
  }

  dispose(): void {
    for (const dispose of this.disposers) {
      dispose();
    }

    this.disposers.length = 0;
  }
}
