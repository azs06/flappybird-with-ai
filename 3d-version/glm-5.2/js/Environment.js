import * as THREE from "three";

export const GROUND_Y = -2.2;
export const CEILING_Y = 12.5;

const HILL_TILES = 4;

export class Environment {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.scroll = 0;
    this._skyMat = null;
    this._sunMat = null;
    this._grassTex = null;
    this._clouds = [];
    this._hillLayers = [];

    this._setupFog();
    this._buildSky();
    this._buildLights();
    this._buildSun();
    this._buildGround();
    this._buildHills();
    this._buildClouds();
  }

  _setupFog() {
    this.scene.fog = new THREE.Fog(0xbfe9ff, 38, 120);
  }

  _buildSky() {
    this._skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x4ea8e8) },
        midColor: { value: new THREE.Color(0x9fd9ff) },
        botColor: { value: new THREE.Color(0xe7f7ff) },
        offset: { value: 12.0 },
        exponent: { value: 0.7 }
      },
      vertexShader: [
        "varying vec3 vPos;",
        "void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;",
        "uniform float offset; uniform float exponent;",
        "varying vec3 vPos;",
        "void main(){",
        "  float h = normalize(vPos + vec3(0.0, offset, 0.0)).y;",
        "  float t = pow(max(h, 0.0), exponent);",
        "  vec3 col = mix(midColor, topColor, t);",
        "  float b = pow(max(-h, 0.0), exponent * 0.6);",
        "  col = mix(col, botColor, b);",
        "  gl_FragColor = vec4(col, 1.0);",
        "}"
      ].join("\n")
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 16), this._skyMat);
    this.scene.add(sky);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xcdebff, 0x6f8f5a, 0.95);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d6, 1.35);
    sun.position.set(-18, 26, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0xb8d8ff, 0.25);
    fill.position.set(20, 10, -16);
    this.scene.add(fill);
  }

  _buildSun() {
    this._sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2c4, fog: false, transparent: true, opacity: 0.95 });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 18), this._sunMat);
    sun.position.set(-40, 40, -80);
    this.scene.add(sun);

    const haloMat = new THREE.SpriteMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, fog: false, depthWrite: false });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(34, 34, 1);
    halo.position.copy(sun.position);
    this.scene.add(halo);
    this._sunHalo = halo;
  }

  _makeGrassTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7cc36a";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = Math.random() * 2 + 0.5;
      const g = 120 + Math.random() * 70 | 0;
      ctx.fillStyle = `rgb(${80 + Math.random() * 40 | 0},${g},${70 + Math.random() * 30 | 0})`;
      ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = "rgba(120,180,90,0.5)";
      ctx.fillRect(Math.random() * size, Math.random() * size, 6, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 8);
    tex.anisotropy = 4;
    return tex;
  }

  _buildGround() {
    this._grassTex = this._makeGrassTexture();
    const mat = new THREE.MeshStandardMaterial({ map: this._grassTex, roughness: 0.95, metalness: 0.0 });
    const geo = new THREE.PlaneGeometry(400, 90, 1, 1);
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(60, GROUND_Y, -10);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1.0 });
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.5), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(60, GROUND_Y + 0.02, 6);
    this.scene.add(edge);
  }

  _makeHillTile(width, height, segs, color, rough) {
    const geo = new THREE.PlaneGeometry(width, height, segs, 1);
    const pos = geo.attributes.position;
    const phase = Math.random() * 100;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const yNorm = pos.getY(i);
      if (yNorm > 0) {
        const h = (Math.sin(x * 0.18 + phase) * 0.5 + Math.sin(x * 0.07 + phase * 0.7) * 0.7 + 1.2) * (rough ? 1.0 : 0.6);
        pos.setY(i, yNorm * h);
      }
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 1.0, metalness: 0.0, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  _buildHillLayer(z, baseY, width, height, segs, color, rough, speedScale) {
    const tiles = [];
    const gap = width;
    for (let i = 0; i < HILL_TILES; i++) {
      const tile = this._makeHillTile(width, height, segs, color, rough);
      tile.position.set(i * gap - width, baseY, z);
      this.scene.add(tile);
      tiles.push(tile);
    }
    this._hillLayers.push({ tiles, gap, width, speedScale, z });
  }

  _buildHills() {
    this._buildHillLayer(-34, GROUND_Y - 1.2, 40, 9, 40, 0x8bbf6a, true, 0.35);
    this._buildHillLayer(-22, GROUND_Y - 0.4, 34, 6, 34, 0x69a85a, false, 0.55);
  }

  _makeCloud() {
    const cloud = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0, flatShading: true, transparent: true, opacity: 0.96 });
    const puffs = 4 + (Math.random() * 3 | 0);
    for (let i = 0; i < puffs; i++) {
      const r = 0.8 + Math.random() * 0.9;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      puff.position.set((Math.random() - 0.5) * 3.2, Math.random() * 0.7, (Math.random() - 0.5) * 1.4);
      cloud.add(puff);
    }
    return cloud;
  }

  _buildClouds() {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const cloud = this._makeCloud();
      const x = (Math.random() - 0.5) * 120;
      const y = 9 + Math.random() * 8;
      const z = -18 - Math.random() * 30;
      const scale = 0.7 + Math.random() * 1.1;
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      cloud.userData.speed = 0.15 + Math.random() * 0.2;
      this.scene.add(cloud);
      this._clouds.push(cloud);
    }
  }

  setProgress(t) {
    const top = new THREE.Color(0x4ea8e8).lerp(new THREE.Color(0x2a6fd0), t);
    const mid = new THREE.Color(0x9fd9ff).lerp(new THREE.Color(0x6fb8ef), t);
    const bot = new THREE.Color(0xe7f7ff).lerp(new THREE.Color(0xcfe6f7), t);
    this._skyMat.uniforms.topColor.value.copy(top);
    this._skyMat.uniforms.midColor.value.copy(mid);
    this._skyMat.uniforms.botColor.value.copy(bot);
  }

  update(dt, speed) {
    this.scroll += speed * dt;
    if (this._grassTex) this._grassTex.offset.x = (this.scroll * 0.012) % 1;

    for (const layer of this._hillLayers) {
      const move = speed * layer.speedScale * dt;
      for (const tile of layer.tiles) {
        tile.position.x -= move;
        if (tile.position.x < -layer.width * 1.5) {
          let maxX = tile.position.x;
          for (const t2 of layer.tiles) if (t2.position.x > maxX) maxX = t2.position.x;
          tile.position.x = maxX + layer.gap;
        }
      }
    }

    for (const cloud of this._clouds) {
      cloud.position.x -= speed * cloud.userData.speed * dt;
      cloud.position.y += Math.sin(this.scroll * 0.3 + cloud.position.x) * dt * 0.1;
      if (cloud.position.x < -70) {
        cloud.position.x = 70 + Math.random() * 30;
        cloud.position.y = 9 + Math.random() * 8;
        cloud.position.z = -18 - Math.random() * 30;
        cloud.scale.setScalar(0.7 + Math.random() * 1.1);
      }
    }
  }
}
