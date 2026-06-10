import * as THREE from 'three';

class Pipe {
  constructor(scene, x, gapY, gapSize, themeColors) {
    this.scene = scene;
    this.x = x;
    this.gapY = gapY;
    this.gapSize = gapSize;
    this.theme = themeColors;
    
    this.passed = false;
    this.width = 0.9; // Pillar diameter
    
    this.group = new THREE.Group();
    this.group.position.x = x;
    this.scene.add(this.group);
    
    this.createModel();
  }

  createModel() {
    // Materials
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x110d24,
      roughness: 0.7,
      metalness: 0.8,
      flatShading: true
    });
    
    const neonMaterial = new THREE.MeshBasicMaterial({
      color: this.theme.primary,
    });
    
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.theme.secondary,
      transparent: true,
      opacity: 0.9
    });

    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x221a44,
      roughness: 0.5,
      metalness: 0.6,
      flatShading: true
    });

    // Screen height range is roughly -5 to +5.
    const worldHeight = 12.0; 
    
    // Bottom Pillar
    const bottomHeight = (this.gapY - this.gapSize / 2) - (-6.0);
    const bottomY = -6.0 + bottomHeight / 2;
    
    const geomBottom = new THREE.CylinderGeometry(this.width / 2, this.width / 2, bottomHeight, 8);
    this.meshBottom = new THREE.Mesh(geomBottom, pillarMaterial);
    this.meshBottom.position.y = bottomY;
    this.meshBottom.castShadow = true;
    this.meshBottom.receiveShadow = true;
    this.group.add(this.meshBottom);
    
    // Bottom cap
    const capGeom = new THREE.CylinderGeometry(this.width / 2 + 0.08, this.width / 2 + 0.08, 0.25, 8);
    const capBottom = new THREE.Mesh(capGeom, capMaterial);
    capBottom.position.y = this.gapY - this.gapSize / 2 - 0.125;
    capBottom.castShadow = true;
    this.group.add(capBottom);

    // Neon trim for bottom cap
    const trimGeom = new THREE.CylinderGeometry(this.width / 2 + 0.1, this.width / 2 + 0.1, 0.06, 8);
    const trimBottom = new THREE.Mesh(trimGeom, neonMaterial);
    trimBottom.position.y = this.gapY - this.gapSize / 2 - 0.03;
    this.group.add(trimBottom);

    // Top Pillar
    const topHeight = 6.0 - (this.gapY + this.gapSize / 2);
    const topY = 6.0 - topHeight / 2;
    
    const geomTop = new THREE.CylinderGeometry(this.width / 2, this.width / 2, topHeight, 8);
    this.meshTop = new THREE.Mesh(geomTop, pillarMaterial);
    this.meshTop.position.y = topY;
    this.meshTop.castShadow = true;
    this.meshTop.receiveShadow = true;
    this.group.add(this.meshTop);

    // Top cap
    const capTop = new THREE.Mesh(capGeom, capMaterial);
    capTop.position.y = this.gapY + this.gapSize / 2 + 0.125;
    capTop.castShadow = true;
    this.group.add(capTop);

    // Neon trim for top cap
    const trimTop = new THREE.Mesh(trimGeom, neonMaterial);
    trimTop.position.y = this.gapY + this.gapSize / 2 + 0.03;
    this.group.add(trimTop);

    // Glowing Score Ring in the Gap
    // Torus facing the camera (aligned with Y-Z plane so bird flies through it)
    const ringGeom = new THREE.TorusGeometry(this.gapSize / 2.2, 0.06, 8, 24);
    this.ringMesh = new THREE.Mesh(ringGeom, ringMaterial);
    // Rotate 90 degrees around Y so the ring opening is along the X-axis (direction of travel)
    this.ringMesh.rotation.y = Math.PI / 2;
    this.ringMesh.position.y = this.gapY;
    this.group.add(this.ringMesh);
  }

  update(deltaTime, speed) {
    this.x -= speed * deltaTime;
    this.group.position.x = this.x;
    
    // Rotate the ring slowly for dynamic visuals
    if (this.ringMesh) {
      this.ringMesh.rotation.z += 1.5 * deltaTime;
    }
  }

  // Bounding boxes for physics
  getBoundingBoxes() {
    const boxBottom = new THREE.Box3();
    const boxTop = new THREE.Box3();
    
    // Compute bounding box from meshes in world coordinates
    if (this.meshBottom && this.meshTop) {
      boxBottom.setFromObject(this.meshBottom);
      boxTop.setFromObject(this.meshTop);
    }
    
    return [boxBottom, boxTop];
  }

  destroy() {
    this.scene.remove(this.group);
    
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

class PipeManager {
  constructor(scene) {
    this.scene = scene;
    this.pipes = [];
    
    // Speed variables
    this.baseSpeed = 4.8;
    this.speed = this.baseSpeed;
    this.speedIncreaseRate = 0.08; // speed up slowly over time
    
    // Generation settings
    this.spawnInterval = 3.6; // spawn new pipe every X seconds
    this.spawnTimer = 0;
    this.startX = 22.0;       // spawn far right
    this.minY = -1.6;
    this.maxY = 1.6;
    this.gapSize = 2.8;       // space between top/bottom pillars
    
    // Default theme colors (will be updated dynamically)
    this.themeColors = {
      primary: 0xff007f,   // Neon Pink
      secondary: 0x00f0ff  // Neon Cyan
    };
  }

  setTheme(themeName) {
    switch (themeName) {
      case 'emerald':
        this.themeColors = { primary: 0x00ff88, secondary: 0xffaa00 }; // Emerald + Amber Gold
        break;
      case 'cyberpunk':
        this.themeColors = { primary: 0xffea00, secondary: 0xbd00ff }; // Cyber Yellow + Neon Purple
        break;
      case 'synthwave':
      default:
        this.themeColors = { primary: 0xff007f, secondary: 0x00f0ff }; // Neon Pink + Neon Cyan
        break;
    }
  }

  update(deltaTime, birdX, onScore, particleSystem) {
    // Increase speed slowly
    this.speed += this.speedIncreaseRate * deltaTime;

    // Spawn pipes
    this.spawnTimer += deltaTime;
    const timePerSpawn = this.spawnInterval * (this.baseSpeed / this.speed); // spawn closer together at higher speeds
    if (this.spawnTimer >= timePerSpawn) {
      this.spawnTimer = 0;
      this.spawnPipe();
    }

    // Update and filter pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.update(deltaTime, this.speed);
      
      // Score point check
      if (!pipe.passed && pipe.x < birdX) {
        pipe.passed = true;
        
        // Visual reward: spawn sparkles around the ring center
        if (particleSystem) {
          particleSystem.spawnSparkles(
            new THREE.Vector3(pipe.x, pipe.gapY, 0),
            12,
            this.themeColors.secondary
          );
        }
        
        onScore(); // trigger score callback
      }
      
      // Remove offscreen pipes
      if (pipe.x < -12.0) {
        pipe.destroy();
        this.pipes.splice(i, 1);
      }
    }
  }

  spawnPipe() {
    const gapY = this.minY + Math.random() * (this.maxY - this.minY);
    const pipe = new Pipe(this.scene, this.startX, gapY, this.gapSize, this.themeColors);
    this.pipes.push(pipe);
  }

  checkCollision(birdBox) {
    for (const pipe of this.pipes) {
      const [boxBottom, boxTop] = pipe.getBoundingBoxes();
      if (birdBox.intersectsBox(boxBottom) || birdBox.intersectsBox(boxTop)) {
        return true; // Crash!
      }
    }
    return false;
  }

  clear() {
    this.pipes.forEach(pipe => pipe.destroy());
    this.pipes = [];
    this.spawnTimer = 0;
    this.speed = this.baseSpeed;
  }
}

export { PipeManager };
