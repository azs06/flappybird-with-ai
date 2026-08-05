import * as THREE from 'three';

// Juice central: trauma-based screen shake, hitstop frames, slow-motion,
// and FOV kick. update() returns the time scale the game should apply.
export class Effects {
  constructor(camera, baseFov) {
    this.camera = camera;
    this.baseFov = baseFov;
    this.trauma = 0;
    this.hitstopT = 0;
    this.slowmoT = 0;
    this.slowmoScale = 1;
    this.fovKick = 0;      // 0..1 driven by speed/milestones
    this._kickBoost = 0;   // decaying punch from milestones
    this._t = 0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRot = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  hitstop(seconds) {
    this.hitstopT = Math.max(this.hitstopT, seconds);
  }

  slowmo(scale, seconds) {
    this.slowmoScale = scale;
    this.slowmoT = Math.max(this.slowmoT, seconds);
  }

  fovPunch(amount = 0.35) {
    this._kickBoost = Math.min(0.6, this._kickBoost + amount);
  }

  update(realDt) {
    this._t += realDt;

    // Time scale resolution: hitstop wins over slowmo.
    let scale = 1;
    if (this.hitstopT > 0) {
      this.hitstopT -= realDt;
      scale = 0;
    } else if (this.slowmoT > 0) {
      this.slowmoT -= realDt;
      const k = 1 - this.slowmoT / 0.9;
      scale = THREE.MathUtils.lerp(this.slowmoScale, 1, Math.min(1, Math.max(0, k)));
    }

    // Trauma decay + noise-based offset (squared response feels snappier).
    this.trauma = Math.max(0, this.trauma - realDt * 1.4);
    const s = this.trauma * this.trauma;
    const t = this._t * 31;
    this.shakeOffset.set(
      (Math.sin(t * 1.1) + Math.sin(t * 2.3) * 0.5) * 0.22 * s,
      (Math.sin(t * 1.7 + 4.2) + Math.sin(t * 2.9) * 0.5) * 0.18 * s,
      0
    );
    this.shakeRot = (Math.sin(t * 1.3 + 1.7) + Math.sin(t * 3.1) * 0.5) * 0.012 * s;

    // FOV: speed-driven kick + milestone punch, eased back.
    this._kickBoost = Math.max(0, this._kickBoost - realDt * 1.6);
    const targetFov = this.baseFov + this.fovKick + this._kickBoost * 9;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, realDt * 5);
      this.camera.updateProjectionMatrix();
    }

    return scale;
  }
}
