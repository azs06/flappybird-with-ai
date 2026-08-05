import * as THREE from "three";

const PIPE_GAP = 2.7;
const PIPE_SPACING = 5.0;
const PIPE_WIDTH = 1.1;
const PIPE_DEPTH = 1.0;
const SCROLL_BASE = 3.2;
const SCROLL_MAX = 6.4;

/**
 * Endless floating ruins / pipe gates + sky, clouds, ground.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.pipes = [];
    this.scrollSpeed = SCROLL_BASE;
    this.distance = 0;
    this.nextPipeX = 8;
    this.pool = [];

    this._buildEnvironment();
    this._seedPipes();
  }

  _buildEnvironment() {
    // Gradient sky via large sphere
    const skyGeo = new THREE.SphereGeometry(80, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a2744) },
        midColor: { value: new THREE.Color(0xc45c26) },
        bottomColor: { value: new THREE.Color(0xffb347) },
        offset: { value: 0.12 },
        exponent: { value: 0.65 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.45, t));
          col = mix(col, topColor, smoothstep(0.35, 1.0, t));
          // soft sun disc
          vec3 sunDir = normalize(vec3(0.4, 0.15, -0.9));
          float sun = pow(max(dot(normalize(vWorldPosition), sunDir), 0.0), 48.0);
          col += vec3(1.0, 0.85, 0.5) * sun * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    // Distant mountain silhouettes
    this.mountains = new THREE.Group();
    this.scene.add(this.mountains);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x2a1f3d,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 8; i++) {
      const h = 4 + Math.random() * 6;
      const w = 6 + Math.random() * 8;
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(w * 0.5, h, 5), mountainMat);
      mesh.position.set(-15 + i * 8 + Math.random() * 2, -4 + h * 0.35, -18 - Math.random() * 6);
      mesh.rotation.y = Math.random() * Math.PI;
      this.mountains.add(mesh);
    }

    // Ground plane strip
    const groundGeo = new THREE.PlaneGeometry(200, 40, 40, 1);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * 0.3) * 0.15 + Math.sin(x * 0.07) * 0.25);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d2a1a,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -3.6, 0);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Ground accent ribbon
    const ribbon = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 2),
      new THREE.MeshStandardMaterial({
        color: 0xff8a4c,
        emissive: 0xff6b35,
        emissiveIntensity: 0.25,
        roughness: 0.6,
      })
    );
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.position.set(0, -3.55, 2);
    this.scene.add(ribbon);
    this.ribbon = ribbon;

    // Clouds
    this.clouds = new THREE.Group();
    this.scene.add(this.clouds);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffe8d0,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
      flatShading: true,
    });
    for (let i = 0; i < 14; i++) {
      const cloud = this._makeCloud(cloudMat);
      cloud.position.set(
        -20 + Math.random() * 50,
        1.5 + Math.random() * 5,
        -6 - Math.random() * 12
      );
      cloud.userData.speed = 0.3 + Math.random() * 0.5;
      this.clouds.add(cloud);
    }

    // Floating dust / sparkles
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 40;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
      const warm = Math.random();
      dustCol[i * 3] = 1;
      dustCol[i * 3 + 1] = 0.7 + warm * 0.25;
      dustCol[i * 3 + 2] = 0.4 + warm * 0.3;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.scene.add(this.dust);
  }

  _makeCloud(mat) {
    const g = new THREE.Group();
    const parts = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < parts; i++) {
      const s = 0.4 + Math.random() * 0.7;
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 5), mat);
      m.position.set(i * 0.45 - 0.5, Math.random() * 0.2, (Math.random() - 0.5) * 0.3);
      m.scale.y = 0.55 + Math.random() * 0.2;
      g.add(m);
    }
    return g;
  }

  _createPipePair() {
    const group = new THREE.Group();

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6b5b4f,
      roughness: 0.75,
      metalness: 0.12,
      flatShading: true,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xc4a574,
      roughness: 0.5,
      metalness: 0.25,
      flatShading: true,
      emissive: 0x3a2810,
      emissiveIntensity: 0.15,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x7ec8ff,
      emissive: 0x4aa8ff,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.4,
    });
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x3d6b4f,
      roughness: 0.9,
      flatShading: true,
    });

    const makePillar = (height, isTop) => {
      const pillar = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(PIPE_WIDTH * 0.75, height, PIPE_DEPTH * 0.75),
        stoneMat
      );
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      pillar.add(shaft);

      // Cap / capital
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(PIPE_WIDTH, 0.28, PIPE_DEPTH),
        accentMat
      );
      cap.position.y = isTop ? -height / 2 + 0.1 : height / 2 - 0.1;
      cap.castShadow = true;
      pillar.add(cap);

      // Decorative rings
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(PIPE_WIDTH * 0.42, 0.05, 6, 16),
        runeMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = isTop ? -height / 2 + 0.45 : height / 2 - 0.45;
      pillar.add(ring);

      // Side buttresses
      for (const side of [-1, 1]) {
        const butt = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, height * 0.55, 0.18),
          stoneMat
        );
        butt.position.set(side * PIPE_WIDTH * 0.55, isTop ? 0.2 : -0.2, 0);
        butt.castShadow = true;
        pillar.add(butt);
      }

      // Vines
      if (Math.random() > 0.4) {
        const vine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.04, height * 0.5, 5),
          vineMat
        );
        vine.position.set(PIPE_WIDTH * 0.35, 0, PIPE_DEPTH * 0.35);
        vine.rotation.z = 0.15;
        pillar.add(vine);
      }

      // Floating rune gem
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), runeMat);
      gem.position.set(0, isTop ? -height / 2 + 0.7 : height / 2 - 0.7, PIPE_DEPTH * 0.4);
      pillar.add(gem);
      pillar.userData.gem = gem;

      return pillar;
    };

    const topH = 6;
    const botH = 6;
    const top = makePillar(topH, true);
    const bot = makePillar(botH, false);
    top.position.y = 0;
    bot.position.y = 0;
    group.add(top, bot);
    group.userData = {
      top,
      bot,
      scored: false,
      gapY: 0,
      topH,
      botH,
    };

    // Invisible collision helpers stored as data
    return group;
  }

  _placePipe(pipe, x, gapY) {
    const halfGap = PIPE_GAP / 2;
    const top = pipe.userData.top;
    const bot = pipe.userData.bot;
    const topH = pipe.userData.topH;
    const botH = pipe.userData.botH;

    // Top pillar hangs from above; bottom rises from below
    top.position.y = gapY + halfGap + topH / 2;
    bot.position.y = gapY - halfGap - botH / 2;

    pipe.position.x = x;
    pipe.position.z = 0;
    pipe.userData.gapY = gapY;
    pipe.userData.scored = false;
    pipe.visible = true;
  }

  _randomGapY(index = 0) {
    // Easier opening stretch, then full variance
    const spread = index < 2 ? 1.2 : 2.6;
    return THREE.MathUtils.clamp((Math.random() - 0.5) * spread, -1.5, 1.5);
  }

  _seedPipes() {
    for (let i = 0; i < 6; i++) {
      const pipe = this._createPipePair();
      this.scene.add(pipe);
      this.pool.push(pipe);
      this.pipes.push(pipe);
      this._placePipe(pipe, this.nextPipeX, this._randomGapY(i));
      this.nextPipeX += PIPE_SPACING;
    }
  }

  reset() {
    this.scrollSpeed = SCROLL_BASE;
    this.distance = 0;
    this.nextPipeX = 8;
    this.pipes.forEach((pipe, i) => {
      this._placePipe(pipe, 7.5 + i * PIPE_SPACING, this._randomGapY(i));
    });
    this.nextPipeX = 7.5 + this.pipes.length * PIPE_SPACING;
  }

  update(dt, playing) {
    const t = performance.now() * 0.001;

    // Ambient motion always
    this.clouds.children.forEach((c, i) => {
      c.position.x -= c.userData.speed * dt * (playing ? 1 : 0.35);
      c.position.y += Math.sin(t + i) * 0.002;
      if (c.position.x < -25) c.position.x = 30 + Math.random() * 8;
    });

    const dustPos = this.dust.geometry.attributes.position;
    for (let i = 0; i < dustPos.count; i++) {
      let x = dustPos.getX(i) - dt * (playing ? 1.2 : 0.3);
      let y = dustPos.getY(i) + Math.sin(t * 2 + i) * 0.004;
      if (x < -20) x = 20;
      dustPos.setXYZ(i, x, y, dustPos.getZ(i));
    }
    dustPos.needsUpdate = true;

    // Gem spin
    for (const pipe of this.pipes) {
      if (pipe.userData.top?.userData.gem) {
        pipe.userData.top.userData.gem.rotation.y += dt * 1.5;
        pipe.userData.bot.userData.gem.rotation.y -= dt * 1.5;
      }
    }

    this.ground.position.x = -((this.distance * 0.3) % 8);
    this.ribbon.position.x = this.ground.position.x;

    if (!playing) return { scored: 0, hit: false };

    this.scrollSpeed = Math.min(SCROLL_MAX, SCROLL_BASE + this.distance * 0.012);
    const dx = this.scrollSpeed * dt;
    this.distance += dx;

    let scored = 0;

    for (const pipe of this.pipes) {
      pipe.position.x -= dx;

      // Recycle
      if (pipe.position.x < -8) {
        this._placePipe(pipe, this.nextPipeX - dx, this._randomGapY(99));
        let maxX = -Infinity;
        for (const p of this.pipes) maxX = Math.max(maxX, p.position.x);
        this.nextPipeX = maxX + PIPE_SPACING;
      }
    }

    return { scored, hit: false };
  }

  /**
   * Check bird collision + scoring against all pipes.
   * Returns { hit, scored }
   */
  checkBird(birdBounds, birdX) {
    let hit = false;
    let scored = 0;
    // Slightly generous vs visual pillars
    const halfGap = PIPE_GAP / 2 + 0.06;
    const halfW = PIPE_WIDTH * 0.36;

    for (const pipe of this.pipes) {
      const px = pipe.position.x;
      const gapY = pipe.userData.gapY;

      // Score once the bird clears the pillar center
      if (!pipe.userData.scored && px < birdX) {
        pipe.userData.scored = true;
        scored += 1;
      }

      // Horizontal overlap with a small inset so edges feel fair
      if (birdBounds.maxX > px - halfW && birdBounds.minX < px + halfW) {
        const gapTop = gapY + halfGap;
        const gapBot = gapY - halfGap;
        if (birdBounds.maxY > gapTop || birdBounds.minY < gapBot) {
          hit = true;
        }
      }
    }

    return { hit, scored };
  }

  get difficulty() {
    return this.scrollSpeed;
  }
}

export const WORLD = {
  PIPE_GAP,
  PIPE_SPACING,
  FLOOR: -3.2,
  CEILING: 4.2,
  GRAVITY: 15.2,
};
