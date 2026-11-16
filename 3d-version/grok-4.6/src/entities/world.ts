import * as THREE from "three";
import type { MatKit } from "../assets/materials.ts";
import { createIsland } from "../assets/pillarMesh.ts";
import { rng } from "../core/rng.ts";

export type WorldView = {
  root: THREE.Group;
  waterUni: { time: { value: number }; scroll: { value: number }; night: { value: number } };
  skyUni: { mixAmt: { value: number } };
  clouds: THREE.Mesh[];
  islands: THREE.Object3D[];
  reeds: THREE.InstancedMesh;
  dust: THREE.Points;
  sun: THREE.Mesh;
};

export function createWorld(mats: MatKit, scene: THREE.Scene): WorldView {
  const root = new THREE.Group();
  scene.add(root);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), mats.sky);
  sky.rotation.y = 0.4;
  scene.add(sky);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(110, 48, 24, 10), mats.water);
  water.rotation.x = -Math.PI * 0.5;
  water.position.set(10, -3.95, 0);
  water.receiveShadow = true;
  root.add(water);

  const makeCliff = (z: number, y: number, s: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 6), mats.stoneDark);
    m.position.set(10, y, z);
    m.scale.copy(s);
    m.receiveShadow = true;
    m.castShadow = true;
    root.add(m);
    return m;
  };
  makeCliff(-18, -11.2, new THREE.Vector3(1, 1, 1.1));
  makeCliff(18, -11.4, new THREE.Vector3(1, 1.05, 1.2));

  const nearBank = new THREE.Mesh(new THREE.BoxGeometry(90, 0.55, 4.2), mats.stone);
  nearBank.position.set(8, -3.72, 5.6);
  nearBank.receiveShadow = true;
  root.add(nearBank);
  const farBank = new THREE.Mesh(new THREE.BoxGeometry(90, 0.7, 5.5), mats.stoneDark);
  farBank.position.set(8, -3.78, -6.8);
  farBank.receiveShadow = true;
  root.add(farBank);

  for (let i = 0; i < 10; i++) {
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.45 + rng.next() * 0.4, 0),
      i % 2 ? mats.stone : mats.stoneDark,
    );
    boulder.position.set(-6 + i * 6.2 + rng.signed() * 0.8, -3.5, (rng.next() > 0.5 ? 1 : -1) * (5.5 + rng.next() * 3));
    boulder.rotation.set(rng.next(), rng.next(), rng.next());
    root.add(boulder);
  }

  const clouds: THREE.Mesh[] = [];
  const cloudGeo = new THREE.PlaneGeometry(7.4, 4.4);
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(cloudGeo, mats.cloud);
    c.position.set(-8 + i * 7.5 + rng.signed() * 1.5, 1.4 + rng.next() * 3.2, -6 - rng.next() * 10);
    c.scale.setScalar(0.7 + rng.next() * 1.1);
    clouds.push(c);
    root.add(c);
  }

  const islands: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const isle = createIsland(mats, () => rng.next());
    isle.position.set(-4 + i * 11 + rng.signed(), 3.4 + rng.next() * 1.2, -16 - rng.next() * 5);
    isle.rotation.y = rng.signed() * 0.4;
    isle.scale.setScalar(0.85 + rng.next() * 0.5);
    islands.push(isle);
    root.add(isle);
  }

  const reedGeo = new THREE.PlaneGeometry(0.12, 0.7);
  const reeds = new THREE.InstancedMesh(reedGeo, mats.moss, 80);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 80; i++) {
    dummy.position.set(-10 + (i % 20) * 2.2 + rng.signed() * 0.4, -3.5, ((i % 2) * 2 - 1) * (5.4 + rng.next() * 1.6));
    dummy.rotation.y = rng.next() * Math.PI;
    dummy.scale.set(1, 0.7 + rng.next() * 0.8, 1);
    dummy.updateMatrix();
    reeds.setMatrixAt(i, dummy.matrix);
  }
  reeds.instanceMatrix.needsUpdate = true;
  root.add(reeds);

  const dustCount = 48;
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(dustCount * 3);
  const col = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    pos[i * 3] = rng.range(-8, 30);
    pos[i * 3 + 1] = rng.range(-3, 5);
    pos[i * 3 + 2] = rng.range(-8, 6);
    const warm = rng.next();
    col[i * 3] = 1;
    col[i * 3 + 1] = 0.72 + warm * 0.2;
    col[i * 3 + 2] = 0.35 + warm * 0.3;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(dust);

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 }),
  );
  sun.position.set(-18, 4.2, -28);
  scene.add(sun);

  const rayGeo = new THREE.PlaneGeometry(4.5, 22);
  for (let i = 0; i < 2; i++) {
    const ray = new THREE.Mesh(rayGeo, mats.ray);
    ray.position.set(-10 + i * 1.4, 1.2, -12);
    ray.rotation.z = -0.5 + i * 0.1;
    ray.rotation.y = 0.2;
    scene.add(ray);
  }

  return {
    root,
    waterUni: mats.water.uniforms as WorldView["waterUni"],
    skyUni: mats.sky.uniforms as WorldView["skyUni"],
    clouds,
    islands,
    reeds,
    dust,
    sun,
  };
}

export function tickWorld(world: WorldView, scroll: number, dt: number, night: number, time: number): void {
  world.waterUni.time.value = time;
  world.waterUni.scroll.value = scroll;
  world.waterUni.night.value = night;
  world.skyUni.mixAmt.value = night;

  for (let i = 0; i < world.clouds.length; i++) {
    const c = world.clouds[i]!;
    const depth = 0.12 + (i % 3) * 0.08;
    c.position.x -= dt * (0.25 + depth);
    if (c.position.x < -22) c.position.x += 70;
  }
  for (let i = 0; i < world.islands.length; i++) {
    const isle = world.islands[i]!;
    isle.position.x -= dt * 0.35;
    isle.position.y += Math.sin(time * 0.4 + i) * dt * 0.08;
    if (isle.position.x < -18) isle.position.x += 55;
  }

  const pos = world.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) - dt * (0.6 + (i % 5) * 0.1);
    let y = pos.getY(i) + Math.sin(time + i) * dt * 0.12;
    if (x < -10) x += 42;
    pos.setXYZ(i, x, y, pos.getZ(i));
  }
  pos.needsUpdate = true;

  const sunMat = world.sun.material as THREE.MeshBasicMaterial;
  sunMat.color.setHSL(0.1, 0.75, 0.72 - night * 0.35);
  sunMat.opacity = 0.95 - night * 0.55;
}
