import * as THREE from 'three';
import { PHYSICS, SKINS, HATS } from '../game/constants.js';

export class Bird {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Physics & State
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;

    this.wingAngle = 0;
    this.wingSpeed = 15;
    this.flapTimer = 0;
    this.squash = new THREE.Vector3(1, 1, 1);
    this.squashTarget = new THREE.Vector3(1, 1, 1);

    // Customization
    this.currentSkin = SKINS[0];
    this.currentHat = 'none';
    this.materials = {};
    this.hatMeshes = {};

    // Powerup visual states
    this.isMini = false;
    this.targetScale = 1.0;
    this.currentScale = 1.0;
    this.shieldMesh = null;
    this.hasShield = false;

    this.initMesh();
    this.setSkin(this.currentSkin.id);
    this.setHat(this.currentHat);
    this.reset();
  }

  initMesh() {
    this.birdContainer = new THREE.Group();
    this.group.add(this.birdContainer);

    // Materials dictionary
    this.materials.body = new THREE.MeshStandardMaterial({
      color: 0xffcb05,
      roughness: 0.35,
      metalness: 0.1
    });

    this.materials.belly = new THREE.MeshStandardMaterial({
      color: 0xfff3a0,
      roughness: 0.45,
      metalness: 0.05
    });

    this.materials.wing = new THREE.MeshStandardMaterial({
      color: 0xe6a800,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.materials.beak = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      roughness: 0.3,
      metalness: 0.2
    });

    this.materials.eyeWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0
    });

    this.materials.pupil = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.8
    });

    this.materials.highlight = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    this.materials.blush = new THREE.MeshStandardMaterial({
      color: 0xff4081,
      roughness: 0.5,
      transparent: true,
      opacity: 0.65
    });

    // --- BODY ---
    // Oval egg shape
    const bodyGeo = new THREE.SphereGeometry(0.7, 24, 20);
    bodyGeo.scale(1.0, 1.1, 1.25);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.materials.body);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.birdContainer.add(this.bodyMesh);

    // --- BELLY ---
    const bellyGeo = new THREE.SphereGeometry(0.58, 20, 16);
    bellyGeo.scale(0.9, 0.95, 1.1);
    this.bellyMesh = new THREE.Mesh(bellyGeo, this.materials.belly);
    this.bellyMesh.position.set(0, -0.15, 0.15);
    this.birdContainer.add(this.bellyMesh);

    // --- HEAD FEATHER CREST ---
    this.crestGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const featherGeo = new THREE.ConeGeometry(0.12 - i * 0.02, 0.45 - i * 0.05, 8);
      featherGeo.rotateX(-0.35 + i * 0.2);
      const feather = new THREE.Mesh(featherGeo, this.materials.wing);
      feather.position.set(0, 0.7 + i * 0.05, -0.15 - i * 0.12);
      this.crestGroup.add(feather);
    }
    this.birdContainer.add(this.crestGroup);

    // --- BEAK ---
    this.beakUpper = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.5, 12),
      this.materials.beak
    );
    this.beakUpper.rotation.x = Math.PI * 0.5;
    this.beakUpper.position.set(0, 0.05, 0.95);
    this.beakUpper.scale.set(1.1, 1.0, 0.65);
    this.birdContainer.add(this.beakUpper);

    this.beakLower = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.4, 12),
      this.materials.beak
    );
    this.beakLower.rotation.x = Math.PI * 0.52;
    this.beakLower.position.set(0, -0.12, 0.88);
    this.beakLower.scale.set(1.0, 0.8, 0.5);
    this.birdContainer.add(this.beakLower);

    // --- EYES (Left & Right) ---
    this.eyeGroupLeft = this.createEye(true);
    this.eyeGroupLeft.position.set(0.38, 0.28, 0.48);
    this.birdContainer.add(this.eyeGroupLeft);

    this.eyeGroupRight = this.createEye(false);
    this.eyeGroupRight.position.set(-0.38, 0.28, 0.48);
    this.birdContainer.add(this.eyeGroupRight);

    // --- CHEEKS ---
    const cheekGeo = new THREE.SphereGeometry(0.14, 12, 10);
    cheekGeo.scale(1.0, 0.6, 0.4);

    this.cheekLeft = new THREE.Mesh(cheekGeo, this.materials.blush);
    this.cheekLeft.position.set(0.52, 0.02, 0.42);
    this.birdContainer.add(this.cheekLeft);

    this.cheekRight = new THREE.Mesh(cheekGeo, this.materials.blush);
    this.cheekRight.position.set(-0.52, 0.02, 0.42);
    this.birdContainer.add(this.cheekRight);

    // --- WINGS (Left & Right Articulated Pivot Groups) ---
    this.wingLeftPivot = new THREE.Group();
    this.wingLeftPivot.position.set(0.65, 0.05, 0.0);
    this.wingMeshLeft = this.createWingMesh();
    this.wingMeshLeft.position.set(0.35, 0, 0);
    this.wingLeftPivot.add(this.wingMeshLeft);
    this.birdContainer.add(this.wingLeftPivot);

    this.wingRightPivot = new THREE.Group();
    this.wingRightPivot.position.set(-0.65, 0.05, 0.0);
    this.wingMeshRight = this.createWingMesh();
    this.wingMeshRight.scale.set(-1, 1, 1);
    this.wingMeshRight.position.set(-0.35, 0, 0);
    this.wingRightPivot.add(this.wingMeshRight);
    this.birdContainer.add(this.wingRightPivot);

    // --- TAIL FEATHERS ---
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0.05, -0.8);
    for (let i = -1; i <= 1; i++) {
      const tailFeather = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.06, 0.45),
        this.materials.wing
      );
      tailFeather.position.set(i * 0.16, i === 0 ? 0.06 : 0, -0.18);
      tailFeather.rotation.set(0.25, i * 0.2, -i * 0.15);
      this.tailGroup.add(tailFeather);
    }
    this.birdContainer.add(this.tailGroup);

    // --- ACCESSORIES / HATS ---
    this.initHats();

    // --- SHIELD BUBBLE ---
    const shieldGeo = new THREE.SphereGeometry(1.2, 24, 20);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      wireframe: false
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.birdContainer.add(this.shieldMesh);
  }

  createEye(isLeft) {
    const group = new THREE.Group();

    // Eyeball
    const eyeGeo = new THREE.SphereGeometry(0.24, 16, 14);
    eyeGeo.scale(1.0, 1.2, 0.9);
    const eyeball = new THREE.Mesh(eyeGeo, this.materials.eyeWhite);
    group.add(eyeball);

    // Pupil
    const pupilGeo = new THREE.SphereGeometry(0.12, 14, 12);
    pupilGeo.scale(1.0, 1.1, 0.5);
    const pupil = new THREE.Mesh(pupilGeo, this.materials.pupil);
    pupil.position.set(isLeft ? 0.05 : -0.05, 0.02, 0.18);
    group.add(pupil);

    // Sparkle dot highlight
    const dotGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const dot = new THREE.Mesh(dotGeo, this.materials.highlight);
    dot.position.set(isLeft ? 0.09 : -0.01, 0.07, 0.22);
    group.add(dot);

    return group;
  }

  createWingMesh() {
    const wingGeo = new THREE.BoxGeometry(0.7, 0.08, 0.5);
    wingGeo.translate(0.35, 0, 0); // Center pivot at shoulder
    const mesh = new THREE.Mesh(wingGeo, this.materials.wing);
    mesh.castShadow = true;
    return mesh;
  }

  initHats() {
    this.hatsContainer = new THREE.Group();
    this.hatsContainer.position.set(0, 0.72, 0.05);
    this.birdContainer.add(this.hatsContainer);

    // 1. Top Hat
    const topHatGroup = new THREE.Group();
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.38, 0.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 })
    );
    crown.position.y = 0.3;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.385, 0.385, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 })
    );
    band.position.y = 0.1;
    topHatGroup.add(brim, crown, band);
    topHatGroup.rotation.x = -0.1;
    this.hatMeshes['tophat'] = topHatGroup;

    // 2. Aviator Goggles
    const gogglesGroup = new THREE.Group();
    const goggleFrameMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const goggleGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });
    [-0.26, 0.26].forEach(x => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), goggleFrameMat);
      rim.position.set(x, -0.32, 0.52);
      rim.rotation.x = 0.2;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), goggleGlassMat);
      lens.position.set(x, -0.32, 0.52);
      lens.rotation.x = Math.PI * 0.5 + 0.2;
      gogglesGroup.add(rim, lens);
    });
    this.hatMeshes['goggles'] = gogglesGroup;

    // 3. Royal Crown
    const crownGroup = new THREE.Group();
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.9 });
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 18, 1, true), crownMat);
    crownGroup.add(crownBase);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), crownMat);
      spike.position.set(Math.cos(ang) * 0.38, 0.2, Math.sin(ang) * 0.38);
      crownGroup.add(spike);
    }
    crownGroup.rotation.x = -0.15;
    this.hatMeshes['crown'] = crownGroup;

    // 4. Viking Helmet
    const vikingGroup = new THREE.Group();
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.8 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), helmMat);
    vikingGroup.add(cap);
    [-1, 1].forEach(side => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), hornMat);
      horn.position.set(side * 0.45, 0.2, 0);
      horn.rotation.z = -side * 0.8;
      horn.rotation.x = 0.2;
      vikingGroup.add(horn);
    });
    vikingGroup.rotation.x = -0.1;
    this.hatMeshes['viking'] = vikingGroup;

    // Hide all initially
    Object.values(this.hatMeshes).forEach(mesh => {
      mesh.visible = false;
      this.hatsContainer.add(mesh);
    });
  }

  setSkin(skinId) {
    const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    this.currentSkin = skin;

    this.materials.body.color.setHex(skin.bodyColor);
    this.materials.belly.color.setHex(skin.bellyColor);
    this.materials.wing.color.setHex(skin.wingColor);
    this.materials.beak.color.setHex(skin.beakColor);
    this.materials.pupil.color.setHex(skin.eyeColor);

    if (skin.id === 'cyber') {
      this.materials.body.metalness = 0.7;
      this.materials.body.roughness = 0.2;
    } else if (skin.id === 'gold') {
      this.materials.body.metalness = 0.95;
      this.materials.body.roughness = 0.15;
    } else {
      this.materials.body.metalness = 0.1;
      this.materials.body.roughness = 0.35;
    }
  }

  setHat(hatId) {
    this.currentHat = hatId;
    Object.keys(this.hatMeshes).forEach(id => {
      this.hatMeshes[id].visible = (id === hatId);
    });
  }

  setShield(active) {
    this.hasShield = active;
    if (this.shieldMesh) {
      this.shieldMesh.visible = active;
    }
  }

  setMini(active) {
    this.isMini = active;
    this.targetScale = active ? 0.55 : 1.0;
  }

  flap() {
    this.velocity.y = PHYSICS.FLAP_VELOCITY;
    this.flapTimer = 0.25;

    // Squash & Stretch impulse
    this.squash.set(0.8, 1.3, 0.8);

    // Beak chirp opening
    this.beakLower.rotation.x = Math.PI * 0.7;
    setTimeout(() => {
      this.beakLower.rotation.x = Math.PI * 0.52;
    }, 120);
  }

  update(delta, isPlaying = true) {
    // Handle mini scale lerp
    this.currentScale += (this.targetScale - this.currentScale) * (1 - Math.exp(-12 * delta));
    this.birdContainer.scale.set(
      this.currentScale * this.squash.x,
      this.currentScale * this.squash.y,
      this.currentScale * this.squash.z
    );

    // Squash recovery
    this.squash.lerp(this.squashTarget, 1 - Math.exp(-10 * delta));

    if (this.hasShield && this.shieldMesh) {
      this.shieldMesh.rotation.y += 2.0 * delta;
      this.shieldMesh.rotation.x += 1.0 * delta;
      const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.08;
      this.shieldMesh.scale.set(pulse, pulse, pulse);
    }

    if (isPlaying) {
      // Apply gravity
      this.velocity.y += PHYSICS.GRAVITY * delta;
      if (this.velocity.y < PHYSICS.MAX_FALL_SPEED) {
        this.velocity.y = PHYSICS.MAX_FALL_SPEED;
      }

      // Update position
      this.position.y += this.velocity.y * delta;
      this.position.z += this.velocity.z * delta;

      // Pitch calculation (smooth nose up on jump, smooth dive on fall)
      const targetPitch = Math.max(-1.1, Math.min(0.65, this.velocity.y * 0.065));
      this.pitch += (targetPitch - this.pitch) * (1 - Math.exp(-8 * delta));

      // Wing flapping animation
      if (this.flapTimer > 0) {
        this.flapTimer -= delta;
        this.wingAngle += 35 * delta;
      } else {
        // Gliding or gentle flap
        this.wingAngle += 8 * delta;
      }

      const wingFlap = Math.sin(this.wingAngle) * 0.7;
      this.wingLeftPivot.rotation.z = wingFlap - 0.2;
      this.wingRightPivot.rotation.z = -wingFlap + 0.2;

      // Tail flutter
      this.tailGroup.rotation.x = 0.2 + Math.sin(this.wingAngle * 0.5) * 0.15 - this.velocity.y * 0.02;

    } else {
      // Menu / Idle bobbing
      const time = Date.now() * 0.003;
      this.position.y = Math.sin(time) * 0.4;
      this.pitch = Math.sin(time * 0.8) * 0.1;
      
      const idleFlap = Math.sin(time * 4) * 0.4;
      this.wingLeftPivot.rotation.z = idleFlap;
      this.wingRightPivot.rotation.z = -idleFlap;
    }

    // Apply rotation & position to root group
    this.group.position.copy(this.position);
    this.birdContainer.rotation.set(this.pitch, this.yaw, this.roll);
  }

  getHitRadius() {
    return PHYSICS.BIRD_RADIUS * this.currentScale;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, PHYSICS.FORWARD_SPEED);
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.setShield(false);
    this.setMini(false);
    this.targetScale = 1.0;
    this.currentScale = 1.0;
    this.squash.set(1, 1, 1);
    this.group.position.copy(this.position);
    this.birdContainer.rotation.set(0, 0, 0);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
