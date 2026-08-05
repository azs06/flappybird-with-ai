/**
 * Input plumbing.
 *
 * Every "go" gesture — space, W, up-arrow, click, tap — funnels into a single
 * `onFlap`, so the game loop never asks *how* the player asked to fly.
 */
export class Input {
  constructor(target, handlers) {
    this.h = handlers;

    const flap = (e) => {
      // Let the HUD's own buttons work without also flapping the bird.
      if (e.target && e.target.closest && e.target.closest('button, a')) return;
      if (e.cancelable) e.preventDefault();
      this.h.onFlap();
    };

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat) return; // holding space must not machine-gun the bird
        switch (e.code) {
          case 'Space':
          case 'ArrowUp':
          case 'KeyW':
            e.preventDefault();
            this.h.onFlap();
            break;
          case 'KeyP':
          case 'Escape':
            this.h.onPause();
            break;
          case 'KeyM':
            this.h.onMute();
            break;
          case 'KeyR':
            this.h.onRestart();
            break;
        }
      },
      { passive: false }
    );

    target.addEventListener('pointerdown', flap);
    // Suppress the double-tap-to-zoom delay and the synthetic click that
    // follows a touch; pointerdown already handled it.
    target.addEventListener('touchstart', (e) => e.cancelable && e.preventDefault(), {
      passive: false,
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
