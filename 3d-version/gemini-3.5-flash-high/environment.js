import * as THREE from 'three';

class Environment {
  constructor(scene, camera, quality = 'medium') {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    
    this.clouds = [];
    this.mountains = [];
    
    this.themeColors = {
      primary: '#ff007f',
      secondary: '#00f0ff',
      background: '#050112'
    };

    this.setupFog();
    this.setupLighting();
    this.setupFloor();
    this.setupBackground();
  }

  // Set theme colors
  setTheme(themeName) {
    switch (themeName) {
      case 'emerald':
        this.themeColors = { primary: '#00ff88', secondary: '#ffaa00', background: '#020b07' };
        break;
      case 'cyberpunk':
        this.themeColors = { primary: '#ffea00', secondary: '#bd00ff', background: '#0a010d' };
        break;
      case 'synthwave':
      default:
        this.themeColors = { primary: '#ff007f', secondary: '#00f0ff', background: '#050112' };
        break;
    }
    
    // Update colors on active meshes
    if (this.scene.fog) {
      this.scene.fog.color.set(this.themeColors.background);
    }
    
    // Recreate floor grid texture
    this.updateFloorGridColor();
  }

  // Atmospheric fog
  setupFog() {
    this.scene.fog = new THREE.FogExp2(this.themeColors.background, 0.038);
  }

  // Lighting with optional high-quality shadows
  setupLighting() {
    // Ambient Light (deep purple fill light)
    this.ambientLight = new THREE.AmbientLight(0x1a0d33, 1.2);
    this.scene.add(this.ambientLight);

    // Directional Key Light (angled downwards)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight.position.set(5, 12, 6);
    
    if (this.quality === 'high') {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 25;
      this.dirLight.shadow.camera.left = -10;
      this.dirLight.shadow.camera.right = 10;
      this.dirLight.shadow.camera.top = 10;
      this.dirLight.shadow.camera.bottom = -10;
      this.dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.dirLight);

    // Back light to pop the 3D shapes from the dark background
    this.backLight = new THREE.DirectionalLight(0x442288, 1.0);
    this.backLight.position.set(-8, 3, -5);
    this.scene.add(this.backLight);
  }

  // Generate glowing grid texture dynamically via HTML5 Canvas
  createGridTexture(lineColor, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);

    // Draw grid lines
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    
    // Draw outer borders
    ctx.strokeRect(0, 0, 128, 128);
    
    // Add inner neon blur glow effect
    ctx.strokeStyle = lineColor + '33'; // transparent glow
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Set repeat scale
    texture.repeat.set(30, 30);
    
