import * as THREE from 'three';

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    
    // Share geometries and materials where possible to optimize memory/GC
    this.featherGeometry = new THREE.PlaneGeometry(0.12, 0.25);
    this.sparkleGeometry = new THREE.OctahedronGeometry(0.08, 0);
    this.voxelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
  }

  // Spawn feather particles when the bird flaps
  spawnFeathers(position, count = 8) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      
      const mesh = new THREE.Mesh(this.featherGeometry, material);
      
      // Position slightly offset from bird center
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.2;
      mesh.position.y += (Math.random() - 0.5) * 0.2;
      mesh.position.z += (Math.random() - 0.5) * 0.2;
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Physics values: drift back and down
      const velocity = new THREE.Vector3(
        -1.5 - Math.random() * 1.5,      // Drift backwards
        -0.5 + (Math.random() - 0.3) * 1.0, // Mild vertical spread
        (Math.random() - 0.5) * 1.5      // Horizontal spread
      );

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        gravity: 0.8, // Drifts down
        drag: 0.95,   // Slows down in air
        rotSpeed,
        scaleSpeed: -0.5,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4
      });
    }
  }

  // Spawn bright sparkles when passing through a scoring ring
  spawnSparkles(position, count = 18, color = 0x00f0ff) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      
      const mesh = new THREE.Mesh(this.sparkleGeometry, material);
      
      mesh.position.copy(position);
      
      // Explosive speed in all directions
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const speed = 4 + Math.random() * 6;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      // Spin
      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        gravity: 0,   // Sparkles fly straight without gravity
        drag: 0.92,   // High drag to slow them down quickly
        rotSpeed,
        scaleSpeed: -0.9,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3
      });
    }
  }

  // Spawn voxel shards when bird crashes
  spawnExplosion(position, primaryColor = 0xff007f, secondaryColor = 0x00f0ff, count = 45) {
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.4 ? primaryColor : secondaryColor;
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.2,
        flatShading: true,
        transparent: true,
        opacity: 1.0
      });
      
      const mesh = new THREE.Mesh(this.voxelGeometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      mesh.position.copy(position);
      
      // Burst pattern
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const speed = 5 + Math.random() * 12;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed + 3, // Blast upwards
        Math.cos(phi) * speed
      );

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        gravity: 12.0, // High gravity pulls them down
        drag: 0.98,   // Slighter air resistance
        rotSpeed,
        scaleSpeed: -0.4,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        bounce: true
      });
    }
  }

  // Update all active particles in the loop
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;
      
      if (p.life >= p.maxLife) {
        // Remove from scene and list
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }
      
      // Apply gravity
      p.velocity.y -= p.gravity * deltaTime;
      
      // Apply drag
      p.velocity.x *= Math.pow(p.drag, deltaTime * 60);
      p.velocity.y *= Math.pow(p.drag, deltaTime * 60);
      p.velocity.z *= Math.pow(p.drag, deltaTime * 60);
      
      // Move mesh
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      
      // Rotate mesh
      p.mesh.rotation.x += p.rotSpeed.x * deltaTime;
      p.mesh.rotation.y += p.rotSpeed.y * deltaTime;
      p.mesh.rotation.z += p.rotSpeed.z * deltaTime;
      
      // Fade out
      const pctLife = p.life / p.maxLife;
      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, 1 - pctLife);
      }
      
      // Shrink
      const scale = Math.max(0.01, 1 + p.scaleSpeed * pctLife);
      p.mesh.scale.set(scale, scale, scale);
      
      // Physics ground collision (if bounce is enabled)
      if (p.bounce && p.mesh.position.y < -3.9) {
        p.mesh.position.y = -3.9;
        p.velocity.y = -p.velocity.y * 0.5; // Bounce energy loss
        p.velocity.x *= 0.8;                // Friction
        p.velocity.z *= 0.8;
      }
    }
  }

  // Clear all particles (e.g. on restart)
  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach(m => m.dispose());
      } else {
        p.mesh.material.dispose();
      }
    });
    this.particles = [];
  }
}

export { ParticleSystem };
