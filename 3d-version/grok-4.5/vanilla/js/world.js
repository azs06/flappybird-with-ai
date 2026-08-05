// world.js — void sky, starfield, aurora ribbons, ground plane, lighting, PMREM

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const PALETTE = {
  skyZenith: '#030208',
  skyMid: '#120a18',
  skyHorizon: '#2a1410',
  fog: '#08060c',
  ground: '#0a090e',
  amber: '#ffb020',
  ember: '#ff6a00',
  hot: '#fff5e0',
  cyan: '#4de8ff',
};

export const GROUND_Y = 0;
export const CEILING_Y = 20;

function gradientTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [t, color] of stops) g.addColorStop(t, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function softDisc() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function gridTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255, 176, 32, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(256, 0);
  ctx.moveTo(0, 0); ctx.lineTo(0, 256);
  ctx.stroke();
  // faint cross hatch accent
  ctx.strokeStyle = 'rgba(77, 232, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(128, 0); ctx.lineTo(128, 256);
  ctx.moveTo(0, 128); ctx.lineTo(256, 128);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 40);
  return tex;
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.distance = 0;
    this.time = 0;

    scene.background = gradientTexture([
      [0, PALETTE.skyZenith],
      [0.45, PALETTE.skyMid],
      [0.78, PALETTE.skyHorizon],
      [1, '#08050a'],
    ]);
    scene.fog = new THREE.FogExp2(PALETTE.fog, 0.014);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting: warm key (sun/fire), cool fill, amber rim
    this.key = new THREE.DirectionalLight('#ffe0b0', 2.2);
    this.key.position.set(8, 24, 12);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -22;
    this.key.shadow.camera.right = 22;
    this.key.shadow.camera.top = 28;
    this.key.shadow.camera.bottom = -8;
    this.key.shadow.camera.far = 80;
    this.key.shadow.bias = -0.002;
    scene.add(this.key);

    scene.add(new THREE.HemisphereLight('#6a4a80', '#1a0805', 0.55));

    this.rim = new THREE.DirectionalLight(PALETTE.cyan, 0.45);
    this.rim.position.set(-14, 6, -8);
    scene.add(this.rim);

    this.amb = new THREE.AmbientLight('#1a1018', 0.35);
    scene.add(this.amb);

    // Distant horizon glow (dying sun)
    const sunGeo = new THREE.SphereGeometry(14, 32, 24);
    this.sun = new THREE.Mesh(
      sunGeo,
      new THREE.MeshBasicMaterial({ color: 0xff6a00, fog: false, transparent: true, opacity: 0.55 }),
    );
    this.sun.position.set(40, 8, -120);
    scene.add(this.sun);

    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(22, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffb020,
        fog: false,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    this.sun.add(corona);

    this._buildStars(scene);
    this._buildAurora(scene);
    this._buildGround(scene);
    this._buildDebris(scene);
  }

  _buildStars(scene) {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + 4;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 30;

      const pick = Math.random();
      if (pick < 0.12) c.set(PALETTE.amber);
      else if (pick < 0.22) c.set(PALETTE.cyan);
      else c.setRGB(0.9 + Math.random() * 0.1, 0.88 + Math.random() * 0.1, 0.85);

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sizes[i] = 0.6 + Math.random() * 2.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: softDisc(),
        size: 1.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    scene.add(this.stars);
  }

  _buildAurora(scene) {
    this.aurora = new THREE.Group();
    const colors = [0xff6a00, 0xffb020, 0x4de8ff, 0xaa55ff];

    for (let i = 0; i < 5; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-40, 10 + i * 1.5, -50 - i * 8),
        new THREE.Vector3(-10, 14 + Math.sin(i) * 3, -55 - i * 6),
        new THREE.Vector3(15, 12 + i, -48 - i * 7),
        new THREE.Vector3(45, 15 + Math.cos(i) * 2, -60 - i * 5),
      ]);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.15 + i * 0.04, 6, false),
        new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      );
      this.aurora.add(tube);
    }
    scene.add(this.aurora);
  }

  _buildGround(scene) {
    const geo = new THREE.PlaneGeometry(200, 300, 1, 1);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a10,
      roughness: 0.92,
      metalness: 0.15,
      map: gridTex(),
      transparent: true,
      opacity: 0.85,
    });
    this.ground = new THREE.Mesh(geo, this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = GROUND_Y;
    this.ground.position.z = -40;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    // Reflective dark slab under player path
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 200),
      new THREE.MeshStandardMaterial({
        color: 0x121018,
        roughness: 0.35,
        metalness: 0.7,
        emissive: 0x1a0a05,
        emissiveIntensity: 0.15,
      }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, GROUND_Y + 0.02, -30);
    path.receiveShadow = true;
    scene.add(path);
  }

  _buildDebris(scene) {
    // Distant floating rock shards for parallax depth
    this.debris = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1620,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xffb020,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });

    for (let i = 0; i < 28; i++) {
      const s = 0.8 + Math.random() * 2.5;
      const geo = new THREE.IcosahedronGeometry(s, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 35),
        2 + Math.random() * 16,
        -20 - Math.random() * 100,
      );
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.userData.spin = (Math.random() - 0.5) * 0.3;
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      this.debris.add(mesh);

      if (Math.random() > 0.5) {
        const wire = new THREE.Mesh(geo, edgeMat);
        wire.scale.multiplyScalar(1.02);
        mesh.add(wire);
      }
    }
    scene.add(this.debris);
  }

  update(dt, speed) {
    this.time += dt;
    this.distance += speed * dt;

    // Scroll ground grid
    if (this.groundMat.map) {
      this.groundMat.map.offset.y = -this.distance * 0.035;
    }

    // Drift stars slowly
    this.stars.rotation.y = this.time * 0.008;
    this.stars.rotation.x = Math.sin(this.time * 0.05) * 0.02;

    // Aurora breathe
    this.aurora.position.y = Math.sin(this.time * 0.3) * 0.8;
    this.aurora.rotation.z = Math.sin(this.time * 0.12) * 0.04;
    this.aurora.children.forEach((t, i) => {
      t.material.opacity = 0.12 + 0.08 * Math.sin(this.time * 0.7 + i);
    });

    // Sun pulse
    const pulse = 0.5 + 0.08 * Math.sin(this.time * 0.8);
    this.sun.material.opacity = pulse;
    this.sun.scale.setScalar(1 + 0.03 * Math.sin(this.time * 0.5));

    // Debris float + scroll back, recycle
    this.debris.children.forEach((m) => {
      m.rotation.x += m.userData.spin * dt;
      m.rotation.y += m.userData.spin * 0.6 * dt;
      m.position.y = m.userData.baseY + Math.sin(this.time * 0.6 + m.userData.phase) * 0.6;
      m.position.z += speed * dt * 0.35;
      if (m.position.z > 20) {
        m.position.z = -100 - Math.random() * 40;
        m.position.x = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 35);
      }
    });

    // Subtle key light sway
    this.key.position.x = 8 + Math.sin(this.time * 0.25) * 2;
  }
}
