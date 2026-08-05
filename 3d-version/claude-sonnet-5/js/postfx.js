// postfx.js — bloom pipeline. Bright facets (emissive crystal cores, the
// Source, score sparkles) get a soft glow; everything else passes through
// untouched because UnrealBloomPass thresholds on luminance.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostFX {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,  // strength
      0.55,  // radius
      0.72,  // threshold — only the genuinely bright stuff blooms
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render(dt) {
    this.composer.render(dt);
  }
}
