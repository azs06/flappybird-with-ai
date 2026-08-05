import * as THREE from "three";

/** Shared material kit — reuse to keep draw calls / GPU memory low. */
export class MaterialKit {
  readonly birdBody = new THREE.MeshStandardMaterial({
    color: 0xffc94a,
    roughness: 0.42,
    metalness: 0.08,
    emissive: 0x5a2a00,
    emissiveIntensity: 0.12,
  });

  readonly birdBelly = new THREE.MeshStandardMaterial({
    color: 0xfff1c8,
    roughness: 0.55,
    metalness: 0.02,
  });

  readonly birdWing = new THREE.MeshStandardMaterial({
    color: 0xff9a3c,
    roughness: 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  readonly birdBeak = new THREE.MeshStandardMaterial({
    color: 0xff5a3c,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0x401000,
    emissiveIntensity: 0.15,
  });

  readonly birdEye = new THREE.MeshStandardMaterial({
    color: 0x1a1f2c,
    roughness: 0.25,
    metalness: 0.2,
  });

  readonly birdEyeWhite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0,
  });

  readonly birdCrest = new THREE.MeshStandardMaterial({
    color: 0x5ad7ff,
    roughness: 0.35,
    metalness: 0.25,
    emissive: 0x0a4060,
    emissiveIntensity: 0.35,
  });

  readonly pipeBody = new THREE.MeshStandardMaterial({
    color: 0x2f9e6b,
    roughness: 0.38,
    metalness: 0.22,
  });

  readonly pipeAccent = new THREE.MeshStandardMaterial({
    color: 0x1f6f4b,
    roughness: 0.32,
    metalness: 0.35,
  });

  readonly pipeCap = new THREE.MeshStandardMaterial({
    color: 0x45c98a,
    roughness: 0.3,
    metalness: 0.28,
    emissive: 0x0a3020,
    emissiveIntensity: 0.1,
  });

  readonly pipeRing = new THREE.MeshStandardMaterial({
    color: 0x7cf0ff,
    roughness: 0.25,
    metalness: 0.55,
    emissive: 0x1ec8ff,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.92,
  });

  readonly pipeRingDim = new THREE.MeshStandardMaterial({
    color: 0x4aa8c8,
    roughness: 0.4,
    metalness: 0.35,
    emissive: 0x0a3040,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.55,
  });

  readonly ground = new THREE.MeshStandardMaterial({
    color: 0x3d8f4a,
    roughness: 0.85,
    metalness: 0.02,
  });

  readonly groundDark = new THREE.MeshStandardMaterial({
    color: 0x2d6a38,
    roughness: 0.9,
    metalness: 0.02,
  });

  readonly dirt = new THREE.MeshStandardMaterial({
    color: 0x6b4a2e,
    roughness: 0.95,
    metalness: 0,
  });

  readonly rock = new THREE.MeshStandardMaterial({
    color: 0x6d7588,
    roughness: 0.78,
    metalness: 0.08,
  });

  readonly cloud = new THREE.MeshStandardMaterial({
    color: 0xe8f2ff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  readonly crystal = new THREE.MeshStandardMaterial({
    color: 0xa78bff,
    roughness: 0.2,
    metalness: 0.45,
    emissive: 0x4020a0,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.9,
  });

  readonly particleFlap = new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  readonly particleScore = new THREE.MeshBasicMaterial({
    color: 0x7cf0ff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  readonly particleHit = new THREE.MeshBasicMaterial({
    color: 0xff6b7a,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  readonly particleDust = new THREE.MeshBasicMaterial({
    color: 0xc8d6a0,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  dispose(): void {
    for (const m of Object.values(this)) {
      if (m && typeof (m as THREE.Material).dispose === "function") {
        (m as THREE.Material).dispose();
      }
    }
  }
}
