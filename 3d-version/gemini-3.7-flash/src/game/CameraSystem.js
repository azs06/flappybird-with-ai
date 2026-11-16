import * as THREE from 'three';
import { CAMERA_MODES } from './constants.js';

export class CameraSystem {
  constructor(camera) {
    this.camera = camera;
    this.mode = CAMERA_MODES.THIRD_PERSON;

    this.currentPos = new THREE.Vector3(0, 3, -8);
    this.targetPos = new THREE.Vector3(0, 3, -8);
    this.currentLookAt = new THREE.Vector3(0, 0, 10);
    this.targetLookAt = new THREE.Vector3(0, 0, 10);

    // Screen Shake (Trauma based)
    this.trauma = 0;
    this.traumaDecay = 2.5;

    // Cinematic Orbit state
    this.orbitAngle = 0;
  }

  setMode(mode) {
    this.mode = mode;
  }

  cycleMode() {
    const modes = [
      CAMERA_MODES.THIRD_PERSON,
      CAMERA_MODES.SIDE_VIEW,
      CAMERA_MODES.FIRST_PERSON
    ];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);
    return this.mode;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(delta, bird, isGameOver = false) {
    const birdPos = bird.position;
    const birdVel = bird.velocity;

    // Compute Camera Target based on mode
    if (isGameOver) {
      // Cinematic slow orbit around crash location
      this.orbitAngle += 0.8 * delta;
      const radius = 9;
      this.targetPos.set(
        birdPos.x + Math.sin(this.orbitAngle) * radius,
        birdPos.y + 3.0,
        birdPos.z + Math.cos(this.orbitAngle) * radius
      );
      this.targetLookAt.copy(birdPos);
      this.camera.fov = 65;

    } else if (this.mode === CAMERA_MODES.THIRD_PERSON) {
      // Behind bird with dynamic speed lag and vertical tracking
      const targetX = birdPos.x * 0.4;
      const targetY = birdPos.y * 0.7 + 2.4;
      const targetZ = birdPos.z - 8.2;

      this.targetPos.set(targetX, targetY, targetZ);
      this.targetLookAt.set(
        birdPos.x * 0.6,
        birdPos.y * 0.8 + 0.4,
        birdPos.z + 14.0
      );

      // Dynamic FOV rush on speed
      this.camera.fov = 65 + Math.min(birdVel.z * 0.4, 15);

    } else if (this.mode === CAMERA_MODES.SIDE_VIEW) {
      // Classic 2.5D Side Scroller
      this.targetPos.set(16.0, birdPos.y * 0.4 + 1.5, birdPos.z - 0.5);
      this.targetLookAt.set(0, birdPos.y * 0.4 + 1.0, birdPos.z + 2.0);
      this.camera.fov = 55;

    } else if (this.mode === CAMERA_MODES.FIRST_PERSON) {
      // From bird's perspective (beak slightly in view)
      this.targetPos.set(birdPos.x, birdPos.y + 0.35, birdPos.z + 0.65);
      this.targetLookAt.set(
        birdPos.x,
        birdPos.y + bird.pitch * 6.0,
        birdPos.z + 20.0
      );
      this.camera.fov = 85;

    } else if (this.mode === CAMERA_MODES.CINEMATIC) {
      // Title menu idle camera
      const time = Date.now() * 0.001;
      this.targetPos.set(Math.sin(time * 0.5) * 8.0, 3.0 + Math.cos(time * 0.3) * 1.5, birdPos.z - 7.0);
      this.targetLookAt.set(birdPos.x, birdPos.y, birdPos.z + 5.0);
      this.camera.fov = 60;
    }

    // Smooth Lerp
    const lerpSpeed = this.mode === CAMERA_MODES.FIRST_PERSON ? 25 : 12;
    this.currentPos.lerp(this.targetPos, 1 - Math.exp(-lerpSpeed * delta));
    this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-lerpSpeed * delta));

    this.camera.position.copy(this.currentPos);

    // Apply Screen Shake (Trauma^2)
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * delta);
      const shake = this.trauma * this.trauma;
      const shakeX = (Math.random() * 2 - 1) * 0.5 * shake;
      const shakeY = (Math.random() * 2 - 1) * 0.5 * shake;
      const shakeZ = (Math.random() * 2 - 1) * 0.3 * shake;
      this.camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
    }

    this.camera.lookAt(this.currentLookAt);
    this.camera.updateProjectionMatrix();
  }
}
