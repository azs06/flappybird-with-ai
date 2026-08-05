import * as THREE from 'three';
import { CFG } from './config';

export class Bird {
  readonly group = new THREE.Group();
  y = 0.6;
  vy = 0;
  alive = true;
  private wingPivot: THREE.Object3D;
  private wingPivotFar: THREE.Object3D;
  private beakTop: THREE.Object3D;
  private beakBottom: THREE.Object3D;
  private tailPivot: THREE.Object3D;
  private bodyMesh: THREE.Mesh;
  private time = 0;
  private flapTime = 10;
  private squash = 0;
  private targetPitch = 0;
  private spinVel = 0;

  constructor() {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.5, metalness: 0 });
    const light = new THREE.MeshStandardMaterial({ color: 0xfff1b8, roughness: 0.55 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7b2f, roughness: 0.45 });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const black = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 22), yellow);
    body.scale.set(1.06, 0.92, 0.86);
    body.castShadow = true;
    this.bodyMesh = body;
    this.group.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), light);
    belly.position.set(0.16, -0.18, 0);
    belly.scale.set(0.95, 0.75, 0.72);
    this.group.add(belly);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(-0.28, 0.24, -0.62, 0.16);
    wingShape.quadraticCurveTo(-0.5, -0.02, -0.3, -0.1);
    wingShape.quadraticCurveTo(-0.12, -0.16, 0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
    wingGeo.center();

    this.wingPivot = new THREE.Object3D();
    this.wingPivot.position.set(-0.08, 0.1, 0.34);
    const wingNear = new THREE.Mesh(wingGeo, orange);
    wingNear.castShadow = true;
    this.wingPivot.add(wingNear);
    this.group.add(this.wingPivot);

    this.wingPivotFar = new THREE.Object3D();
    this.wingPivotFar.position.set(-0.08, 0.1, -0.36);
    const wingFar = new THREE.Mesh(wingGeo, orange);
    this.wingPivotFar.add(wingFar);
    this.group.add(this.wingPivotFar);

    const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 14), white);
    eyeWhiteL.position.set(0.34, 0.2, 0.22);
    const eyeWhiteR = eyeWhiteL.clone();
    eyeWhiteR.position.z = -0.22;
    const pupilGeo = new THREE.SphereGeometry(0.06, 12, 10);
    const pupilL = new THREE.Mesh(pupilGeo, black);
    pupilL.position.set(0.46, 0.22, 0.26);
    const pupilR = pupilL.clone();
    pupilR.position.z = -0.26;
    this.group.add(eyeWhiteL, eyeWhiteR, pupilL, pupilR);

    const beakGeoTop = new THREE.ConeGeometry(0.11, 0.34, 12);
    beakGeoTop.rotateZ(-Math.PI / 2);
    this.beakTop = new THREE.Object3D();
    this.beakTop.position.set(0.52, 0.06, 0);
    const beakTopMesh = new THREE.Mesh(beakGeoTop, orange);
    beakTopMesh.position.x = 0.12;
    beakTopMesh.scale.set(1, 1, 0.72);
    this.beakTop.add(beakTopMesh);
    this.group.add(this.beakTop);

    this.beakBottom = new THREE.Object3D();
    this.beakBottom.position.set(0.5, -0.05, 0);
    const beakBottomMesh = new THREE.Mesh(beakGeoTop, new THREE.MeshStandardMaterial({ color: 0xe85f1a, roughness: 0.5 }));
    beakBottomMesh.position.x = 0.09;
    beakBottomMesh.scale.set(0.82, 0.72, 0.56);
    this.beakBottom.add(beakBottomMesh);
    this.group.add(this.beakBottom);

    const tailGeo = new THREE.ConeGeometry(0.14, 0.42, 10);
    tailGeo.rotateZ(Math.PI / 2);
    this.tailPivot = new THREE.Object3D();
    this.tailPivot.position.set(-0.5, 0.12, 0);
    for (const [dy, dz] of [[0.05, 0.08], [0, 0], [0.05, -0.08]] as const) {
      const t = new THREE.Mesh(tailGeo, orange);
      t.position.set(-0.12, dy, dz);
      t.rotation.z = 0.16;
      this.tailPivot.add(t);
    }
    this.group.add(this.tailPivot);

    this.group.position.x = CFG.birdX;
    this.group.scale.setScalar(1.12);
  }

  flap(): void {
    this.flapTime = 0;
    this.squash = 1;
    this.targetPitch = 0.42;
  }

  kill(spinDir: number): void {
    this.alive = false;
    this.spinVel = spinDir * 9;
  }

  update(dt: number, state: 'ready' | 'playing' | 'dying' | 'gameover'): void {
    this.time += dt;
    this.flapTime += dt;
    this.group.position.y = this.y;

    if (state === 'ready') {
      this.y = 0.6 + Math.sin(this.time * 2.6) * 0.22;
      this.vy = Math.cos(this.time * 2.6) * 0.6;
      this.group.rotation.z = Math.sin(this.time * 2.6 + 0.6) * 0.08;
      this.group.rotation.x = 0;
    } else if (state === 'playing') {
      const pitchTarget = THREE.MathUtils.clamp(this.vy * 0.085, -1.05, 0.42);
      this.targetPitch = this.flapTime < 0.12 ? 0.42 : pitchTarget;
      this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, this.targetPitch, 9, dt);
    } else {
      this.group.rotation.z += this.spinVel * dt;
      this.spinVel *= Math.exp(-1.2 * dt);
    }

    const wingCycle = this.flapTime < 0.3
      ? Math.sin((this.flapTime / 0.3) * Math.PI * 2) * 1.15
      : Math.sin(this.time * (state === 'dying' ? 2 : 7)) * (state === 'ready' ? 0.5 : 0.22) - 0.25;
    this.wingPivot.rotation.x = -0.2 + wingCycle;
    this.wingPivotFar.rotation.x = 0.2 - wingCycle;

    this.squash = Math.max(0, this.squash - dt * 7);
    const stretch = state === 'playing' ? THREE.MathUtils.clamp(-this.vy * 0.012, -0.08, 0.1) : 0;
    const s = 1 + this.squash * 0.16 + stretch;
    const si = 1 - this.squash * 0.12;
    this.bodyMesh.scale.set(1.06 * s, 0.92 * si, 0.86 * si);

    const beakOpen = this.flapTime < 0.18 ? (0.18 - this.flapTime) * 2.2 : 0;
    this.beakTop.rotation.z = beakOpen * 0.5;
    this.beakBottom.rotation.z = -beakOpen * 0.5;
    this.tailPivot.rotation.z = THREE.MathUtils.clamp(this.vy * 0.03, -0.3, 0.3);
  }

  reset(): void {
    this.y = 0.6;
    this.vy = 0;
    this.alive = true;
    this.flapTime = 10;
    this.squash = 0;
    this.spinVel = 0;
    this.group.rotation.set(0, 0, 0);
    this.group.position.y = this.y;
  }
}
