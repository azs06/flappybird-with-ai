import * as THREE from 'three';
import { THEMES } from '../game/constants.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.currentTheme = THEMES.SUNSET;

    // Lighting
    this.dirLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    // Scenery groups
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.terrainChunks = [];
    this.clouds = [];
    this.decorations = []; // Trees, windmills, crystals, cyber towers
    this.floatingIslands = [];
    this.stars = null;

    this.initLighting();
    this.initTerrain();
    this.initClouds();
    this.initStarfield();
    this.initDecorations();
    this.setTheme(THEMES.SUNSET);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.7);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffeedd, 0x444455, 0.4);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffd194, 1.6);
    this.dirLight.position.set(40, 60, -80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 250;
    this.dirLight.shadow.camera.left = -40;
    this.dirLight.shadow.camera.right = 40;
    this.dirLight.shadow.camera.top = 40;
    this.dirLight.shadow.camera.bottom = -40;
    this.dirLight.shadow.bias = -0.0005;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Dynamic scene fog
    this.scene.fog = new THREE.FogExp2(0xffaa77, 0.008);
  }

  initTerrain() {
    // Endless modular scrolling terrain chunks (Plane with low-poly noise vertices)
    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c59,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.1
    });

    const chunkLength = 120;
    const chunkWidth = 140;

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(chunkWidth, chunkLength, 20, 20);
      geo.rotateX(-Math.PI * 0.5);

      // Low poly gentle hill noise
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const z = pos.getZ(j);
        // Canyon valley in the middle for flight path, rolling hills on sides
        const distFromCenter = Math.abs(x);
        let y = -14.0;
        if (distFromCenter > 15) {
          y += Math.sin(x * 0.15) * 3 + Math.cos(z * 0.1) * 2.5 + Math.pow((distFromCenter - 15) * 0.2, 1.6);
        } else {
          y += Math.sin(x * 0.2 + z * 0.1) * 0.8;
        }
        pos.setY(j, y);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, this.terrainMat);
      mesh.receiveShadow = true;
      mesh.position.set(0, 0, i * chunkLength - 40);
      this.worldGroup.add(mesh);
      this.terrainChunks.push({ mesh, z: mesh.position.z, length: chunkLength });
    }
  }

  initClouds() {
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });

    // Create 18 fluffy procedural low-poly clouds
    for (let i = 0; i < 18; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 4);

      for (let p = 0; p < numPuffs; p++) {
        const r = 2.5 + Math.random() * 3.5;
        const puffGeo = new THREE.DodecahedronGeometry(r, 1);
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        puff.position.set(
          (p - numPuffs / 2) * 3.2 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2
        );
        cloud.add(puff);
      }

      const side = Math.random() > 0.5 ? 1 : -1;
      cloud.position.set(
        side * (30 + Math.random() * 50),
        12 + Math.random() * 22,
        i * 25 - 40
      );
      this.worldGroup.add(cloud);
      this.clouds.push({
        group: cloud,
        speed: 1.5 + Math.random() * 2.0,
        baseX: cloud.position.x,
        z: cloud.position.z
      });
    }
  }

  initStarfield() {
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 600;
      const y = 10 + Math.random() * 300;
      const z = (Math.random() - 0.5) * 600;
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;

      // Color variation
      const col = Math.random();
      if (col > 0.7) {
        starColors[i * 3] = 0.5; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0;
      } else if (col > 0.4) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.6; starColors[i * 3 + 2] = 0.9;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  initDecorations() {
    // Floating Low-Poly Islands with trees & windmills
    const islandGeo = new THREE.DodecahedronGeometry(6, 1);
    islandGeo.scale(1.8, 0.8, 1.4);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, flatShading: true, roughness: 0.9 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a504b, flatShading: true, roughness: 0.95 });

    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const treeFoliageGeo = new THREE.ConeGeometry(1.6, 3.2, 6);
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });

    for (let i = 0; i < 8; i++) {
      const island = new THREE.Group();
      const top = new THREE.Mesh(islandGeo, islandMat);
      top.castShadow = true;
      island.add(top);

      const bottom = new THREE.Mesh(new THREE.ConeGeometry(6, 7, 6), rockMat);
      bottom.position.y = -3.5;
      bottom.rotation.x = Math.PI;
      island.add(bottom);

      // Add a couple of trees
      for (let t = 0; t < 3; t++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
        trunk.position.y = 0.9;
        const foliage = new THREE.Mesh(treeFoliageGeo, treeFoliageMat);
        foliage.position.y = 2.8;
        tree.add(trunk, foliage);
        tree.position.set((t - 1) * 2.2, 2.2, (Math.random() - 0.5) * 2);
        island.add(tree);
      }

      const side = i % 2 === 0 ? 1 : -1;
      island.position.set(side * (35 + Math.random() * 30), 2 + Math.random() * 14, i * 45 - 20);
      this.worldGroup.add(island);
      this.floatingIslands.push({ group: island, z: island.position.z, baseZ: island.position.z });
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;

    // Fog
    this.scene.fog.color.setHex(theme.fogColor);
    this.scene.fog.density = theme.fogDensity;

    // Background Sky
    this.scene.background = new THREE.Color(theme.skyBottom);

    // Lights
    this.ambientLight.color.setHex(theme.ambientLight);
    this.ambientLight.intensity = theme.ambientIntensity;

    this.hemiLight.color.setHex(theme.ambientLight);
    this.hemiLight.groundColor.setHex(theme.groundColor);

    this.dirLight.color.setHex(theme.sunLight);
    this.dirLight.intensity = theme.sunIntensity;
    this.dirLight.position.set(...theme.sunPosition);

    // Terrain material
    this.terrainMat.color.setHex(theme.groundColor);

    if (theme.id === 'CYBERPUNK') {
      this.terrainMat.metalness = 0.8;
      this.terrainMat.roughness = 0.3;
      this.cloudMat.opacity = 0.2;
      this.stars.visible = true;
    } else if (theme.id === 'NEBULA') {
      this.terrainMat.metalness = 0.5;
      this.terrainMat.roughness = 0.5;
      this.cloudMat.opacity = 0.3;
      this.stars.visible = true;
    } else if (theme.id === 'VOLCANIC') {
      this.terrainMat.metalness = 0.2;
      this.terrainMat.roughness = 0.9;
      this.cloudMat.color.setHex(0x331111);
      this.cloudMat.opacity = 0.6;
      this.stars.visible = false;
    } else {
      // Sunset
      this.terrainMat.metalness = 0.1;
      this.terrainMat.roughness = 0.85;
      this.cloudMat.color.setHex(0xffffff);
      this.cloudMat.opacity = 0.85;
      this.stars.visible = false;
    }
  }

  update(delta, birdPosition) {
    const time = Date.now() * 0.002;

    // Follow bird for directional light & shadows
    this.dirLight.position.z = birdPosition.z - 50;
    this.dirLight.target.position.z = birdPosition.z;
    this.dirLight.target.updateMatrixWorld();

    if (this.stars) {
      this.stars.position.z = birdPosition.z;
    }

    // Scroll & Recycle Terrain chunks
    const chunkLength = 120;
    for (let chunk of this.terrainChunks) {
      if (birdPosition.z - chunk.mesh.position.z > chunkLength * 1.5) {
        chunk.mesh.position.z += chunkLength * this.terrainChunks.length;
      }
    }

    // Move & Recycle Clouds
    for (let cloud of this.clouds) {
      cloud.group.position.x += Math.sin(time * 0.5) * 0.05;
      if (birdPosition.z - cloud.group.position.z > 60) {
        cloud.group.position.z += 300 + Math.random() * 80;
      }
    }

    // Move & Recycle Floating Islands
    for (let isl of this.floatingIslands) {
      isl.group.position.y += Math.sin(time * 0.8 + isl.z) * 0.008;
      if (birdPosition.z - isl.group.position.z > 70) {
        isl.group.position.z += 280 + Math.random() * 60;
      }
    }
  }
}
