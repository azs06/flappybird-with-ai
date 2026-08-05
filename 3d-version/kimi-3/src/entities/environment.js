import * as THREE from 'three';
import { CONFIG } from '../game/config.js';

// ---------------------------------------------------------------------------
// Environment — golden-hour canyon:
//  · shader sky dome (gradient + sun disc + warm band) + additive sun glow
//  · two laterally-parallaxed ridge silhouettes (seamlessly periodic)
//  · instanced mesa buttes, instanced rocks riding analytic dunes
//  · two recycled dune tiles sharing a periodic heightfield + far plane
//  · soft sprite clouds, ambient dust motes
// Ground rule: world scroll offset W grows with speed; a pattern feature at
// pattern-coordinate p appears at world z = p + W (mod period windows).
// Ground height at world z is therefore G(x,z) = duneHeight(x, (z-W) mod P),
// and every grounded prop bakes its y from that same identity.
// ---------------------------------------------------------------------------

const P = CONFIG.world.groundPeriod; // 140
const TAU = Math.PI * 2;
const PROP_WINDOW = 0.72; // props live in z ∈ [-0.72P, +0.28P)

// Periodic dune heightfield. u = pattern z, x = lateral. The flight corridor
// (|x| < ~8) is flattened so gameplay collisions stay fair and readable.
export function duneHeight(x, u) {
  const w1 = Math.sin((u / P) * TAU * 1 + 1.7 + 0.55 * Math.sin(x * 0.10));
  const w2 = Math.sin((u / P) * TAU * 2 + 0.4 + 0.75 * Math.sin(x * 0.061 + 1.9));
  const w3 = Math.sin((u / P) * TAU * 3 + 4.2) * Math.sin(x * 0.13 + 0.7);
  const lateral = Math.sin(x * 0.21 + u * 0.02) * 0.4;
  const h = 1.35 * w1 + 0.7 * w2 + 0.34 * w3 + lateral;
  const corridor = THREE.MathUtils.smoothstep(Math.abs(x), 5, 13);
  const amp = 0.14 + 0.86 * corridor;
  return CONFIG.world.groundY - 0.55 + h * amp;
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const blob = (x, y, r, a) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,246,235,${a})`);
    grad.addColorStop(0.6, `rgba(255,238,224,${a * 0.55})`);
    grad.addColorStop(1, 'rgba(255,235,220,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  };
  blob(128, 78, 58, 0.95);
  blob(84, 84, 40, 0.8);
  blob(172, 84, 42, 0.8);
  blob(108, 62, 34, 0.85);
  blob(148, 60, 30, 0.85);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sandTexture() {
  // Wind-rippled sand: soft diagonal striations + speckle, tiled seamlessly.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    const y = i * 5.6;
    const grad = g.createLinearGradient(0, y, 256, y + 20);
    grad.addColorStop(0, 'rgba(120,70,40,0)');
    grad.addColorStop(0.5, `rgba(120,70,40,${0.035 + Math.random() * 0.05})`);
    grad.addColorStop(1, 'rgba(255,235,200,0.04)');
    g.fillStyle = grad;
    g.save();
    g.translate(128, 128);
    g.rotate(-0.22);
    g.fillRect(-180, y - 128, 360, 2.4);
    g.restore();
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,55,30' : '255,230,190'},${Math.random() * 0.09})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,244,214,1)');
  grad.addColorStop(0.25, 'rgba(255,224,170,0.75)');
  grad.addColorStop(1, 'rgba(255,176,110,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Environment {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.W = 0;

    this._buildSky();
    this._buildLights();
    this._buildGround();
    this._buildRidges();
    this._buildMesas();
    this._buildRocks();
    this._buildClouds();
    this._buildDust();
  }

  // ------------------------------ sky + sun ------------------------------

  _buildSky() {
    const geo = new THREE.SphereGeometry(420, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uHorizon: { value: new THREE.Color(0xffc98f) },
        uMid: { value: new THREE.Color(0xf8937c) },
        uZenith: { value: new THREE.Color(0x5f83c4) },
        uSunDir: { value: new THREE.Vector3(-0.28, 0.34, -0.9).normalize() },
        uSunColor: { value: new THREE.Color(0xfff3cd) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_Position.z = gl_Position.w; // pin to far plane
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon, uMid, uZenith, uSunColor;
        uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -0.12, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.2, h));
          col = mix(col, uZenith, smoothstep(0.1, 0.5, h));
          float sunAmt = max(dot(d, uSunDir), 0.0);
          col += uSunColor * pow(sunAmt, 6.0) * 0.55;        // horizon glow
          float disc = smoothstep(0.9994, 0.99975, sunAmt);   // sun disc
          float halo = pow(sunAmt, 90.0) * 0.9;
          col += uSunColor * (disc * 1.6 + halo);
          col = mix(col, vec3(0.36, 0.24, 0.28), smoothstep(-0.02, -0.3, d.y));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.sky);

    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0.85,
    }));
    sunGlow.position.copy(this.skyMat.uniforms.uSunDir.value).multiplyScalar(390);
    sunGlow.scale.setScalar(190);
    sunGlow.renderOrder = -1;
    this.scene.add(sunGlow);
    this.sunGlow = sunGlow;

    this.scene.fog = new THREE.FogExp2(CONFIG.colors.fog, 0.0085);
  }

  _buildLights() {
    // Hemisphere: warm sky bounce over terracotta ground.
    const hemi = new THREE.HemisphereLight(0xffd9b0, 0x9a6248, 0.95);
    this.scene.add(hemi);

    // Key sun: warm, low, from behind-left of the camera so the bird's
    // camera-facing side is lit and shadows stretch into the scene.
    const sun = new THREE.DirectionalLight(0xffe0b3, 2.2);
    sun.position.set(-14, 24, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    // Cool rim from ahead-left to outline forms against the sky.
    const rim = new THREE.DirectionalLight(0x8fb4ff, 0.6);
    rim.position.set(-10, 12, -22);
    this.scene.add(rim);
  }

  // ------------------------------ ground ------------------------------

  _buildGround() {
    const W_TILE = 96;
    const sandHi = new THREE.Color(0xf6c88c);
    const sandLo = new THREE.Color(0xa8623c);
    this.tiles = [];

    for (let t = 0; t < 2; t++) {
      const geo = new THREE.PlaneGeometry(W_TILE, P, 72, 100);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const u = pos.getZ(i) + P / 2; // local z ∈ [-P/2, P/2] → u ∈ [0, P]
        const h = duneHeight(x, u);
        pos.setY(i, h);
        const k = THREE.MathUtils.clamp((h - (CONFIG.world.groundY - 2.4)) / 3.6, 0, 1);
        c.lerpColors(sandLo, sandHi, k);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.95, metalness: 0,
        map: this._sandTex || (this._sandTex = sandTexture()),
      });
      const tile = new THREE.Mesh(geo, mat);
      tile.receiveShadow = true;
      // Center invariant: zc ≡ W + P/2 (mod P). Two tiles cover [-2P, 0] + W.
      tile.userData.baseZ = (t - 0.5) * P;
      tile.position.z = tile.userData.baseZ;
      this.scene.add(tile);
      this.tiles.push(tile);
    }

    const far = new THREE.Mesh(
      new THREE.CircleGeometry(420, 48),
      new THREE.MeshStandardMaterial({ color: 0xdd9d68, roughness: 1 })
    );
    far.rotation.x = -Math.PI / 2;
    far.position.y = CONFIG.world.groundY - 1.15;
    far.receiveShadow = true;
    this.scene.add(far);
  }

  // ------------------------------ ridges ------------------------------

  // Periodic silhouette strip (integer-frequency sinusoids → endpoints match,
  // so two copies tile seamlessly while scrolling laterally with parallax).
  _ridgeGeometry(length, baseH, peakH, seedOffset) {
    const n = 64;
    const positions = [];
    const step = length / n;
    const peak = (i) =>
      baseH +
      peakH * (0.55 + 0.28 * Math.sin((i / n) * TAU * 3 + seedOffset)
        + 0.17 * Math.sin((i / n) * TAU * 7 + seedOffset * 2.3));
    for (let i = 0; i < n; i++) {
      const x0 = -length / 2 + i * step;
      const x1 = x0 + step;
      const h0 = peak(i);
      const h1 = peak(i + 1);
      positions.push(x0, 0, 0, x1, 0, 0, x0, h0, 0);
      positions.push(x1, 0, 0, x1, h1, 0, x0, h0, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }

  _buildRidges() {
    // Ridges opt out of scene fog; their colors are pre-hazed so denser
    // gameplay fog can't wash them out (painted atmospheric perspective).
    this.ridges = [];
    const layers = [
      { dist: -230, color: 0xecb391, base: 14, peak: 30, factor: 0.55, period: 640 },
      { dist: -165, color: 0xd99771, base: 9, peak: 19, factor: 1.15, period: 520 },
    ];
    layers.forEach((L, li) => {
      const geo = this._ridgeGeometry(L.period, L.base, L.peak, li * 5.1 + 1);
      const mat = new THREE.MeshBasicMaterial({ color: L.color, fog: false, side: THREE.DoubleSide });
      for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(0, CONFIG.world.groundY - 1.6, L.dist);
        m.userData = { k, ...L };
        this.scene.add(m);
        this.ridges.push(m);
      }
    });
  }

  // ------------------------------ mesas ------------------------------

  _buildMesas() {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, flatShading: true });
    const variants = [
      [{ r1: 6.5, r2: 5.2, h: 6 }, { r1: 4.6, r2: 4.1, h: 4.5 }],
      [{ r1: 4.2, r2: 3.1, h: 9 }, { r1: 2.9, r2: 2.6, h: 3.2 }, { r1: 2.4, r2: 2.3, h: 1.6 }],
      [{ r1: 8.5, r2: 6.8, h: 4.5 }, { r1: 6.0, r2: 5.4, h: 3.4 }],
    ];
    this.mesas = [];
    const palette = [0xc77b52, 0xb96b48, 0xd08a5e, 0xa85f42];
    const perVariant = 4;
    const period = 150; // mesas stay inside the fog-visible band

    variants.forEach((stacks, vi) => {
      const geos = [];
      let y = 0;
      for (const s of stacks) {
        const g = new THREE.CylinderGeometry(s.r2, s.r1, s.h, 9);
        g.translate((vi % 2) * 0.6 - 0.3, y + s.h / 2, 0);
        geos.push(g);
        y += s.h * 0.92;
      }
      const merged = mergeGeometries(geos);
      const inst = new THREE.InstancedMesh(merged, mat, perVariant);
      const c = new THREE.Color();
      for (let i = 0; i < perVariant; i++) {
        const x = this.rng.sign() * this.rng.range(28, 74);
        const p = this.rng.range(0, period);
        const s = this.rng.range(0.8, 1.9);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, CONFIG.world.groundY - 1.0, p),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.rng.range(0, TAU), 0)),
          new THREE.Vector3(s, s * this.rng.range(0.9, 1.3), s)
        );
        inst.setMatrixAt(i, m);
        c.set(palette[this.rng.int(0, palette.length - 1)]).offsetHSL(this.rng.range(-0.015, 0.015), 0, this.rng.range(-0.04, 0.05));
        inst.setColorAt(i, c);
      }
      inst.userData = { period, window: 0.853 }; // z ∈ [-128, +22]
      this.scene.add(inst);
      this.mesas.push(inst);
    });
  }

  // ------------------------------ rocks ------------------------------

  _buildRocks() {
    const geos = [new THREE.IcosahedronGeometry(1, 0), new THREE.DodecahedronGeometry(0.9, 0)];
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    this.rocks = [];
    const palette = [0xb5815e, 0x9c6b4c, 0xc99672];
    const counts = [34, 24];
    geos.forEach((geo, gi) => {
      const inst = new THREE.InstancedMesh(geo, mat, counts[gi]);
      inst.castShadow = true;
      inst.receiveShadow = true;
      const c = new THREE.Color();
      for (let i = 0; i < counts[gi]; i++) {
        const x = this.rng.sign() * this.rng.range(8.5, 44);
        const p = this.rng.range(0, P);
        const s = this.rng.range(0.35, 1.5);
        // Bake y from the SAME world identity the scroller uses (window 0.85).
        const u = ((p - 0.85 * P) % P + P) % P;
        const y = duneHeight(x, u) + s * 0.22;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, p),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(this.rng.range(0, 3), this.rng.range(0, 3), this.rng.range(0, 3))),
          new THREE.Vector3(s, s * this.rng.range(0.55, 0.85), s)
        );
        inst.setMatrixAt(i, m);
        c.set(palette[this.rng.int(0, palette.length - 1)]).offsetHSL(0, 0, this.rng.range(-0.05, 0.05));
        inst.setColorAt(i, c);
      }
      inst.userData = { period: P, window: 0.85 }; // z ∈ [-119, +21]
      this.scene.add(inst);
      this.rocks.push(inst);
    });
  }

  // ------------------------------ clouds + dust ------------------------------

  _buildClouds() {
    const tex = cloudTexture();
    this.clouds = [];
    for (let i = 0; i < 13; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        opacity: this.rng.range(0.4, 0.8), fog: true,
      });
      const spr = new THREE.Sprite(mat);
      const big = i < 3;
      spr.scale.set(this.rng.range(26, 44) * (big ? 1.9 : 1), this.rng.range(9, 15) * (big ? 1.7 : 1), 1);
      spr.userData = {
        x: this.rng.range(-95, 95),
        y: big ? this.rng.range(6, 12) : this.rng.range(15, 32),
        p: this.rng.range(0, 300),
        drift: this.rng.range(0.14, 0.5),
        period: 300,
      };
      this.scene.add(spr);
      this.clouds.push(spr);
    }
  }

  _buildDust() {
    const n = 90;
    const pos = new Float32Array(n * 3);
    this.dustSeeds = [];
    for (let i = 0; i < n; i++) {
      this.dustSeeds.push({
        x: this.rng.range(-14, 14),
        y: this.rng.range(CONFIG.world.groundY + 1, 12),
        p: this.rng.range(0, 90),
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffe0b8, size: 0.2, transparent: true, opacity: 0.6,
      sizeAttenuation: true, depthWrite: false,
    }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  // ------------------------------ update ------------------------------

  update(dt, speed) {
    this.W += speed * dt;
    const W = this.W;

    // Dune tiles: wrap into the [-2P, 0]+W coverage window.
    for (const tile of this.tiles) {
      const zc = W + tile.userData.baseZ;
      tile.position.z = zc - 2 * P * Math.floor((zc + 2 * P) / (2 * P));
    }

    // Ridges: lateral parallax pan, seamless thanks to periodic geometry.
    for (const r of this.ridges) {
      const { k, factor, period } = r.userData;
      r.position.x = k * period - ((W * factor) % period) - period / 2;
    }

    for (const inst of this.mesas) this._scrollInstances(inst, W);
    for (const inst of this.rocks) this._scrollInstances(inst, W);

    for (const cl of this.clouds) {
      const u = cl.userData;
      u.x += u.drift * dt;
      if (u.x > 110) u.x = -110;
      const z = ((u.p + W * 0.42) % u.period + u.period) % u.period;
      cl.position.set(u.x, u.y, z - u.period * 0.62);
    }

    const pos = this.dust.geometry.attributes.position;
    for (let i = 0; i < this.dustSeeds.length; i++) {
      const s = this.dustSeeds[i];
      const z = ((s.p + W * 1.15) % 90 + 90) % 90 - 75;
      pos.setXYZ(i, s.x + Math.sin(W * 0.5 + i) * 1.2, s.y + Math.sin(W * 0.33 + i * 2.1) * 0.6, z);
    }
    pos.needsUpdate = true;

    this.sunGlow.material.opacity = 0.8 + Math.sin(W * 0.02) * 0.06;
  }

  // Instances store pattern z in their baked matrix; only z is rewritten.
  _scrollInstances(inst, W) {
    if (!inst.userData.rows) {
      const rows = [];
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m);
        m.decompose(p, q, s);
        rows.push({ x: p.x, y: p.y, p: p.z, q: q.clone(), s: s.clone() });
      }
      inst.userData.rows = rows;
      inst.userData.m = new THREE.Matrix4();
      inst.userData.pos = new THREE.Vector3();
    }
    const { rows, period, window, m, pos } = inst.userData;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const z = ((r.p + W) % period + period) % period - period * window;
      pos.set(r.x, r.y, z);
      m.compose(pos, r.q, r.s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  setShadows(v) {
    this.sun.castShadow = v;
    for (const t of this.tiles) t.receiveShadow = v;
    for (const r of this.rocks) { r.castShadow = v; r.receiveShadow = v; }
  }
}

// Minimal non-indexed geometry merge (positions/normals/uvs).
function mergeGeometries(geos) {
  const expanded = geos.map((g) => g.toNonIndexed());
  let total = 0;
  for (const g of expanded) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o3 = 0;
  let o2 = 0;
  for (const g of expanded) {
    pos.set(g.attributes.position.array, o3);
    norm.set(g.attributes.normal.array, o3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o2);
    o3 += g.attributes.position.count * 3;
    o2 += g.attributes.position.count * 2;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}
