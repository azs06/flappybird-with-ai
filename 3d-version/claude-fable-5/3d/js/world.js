// world.js — environment: gradient sky, paper sun, ridge mountains,
// drifting paper clouds, low-poly ground and recycled paper trees.

import * as THREE from 'three';

export const PALETTE = {
  skyTop: '#f9c995',
  skyMid: '#f2a98c',
  skyBottom: '#e98f7e',
  fog: '#efa489',
  sun: '#d1422f',
  ground: '#b9cfa3',
  groundDark: '#a3bd8c',
  ridgeFar: '#e8a386',
  ridgeMid: '#d98e78',
  ridgeNear: '#c47a6c',
  cloud: '#fdf7ea',
  tree: '#8fb59a',
  treeDark: '#7aa489',
  trunk: '#a98a6f',
};

function gradientTexture(stops) {
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

// A jagged 2D mountain-ridge silhouette, like torn paper held against the sky.
function makeRidge(width, height, peaks, color, seedJitter) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  for (let i = 0; i <= peaks; i++) {
    const x = -width / 2 + (i / peaks) * width;
    const y = i % 2 === 1
      ? height * (0.55 + Math.random() * 0.45)
      : height * (0.08 + Math.random() * 0.3 * seedJitter);
    shape.lineTo(x, y);
  }
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, -4);
  shape.lineTo(-width / 2, -4);
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color }),
  );
  return mesh;
}

// A puffy paper cloud built from a few flat-shaded spheres on a group.
function makeCloud(material) {
  const group = new THREE.Group();
  const blobs = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blobs; i++) {
    const r = 0.7 + Math.random() * 0.9;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), material);
    blob.position.set(i * 1.1 - blobs * 0.55, (Math.random() - 0.5) * 0.5, 0);
    blob.scale.y = 0.6;
    blob.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(blob);
  }
  return group;
}

export class World {
  constructor(scene) {
    this.scene = scene;

    scene.background = gradientTexture([
      [0, PALETTE.skyTop],
      [0.55, PALETTE.skyMid],
      [1, PALETTE.skyBottom],
    ]);
    scene.fog = new THREE.Fog(PALETTE.fog, 45, 150);

    // ---- light: one warm key light + soft ambient fill ----
    const sunLight = new THREE.DirectionalLight('#fff0dd', 2.6);
    sunLight.position.set(14, 26, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.bias = -0.002;
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight('#ffe2c8', 1.1));
    scene.add(new THREE.HemisphereLight('#ffd9b3', '#9cc5b8', 0.6));

    // ---- big red paper sun, unaffected by fog ----
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(13, 40),
      new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
    );
    sun.position.set(-22, 26, -135);
    scene.add(sun);

    // ---- layered ridge silhouettes for depth ----
    const ridges = [
      makeRidge(400, 16, 26, PALETTE.ridgeFar, 1),
      makeRidge(360, 12, 30, PALETTE.ridgeMid, 0.8),
      makeRidge(320, 8, 34, PALETTE.ridgeNear, 0.6),
    ];
    ridges[0].position.set(0, 0, -130);
    ridges[1].position.set(-20, 0, -115);
    ridges[2].position.set(30, 0, -100);
    ridges.forEach((r) => scene.add(r));

    // ---- ground: a wide low-poly plane with gentle creases ----
    const groundGeo = new THREE.PlaneGeometry(320, 240, 48, 36);
    const pos = groundGeo.attributes.position;
    const colors = [];
    const c1 = new THREE.Color(PALETTE.ground);
    const c2 = new THREE.Color(PALETTE.groundDark);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // keep the flight corridor flat, crease the rest
      const dist = Math.abs(x);
      const lift = dist > 6 ? (Math.random() * 0.7) * Math.min(1, (dist - 6) / 20) : 0;
      pos.setZ(i, lift + Math.sin(x * 0.18) * Math.cos(y * 0.13) * 0.25);
      const c = Math.random() > 0.5 ? c1 : c2;
      colors.push(c.r, c.g, c.b);
    }
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -60);
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- drifting paper clouds (pooled, recycled) ----
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: PALETTE.cloud,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    for (let i = 0; i < 10; i++) {
      const cloud = makeCloud(cloudMat);
      this.resetCloud(cloud, true);
      scene.add(cloud);
      this.clouds.push(cloud);
    }

    // ---- paper trees scrolling past for a sense of speed (pooled) ----
    this.trees = [];
    const foliageGeos = [
      new THREE.ConeGeometry(0.9, 2.2, 5),
      new THREE.ConeGeometry(1.2, 3.0, 6),
      new THREE.ConeGeometry(0.7, 1.7, 4),
    ];
    const foliageMats = [
      new THREE.MeshStandardMaterial({ color: PALETTE.tree, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: PALETTE.treeDark, flatShading: true }),
    ];
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.7, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const tree = new THREE.Group();
      const foliage = new THREE.Mesh(
        foliageGeos[i % foliageGeos.length],
        foliageMats[i % foliageMats.length],
      );
      foliage.position.y = 1.4;
      foliage.castShadow = true;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.3; // sunk slightly so its base never meets the ground plane
      tree.add(trunk, foliage);
      const s = 0.7 + Math.random() * 0.9;
      tree.scale.setScalar(s);
      this.resetTree(tree, true);
      scene.add(tree);
      this.trees.push(tree);
    }
  }

  resetCloud(cloud, anywhere = false) {
    cloud.position.set(
      (Math.random() - 0.5) * 90,
      9 + Math.random() * 9,
      anywhere ? -20 - Math.random() * 110 : -130 - Math.random() * 20,
    );
    cloud.scale.setScalar(1.2 + Math.random() * 1.6);
  }

  resetTree(tree, anywhere = false) {
    // keep trees out of the flight corridor (towers live around x = 0)
    const side = Math.random() > 0.5 ? 1 : -1;
    tree.position.set(
      side * (5 + Math.random() * 26),
      0,
      anywhere ? 10 - Math.random() * 150 : -140 - Math.random() * 15,
    );
    tree.rotation.y = Math.random() * Math.PI;
  }

  update(dt, speed) {
    for (const cloud of this.clouds) {
      cloud.position.z += speed * 0.25 * dt;
      cloud.position.x += dt * 0.4;
      if (cloud.position.z > 12) this.resetCloud(cloud);
    }
    for (const tree of this.trees) {
      tree.position.z += speed * dt;
      if (tree.position.z > 14) this.resetTree(tree);
    }
  }
}
