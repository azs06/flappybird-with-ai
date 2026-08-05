import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { CFG, PALETTES, clamp, rand, randInt } from './config.js';

const STARRINESS = { day: 0, sunset: 0.25, night: 1, dawn: 0.08 };

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    // The camera only ever sees roughly h = -0.2 .. 0.45, so the gradient is
    // compressed into that band instead of spreading over the whole dome.
    vec3 c = mix(bottomColor, midColor, smoothstep(-0.16, 0.05, h));
    c = mix(c, topColor, smoothstep(0.06, 0.42, h));
    gl_FragColor = vec4(c, 1.0);
  }
`;

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  // Broad mowed stripes along the scroll direction.
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256);
  // Blade speckle.
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.13)';
    g.fillRect(x, y, 1.5, Math.random() * 4 + 2);
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 10;
  for (let x = -64; x < 192; x += 24) {
    g.beginPath();
    g.moveTo(x, 64);
    g.lineTo(x + 32, 0);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(0, 0, 128, 5);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A horizontally wrapping band of decorations. */
class ScrollLayer {
  constructor(parent, { speedMult, span, count, factory }) {
    this.speedMult = speedMult;
    this.span = span;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const obj = factory(i);
      obj.position.x = -span / 2 + (span / count) * i + rand(-1.5, 1.5);
      parent.add(obj);
      this.items.push(obj);
    }
  }

  update(dt, speed) {
    const d = speed * this.speedMult * dt;
    const half = this.span / 2;
    for (const item of this.items) {
      item.position.x -= d;
      if (item.position.x < -half) item.position.x += this.span;
    }
  }
}

/**
 * Everything that is not the bird or a pipe: sky, sun, stars, lights, ground,
 * mountains, clouds and ground clutter. Also owns the palette cross-fade that
 * cycles the scene through day/sunset/night/dawn as the score climbs.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new Group();
    scene.add(this.root);

    const p0 = PALETTES[0];

    // --- Sky ---------------------------------------------------------------
    this.skyMat = new ShaderMaterial({
      uniforms: {
        topColor: { value: new Color(p0.skyTop) },
        midColor: { value: new Color(p0.skyMid) },
        bottomColor: { value: new Color(p0.skyBottom) },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: BackSide,
      depthWrite: false,
    });
    this.sky = new Mesh(new SphereGeometry(400, 24, 16), this.skyMat);
    this.root.add(this.sky);

    scene.fog = new Fog(new Color(p0.fog), 45, 190);

    // --- Sun / moon --------------------------------------------------------
    this.sunMat = new SpriteMaterial({
      map: glowTexture(),
      color: new Color(p0.sun),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    });
    this.sun = new Sprite(this.sunMat);
    this.sun.scale.setScalar(15);
    this.sun.position.set(30, 16, -120);
    this.root.add(this.sun);

    // --- Stars -------------------------------------------------------------
    const starPos = [];
    for (let i = 0; i < 320; i++) {
      const v = new Vector3(rand(-1, 1), rand(0.02, 1), rand(-1, -0.15)).normalize().multiplyScalar(200);
      starPos.push(v.x, v.y, v.z);
    }
    const starGeo = new BufferGeometry();
    starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
    this.starMat = new PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new Points(starGeo, this.starMat);
    this.root.add(this.stars);

    // --- Lights ------------------------------------------------------------
    this.hemi = new HemisphereLight(new Color(p0.skyMid), new Color(p0.hemiGround), 1.9);
    scene.add(this.hemi);

    this.ambient = new AmbientLight(0xffffff, 0.35);
    scene.add(this.ambient);

    this.sunLight = new DirectionalLight(new Color(p0.light), 2.4);
    this.sunLight.position.set(7, 15, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const sc = this.sunLight.shadow.camera;
    sc.left = -18;
    sc.right = 18;
    sc.top = 14;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 60;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.02;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);
    this.sunLight.target.position.set(0, 0, 0);

    // --- Ground ------------------------------------------------------------
    this.grassTex = grassTexture();
    this.grassTex.repeat.set(30, 7);
    this.grassMat = new MeshStandardMaterial({
      color: new Color(p0.grass),
      map: this.grassTex,
      roughness: 0.9,
    });
    const grass = new Mesh(new PlaneGeometry(300, 70), this.grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, CFG.groundY, -10);
    grass.receiveShadow = true;
    this.root.add(grass);

    this.dirtTex = dirtTexture();
    this.dirtTex.repeat.set(40, 1);
    this.dirtMat = new MeshStandardMaterial({
      color: new Color(p0.dirt),
      map: this.dirtTex,
      roughness: 0.95,
    });
    const dirt = new Mesh(new BoxGeometry(300, 7, 70), this.dirtMat);
    dirt.position.set(0, CFG.groundY - 3.52, -10);
    this.root.add(dirt);

    // --- Mountains ---------------------------------------------------------
    this.mountainFarMat = new MeshStandardMaterial({ color: new Color(p0.mountainFar), roughness: 1 });
    this.mountainNearMat = new MeshStandardMaterial({ color: new Color(p0.mountainNear), roughness: 1 });
    const coneGeo = new ConeGeometry(1, 1, 5);

    const mountains = new Group();
    this.root.add(mountains);
    this.layers = [];

    this.layers.push(
      new ScrollLayer(mountains, {
        speedMult: 0.05,
        span: 260,
        count: 14,
        factory: () => {
          const h = rand(14, 26);
          const m = new Mesh(coneGeo, this.mountainFarMat);
          m.scale.set(rand(11, 18), h, rand(11, 18));
          m.position.set(0, CFG.groundY - 2 + h / 2, -95);
          m.rotation.y = rand(0, Math.PI);
          return m;
        },
      }),
    );

    this.layers.push(
      new ScrollLayer(mountains, {
        speedMult: 0.12,
        span: 200,
        count: 12,
        factory: () => {
          const h = rand(8, 15);
          const m = new Mesh(coneGeo, this.mountainNearMat);
          m.scale.set(rand(7, 12), h, rand(7, 12));
          m.position.set(0, CFG.groundY - 1 + h / 2, -55);
          m.rotation.y = rand(0, Math.PI);
          return m;
        },
      }),
    );

    // --- Clouds ------------------------------------------------------------
    this.cloudMat = new MeshStandardMaterial({
      color: new Color(p0.cloud),
      roughness: 1,
      flatShading: true,
    });
    const blobGeo = new SphereGeometry(1, 10, 8);
    const makeCloud = (scale) => {
      const g = new Group();
      const puffs = randInt(3, 5);
      for (let i = 0; i < puffs; i++) {
        const b = new Mesh(blobGeo, this.cloudMat);
        b.position.set(i * rand(1.1, 1.7) - puffs * 0.6, rand(-0.25, 0.35), rand(-0.5, 0.5));
        b.scale.set(rand(0.9, 1.5), rand(0.6, 0.95), rand(0.8, 1.2));
        g.add(b);
      }
      g.scale.setScalar(scale);
      return g;
    };

    const cloudBands = [
      { z: -34, speed: 0.16, y: [9, 16], scale: [1.6, 2.4], count: 7, span: 170 },
      { z: -22, speed: 0.26, y: [6, 12], scale: [1.1, 1.7], count: 6, span: 140 },
      { z: -13, speed: 0.42, y: [5, 10], scale: [0.7, 1.1], count: 5, span: 120 },
    ];
    for (const band of cloudBands) {
      this.layers.push(
        new ScrollLayer(this.root, {
          speedMult: band.speed,
          span: band.span,
          count: band.count,
          factory: () => {
            const c = makeCloud(rand(band.scale[0], band.scale[1]));
            c.position.set(0, rand(band.y[0], band.y[1]), band.z + rand(-3, 3));
            return c;
          },
        }),
      );
    }

    // --- Ground clutter ----------------------------------------------------
    this.bushMat = new MeshStandardMaterial({ color: new Color(p0.bush), roughness: 1 });
    this.layers.push(
      new ScrollLayer(this.root, {
        speedMult: 0.55,
        span: 110,
        count: 12,
        factory: () => {
          const g = new Group();
          const puffs = randInt(2, 3);
          for (let i = 0; i < puffs; i++) {
            const b = new Mesh(blobGeo, this.bushMat);
            const s = rand(0.7, 1.5);
            b.position.set(i * 1.1, s * 0.35, rand(-0.4, 0.4));
            b.scale.set(s, s * 0.75, s);
            g.add(b);
          }
          g.position.set(0, CFG.groundY, rand(-26, -6));
          return g;
        },
      }),
    );

    // Foreground tufts sit low so they never hide the bird.
    this.tuftMat = new MeshStandardMaterial({ color: new Color(p0.grass), roughness: 1 });
    this.layers.push(
      new ScrollLayer(this.root, {
        speedMult: 1.35,
        span: 90,
        count: 14,
        factory: () => {
          const m = new Mesh(coneGeo, this.tuftMat);
          const h = rand(0.5, 1.1);
          m.scale.set(rand(0.35, 0.7), h, rand(0.35, 0.7));
          m.position.set(0, CFG.groundY + h / 2 - 0.1, rand(4, 8));
          return m;
        },
      }),
    );

    // --- Palette cross-fade state -----------------------------------------
    this.paletteIndex = 0;
    this.mixT = 1;
    this.from = PALETTES[0];
    this.to = PALETTES[0];
    this.tmpA = new Color();
    this.tmpB = new Color();
  }

  setPalette(index) {
    const next = PALETTES[index % PALETTES.length];
    if (next === this.to) return;
    this.from = this.#snapshot();
    this.to = next;
    this.mixT = 0;
  }

  #snapshot() {
    // Current visual state as a palette-shaped object so fades chain smoothly.
    return {
      name: this.to.name,
      skyTop: this.skyMat.uniforms.topColor.value.getHex(),
      skyMid: this.skyMat.uniforms.midColor.value.getHex(),
      skyBottom: this.skyMat.uniforms.bottomColor.value.getHex(),
      fog: this.scene.fog.color.getHex(),
      sun: this.sunMat.color.getHex(),
      light: this.sunLight.color.getHex(),
      hemiGround: this.hemi.groundColor.getHex(),
      grass: this.grassMat.color.getHex(),
      dirt: this.dirtMat.color.getHex(),
      mountainNear: this.mountainNearMat.color.getHex(),
      bush: this.bushMat.color.getHex(),
      mountainFar: this.mountainFarMat.color.getHex(),
      cloud: this.cloudMat.color.getHex(),
      starness: this.starMat.opacity / 0.95,
    };
  }

  #applyMix(t) {
    const mix = (target, key) => {
      this.tmpA.setHex(this.from[key]);
      this.tmpB.setHex(this.to[key]);
      target.copy(this.tmpA).lerp(this.tmpB, t);
    };
    mix(this.skyMat.uniforms.topColor.value, 'skyTop');
    mix(this.skyMat.uniforms.midColor.value, 'skyMid');
    mix(this.skyMat.uniforms.bottomColor.value, 'skyBottom');
    mix(this.scene.fog.color, 'fog');
    mix(this.sunMat.color, 'sun');
    mix(this.sunLight.color, 'light');
    mix(this.hemi.groundColor, 'hemiGround');
    mix(this.hemi.color, 'skyMid');
    mix(this.grassMat.color, 'grass');
    mix(this.tuftMat.color, 'grass');
    mix(this.dirtMat.color, 'dirt');
    mix(this.mountainNearMat.color, 'mountainNear');
    mix(this.bushMat.color, 'bush');
    mix(this.mountainFarMat.color, 'mountainFar');
    mix(this.cloudMat.color, 'cloud');

    const fromStars = this.from.starness ?? STARRINESS[this.from.name] ?? 0;
    const toStars = STARRINESS[this.to.name] ?? 0;
    const stars = fromStars + (toStars - fromStars) * t;
    this.starMat.opacity = stars * 0.95;
    this.stars.visible = stars > 0.02;

    // Night is dimmer and cooler.
    const night = stars;
    this.sunLight.intensity = 2.4 - night * 1.5;
    this.hemi.intensity = 1.9 - night * 0.9;
    this.ambient.intensity = 0.35 + night * 0.15;
  }

  update(dt, speed) {
    if (this.mixT < 1) {
      this.mixT = clamp(this.mixT + dt / 1.6, 0, 1);
      this.#applyMix(this.mixT);
    }
    for (const layer of this.layers) layer.update(dt, speed);
    this.grassTex.offset.x += (speed * dt) / 10;
    this.dirtTex.offset.x += (speed * dt) / 7.5;
    this.stars.rotation.z += dt * 0.004;
  }

  reset() {
    this.from = PALETTES[0];
    this.to = PALETTES[0];
    this.mixT = 0;
    this.#applyMix(1);
    this.mixT = 1;
  }
}
