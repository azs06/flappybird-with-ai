import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // aSize is a WORLD-space diameter. uScale converts world units at unit
    // depth into device pixels, so a particle shrinks with distance exactly
    // like a mesh of the same size would. Hardcoding a constant here instead
    // makes particle size depend on the viewport, which is how you end up with
    // a 165-pixel spark sitting on a bird that is 60 pixels tall.
    gl_PointSize = aSize * uScale / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // Carve a soft disc out of the square point sprite — no texture needed.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float a = smoothstep(0.25, 0.015, r2) * vAlpha;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/**
 * A fixed-capacity CPU particle pool rendered as a single THREE.Points.
 *
 * Everything lives in flat typed arrays and is written back to the GPU once per
 * frame. One draw call for hundreds of particles, and emitting never allocates:
 * `head` is a ring cursor that simply overwrites the oldest slot when full.
 */
export class ParticleSystem {
  constructor(scene, { capacity = 512, blending = THREE.NormalBlending, gravity = -14 } = {}) {
    this.capacity = capacity;
    this.gravity = gravity;
    this.head = 0;
    this.live = 0;

    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);

    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.gravScale = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.baseSize = new Float32Array(capacity);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;

    this.uniforms = { uScale: { value: 600 } };
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending,
      })
    );
    this.points.frustumCulled = false; // particles roam; the bounds are stale
    this.points.renderOrder = 5;
    scene.add(this.points);

    this._c = new THREE.Color();
  }

  /**
   * @param {THREE.Vector3|{x,y,z}} p  origin
   * @param {object} o  count, color(s), speed, spread, life, size, gravity, drag
   */
  emit(p, o = {}) {
    const count = o.count ?? 8;
    const colors = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
    const speed = o.speed ?? 4;
    const spread = o.spread ?? 0.35;
    const life = o.life ?? 0.8;
    const size = o.size ?? 10;
    const dir = o.dir ?? { x: 0, y: 0, z: 0 };

    for (let n = 0; n < count; n++) {
      const i = this.head;
      this.head = (this.head + 1) % this.capacity;

      const i3 = i * 3;
      this.pos[i3] = p.x + (Math.random() - 0.5) * (o.jitter ?? 0.3);
      this.pos[i3 + 1] = p.y + (Math.random() - 0.5) * (o.jitter ?? 0.3);
      this.pos[i3 + 2] = p.z + (Math.random() - 0.5) * (o.jitter ?? 0.3);

      // Random direction on a sphere, biased toward `dir`.
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const s = speed * (0.45 + Math.random() * 0.85);
      this.vel[i3] = dir.x + Math.sin(ph) * Math.cos(th) * s * spread * 3;
      this.vel[i3 + 1] = dir.y + Math.cos(ph) * s * spread * 3;
      this.vel[i3 + 2] = dir.z + Math.sin(ph) * Math.sin(th) * s * spread * 3;

      const c = this._c.set(colors[(Math.random() * colors.length) | 0]);
      this.col[i3] = c.r;
      this.col[i3 + 1] = c.g;
      this.col[i3 + 2] = c.b;

      const L = life * (0.6 + Math.random() * 0.8);
      this.life[i] = L;
      this.maxLife[i] = L;
      this.baseSize[i] = size * (0.6 + Math.random() * 0.8);
      this.size[i] = this.baseSize[i];
      this.alpha[i] = 1;
      this.drag[i] = o.drag ?? 1.6;
      this.gravScale[i] = o.gravity ?? 1;
      this.spin[i] = Math.random() * 6.28;
    }
    this.live = Math.min(this.capacity, this.live + count);
  }

  update(dt) {
    if (this.live === 0) return;
    let anyAlive = false;

    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        this.alpha[i] = 0;
        continue;
      }
      anyAlive = true;
      this.life[i] -= dt;
      const i3 = i * 3;

      const k = Math.max(0, 1 - this.drag[i] * dt); // exponential-ish drag
      this.vel[i3] *= k;
      this.vel[i3 + 2] *= k;
      this.vel[i3 + 1] = this.vel[i3 + 1] * k + this.gravity * this.gravScale[i] * dt;

      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;

      const u = Math.max(0, this.life[i] / this.maxLife[i]);
      // Fade out on a curve and shrink slightly: linear fades look like a
      // light switch, u^0.6 keeps the tail visible longer.
      this.alpha[i] = Math.pow(u, 0.6);
      this.size[i] = this.baseSize[i] * (0.35 + u * 0.65);
    }

    if (!anyAlive) this.live = 0;

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  /**
   * Recompute the world-units-to-device-pixels factor.
   *
   * gl_PointSize is in device pixels, so this must use the real framebuffer
   * height (CSS height x pixel ratio), not the CSS height.
   */
  setProjection(fovDegrees, framebufferHeight) {
    const halfFov = (fovDegrees * Math.PI) / 360;
    this.uniforms.uScale.value = framebufferHeight / (2 * Math.tan(halfFov));
  }

  clear() {
    this.life.fill(0);
    this.size.fill(0);
    this.alpha.fill(0);
    this.live = 0;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}
