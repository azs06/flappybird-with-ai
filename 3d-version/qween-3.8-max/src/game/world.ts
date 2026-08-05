import * as THREE from 'three';
import { CFG, gapSizeFor } from './config';
import { makeGrassTexture, makeGrassTopTexture, makePipeTexture, makeSunGlow, makeBlobShadow } from './textures';
import { mulberry32, type Rng } from '../core/rng';

export class PipeGate {
  readonly group = new THREE.Group();
  x = 0;
  gapCenter = 0;
  gapSize: number = CFG.gapStart;
  scored = false;
  private topCol: THREE.Mesh;
  private bottomCol: THREE.Mesh;
  private topLip!: THREE.Mesh;
  private bottomLip!: THREE.Mesh;
  private bottomCap!: THREE.Mesh;
  private topCap!: THREE.Mesh;
  private lipMats: THREE.MeshStandardMaterial[] = [];
  private flash = 0;

  constructor(pipeMat: THREE.MeshStandardMaterial, lipMat: THREE.MeshStandardMaterial) {
    const unit = new THREE.CylinderGeometry(CFG.pipeRadius, CFG.pipeRadius, 1, 22, 1);
    const lipGeo = new THREE.CylinderGeometry(CFG.pipeRadius + 0.2, CFG.pipeRadius + 0.2, 0.52, 22, 1);
    const capGeo = new THREE.CircleGeometry(CFG.pipeRadius - 0.02, 22);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x14501f, roughness: 0.8, side: THREE.DoubleSide });

    this.topCol = new THREE.Mesh(unit, pipeMat);
    this.bottomCol = new THREE.Mesh(unit, pipeMat);
    this.topCol.castShadow = this.bottomCol.castShadow = true;
    this.topCol.receiveShadow = this.bottomCol.receiveShadow = true;

    this.bottomCap = new THREE.Mesh(capGeo, capMat);
    this.bottomCap.rotation.x = -Math.PI / 2;
    this.topCap = new THREE.Mesh(capGeo, capMat);
    this.topCap.rotation.x = Math.PI / 2;

    for (const side of [1, -1]) {
      const lip = new THREE.Mesh(lipGeo, lipMat.clone());
      lip.castShadow = true;
      if (side === 1) this.topLip = lip;
      else this.bottomLip = lip;
      this.lipMats.push(lip.material as THREE.MeshStandardMaterial);
    }
    this.group.add(this.topCol, this.bottomCol, this.topLip, this.bottomLip, this.bottomCap, this.topCap);
  }

  configure(x: number, gapCenter: number, gapSize: number): void {
    this.x = x;
    this.gapCenter = gapCenter;
    this.gapSize = gapSize;
    this.scored = false;
    this.flash = 0;
    this.layout();
  }

  private layout(): void {
    const bottomTop = this.gapCenter - this.gapSize / 2;
    const topBottom = this.gapCenter + this.gapSize / 2;
    const bh = bottomTop - (CFG.groundY - 1.5);
    this.bottomCol.scale.y = bh;
    this.bottomCol.position.set(0, CFG.groundY - 1.5 + bh / 2, 0);
    this.bottomLip.position.set(0, bottomTop - 0.26, 0);
    const th = 9.5 - topBottom;
    this.topCol.scale.y = th;
    this.topCol.position.set(0, topBottom + th / 2, 0);
    this.topLip.position.set(0, topBottom + 0.26, 0);
    this.bottomCap.position.set(0, bottomTop + 0.03, 0);
    this.topCap.position.set(0, topBottom - 0.03, 0);
    this.group.position.x = this.x;
  }

  update(dt: number, dx: number): void {
    this.x += dx;
    this.group.position.x = this.x;
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
      const e = this.flash * 0.9;
      for (const m of this.lipMats) m.emissive.setRGB(e * 1, e * 0.9, e * 0.35);
    }
  }

  flashScore(): void {
    this.flash = 1;
  }
}

