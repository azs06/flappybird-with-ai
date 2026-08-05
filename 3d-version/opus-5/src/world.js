import * as THREE from 'three';
import { CFG } from './config.js';

/**
 * Time-of-day palettes. The world lerps between consecutive entries as the
 * score climbs, so a long run visibly travels from dawn into night and back.
 */
const PALETTES = [
  { name: 'dawn',  top: 0x2b5f9e, mid: 0x8fc4e8, bot: 0xffd9a0, sun: 0xffd9a8, sunI: 2.0, hemi: 0x9fd4ff, ground: 0x6fbf5f, fog: 0xa9d3ef },
  { name: 'day',   top: 0x2a7ad4, mid: 0x87c8f2, bot: 0xdff2ff, sun: 0xffffff, sunI: 2.4, hemi: 0xbfe6ff, ground: 0x53a84c, fog: 0xbfe0f6 },
  { name: 'gold',  top: 0x1e5da8, mid: 0xf0a460, bot: 0xffd98a, sun: 0xffc073, sunI: 2.2, hemi: 0xffcf9a, ground: 0x67a94e, fog: 0xf3c48f },
  { name: 'dusk',  top: 0x131a44, mid: 0x7a3f83, bot: 0xf0785a, sun: 0xff8a5c, sunI: 1.7, hemi: 0xa06a9a, ground: 0x3f7a55, fog: 0xb46a72 },
  { name: 'night', top: 0x03050f, mid: 0x0d1a3a, bot: 0x25406b, sun: 0x9fb6ff, sunI: 0.9, hemi: 0x2a3f6e, ground: 0x1f4436, fog: 0x14203d },
];

