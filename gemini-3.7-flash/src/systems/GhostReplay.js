// ============================================================================
// GhostReplay.js - Best Run Recording & Phantom Bird Playback System
// ============================================================================

export class GhostReplay {
  constructor() {
    this.currentRecording = [];
    this.bestRecording = [];
    this.playbackIndex = 0;
    this.enabled = true;

    this.loadBestRecording();
  }

  loadBestRecording() {
    try {
      const data = localStorage.getItem('flappy_ghost_best');
      if (data) {
        this.bestRecording = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load ghost replay', e);
    }
  }

  saveBestRecording() {
    try {
      if (this.currentRecording.length > 0) {
        this.bestRecording = [...this.currentRecording];
        // Keep within reasonable size
        const compressed = this.bestRecording.filter((_, idx) => idx % 2 === 0);
        localStorage.setItem('flappy_ghost_best', JSON.stringify(compressed));
      }
    } catch (e) {
      console.warn('Failed to save ghost replay', e);
    }
  }

  startRecording() {
    this.currentRecording = [];
    this.playbackIndex = 0;
  }

  recordFrame(bird) {
    if (!bird) return;
    this.currentRecording.push({
      x: bird.x,
      y: bird.y,
      rotation: bird.rotation,
      wingAngle: bird.wingAngle,
      skin: bird.skin
    });
  }

  updatePlayback() {
    if (!this.enabled || this.bestRecording.length === 0) return null;

    if (this.playbackIndex < this.bestRecording.length) {
      const frame = this.bestRecording[this.playbackIndex];
      this.playbackIndex++;
      return frame;
    }
    return null;
  }

  renderGhost(ctx, ghostFrame) {
    if (!this.enabled || !ghostFrame) return;

    ctx.save();
    ctx.translate(ghostFrame.x, ghostFrame.y);
    ctx.rotate(ghostFrame.rotation);
    ctx.globalAlpha = 0.35;

    // Ghost body silhouette
    ctx.fillStyle = '#60a5fa';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // "BEST" Phantom Tag above ghost
    ctx.restore();

    ctx.save();
    ctx.translate(ghostFrame.x, ghostFrame.y - 24);
    ctx.font = '700 8px "Press Start 2P", sans-serif';
    ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('PB GHOST', 0, 0);
    ctx.restore();
  }
}