function ridgeGeometry(
  width: number,
  segments: number,
  height: (x: number) => number,
  drop: number,
  topColor: THREE.Color,
  bottomColor: THREE.Color
): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    pos.push(x, height(x), 0, x, -drop, 0);
    col.push(topColor.r, topColor.g, topColor.b, bottomColor.r, bottomColor.g, bottomColor.b);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export class World {
  readonly group = new THREE.Group();
  readonly pipes: PipeGate[] = [];
  readonly blobShadow: THREE.Mesh;
  private rng: Rng;
  private scroll = 0;
  private grassTex: THREE.CanvasTexture;
  private grassTopTex: THREE.CanvasTexture;
  private tufts: THREE.InstancedMesh;
  private flowers: THREE.InstancedMesh;
  private tuftData: { x: number; z: number; s: number; c: THREE.Color; spin: number }[] = [];
  private flowerData: { x: number; z: number; s: number; c: THREE.Color }[] = [];
  private hillsFar!: THREE.Mesh;
  private hillsNear!: THREE.Mesh;
  private clouds: { g: THREE.Group; speed: number }[] = [];
  private props: THREE.Object3D[] = [];
  private waterMat: THREE.ShaderMaterial;
  private dummy = new THREE.Object3D();
  private lastGap = 0.5;
  private scoreAtGen = 0;

  constructor(rng: Rng) {
    this.rng = rng;
    const sunDir = new THREE.Vector3(-0.38, 0.42, -0.82).normalize();

    const skyGeo = new THREE.SphereGeometry(160, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: sunDir },
        uTop: { value: new THREE.Color(0x2f8fe6) },
        uMid: { value: new THREE.Color(0x8fd4f8) },
        uHorizon: { value: new THREE.Color(0xeafaff) },
        uWarm: { value: new THREE.Color(0xfff0b8) }
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uSunDir; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uWarm;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
          col = mix(col, uTop, smoothstep(0.18, 0.75, h));
          float sunAmt = pow(max(dot(normalize(vDir), uSunDir), 0.0), 8.0);
          col += uWarm * sunAmt * 0.4;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    this.group.add(sky);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSunGlow(), transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    glow.scale.setScalar(21);
    glow.position.copy(sunDir).multiplyScalar(130);
    this.group.add(glow);
    const sunCore = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })
    );
    sunCore.position.copy(sunDir).multiplyScalar(128);
    sunCore.lookAt(0, 0, 0);
    this.group.add(sunCore);

    this.hillsFar = this.makeHills(90, 0.55, 3.2, 0x8fcf96, 0xd6ecd9, -54);
    this.hillsNear = this.makeHills(60, 1.1, 2.4, 0x63b959, 0xb2dfad, -34);
    this.group.add(this.hillsFar, this.hillsNear);

    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(0x2a8fc9) },
        uShallow: { value: new THREE.Color(0x7fd4f0) },
        uFog: { value: new THREE.Color(0xdff3fb) }
      },
      vertexShader: `
        varying vec2 vXZ; varying float vDist;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vXZ = wp.xz;
          vec4 mv = viewMatrix * wp;
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFog;
        varying vec2 vXZ; varying float vDist;
        void main() {
          float lane = sin(vXZ.y * 0.55 + uTime * 0.35);
          float w = sin(vXZ.x * 0.32 + uTime * 1.1 + lane * 1.4)
                  + 0.45 * sin(vXZ.x * 0.71 - uTime * 0.7 + vXZ.y * 0.13);
          float t = smoothstep(-0.9, 1.1, w);
          vec3 col = mix(uDeep, uShallow, t * 0.75);
          float crest = smoothstep(0.93, 1.05, w) * (0.35 + 0.65 * smoothstep(0.2, 1.0, sin(vXZ.y * 0.9 - uTime * 0.5) * 0.5 + 0.5));
          col += vec3(0.75, 0.9, 0.95) * crest * 0.35;
          col = mix(col, uFog, smoothstep(40.0, 100.0, vDist));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(320, 70), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, CFG.groundY - 0.85, -38);
    this.group.add(water);

    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(240, 8, 9),
      new THREE.MeshStandardMaterial({ color: 0xc99a55, roughness: 0.95 })
    );
    dirt.position.set(0, CFG.groundY - 4.5, -1.5);
    dirt.receiveShadow = true;
    this.group.add(dirt);

    this.grassTex = makeGrassTexture();
    this.grassTex.repeat.set(60, 1);
    this.grassTopTex = makeGrassTopTexture();
    this.grassTopTex.repeat.set(48, 2);
    const sideMat = new THREE.MeshStandardMaterial({ map: this.grassTex, roughness: 0.9 });
    const topMat = new THREE.MeshStandardMaterial({ map: this.grassTopTex, roughness: 0.92 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x6b4a24, roughness: 1 });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(240, 0.6, 9),
      [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat]
    );
    slab.position.set(0, CFG.groundY - 0.3, -1.5);
    slab.receiveShadow = true;
    this.group.add(slab);

    const tuftGeo = new THREE.ConeGeometry(0.075, 0.42, 5);
    tuftGeo.translate(0, 0.21, 0);
    this.tufts = new THREE.InstancedMesh(
      tuftGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      230
    );
    this.tufts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 230; i++) {
      const c = new THREE.Color().setHSL(0.3 + this.rng() * 0.06, 0.7, 0.3 + this.rng() * 0.24);
      this.tuftData.push({ x: -16 + this.rng() * 56, z: 2.4 - this.rng() * 6, s: 0.6 + this.rng() * 0.8, c, spin: this.rng() * Math.PI });
    }
    this.group.add(this.tufts);

    const flowerGeo = new THREE.IcosahedronGeometry(0.085, 0);
    flowerGeo.translate(0, 0.34, 0);
    this.flowers = new THREE.InstancedMesh(
      flowerGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.6 }),
      26
    );
    this.flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const palette = [0xffffff, 0xff8ab5, 0xffd32a, 0xff6b4a, 0xc792ff];
    for (let i = 0; i < 26; i++) {
      this.flowerData.push({
        x: -16 + this.rng() * 56,
        z: 1.6 - this.rng() * 4.2,
        s: 0.8 + this.rng() * 0.7,
        c: new THREE.Color(palette[Math.floor(this.rng() * palette.length)])
      });
    }
    this.group.add(this.flowers);

    for (let i = 0; i < 10; i++) {
      this.clouds.push(this.makeCloud(-70 + this.rng() * 140));
    }

    for (let i = 0; i < 7; i++) {
      const prop = this.rng() > 0.4 ? this.makeBush() : this.makeRock();
      prop.position.x = -14 + this.rng() * 50;
      prop.position.z = -3.2 - this.rng() * 2.5;
      this.props.push(prop);
      this.group.add(prop);
    }

    const pipeMat = new THREE.MeshStandardMaterial({ map: makePipeTexture(), roughness: 0.38, metalness: 0.05 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x4fc459, roughness: 0.32, metalness: 0.08 });
    for (let i = 0; i < CFG.pipePoolSize; i++) {
      const gate = new PipeGate(pipeMat, lipMat);
      gate.configure(CFG.firstPipeX + i * CFG.pipeSpacing, this.nextGapCenter(), CFG.gapStart);
      this.pipes.push(gate);
      this.group.add(gate.group);
    }

    this.blobShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ map: makeBlobShadow(), transparent: true, depthWrite: false })
    );
    this.blobShadow.rotation.x = -Math.PI / 2;
    this.blobShadow.position.y = CFG.groundY + 0.02;
    this.blobShadow.renderOrder = 2;
    this.group.add(this.blobShadow);
  }

  private makeHills(wavelength: number, amp: number, base: number, top: number, bottom: number, z: number): THREE.Mesh {
    const w = wavelength * 2;
    const h = (x: number) =>
      base +
      amp * Math.sin((x / wavelength) * Math.PI * 2) +
      amp * 0.55 * Math.sin((x / wavelength) * Math.PI * 4 + 1.7) +
      amp * 0.3 * Math.sin((x / wavelength) * Math.PI * 6 + 4.1);
    const mesh = new THREE.Mesh(
      ridgeGeometry(w, 128, h, 6, new THREE.Color(top), new THREE.Color(bottom)),
      new THREE.MeshBasicMaterial({ vertexColors: true })
    );
    mesh.position.set(-w / 2, CFG.groundY - 1.4, z);
    return mesh;
  }

  private makeCloud(x: number): { g: THREE.Group; speed: number } {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const n = 3 + Math.floor(this.rng() * 3);
    for (let i = 0; i < n; i++) {
      const r = 0.9 + this.rng() * 1.4;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      m.position.set((i - n / 2) * 1.3 + this.rng() * 0.6, this.rng() * 0.5, this.rng() * 0.8 - 0.4);
      m.scale.y = 0.62;
      m.rotation.set(this.rng() * 3, this.rng() * 3, 0);
      g.add(m);
    }
    g.position.set(x, 3.5 + this.rng() * 5.5, -16 - this.rng() * 26);
    const s = 0.8 + this.rng() * 0.9;
    g.scale.setScalar(s);
    this.group.add(g);
    return { g, speed: 0.25 + this.rng() * 0.45 };
  }

  private makeBush(): THREE.Object3D {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3e9e4f, roughness: 0.85, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + this.rng() * 0.3, 0), mat);
      m.position.set((i - 1) * 0.45, 0.3 + this.rng() * 0.15, (this.rng() - 0.5) * 0.3);
      m.castShadow = true;
      g.add(m);
    }
    g.position.y = CFG.groundY;
    return g;
  }

  private makeRock(): THREE.Object3D {
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.9, flatShading: true });
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + this.rng() * 0.25, 0), mat);
    m.castShadow = true;
    m.rotation.set(this.rng() * 3, this.rng() * 3, 0);
    m.scale.y = 0.7;
    m.position.y = CFG.groundY + 0.22;
    return m;
  }

  private nextGapCenter(): number {
    const lo = CFG.gapCenterMin + 0.4;
    const hi = CFG.gapCenterMax - 0.4;
    let next = lo + this.rng() * (hi - lo);
    const speed = Math.min(CFG.scrollMax, CFG.worldScroll + this.scoreAtGen * CFG.scrollGainPerScore);
    const maxJump = Math.min(3.2, Math.max(1.0, 3.2 - (speed - CFG.worldScroll) * 2.2));
    if (Math.abs(next - this.lastGap) > maxJump) {
      next = this.lastGap + Math.sign(next - this.lastGap) * (0.6 + this.rng() * (maxJump - 0.6));
      next = THREE.MathUtils.clamp(next, lo, hi);
    }
    this.lastGap = next;
    return next;
  }

  setSeed(seed: number): void {
    this.rng = mulberry32(seed);
  }

  reset(): void {
    this.lastGap = 0.5;
    this.scoreAtGen = 0;
    for (let i = 0; i < this.pipes.length; i++) {
      this.pipes[i].configure(CFG.firstPipeX + i * CFG.pipeSpacing, this.nextGapCenter(), CFG.gapStart);
    }
  }

  update(dt: number, speed: number, scrollPipes: boolean, score: number): void {
    const dx = -speed * dt;
    this.scroll += speed * dt;
    this.waterMat.uniforms.uTime.value += dt;
    this.grassTex.offset.x = (this.scroll / 4) % 1;
    this.grassTopTex.offset.x = (this.scroll / 5) % 1;

    if (scrollPipes) {
      for (const gate of this.pipes) {
        gate.update(dt, 0);
        if (gate.x < -11) {
          let maxX = -Infinity;
          for (const g2 of this.pipes) maxX = Math.max(maxX, g2.x);
          this.scoreAtGen = score;
          gate.configure(maxX + CFG.pipeSpacing, this.nextGapCenter(), gapSizeFor(score));
        }
      }
    } else {
      for (const gate of this.pipes) gate.update(dt, 0);
    }

    this.hillsFar.position.x = -45 - ((this.scroll * 0.06) % 90);
    this.hillsNear.position.x = -30 - ((this.scroll * 0.16) % 60);

    for (const c of this.clouds) {
      c.g.position.x += dx * c.speed - dt * 0.12;
      if (c.g.position.x < -75) c.g.position.x = 75;
    }

    for (const t of this.tuftData) {
      t.x += dx;
      if (t.x < -16) t.x += 56;
    }
    for (let i = 0; i < this.tuftData.length; i++) {
      const t = this.tuftData[i];
      this.dummy.position.set(t.x, CFG.groundY, t.z);
      this.dummy.rotation.set(0, t.spin, 0);
      this.dummy.scale.setScalar(t.s);
      this.dummy.updateMatrix();
      this.tufts.setMatrixAt(i, this.dummy.matrix);
      this.tufts.setColorAt(i, t.c);
    }
    this.tufts.instanceMatrix.needsUpdate = true;
    if (this.tufts.instanceColor) this.tufts.instanceColor.needsUpdate = true;

    for (const f of this.flowerData) {
      f.x += dx;
      if (f.x < -16) f.x += 56;
    }
    for (let i = 0; i < this.flowerData.length; i++) {
      const f = this.flowerData[i];
      this.dummy.position.set(f.x, CFG.groundY, f.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(f.s);
      this.dummy.updateMatrix();
      this.flowers.setMatrixAt(i, this.dummy.matrix);
      this.flowers.setColorAt(i, f.c);
    }
    this.flowers.instanceMatrix.needsUpdate = true;
    if (this.flowers.instanceColor) this.flowers.instanceColor.needsUpdate = true;

    for (const p of this.props) {
      p.position.x += dx;
      if (p.position.x < -15) {
        p.position.x += 52;
        p.position.z = -3.2 - this.rng() * 2.5;
      }
    }
  }

  nextGateAfter(x: number): PipeGate | null {
    let best: PipeGate | null = null;
    for (const g of this.pipes) {
      if (g.x > x && (!best || g.x < best.x)) best = g;
    }
    return best;
  }
}
