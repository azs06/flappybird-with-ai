import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer
} from "three";
import type { PipeState, SimulationSnapshot, SparkState, WorldConfig } from "../simulation/types";
import { colorFromTone, makeStripeTexture, standardMaterial } from "./materials";

interface PipeMeshes {
  root: Group;
  top: Mesh;
  bottom: Mesh;
  topCap: Mesh;
  bottomCap: Mesh;
  ring: Mesh;
}

export class SceneRenderer {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(44, 1, 0.1, 100);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: false });
  private readonly bird = new Group();
  private readonly birdBody: Mesh;
  private readonly leftWing: Mesh;
  private readonly rightWing: Mesh;
  private readonly pipePool = new Map<number, PipeMeshes>();
  private readonly pipeMaterial: MeshStandardMaterial;
  private readonly pipeAccentMaterial: MeshStandardMaterial;
  private readonly sparkMesh: InstancedMesh;
  private readonly sparkDummy = new Object3D();
  private readonly groundBands: Mesh[] = [];
  private readonly cloudGroups: Group[] = [];
  private readonly skyRings: Mesh[] = [];
  private readonly world: WorldConfig;
  private readonly defaultCameraZ = 8.1;
  private readonly shakeVector = new Vector3();

  constructor(private readonly host: HTMLElement, world: WorldConfig) {
    this.world = world;
    this.host.append(this.renderer.domElement);

    this.scene.background = new Color("#87cbe7");
    this.scene.fog = new Fog("#87cbe7", 10, 26);

    this.pipeMaterial = standardMaterial({
      color: "#1f9d55",
      map: makeStripeTexture("#1f9d55", "#53d176")
    });
    this.pipeAccentMaterial = standardMaterial({ color: "#105c39", roughness: 0.5 });

    this.birdBody = this.createBird();
    this.leftWing = this.createWing(-1);
    this.rightWing = this.createWing(1);
    this.bird.add(this.birdBody, this.leftWing, this.rightWing);
    this.scene.add(this.bird);

    this.sparkMesh = new InstancedMesh(
      new SphereGeometry(1, 8, 6),
      new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.82 }),
      96
    );
    this.sparkMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.scene.add(this.sparkMesh);

    this.configureRenderer();
    this.createLights();
    this.createWorld();
    this.resize();

    window.addEventListener("resize", this.resize);
    this.renderer.domElement.addEventListener("webglcontextlost", this.handleContextLost);
  }

  render(snapshot: SimulationSnapshot): void {
    this.updateCamera(snapshot);
    this.updateBird(snapshot);
    this.updatePipes(snapshot.pipes);
    this.updateSparks(snapshot.sparks);
    this.updateWorldMotion(snapshot);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.handleContextLost);
    this.renderer.dispose();
  }

  private configureRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
  }

  private createLights(): void {
    const ambient = new AmbientLight("#c9f4ff", 1.15);
    const hemi = new HemisphereLight("#d8fbff", "#2d7d86", 1.2);
    const sun = new DirectionalLight("#fff3c2", 3.4);
    sun.position.set(-3, 5.4, 4.8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    this.scene.add(ambient, hemi, sun);
  }

  private createWorld(): void {
    const waterMaterial = standardMaterial({ color: "#0c8f96", roughness: 0.82, metalness: 0.02 });
    const shoreMaterial = standardMaterial({ color: "#f1d06d", roughness: 0.72 });
    const shadowMaterial = standardMaterial({ color: "#196d74", roughness: 0.9 });

    const water = new Mesh(new PlaneGeometry(40, 8), waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, this.world.floorY - 0.52, -1.8);
    water.receiveShadow = true;
    this.scene.add(water);

    for (let i = 0; i < 8; i += 1) {
      const band = new Mesh(new BoxGeometry(3.8, 0.03, 0.08), i % 2 === 0 ? shoreMaterial : shadowMaterial);
      band.position.set(i * 3.4 - 13.5, this.world.floorY - 0.26, -0.92);
      band.rotation.z = Math.sin(i * 1.8) * 0.08;
      band.receiveShadow = true;
      this.groundBands.push(band);
      this.scene.add(band);
    }

    for (let i = 0; i < 7; i += 1) {
      const cloud = this.createCloud();
      cloud.position.set(i * 2.7 - 8.2, 1.42 + Math.sin(i * 1.2) * 0.65, -4.4 - (i % 3) * 0.8);
      cloud.scale.setScalar(0.72 + (i % 3) * 0.17);
      this.cloudGroups.push(cloud);
      this.scene.add(cloud);
    }

    const ringMaterial = new MeshBasicMaterial({
      color: "#f9f5bd",
      transparent: true,
      opacity: 0.3,
      side: DoubleSide
    });

    for (let i = 0; i < 7; i += 1) {
      const ring = new Mesh(new TorusGeometry(2.6 + i * 0.08, 0.018, 6, 80), ringMaterial);
      ring.position.set(i * 2.9 - 8, 0.3, -5.7);
      this.skyRings.push(ring);
      this.scene.add(ring);
    }
  }

  private createBird(): Mesh {
    const body = new Mesh(
      new SphereGeometry(this.world.birdRadius, 32, 20),
      standardMaterial({ color: "#f7c948", roughness: 0.48, metalness: 0.01 })
    );
    body.scale.set(1.22, 0.9, 0.96);
    body.castShadow = true;

    const belly = new Mesh(
      new SphereGeometry(this.world.birdRadius * 0.67, 24, 14),
      standardMaterial({ color: "#fff3c4", roughness: 0.56 })
    );
    belly.position.set(0.05, -0.08, 0.18);
    belly.scale.set(1.15, 0.72, 0.52);
    body.add(belly);

    const beak = new Mesh(
      new ConeGeometry(0.105, 0.32, 18),
      standardMaterial({ color: "#ed8936", roughness: 0.45 })
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.31, 0.02, 0);
    beak.castShadow = true;
    body.add(beak);

    const eyeMaterial = new MeshBasicMaterial({ color: "#102533" });
    const eyeGeometry = new SphereGeometry(0.035, 12, 8);
    const leftEye = new Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.18, 0.1, 0.22);
    const rightEye = new Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.18, 0.1, -0.22);
    body.add(leftEye, rightEye);

    return body;
  }

  private createWing(side: -1 | 1): Mesh {
    const shape = new Shape();
    shape.moveTo(-0.02, 0.16);
    shape.lineTo(-0.38, -0.02);
    shape.lineTo(-0.04, -0.18);
    shape.closePath();

    const wing = new Mesh(
      new ShapeGeometry(shape),
      standardMaterial({ color: "#2f80ed", roughness: 0.5, side: DoubleSide })
    );
    wing.position.set(-0.02, -0.02, side * 0.28);
    wing.rotation.y = side * Math.PI / 2;
    wing.rotation.z = side * 0.08;
    wing.castShadow = true;
    return wing;
  }

  private createPipeMeshes(pipe: PipeState): PipeMeshes {
    const root = new Group();
    const top = new Mesh(new BoxGeometry(1, 1, 1), this.pipeMaterial);
    const bottom = new Mesh(new BoxGeometry(1, 1, 1), this.pipeMaterial);
    const topCap = new Mesh(new BoxGeometry(1.18, 0.18, 1.18), this.pipeAccentMaterial);
    const bottomCap = new Mesh(new BoxGeometry(1.18, 0.18, 1.18), this.pipeAccentMaterial);
    const ring = new Mesh(
      new RingGeometry(0.58, 0.72, 32),
      new MeshBasicMaterial({
        color: pipe.skin % 2 === 0 ? "#fff176" : "#9ff3d4",
        transparent: true,
        opacity: 0.46,
        side: DoubleSide
      })
    );

    for (const mesh of [top, bottom, topCap, bottomCap]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    root.add(top, bottom, topCap, bottomCap, ring);
    this.scene.add(root);
    return { root, top, bottom, topCap, bottomCap, ring };
  }

  private updatePipes(pipes: PipeState[]): void {
    const activeIds = new Set<number>();

    for (const pipe of pipes) {
      activeIds.add(pipe.id);
      let meshes = this.pipePool.get(pipe.id);

      if (meshes === undefined) {
        meshes = this.createPipeMeshes(pipe);
        this.pipePool.set(pipe.id, meshes);
      }

      const bottomHeight = pipe.gapY - pipe.gapHeight * 0.5 - this.world.floorY;
      const topHeight = this.world.ceilingY - (pipe.gapY + pipe.gapHeight * 0.5);
      meshes.root.position.set(pipe.x, 0, 0);

      meshes.bottom.scale.set(this.world.pipeWidth, Math.max(0.05, bottomHeight), this.world.pipeDepth);
      meshes.bottom.position.set(0, this.world.floorY + bottomHeight * 0.5, 0);
      meshes.top.scale.set(this.world.pipeWidth, Math.max(0.05, topHeight), this.world.pipeDepth);
      meshes.top.position.set(0, this.world.ceilingY - topHeight * 0.5, 0);

      meshes.bottomCap.position.set(0, pipe.gapY - pipe.gapHeight * 0.5 - 0.08, 0);
      meshes.bottomCap.scale.set(this.world.pipeWidth, 1, this.world.pipeDepth);
      meshes.topCap.position.set(0, pipe.gapY + pipe.gapHeight * 0.5 + 0.08, 0);
      meshes.topCap.scale.set(this.world.pipeWidth, 1, this.world.pipeDepth);

      meshes.ring.position.set(0.02, pipe.gapY, -0.72);
      meshes.ring.scale.set(0.94, pipe.gapHeight * 0.62, 1);
      meshes.ring.rotation.z += 0.006;
      meshes.ring.visible = !pipe.scored;
    }

    for (const [id, meshes] of this.pipePool) {
      if (!activeIds.has(id)) {
        this.scene.remove(meshes.root);
        this.pipePool.delete(id);
      }
    }
  }

  private updateBird(snapshot: SimulationSnapshot): void {
    const bird = snapshot.bird;
    this.bird.position.set(bird.x, bird.y, 0);
    this.bird.rotation.z = -bird.roll;
    this.bird.rotation.y = Math.sin(snapshot.elapsed * 2.4) * 0.06;
    this.birdBody.scale.y = 0.9 + snapshot.eventPulse * 0.09;
    this.birdBody.scale.x = 1.22 - snapshot.eventPulse * 0.05;

    const wingAngle = Math.sin(bird.wingBeat) * 0.72 + (snapshot.phase === "playing" ? 0.1 : 0.25);
    this.leftWing.rotation.x = wingAngle;
    this.rightWing.rotation.x = -wingAngle;
  }

  private updateSparks(sparks: SparkState[]): void {
    this.sparkMesh.count = Math.min(sparks.length, 96);

    for (let i = 0; i < this.sparkMesh.count; i += 1) {
      const spark = sparks[i];
      const life = 1 - spark.age / spark.ttl;
      this.sparkDummy.position.set(spark.x, spark.y, spark.z);
      this.sparkDummy.scale.setScalar(spark.scale * Math.max(0.1, life));
      this.sparkDummy.quaternion.identity();
      this.sparkDummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.sparkDummy.matrix);
      this.sparkMesh.setColorAt(i, colorFromTone(spark.tone));
    }

    this.sparkMesh.instanceMatrix.needsUpdate = true;

    if (this.sparkMesh.instanceColor !== null) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateCamera(snapshot: SimulationSnapshot): void {
    const shake = snapshot.shake;
    const isMobile = window.innerWidth < 620;
    const cameraX = isMobile ? -0.74 : 0;
    const lookX = isMobile ? -0.54 : 0.1;

    this.shakeVector.set(
      Math.sin(snapshot.elapsed * 48) * 0.07 * shake,
      Math.cos(snapshot.elapsed * 52) * 0.05 * shake,
      0
    );

    const targetZ = isMobile ? 10.7 : this.defaultCameraZ;
    this.camera.position.set(
      cameraX + this.shakeVector.x,
      0.2 + this.shakeVector.y,
      targetZ + Math.min(0.35, snapshot.eventPulse * 0.18)
    );
    this.camera.lookAt(lookX, 0.12, 0);
  }

  private updateWorldMotion(snapshot: SimulationSnapshot): void {
    for (let i = 0; i < this.groundBands.length; i += 1) {
      const band = this.groundBands[i];
      band.position.x -= snapshot.speed * 0.26 * 0.016;

      if (band.position.x < -14) {
        band.position.x += 27.2;
      }
    }

    for (let i = 0; i < this.cloudGroups.length; i += 1) {
      const cloud = this.cloudGroups[i];
      cloud.position.x -= (0.08 + i * 0.006) * 0.016;
      cloud.position.y += Math.sin(snapshot.elapsed * 0.55 + i) * 0.0009;

      if (cloud.position.x < -8.8) {
        cloud.position.x = 9.4;
      }
    }

    for (let i = 0; i < this.skyRings.length; i += 1) {
      const ring = this.skyRings[i];
      ring.rotation.z += 0.0015 + i * 0.0002;
      ring.position.x -= snapshot.speed * 0.08 * 0.016;

      if (ring.position.x < -8.7) {
        ring.position.x += 19.8;
      }
    }
  }

  private createCloud(): Group {
    const group = new Group();
    const material = new MeshLambertMaterial({ color: "#f4fbff", transparent: true, opacity: 0.9 });
    const geometry = new SphereGeometry(0.42, 16, 10);
    const positions: Array<[number, number, number, number]> = [
      [-0.48, -0.02, 0, 0.72],
      [-0.18, 0.08, 0.02, 0.92],
      [0.2, 0.04, 0, 0.78],
      [0.52, -0.05, -0.02, 0.58]
    ];

    for (const [x, y, z, scale] of positions) {
      const puff = new Mesh(geometry, material);
      puff.position.set(x, y, z);
      puff.scale.setScalar(scale);
      group.add(puff);
    }

    return group;
  }

  private resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
  };

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
  };
}
