// ============================================================================
// Renderer.js - Canvas 2D Engine with Screen FX, CRT Filter, and Lighting
// ============================================================================

export class Renderer {
  constructor(canvas, virtualWidth = 420, virtualHeight = 650) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

    this.dpr = window.devicePixelRatio || 1;
    this.scale = 1;

    // Screen Shake & Camera FX
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.cameraZoom = 1.0;
    this.targetZoom = 1.0;

    // Screen Flash FX
    this.flashColor = '#ffffff';
    this.flashAlpha = 0;

    // Post-processing options
    this.crtEnabled = false;
    this.vignetteEnabled = true;
    this.bloomEnabled = true;
    this.screenshakeMultiplier = 1.0;

    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement || document.body;
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;

    // Calculate maximum fit maintaining aspect ratio
    const scaleX = parentWidth / this.virtualWidth;
    const scaleY = parentHeight / this.virtualHeight;
    this.scale = Math.min(scaleX, scaleY);

    const displayWidth = Math.floor(this.virtualWidth * this.scale);
    const displayHeight = Math.floor(this.virtualHeight * this.scale);

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Internal resolution with DPR
    this.canvas.width = Math.floor(this.virtualWidth * this.dpr);
    this.canvas.height = Math.floor(this.virtualHeight * this.dpr);

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  triggerShake(magnitude = 6, duration = 12) {
    this.shakeMagnitude = magnitude * this.screenshakeMultiplier;
    this.shakeDuration = duration;
  }

  triggerFlash(color = '#ffffff', alpha = 0.5) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  triggerZoomPulse(zoom = 1.05) {
    this.cameraZoom = zoom;
  }

  update(dt = 1) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeOffset.x = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      this.shakeDuration -= dt;
      this.shakeMagnitude *= 0.9;
      if (this.shakeDuration <= 0) {
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.04 * dt;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    // Zoom decay to 1.0
    this.cameraZoom += (1.0 - this.cameraZoom) * 0.1 * dt;
  }

  beginFrame() {
    this.ctx.save();
    // Scale canvas context to match DPR
    this.ctx.scale(this.dpr, this.dpr);

    // Apply Camera transforms (Shake, Zoom)
    this.ctx.save();
    if (this.cameraZoom !== 1.0) {
      this.ctx.translate(this.virtualWidth / 2, this.virtualHeight / 2);
      this.ctx.scale(this.cameraZoom, this.cameraZoom);
      this.ctx.translate(-this.virtualWidth / 2, -this.virtualHeight / 2);
    }

    this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
  }

  endFrame() {
    this.ctx.restore(); // Restore camera transforms

    // Render Flash overlay
    if (this.flashAlpha > 0) {
      this.ctx.save();
      this.ctx.fillStyle = this.flashColor;
      this.ctx.globalAlpha = Math.min(1, this.flashAlpha);
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      this.ctx.restore();
    }

    // Render Vignette
    if (this.vignetteEnabled) {
      this.renderVignette();
    }

    // Render CRT scanlines if enabled
    if (this.crtEnabled) {
      this.renderCRT();
    }

    this.ctx.restore(); // Restore DPR scaling
  }

  renderVignette() {
    this.ctx.save();
    const grad = this.ctx.createRadialGradient(
      this.virtualWidth / 2, this.virtualHeight / 2, this.virtualWidth * 0.45,
      this.virtualWidth / 2, this.virtualHeight / 2, this.virtualWidth * 0.8
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
    this.ctx.restore();
  }

  renderCRT() {
    this.ctx.save();
    // Scanlines
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < this.virtualHeight; y += 3) {
      this.ctx.fillRect(0, y, this.virtualWidth, 1.2);
    }

    // Phosphor glow frame
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(2, 2, this.virtualWidth - 4, this.virtualHeight - 4);

    this.ctx.restore();
  }
}