const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Two-stop vertical gradient with a widened horizon band. Cheaper and cleaner
// than an equirect texture, and every colour is a uniform we can animate.
const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBot;
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld).y;
    vec3 c = mix(uBot, uMid, smoothstep(-0.28, 0.10, h));
    c = mix(c, uTop, smoothstep(0.06, 0.62, h));
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Soft, slightly noisy grass texture drawn to an offscreen canvas. */
function makeGroundTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);

  // Two-tone checker gives the eye something to track as the ground scrolls.
  // Kept very low contrast — this is a motion cue, not a focal point.
  g.fillStyle = 'rgba(0,0,0,0.055)';
  g.fillRect(0, 0, S / 2, S / 2);
  g.fillRect(S / 2, S / 2, S / 2, S / 2);

  // Grass speckle.
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const a = 0.03 + Math.random() * 0.07;
    g.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    g.fillRect(x, y, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GROUND_SIZE = 900;
const GROUND_REPEAT = 150; // => one 6-unit tile, roughly five bird-lengths
const GROUND_TILE = GROUND_SIZE / GROUND_REPEAT;

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.paletteT = 0;

    // ── Sky dome ───────────────────────────────────────────────────────────
    this.skyUniforms = {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uBot: { value: new THREE.Color() },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // ── Lighting ───────────────────────────────────────────────────────────
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b4a, 1.1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.position.set(-30, 42, 26);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 140;
    // Shadow frustum only covers the playfield around the bird; distant pipes
    // fall back to ambient-only shading, which fog hides anyway.
    const sc = this.sun.shadow.camera;
    sc.left = -28; sc.right = 28; sc.top = 24; sc.bottom = -24;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0xbcd8ff, 0.35);
    this.fill.position.set(20, 10, -25);
    scene.add(this.fill);

    // Visible sun disc, parked far away on the light vector.
    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(14, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff3d0, fog: false })
    );
    this.sunDisc.position.set(-260, 150, -320);
    scene.add(this.sunDisc);

    // ── Ground ─────────────────────────────────────────────────────────────
    this.groundTex = makeGroundTexture();
    this.groundMat = new THREE.MeshStandardMaterial({
      map: this.groundTex,
      color: 0x62c05a,
      roughness: 0.95,
      metalness: 0,
    });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, 700), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = CFG.world.groundY;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    this._buildClouds();
    this._buildMountains();

    scene.fog = new THREE.Fog(0xbfe0f6, CFG.world.fogNear, CFG.world.fogFar);
    // Index 0 ("dawn") is what paletteForScore(0) returns. Starting anywhere
    // else means the world visibly drifts on the first second of every run.
    this.applyPalette(0);
  }

  // ── Scenery ──────────────────────────────────────────────────────────────

  _buildClouds() {
    // One shared low-poly sphere; each cloud is a handful of scaled copies.
    // Sharing geometry keeps the draw calls cheap and the silhouette chunky.
    const geo = new THREE.SphereGeometry(1, 14, 10);
    // Smooth-shaded and self-lit. Flat shading turned these into grey boulders:
    // clouds have no hard facets, and the shadowed side of a real cloud is
    // still bright because light scatters through it.
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      emissive: 0xffffff,
      emissiveIntensity: 0.34,
      transparent: true,
      opacity: 0.97,
    });

    this.clouds = [];
    this.cloudSpan = 420;
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(geo, this.cloudMat);
        m.position.set((p - puffs / 2) * 2.1 + Math.random(), Math.random() * 1.2, Math.random() * 2 - 1);
        const s = 1.6 + Math.random() * 1.9;
        m.scale.set(s, s * 0.68, s);
        g.add(m);
      }
      g.position.set(
        (i / 22) * this.cloudSpan - 60,
        16 + Math.random() * 26,
        -70 - Math.random() * 130
      );
      const s = 1.4 + Math.random() * 2.6;
      g.scale.setScalar(s);
      g.userData.drift = 0.4 + Math.random() * 0.8;
      this.clouds.push(g);
      this.scene.add(g);
    }
  }

  _buildMountains() {
    const geo = new THREE.ConeGeometry(1, 1, 6);
    // Opted out of scene fog: these sit well beyond `fogFar`, so real fog would
    // erase them completely. Instead they're hand-tinted toward the horizon
    // colour in applyPalette() — the standard "painted backdrop" trick.
    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x4a7a6d,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      fog: false,
    });

    this.mountains = [];
    this.mountainSpan = 520;
    const COUNT = 16;
    for (let i = 0; i < COUNT; i++) {
      const m = new THREE.Mesh(geo, this.mountainMat);
      // Wide, squat proportions read as hills; tall narrow cones read as spikes.
      const h = 30 + Math.random() * 62;
      const r = h * (0.55 + Math.random() * 0.5);
      m.scale.set(r, h, r);
      m.position.set(
        (i / COUNT) * this.mountainSpan - 90 + (Math.random() * 40 - 20),
        CFG.world.groundY + h / 2 - 6,
        -195 - Math.random() * 120
      );
      m.rotation.y = Math.random() * Math.PI;
      this.mountains.push(m);
      this.scene.add(m);
    }
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  /**
   * Recycle scenery so the corridor is endless.
   *
   * The ground plane rides along with the bird while its texture offset moves
   * in the opposite direction — the surface never leaves the camera, but the
   * pattern slides past, which is what actually sells the motion.
   */
  update(dt, birdX) {
    this.ground.position.x = birdX;
    // The plane rides with the bird; the texture offset slides the other way.
    // Net effect: an infinite surface that visibly streams past the camera.
    this.groundTex.offset.x = birdX / GROUND_TILE;

    for (const c of this.clouds) {
      c.position.x -= c.userData.drift * dt; // gentle parallax breeze
      if (c.position.x < birdX - 120) c.position.x += this.cloudSpan;
      else if (c.position.x > birdX + this.cloudSpan - 120) c.position.x -= this.cloudSpan;
    }

    for (const m of this.mountains) {
      if (m.position.x < birdX - 160) m.position.x += this.mountainSpan;
      else if (m.position.x > birdX + this.mountainSpan - 160) m.position.x -= this.mountainSpan;
    }

    // Keep the shadow frustum centred on the action.
    this.sun.position.set(birdX - 30, 42, 26);
    this.sun.target.position.set(birdX + 6, 0, 0);
    this.sun.target.updateMatrixWorld();

    this.sky.position.x = birdX;
    this.sunDisc.position.x = birdX - 260;
  }

  /**
   * Blend the world's colours toward a floating palette index.
   * `p = 2.4` means "40% of the way from palette 2 to palette 3".
   */
  applyPalette(p) {
    const n = PALETTES.length;
    const i = Math.floor(p) % n;
    const j = (i + 1) % n;
    const t = p - Math.floor(p);
    const a = PALETTES[i];
    const b = PALETTES[j];
    const mix = (ka, kb) => new THREE.Color(ka).lerp(new THREE.Color(kb), t);

    this.skyUniforms.uTop.value.copy(mix(a.top, b.top));
    this.skyUniforms.uMid.value.copy(mix(a.mid, b.mid));
    this.skyUniforms.uBot.value.copy(mix(a.bot, b.bot));

    const fog = mix(a.fog, b.fog);
    this.scene.fog.color.copy(fog);
    this.renderer.setClearColor(fog);

    this.sun.color.copy(mix(a.sun, b.sun));
    this.sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    this.hemi.color.copy(mix(a.hemi, b.hemi));
    this.hemi.intensity = 0.55 + this.sun.intensity * 0.28;

    this.groundMat.color.copy(mix(a.ground, b.ground));
    // Aerial perspective: distant geometry loses saturation and drifts toward
    // the horizon colour. Doing it by hand keeps the ridge readable at night.
    this.mountainMat.color.copy(mix(a.ground, b.ground)).multiplyScalar(0.66).lerp(fog, 0.46);
    // Clouds pick up a hint of the sky's warmth but stay bright — tinting them
    // toward the fog colour made them read as dull grey rocks.
    this.cloudMat.color.set(0xffffff).lerp(mix(a.bot, b.bot), 0.22);
    this.cloudMat.emissive.set(0xffffff).multiplyScalar(0.06);
    this.sunDisc.material.color.copy(mix(a.sun, b.sun));

    this.paletteT = p;
  }

  /** Score -> time of day. One full day/night cycle every 60 points. */
  paletteForScore(score) {
    return (score / 12) % PALETTES.length;
  }
}
