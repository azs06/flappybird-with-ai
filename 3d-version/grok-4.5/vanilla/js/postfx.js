// postfx.js — selective bloom on emissive firebird / sparks (UnrealBloomPass)

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;

    // Graceful degrade on weak GPUs / mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
    if (isMobile || lowMem) {
      this.enabled = false;
      this.composer = null;
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.55,  // strength
      0.4,   // radius
      0.72,  // threshold — only hot emissives bloom
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize(w, h) {
    if (!this.composer) return;
    this.composer.setSize(w, h);
    if (this.bloom) this.bloom.resolution.set(w, h);
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