    return texture;
  }

  setupFloor() {
    this.gridTexture = this.createGridTexture(this.themeColors.secondary, '#03010a');
    
    // High-performance scrolling floor grid
    const floorGeom = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.gridTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2; // Lie flat
    this.floorMesh.position.y = -4.3;         // Just below bird floor boundary
    this.floorMesh.receiveShadow = true;
    
    this.scene.add(this.floorMesh);
  }

  updateFloorGridColor() {
    if (this.gridTexture) {
      this.gridTexture.dispose();
    }
    this.gridTexture = this.createGridTexture(this.themeColors.secondary, '#03010a');
    if (this.floorMesh && this.floorMesh.material) {
      this.floorMesh.material.map = this.gridTexture;
      this.floorMesh.material.needsUpdate = true;
    }
  }

  // Parallax elements: low-poly mountains and clouds
  setupBackground() {
    // 1. Far mountains (Cones with flat shading)
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x0c061a,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    const mCount = 10;
    for (let i = 0; i < mCount; i++) {
      const radius = 6 + Math.random() * 8;
      const height = 8 + Math.random() * 12;
      const geom = new THREE.ConeGeometry(radius, height, 5); // 5-sided cone for low-poly look
      
      const mesh = new THREE.Mesh(geom, mountainMat);
      
      // Position them deep in background, staggered
      const x = -30 + i * 15 + (Math.random() - 0.5) * 8;
      const z = -20 - Math.random() * 15;
      const y = -4.3 + height / 2 - 1.5; // sink partially in floor
      
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * Math.PI;
      
      this.scene.add(mesh);
      this.mountains.push({ mesh, x, radius, speedFactor: 0.05 + Math.random() * 0.05 });
    }

    // 2. Floating low-poly clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
      transparent: true,
      opacity: 0.45
    });

    const cCount = 12;
    for (let i = 0; i < cCount; i++) {
      const cloudGroup = new THREE.Group();
      
      // Assemble cloud out of 3-5 intersecting boxes
      const boxCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < boxCount; j++) {
        const w = 1.5 + Math.random() * 2;
        const h = 0.8 + Math.random() * 1;
        const d = 1.0 + Math.random() * 1.5;
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloudMat);
        
        box.position.set(
          (j - boxCount/2) * 0.8,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        );
        cloudGroup.add(box);
      }

      const x = -20 + i * 12 + (Math.random() - 0.5) * 5;
      const y = 3 + Math.random() * 4;
      const z = -8 - Math.random() * 12;
      
      cloudGroup.position.set(x, y, z);
      this.scene.add(cloudGroup);
      
      this.clouds.push({
        group: cloudGroup,
        x,
        speedFactor: 0.12 + Math.random() * 0.15
      });
    }
  }

  // Update parallax elements and texture scroll offsets
  update(deltaTime, gameSpeed) {
    // Scroll the infinite floor grid texture
    if (this.gridTexture) {
      // Offset along Y maps to scrolling in X direction (due to plane UV rotation)
      this.gridTexture.offset.y -= (gameSpeed * 0.15) * deltaTime;
    }

    // Scroll mountains (slow parallax)
    this.mountains.forEach(m => {
      m.x -= gameSpeed * m.speedFactor * deltaTime;
      // Wrap around when off-screen
      if (m.x < -45) {
        m.x = 45;
      }
      m.mesh.position.x = m.x;
    });

    // Scroll clouds (medium parallax)
    this.clouds.forEach(c => {
      c.x -= gameSpeed * c.speedFactor * deltaTime;
      if (c.x < -30) {
        c.x = 30;
      }
      c.group.position.x = c.x;
    });
  }

  // Core Camera Controllers: smoothly follow player with different perspectives
  updateCamera(cameraMode, birdPos, birdVelocity, deltaTime) {
    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    switch (cameraMode) {
      case 'chase':
        // Chase Cam: Behind the bird, looking down the course
        targetCamPos.set(
          birdPos.x - 4.5, // 4.5 units behind
          THREE.MathUtils.lerp(this.camera.position.y, birdPos.y + 0.8, deltaTime * 8.0), // follow height smoothly
          birdPos.z
        );
        targetLookAt.set(
          birdPos.x + 5.0, // Look ahead
          birdPos.y * 0.6,
          birdPos.z
        );
        break;

      case 'firstperson':
        // FPV: From the eyes of the bird
        targetCamPos.set(
          birdPos.x + 0.4,
          birdPos.y + 0.1,
          birdPos.z
        );
        targetLookAt.set(
          birdPos.x + 8.0,
          // Follow vertical pitch of bird flight path
          birdPos.y + birdVelocity.y * 0.12, 
          birdPos.z
        );
        break;

      case 'classic':
      default:
        // Classic 3D View: Angled side-scroller
        targetCamPos.set(
          birdPos.x + 1.2,
          1.0, // stationary height
          7.2  // offset in Z
        );
        targetLookAt.set(
          birdPos.x + 1.5,
          birdPos.y * 0.7, // partial follow of bird's height
          0
        );
        break;
    }

    // Apply positions with smooth dampening
    if (cameraMode === 'firstperson') {
      // First person needs rigid position to avoid looking inside the bird mesh
      this.camera.position.copy(targetCamPos);
    } else {
      // Chase & Classic cameras benefit from smooth tracking
      this.camera.position.lerp(targetCamPos, deltaTime * 12.0);
    }

    // Look at target
    const currentLookTarget = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .add(this.camera.position);
      
    currentLookTarget.lerp(targetLookAt, deltaTime * 12.0);
    this.camera.lookAt(currentLookTarget);
  }

  // Handle updates to quality settings
  setQuality(quality) {
    this.quality = quality;
    if (this.dirLight) {
      this.scene.remove(this.dirLight);
    }
    this.setupLighting();
  }

  // Clear background elements from scene
  destroy() {
    this.scene.remove(this.floorMesh);
    this.floorMesh.geometry.dispose();
    this.floorMesh.material.dispose();
    this.gridTexture.dispose();
    
    this.mountains.forEach(m => {
      this.scene.remove(m.mesh);
      m.mesh.geometry.dispose();
      m.mesh.material.dispose();
    });
    
    this.clouds.forEach(c => {
      this.scene.remove(c.group);
      c.group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    });
  }
}

export { Environment };
