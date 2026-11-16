import * as THREE from 'three';
import { PHYSICS, THEMES, POWERUPS } from '../game/constants.js';

export class PipeManager {
  constructor(scene) {
    this.scene = scene;
    this.pipes = [];
    this.coins = [];
    this.rings = [];
    this.powerupItems = [];
    this.currentTheme = THEMES.SUNSET;

    // Shared geometries
    this.pipeGeo = new THREE.CylinderGeometry(PHYSICS.PIPE_RADIUS, PHYSICS.PIPE_RADIUS, 28, 20);
    this.rimGeo = new THREE.CylinderGeometry(PHYSICS.PIPE_RADIUS * 1.22, PHYSICS.PIPE_RADIUS * 1.22, 1.2, 20);
    this.neonBandGeo = new THREE.CylinderGeometry(PHYSICS.PIPE_RADIUS * 1.24, PHYSICS.PIPE_RADIUS * 1.24, 0.25, 20);

    // Coin & Ring Geometries
    this.coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16);
    this.coinGeo.rotateX(Math.PI * 0.5);

    this.ringGeo = new THREE.TorusGeometry(1.6, 0.12, 12, 24);

    this.powerupGeo = new THREE.OctahedronGeometry(0.65, 0);

    // Materials
    this.initMaterials();

    this.poolSize = 12;
    this.nextSpawnZ = 25;
    this.spawnIndex = 0;

