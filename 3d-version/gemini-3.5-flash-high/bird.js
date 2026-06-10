import * as THREE from 'three';

class Bird {
  constructor(scene) {
    this.scene = scene;
    
    // Physics parameters
    this.y = 0;
    this.vy = 0;
    this.gravity = -25.0; // units/sec^2
    this.jumpForce = 8.5; // instant upward velocity
    
    this.radius = 0.45; // Collision radius approximation
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    
    // Flight status
    this.isDead = false;
    this.wingTimer = 0;
    this.wingFlapSpeed = 10;
    
    // Build 3D meshes
    this.group = new THREE.Group();
    this.createModel();
    this.scene.add(this.group);
    
    // Set initial position
    this.reset();
  }

  // Create cute low-poly bird model
  createModel() {
    // Materials
    const yellowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdb14,
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true
    });
    
    const bellyMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffcf0,
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true
    });

    const beakMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7b00,
      roughness: 0.3,
      metalness: 0.1,
      flatShading: true
    });

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0418 });
    const cheekMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b93 });

    // 1. Main Body (Ellipsoid-like sphere)
    const bodyGeom = new THREE.SphereGeometry(0.45, 8, 8);
    const bodyMesh = new THREE.Mesh(bodyGeom, yellowMaterial);
    bodyMesh.scale.set(1.2, 1, 1); // Stretch along X-axis (direction of travel/facing)
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.group.add(bodyMesh);

    // 2. Belly Plate (Soft underbelly)
    const bellyGeom = new THREE.SphereGeometry(0.38, 6, 6);
    const bellyMesh = new THREE.Mesh(bellyGeom, bellyMaterial);
    bellyMesh.scale.set(1.1, 0.8, 1);
    bellyMesh.position.set(0.08, -0.15, 0);
    this.group.add(bellyMesh);

    // 3. Cute Beak (Cone)
    const beakGeom = new THREE.ConeGeometry(0.12, 0.28, 4);
    const beakMesh = new THREE.Mesh(beakGeom, beakMaterial);
    beakMesh.rotation.z = -Math.PI / 2; // Point forward (positive X)
    beakMesh.position.set(0.52, -0.05, 0);
    beakMesh.castShadow = true;
    this.group.add(beakMesh);

    // 4. Large Expressive Eyes (Left & Right)
    const eyeGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const pupilGeom = new THREE.SphereGeometry(0.06, 6, 6);
    
    // Left Eye
    this.leftEyeGroup = new THREE.Group();
    const eyeL = new THREE.Mesh(eyeGeom, eyeMaterial);
    const pupilL = new THREE.Mesh(pupilGeom, pupilMaterial);
    pupilL.position.set(0.06, 0.02, 0.06); // Face slightly forward and outward
    this.leftEyeGroup.add(eyeL);
    this.leftEyeGroup.add(pupilL);
    this.leftEyeGroup.position.set(0.24, 0.15, 0.26);
    this.group.add(this.leftEyeGroup);

    // Right Eye
    this.rightEyeGroup = new THREE.Group();
    const eyeR = new THREE.Mesh(eyeGeom, eyeMaterial);
    const pupilR = new THREE.Mesh(pupilGeom, pupilMaterial);
    pupilR.position.set(0.06, 0.02, -0.06);
    this.rightEyeGroup.add(eyeR);
    this.rightEyeGroup.add(pupilR);
    this.rightEyeGroup.position.set(0.24, 0.15, -0.26);
    this.group.add(this.rightEyeGroup);

    // 5. Rosy Cheeks
    const cheekGeom = new THREE.SphereGeometry(0.06, 6, 6);
    const cheekL = new THREE.Mesh(cheekGeom, cheekMaterial);
    cheekL.position.set(0.26, 0.02, 0.28);
    cheekL.scale.set(0.5, 1, 1);
    this.group.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeom, cheekMaterial);
    cheekR.position.set(0.26, 0.02, -0.28);
    cheekR.scale.set(0.5, 1, 1);
    this.group.add(cheekR);

    // 6. Tail Feathers (stacked low poly boxes)
    const tailGeom = new THREE.BoxGeometry(0.2, 0.15, 0.3);
    const tailMesh = new THREE.Mesh(tailGeom, yellowMaterial);
    tailMesh.position.set(-0.5, 0.05, 0);
    tailMesh.rotation.z = Math.PI / 12; // tilted up slightly
    tailMesh.castShadow = true;
    this.group.add(tailMesh);

    // 7. Jointed Wings (Pivot groups for left/right flapping)
    this.leftWingJoint = new THREE.Group();
    this.leftWingJoint.position.set(-0.05, 0.08, 0.42); // attach to left side of body
    this.group.add(this.leftWingJoint);

    const wingGeom = new THREE.BoxGeometry(0.35, 0.05, 0.45);
    // Offset the mesh inside the joint group so it rotates about its root (inner edge)
    const wingL = new THREE.Mesh(wingGeom, bellyMaterial);
    wingL.position.set(-0.05, 0, 0.2); // offset outward in Z
    wingL.rotation.x = Math.PI / 15;
    wingL.castShadow = true;
    this.leftWingJoint.add(wingL);

    this.rightWingJoint = new THREE.Group();
    this.rightWingJoint.position.set(-0.05, 0.08, -0.42); // attach to right side of body
    this.group.add(this.rightWingJoint);

    const wingR = new THREE.Mesh(wingGeom, bellyMaterial);
    wingR.position.set(-0.05, 0, -0.2); // offset outward in negative Z
    wingR.rotation.x = -Math.PI / 15;
    wingR.castShadow = true;
    this.rightWingJoint.add(wingR);
  }

  // Handle wing flapping animation and body tilt
  update(deltaTime) {
    if (this.isDead) {
      // Falling rotation/spin
      this.group.rotation.x += 10 * deltaTime;
      this.group.rotation.y += 2 * deltaTime;
      
      // Fall down
      this.vy += this.gravity * deltaTime;
      this.y += this.vy * deltaTime;
      if (this.y < -4.0) {
        this.y = -4.0;
        this.vy = 0;
      }
      this.group.position.y = this.y;
      
      // Stop wings flapping
      this.leftWingJoint.rotation.x = Math.PI / 6;
      this.rightWingJoint.rotation.x = -Math.PI / 6;
      return;
    }

    // Apply gravity
    this.vy += this.gravity * deltaTime;
    this.y += this.vy * deltaTime;

    // Floor and Ceiling limits
    if (this.y > 4.5) {
      this.y = 4.5;
      this.vy = 0;
    }
    if (this.y < -3.9) {
      this.y = -3.9;
      this.vy = 0;
    }

    this.group.position.y = this.y;

    // Calculate pitch angle based on velocity (tilt up when moving up, tilt down when falling)
    // Map velocity to angle (-60 to +30 degrees)
    const targetPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 8, this.vy * 0.08));
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, deltaTime * 12);
    
    // Roll slightly based on pitch/flapping (adds action)
    this.roll = THREE.MathUtils.lerp(this.roll, 0, deltaTime * 6);
    this.yaw = THREE.MathUtils.lerp(this.yaw, 0, deltaTime * 6);

    // Apply rotation transforms
    this.group.rotation.set(0, 0, 0); // clear
    this.group.rotateZ(this.pitch);
    this.group.rotateX(this.roll);
    this.group.rotateY(this.yaw);

    // Animate wing flapping: fast when rising, slow/gliding when falling
    this.wingTimer += deltaTime * (this.wingFlapSpeed + Math.max(0, this.vy * 1.5));
    
    // Wave movement
    const wingAngle = Math.sin(this.wingTimer) * 0.7; // flap sweep
    
    this.leftWingJoint.rotation.x = wingAngle;
    this.rightWingJoint.rotation.x = -wingAngle;
  }

  // Jump logic
  flap() {
    if (this.isDead) return;
    this.vy = this.jumpForce;
    
    // Boost flap animation instantly
    this.wingTimer += 2.0; 
    this.roll = (Math.random() - 0.5) * 0.3; // tiny roll wiggle on flap
    
    // Look up quickly
    this.pitch = Math.PI / 6;
  }

  // Collide or die
  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.vy = -3.0; // Initial push up on death
  }

  // Retrieve current world bounding box for accurate collisions
  getBoundingBox() {
    // Construct local bounds and translate
    const box = new THREE.Box3();
    box.setFromObject(this.group);
    
    // In Chase Cam or First Person, we want tight bounds
    // Contract the box slightly to make gameplay feel fair (forgiving collisions)
    box.expandByScalar(-0.1); 
    return box;
  }

  // Reset player variables
  reset() {
    this.y = 0;
    this.vy = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.isDead = false;
    
    this.group.position.set(0, this.y, 0);
    this.group.rotation.set(0, 0, 0);
    
    this.leftWingJoint.rotation.set(0, 0, 0);
    this.rightWingJoint.rotation.set(0, 0, 0);
  }
}

export { Bird };
