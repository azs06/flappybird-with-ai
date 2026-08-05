import * as THREE from 'three';

/** Shared material kit — reuse to keep draw calls / GPU memory low. */
export class MaterialKit {
  readonly birdBody: THREE.MeshStandardMaterial;
  readonly birdAccent: THREE.MeshStandardMaterial;
  readonly birdEye: THREE.MeshStandardMaterial;
  readonly birdBeak: THREE.MeshStandardMaterial;
  readonly wing: THREE.MeshStandardMaterial;
  readonly pillar: THREE.MeshStandardMaterial;
  readonly pillarAccent: THREE.MeshStandardMaterial;
  readonly pillarCap: THREE.MeshStandardMaterial;
  readonly ring: THREE.MeshStandardMaterial;
  readonly ground: THREE.MeshStandardMaterial;
  readonly groundTrim: THREE.MeshStandardMaterial;
  readonly cloud: THREE.MeshStandardMaterial;
  readonly crystal: THREE.MeshStandardMaterial;
  readonly glowSprite: THREE.SpriteMaterial;
  readonly trail: THREE.MeshBasicMaterial;

  private readonly all: THREE.Material[] = [];

  constructor() {
    const add = <T extends THREE.Material>(m: T): T => {
      this.all.push(m);
      return m;
    };

    this.birdBody = add(
      new THREE.MeshStandardMaterial({
        color: 0xffc94a,
        emissive: 0xff8a1a,
        emissiveIntensity: 0.35,
        metalness: 0.25,
        roughness: 0.42,
      }),
    );
    this.birdAccent = add(
      new THREE.MeshStandardMaterial({
        color: 0xff6b2d,
        emissive: 0xff3b00,
        emissiveIntensity: 0.25,
        metalness: 0.3,
        roughness: 0.45,
      }),
    );
    this.birdEye = add(
      new THREE.MeshStandardMaterial({
        color: 0x111820,
        roughness: 0.3,
        metalness: 0.1,
      }),
    );
    this.birdBeak = add(
      new THREE.MeshStandardMaterial({
        color: 0xff5a6a,
        emissive: 0xaa2030,
        emissiveIntensity: 0.2,
        metalness: 0.15,
        roughness: 0.5,
      }),
    );
    this.wing = add(
      new THREE.MeshStandardMaterial({
        color: 0xffe08a,
        emissive: 0xffaa33,
        emissiveIntensity: 0.2,
        metalness: 0.2,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    this.pillar = add(
      new THREE.MeshStandardMaterial({
        color: 0x2a3d6a,
        emissive: 0x0a1840,
        emissiveIntensity: 0.4,
        metalness: 0.55,
        roughness: 0.35,
      }),
    );
    this.pillarAccent = add(
      new THREE.MeshStandardMaterial({
        color: 0x5cf0ff,
        emissive: 0x2ad0ff,
        emissiveIntensity: 0.85,
        metalness: 0.7,
        roughness: 0.25,
      }),
    );
    this.pillarCap = add(
      new THREE.MeshStandardMaterial({
        color: 0xff4fd8,
        emissive: 0xc020a0,
        emissiveIntensity: 0.7,
        metalness: 0.6,
        roughness: 0.3,
      }),
    );
    this.ring = add(
      new THREE.MeshStandardMaterial({
        color: 0x7dffb3,
        emissive: 0x2aff90,
        emissiveIntensity: 0.9,
        metalness: 0.5,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    this.ground = add(
      new THREE.MeshStandardMaterial({
        color: 0x121c32,
        emissive: 0x061018,
        emissiveIntensity: 0.5,
        metalness: 0.4,
        roughness: 0.7,
      }),
    );
    this.groundTrim = add(
      new THREE.MeshStandardMaterial({
        color: 0x3a80ff,
        emissive: 0x1a40aa,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.4,
      }),
    );
    this.cloud = add(
      new THREE.MeshStandardMaterial({
        color: 0x6a7aaa,
        emissive: 0x203050,
        emissiveIntensity: 0.35,
        metalness: 0.05,
        roughness: 0.9,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.crystal = add(
      new THREE.MeshStandardMaterial({
        color: 0xa0e8ff,
        emissive: 0x40a0ff,
        emissiveIntensity: 0.55,
        metalness: 0.8,
        roughness: 0.15,
        transparent: true,
        opacity: 0.75,
      }),
    );
    this.glowSprite = add(
      new THREE.SpriteMaterial({
        color: 0x5cf0ff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.trail = add(
      new THREE.MeshBasicMaterial({
        color: 0xffc94a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  }

  dispose(): void {
    for (const m of this.all) m.dispose();
  }
}

/** Soft radial glow texture for sprites. */
export function makeGlowTexture(size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(180,240,255,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
