import * as THREE from 'three';

// Engine owns the renderer, camera, resize, clock and frame diagnostics.
// Game logic plugs in through the update callback in main.js.
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // enables canvas pixel verification in QA
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.isCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.maxDPR = this.isCoarse ? 1.6 : 2;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
    this.camera.position.set(2.5, 4, 10);

    this.clock = new THREE.Clock();
    this._fpsEMA = 60;
    this._resize = this.resize.bind(this);
    window.addEventListener('resize', this._resize);
    window.addEventListener('orientationchange', this._resize);
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDPR);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Returns a clamped delta and updates the fps EMA.
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (dt > 0) this._fpsEMA = this._fpsEMA * 0.95 + (1 / dt) * 0.05;
    return dt;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  diagnostics() {
    const info = this.renderer.info;
    return {
      fps: Math.round(this._fpsEMA),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      dpr: this.renderer.getPixelRatio(),
    };
  }

  dispose() {
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('orientationchange', this._resize);
    this.renderer.dispose();
  }
}
