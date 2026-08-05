import * as THREE from 'three';
import type { MaterialKit } from '../assets/materials';
import { makeGlowTexture } from '../assets/materials';
import type { SeededRNG } from '../core/rng';

/**
 * Scrolling cyber-sky runway: ground strips, floating crystals, clouds, stars.
 */
export class World {
  readonly root = new THREE.Group();
  readonly sky: THREE.Mesh;

  private readonly mats: MaterialKit;
  private readonly groundSegments: THREE.Group[] = [];
  private readonly clouds: THREE.Group[] = [];
  private readonly crystals: THREE.Mesh[] = [];
  private readonly stars: THREE.Points;
  private readonly segmentLen = 20;
  private readonly segmentCount = 6;
  private scroll = 0;
  private readonly crystalGeo: THREE.OctahedronGeometry;
  private readonly cloudGeo: THREE.SphereGeometry;
  private readonly glowTex: THREE.Texture;

  constructor(mats: MaterialKit, rng: SeededRNG) {
    this.mats = mats;
    this.glowTex = makeGlowTexture(128);
    this.crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
    this.cloudGeo = new THREE.SphereGeometry(1, 10, 8);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(180, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1030) },
        midColor: { value: new THREE.Color(0x1a0a40) },
        bottomColor: { value: new THREE.Color(0x050810) },
        offset: { value: 8 },
        exponent: { value: 0.55 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.45, t));
          col = mix(col, topColor, smoothstep(0.35, 1.0, t));
          // horizon glow band
          float band = exp(-pow((h - 0.02) * 8.0, 2.0)) * 0.35;
          col += vec3(0.15, 0.35, 0.55) * band;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.root.add(this.sky);

    // Stars
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + rng.range(0, 120);
      const theta = rng.range(0, Math.PI * 2);
      const phi = rng.range(0.15, Math.PI * 0.55);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 10;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 20;
      const c = new THREE.Color().setHSL(rng.range(0.5, 0.75), 0.6, rng.range(0.55, 0.95));
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.55,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    this.root.add(this.stars);

    // Ground runway segments
    for (let i = 0; i < this.segmentCount; i++) {
      const seg = this.makeGroundSegment(rng);
      seg.position.z = -i * this.segmentLen;
      this.groundSegments.push(seg);
      this.root.add(seg);
    }

    // Clouds
    for (let i = 0; i < 18; i++) {
      const c = this.makeCloud(rng);
      c.position.set(rng.range(-28, 28), rng.range(4, 16), rng.range(-80, 20));
      this.clouds.push(c);
      this.root.add(c);
    }

    // Floating crystals along sides
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(this.crystalGeo, mats.crystal);
      mesh.position.set(
        (rng.next() > 0.5 ? 1 : -1) * rng.range(5, 14),
        rng.range(-1, 6),
        rng.range(-90, 10),
      );
      mesh.rotation.set(rng.range(0, 1), rng.range(0, 2), rng.range(0, 1));
      mesh.scale.setScalar(rng.range(0.6, 1.6));
      this.crystals.push(mesh);
      this.root.add(mesh);
    }

    // Distant mountain silhouettes
    const silGeo = new THREE.ConeGeometry(1, 1, 5);
    const silMat = new THREE.MeshStandardMaterial({
      color: 0x0c1428,
      emissive: 0x101830,
      emissiveIntensity: 0.4,
      flatShading: true,
      roughness: 1,
    });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(silGeo, silMat);
      const side = i % 2 === 0 ? -1 : 1;
      m.position.set(side * rng.range(18, 40), rng.range(-2, 2), -rng.range(30, 120));
      m.scale.set(rng.range(4, 10), rng.range(8, 22), rng.range(4, 10));
      this.root.add(m);
    }

    // Horizon neon line
    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 0.15),
      new THREE.MeshBasicMaterial({
        color: 0x5cf0ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    horizon.position.set(0, -3.2, -70);
    horizon.rotation.x = -0.1;
    this.root.add(horizon);
  }

  private makeGroundSegment(rng: SeededRNG): THREE.Group {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.4, this.segmentLen),
      this.mats.ground,
    );
    floor.position.y = -4.2;
    floor.receiveShadow = true;
    g.add(floor);

    // Center strip
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.06, this.segmentLen * 0.92),
      this.mats.groundTrim,
    );
    strip.position.y = -3.96;
    g.add(strip);

    // Side rails
    for (const x of [-9, 9]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.55, this.segmentLen),
        this.mats.groundTrim,
      );
      rail.position.set(x, -3.85, 0);
      g.add(rail);

      // Rail lights
      for (let i = 0; i < 4; i++) {
        const bulb = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.12, 0.35),
          this.mats.pillarAccent,
        );
        bulb.position.set(x, -3.5, -this.segmentLen / 2 + 2.5 + i * 4.5 + rng.range(0, 0.5));
        g.add(bulb);
      }
    }

    // Grid lines
    const lineMat = this.mats.groundTrim;
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(20, 0.03, 0.08), lineMat);
      line.position.set(0, -3.98, -this.segmentLen / 2 + 2 + i * 4);
      g.add(line);
    }

    return g;
  }

  private makeCloud(rng: SeededRNG): THREE.Group {
    const g = new THREE.Group();
    const n = 3 + rng.int(0, 3);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.cloudGeo, this.mats.cloud);
      m.position.set(rng.range(-1.5, 1.5), rng.range(-0.4, 0.4), rng.range(-0.8, 0.8));
      m.scale.set(rng.range(1.2, 2.4), rng.range(0.6, 1.1), rng.range(1.0, 1.8));
      g.add(m);
    }
    return g;
  }

  update(dt: number, scrollSpeed: number): void {
    this.scroll += scrollSpeed * dt;

    // Recycle ground — scroll toward camera (+Z), wrap back ahead (−Z)
    for (const seg of this.groundSegments) {
      seg.position.z += scrollSpeed * dt;
      if (seg.position.z > this.segmentLen) {
        seg.position.z -= this.segmentCount * this.segmentLen;
      }
    }

    // Parallax clouds
    for (const c of this.clouds) {
      c.position.z += scrollSpeed * dt * 0.35;
      c.position.x += Math.sin(performance.now() * 0.0003 + c.position.y) * dt * 0.2;
      if (c.position.z > 25) {
        c.position.z -= 110;
        c.position.x = (Math.random() - 0.5) * 50;
      }
    }

    // Crystals
    for (const cr of this.crystals) {
      cr.position.z += scrollSpeed * dt * 0.7;
      cr.rotation.y += dt * 0.6;
      cr.position.y += Math.sin(performance.now() * 0.002 + cr.position.x) * dt * 0.15;
      if (cr.position.z > 15) {
        cr.position.z -= 100;
      }
    }

    this.stars.rotation.y += dt * 0.01;
  }

  dispose(): void {
    this.crystalGeo.dispose();
    this.cloudGeo.dispose();
    this.glowTex.dispose();
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
  }
}
