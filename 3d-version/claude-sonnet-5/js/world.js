// world.js — the Prism's environment: a deep void sky, a drifting starfield,
// a glowing horizon grid, and a distant light-Source. Also builds the PMREM
// environment map that every faceted crystal (bird + gates) reflects and
// refracts — without it, MeshPhysicalMaterial transmission looks flat.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const PALETTE = {
  skyZenith: '#04030a',
  skyHorizon: '#1c1640',
  skyFloor: '#020108',
  fog: '#0a0818',
  source: '#bfe9ff',
  grid: '#63e8ff',
  starWhite: '#eef0ff',
  starCyan: '#9fe9ff',
  starViolet: '#c6b6ff',
};

function verticalGradientTexture(stops) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// soft round sprite so Points don't render as little squares
function softDiscTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// a faint cyan grid on transparent black, tiled and scrolled to fake forward
// motion across an otherwise static floor plane
function gridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(99, 232, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(256, 0);
  ctx.moveTo(0, 0); ctx.lineTo(0, 256);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.distance = 0; // cumulative scroll, drives the floor's flow

    scene.background = verticalGradientTexture([
      [0, PALETTE.skyZenith],
      [0.62, PALETTE.skyHorizon],
      [1, PALETTE.skyFloor],
    ]);
    scene.fog = new THREE.FogExp2(PALETTE.fog, 0.016);

    // ---- environment map: lets transmissive/iridescent facets pick up
    // soft studio-like reflections instead of looking like flat glass ----
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // ---- lighting: cool key light + violet hemisphere fill + warm rim ----
    const key = new THREE.DirectionalLight('#cfe9ff', 2.4);
    key.position.set(12, 22, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 26;
    key.shadow.camera.bottom = -10;
    key.shadow.camera.far = 70;
    key.shadow.bias = -0.0025;
    scene.add(key);

    scene.add(new THREE.HemisphereLight('#6b5cff', '#05040c', 0.65));

    const rim = new THREE.DirectionalLight('#ff9ad6', 0.6);
    rim.position.set(-10, 6, -16);
    scene.add(rim);

    // ---- the Source: a distant glowing core, the prism's light origin ----
    const source = new THREE.Mesh(
      new THREE.IcosahedronGeometry(9, 1),
      new THREE.MeshBasicMaterial({ color: PALETTE.source, fog: false }),
    );
    source.position.set(-18, 30, -180);
    scene.add(source);
    const sourceGlow = new THREE.PointLight('#bfe9ff', 4, 400, 2);
    sourceGlow.position.copy(source.position);
    scene.add(sourceGlow);
    this.source = source;

    // ---- starfield: slow independent drift, layered behind everything ----
    const STAR_COUNT = 2200;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const palette = [PALETTE.starWhite, PALETTE.starCyan, PALETTE.starViolet].map((c) => new THREE.Color(c));
    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 140 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2) * 0.6);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.6 + 4;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 60;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      map: softDiscTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    scene.add(this.stars);

    // ---- horizon floor: a glowing grid receding into the fog ----
    this.gridTex = gridTexture();
    this.gridTex.repeat.set(40, 400);
    const floorGeo = new THREE.PlaneGeometry(160, 2000);
    const floorMat = new THREE.MeshBasicMaterial({
      map: this.gridTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -13, -300);
    scene.add(this.floor);
    this.floorY = -13;

    // ---- drifting dust motes: foreground parallax that scrolls with play
    // speed, unlike the slow ambient starfield behind it ----
    this.motes = [];
    const moteGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const moteMats = [PALETTE.starCyan, PALETTE.starViolet, PALETTE.starWhite].map(
      (c) => new THREE.MeshBasicMaterial({ color: c, fog: false }),
    );
    for (let i = 0; i < 60; i++) {
      const mote = new THREE.Mesh(moteGeo, moteMats[i % moteMats.length]);
      this.resetMote(mote, true);
      scene.add(mote);
      this.motes.push(mote);
    }
  }

  resetMote(mote, anywhere = false) {
    mote.position.set(
      (Math.random() - 0.5) * 30,
      Math.random() * 24 - 4,
      anywhere ? 10 - Math.random() * 150 : -140 - Math.random() * 15,
    );
    mote.scale.setScalar(0.5 + Math.random() * 1.4);
  }

  update(dt, speed) {
    this.distance += speed * dt;
    this.gridTex.offset.y = -(this.distance / 14) % 1;

    this.stars.rotation.y += dt * 0.01;

    for (const mote of this.motes) {
      mote.position.z += speed * dt;
      mote.position.y += Math.sin(this.distance * 0.3 + mote.position.x) * dt * 0.15;
      if (mote.position.z > 14) this.resetMote(mote);
    }

    this.source.rotation.y += dt * 0.05;
  }
}
