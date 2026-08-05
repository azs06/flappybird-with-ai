// One-button input: every press (space / click / tap) raises the same
// "primary" intent. UI buttons stopPropagation so they don't leak flaps.
export class Input {
  constructor(target = window) {
    this._handlers = new Set();
    this._enabled = true;

    const press = (e) => {
      if (!this._enabled) return;
      if (e.type === 'keydown') {
        if (e.repeat) return;
        if (!['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) return;
        e.preventDefault();
      }
      // Ignore presses that start on interactive UI (buttons handle themselves).
      if (e.type === 'pointerdown' && e.target.closest?.('button')) return;
      this._handlers.forEach((fn) => fn(e));
    };

    target.addEventListener('keydown', press);
    target.addEventListener('pointerdown', press);
    // Block context menu / double-tap zoom stealing our one button.
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  onPress(fn) {
    this._handlers.add(fn);
    return () => this._handlers.delete(fn);
  }

  setEnabled(v) {
    this._enabled = v;
  }
}