    this.initPool();
  }

  initMaterials() {
    this.pipeMat = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      roughness: 0.35,
      metalness: 0.2
    });

    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0x3cb371,
      roughness: 0.3,
      metalness: 0.25
    });

    this.neonBandMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x775500,
      emissiveIntensity: 0.3
    });

    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.5
    });

    this.powerupMats = {
      SHIELD: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, metalness: 0.5 }),
      SLOW_MO: new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.8, metalness: 0.5 }),
      MAGNET: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.8, metalness: 0.5 }),
      MINI: new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.8, metalness: 0.5 })
    };
  }

  setTheme(theme) {
    this.currentTheme = theme;
    this.pipeMat.color.setHex(theme.pipeColor);
    this.rimMat.color.setHex(theme.pipeRimColor);
    this.neonBandMat.color.setHex(theme.pipeAccentColor);
    this.neonBandMat.emissive.setHex(theme.pipeAccentColor);

    if (theme.id === 'CYBERPUNK') {
      this.pipeMat.metalness = 0.8;
      this.pipeMat.roughness = 0.2;
      this.neonBandMat.emissiveIntensity = 1.4;
    } else if (theme.id === 'VOLCANIC') {
      this.pipeMat.metalness = 0.1;
      this.pipeMat.roughness = 0.8;
      this.neonBandMat.emissiveIntensity = 1.2;
    } else {
      this.pipeMat.metalness = 0.2;
      this.pipeMat.roughness = 0.35;
      this.neonBandMat.emissiveIntensity = 0.7;
    }
  }

  createPipePair() {
    const pair = new THREE.Group();

    // Top Pipe
    const topGroup = new THREE.Group();
    const topBody = new THREE.Mesh(this.pipeGeo, this.pipeMat);
    topBody.position.y = 14;
    topBody.castShadow = true;
    topBody.receiveShadow = true;

    const topRim = new THREE.Mesh(this.rimGeo, this.rimMat);
    topRim.position.y = 0.6;
    topRim.castShadow = true;

    const topNeon = new THREE.Mesh(this.neonBandGeo, this.neonBandMat);
    topNeon.position.y = 0.6;

    topGroup.add(topBody, topRim, topNeon);

    // Bottom Pipe
    const bottomGroup = new THREE.Group();
    const bottomBody = new THREE.Mesh(this.pipeGeo, this.pipeMat);
    bottomBody.position.y = -14;
    bottomBody.castShadow = true;
    bottomBody.receiveShadow = true;

    const bottomRim = new THREE.Mesh(this.rimGeo, this.rimMat);
    bottomRim.position.y = -0.6;
    bottomRim.castShadow = true;

    const bottomNeon = new THREE.Mesh(this.neonBandGeo, this.neonBandMat);
    bottomNeon.position.y = -0.6;

    bottomGroup.add(bottomBody, bottomRim, bottomNeon);

    pair.add(topGroup, bottomGroup);

    return {
      group: pair,
      topGroup,
      bottomGroup,
      passed: false,
      nearMissLogged: false,
      gapCenterY: 0,
      gapHeight: PHYSICS.PIPE_GAP_HEIGHT,
      z: 0,
      isMoving: false,
      moveSpeed: 0,
      moveAmplitude: 0,
      baseY: 0,
      index: 0
    };
  }

  initPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const pipe = this.createPipePair();
      pipe.group.visible = false;
      this.scene.add(pipe.group);
      this.pipes.push(pipe);

      // Coins
      const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
      coin.visible = false;
      coin.castShadow = true;
      this.scene.add(coin);
      this.coins.push({ mesh: coin, active: false, z: 0, collected: false });

      // Golden Rings
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
      ring.visible = false;
      this.scene.add(ring);
      this.rings.push({ mesh: ring, active: false, z: 0, collected: false });

      // Powerups
      const powerup = new THREE.Mesh(this.powerupGeo, this.powerupMats.SHIELD);
      powerup.visible = false;
      this.scene.add(powerup);
      this.powerupItems.push({ mesh: powerup, active: false, type: 'SHIELD', z: 0, collected: false });
    }
  }

  reset() {
    this.nextSpawnZ = 22;
    this.spawnIndex = 0;

    this.pipes.forEach(p => {
      p.group.visible = false;
      p.passed = false;
      p.nearMissLogged = false;
    });

    this.coins.forEach(c => {
      c.mesh.visible = false;
      c.active = false;
      c.collected = false;
    });

    this.rings.forEach(r => {
      r.mesh.visible = false;
      r.active = false;
      r.collected = false;
    });

    this.powerupItems.forEach(p => {
      p.mesh.visible = false;
      p.active = false;
      p.collected = false;
    });

    // Spawn initial set
    for (let i = 0; i < 7; i++) {
      this.spawnPipe();
    }
  }

  spawnPipe() {
    const pipe = this.pipes.find(p => !p.group.visible) || this.pipes[0];

    const gapHeight = Math.max(4.8, PHYSICS.PIPE_GAP_HEIGHT - Math.min(this.spawnIndex * 0.03, 0.9));
    const range = PHYSICS.PIPE_MAX_Y - PHYSICS.PIPE_MIN_Y;
    const gapCenterY = PHYSICS.PIPE_MIN_Y + Math.random() * range;

    pipe.gapCenterY = gapCenterY;
    pipe.baseY = gapCenterY;
    pipe.gapHeight = gapHeight;
    pipe.z = this.nextSpawnZ;
    pipe.passed = false;
    pipe.nearMissLogged = false;
    pipe.index = this.spawnIndex;

    // Movement mechanics after 8 pipes
    if (this.spawnIndex > 8 && Math.random() < 0.35) {
      pipe.isMoving = true;
      pipe.moveSpeed = 1.8 + Math.random() * 1.5;
      pipe.moveAmplitude = 1.4 + Math.random() * 1.2;
    } else {
      pipe.isMoving = false;
    }

    pipe.topGroup.position.set(0, gapCenterY + gapHeight * 0.5, 0);
    pipe.bottomGroup.position.set(0, gapCenterY - gapHeight * 0.5, 0);
    pipe.group.position.set(0, 0, this.nextSpawnZ);
    pipe.group.visible = true;

    // Spawn Bonus Items
    this.spawnCollectibles(pipe, gapCenterY, this.nextSpawnZ);

    this.nextSpawnZ += PHYSICS.PIPE_SPACING_Z;
    this.spawnIndex++;
  }

  spawnCollectibles(pipe, gapCenterY, z) {
    const rand = Math.random();

    // 1. Golden Ring (25% chance)
    if (rand < 0.25) {
      const ring = this.rings.find(r => !r.active);
      if (ring) {
        ring.mesh.position.set(0, gapCenterY, z);
        ring.mesh.visible = true;
        ring.active = true;
        ring.z = z;
        ring.collected = false;
      }
    }
    // 2. Power-up (10% chance)
    else if (rand < 0.35) {
      const powerup = this.powerupItems.find(p => !p.active);
      if (powerup) {
        const types = ['SHIELD', 'SLOW_MO', 'MAGNET', 'MINI'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerup.type = type;
        powerup.mesh.material = this.powerupMats[type];
        powerup.mesh.position.set(0, gapCenterY, z);
        powerup.mesh.visible = true;
        powerup.active = true;
        powerup.z = z;
        powerup.collected = false;
      }
    }
    // 3. Gem / Coin (40% chance)
    else if (rand < 0.75) {
      const coin = this.coins.find(c => !c.active);
      if (coin) {
        coin.mesh.position.set(0, gapCenterY + (Math.random() * 1.2 - 0.6), z);
        coin.mesh.visible = true;
        coin.active = true;
        coin.z = z;
        coin.collected = false;
      }
    }
  }

  update(delta, birdPosition, birdMagnet = false) {
    const time = Date.now() * 0.003;

    // Animate & recycle pipes
    for (let pipe of this.pipes) {
      if (!pipe.group.visible) continue;

      if (pipe.isMoving) {
        const offset = Math.sin(time * pipe.moveSpeed + pipe.index) * pipe.moveAmplitude;
        pipe.gapCenterY = pipe.baseY + offset;
        pipe.topGroup.position.set(0, pipe.gapCenterY + pipe.gapHeight * 0.5, 0);
        pipe.bottomGroup.position.set(0, pipe.gapCenterY - pipe.gapHeight * 0.5, 0);
      }

      // If bird passed well ahead of pipe, recycle
      if (birdPosition.z - pipe.z > 25) {
        pipe.group.visible = false;
      }
    }

    // Animate coins & magnet pull
    for (let coin of this.coins) {
      if (!coin.active) continue;
      coin.mesh.rotation.z += 3.5 * delta;
      coin.mesh.rotation.y += 1.5 * delta;

      if (birdMagnet && !coin.collected) {
        const dist = coin.mesh.position.distanceTo(birdPosition);
        if (dist < 16) {
          coin.mesh.position.lerp(birdPosition, 1 - Math.exp(-9 * delta));
        }
      }

      if (birdPosition.z - coin.z > 20) {
        coin.active = false;
        coin.mesh.visible = false;
      }
    }

    // Animate Rings
    for (let ring of this.rings) {
      if (!ring.active) continue;
      ring.mesh.rotation.z += 1.8 * delta;

      if (birdPosition.z - ring.z > 20) {
        ring.active = false;
        ring.mesh.visible = false;
      }
    }

    // Animate Powerups
    for (let pup of this.powerupItems) {
      if (!pup.active) continue;
      pup.mesh.rotation.x += 2.0 * delta;
      pup.mesh.rotation.y += 2.5 * delta;
      pup.mesh.position.y += Math.sin(time * 3 + pup.z) * 0.008;

      if (birdMagnet && !pup.collected) {
        const dist = pup.mesh.position.distanceTo(birdPosition);
        if (dist < 14) {
          pup.mesh.position.lerp(birdPosition, 1 - Math.exp(-8 * delta));
        }
      }

      if (birdPosition.z - pup.z > 20) {
        pup.active = false;
        pup.mesh.visible = false;
      }
    }

    // Spawn new pipes as bird progresses forward
    while (this.nextSpawnZ < birdPosition.z + 130) {
      this.spawnPipe();
    }
  }

  getActivePipes() {
    return this.pipes.filter(p => p.group.visible);
  }

  getActiveCoins() {
    return this.coins.filter(c => c.active && !c.collected);
  }

  getActiveRings() {
    return this.rings.filter(r => r.active && !r.collected);
  }

  getActivePowerups() {
    return this.powerupItems.filter(p => p.active && !p.collected);
  }
}
