import * as THREE from "three";
import type { MatKit } from "./materials.ts";
import type { TexKit } from "./textures.ts";

export type GateView = {
  root: THREE.Group;
  lower: THREE.Group;
  upper: THREE.Group;
  ring: THREE.Mesh;
  lanterns: THREE.Mesh[];
};

function column(mats: MatKit, height: number): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, height, 10, 1, false), mats.stone);
  g.add(shaft);

  const addRing = (y: number, r: number) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, 14), mats.gold);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = y;
    g.add(ring);
  };
  addRing(height * 0.28, 0.46);
  addRing(-height * 0.18, 0.5);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.22, 8), mats.gold);
  cap.position.y = height * 0.5 + 0.05;
  g.add(cap);

  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 1.28), mats.stoneDark);
  abacus.position.y = height * 0.5 + 0.18;
  g.add(abacus);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.2, 8), mats.stoneDark);
  base.position.y = -height * 0.5 - 0.02;
  g.add(base);

  return g;
}

export function createGate(mats: MatKit, _tex: TexKit): GateView {
  const root = new THREE.Group();
  const colH = 8.4;
  const lower = column(mats, colH);
  const upper = column(mats, colH);
  upper.rotation.z = Math.PI;
  root.add(lower, upper);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 8, 36), mats.gate);
  ring.rotation.y = Math.PI * 0.5;
  root.add(ring);

  const lanterns: THREE.Mesh[] = [];
  const geo = new THREE.PlaneGeometry(0.42, 0.95);
  for (const side of [-1, 1]) {
    const l = new THREE.Mesh(geo, mats.lantern);
    l.position.set(0, 0, side * 0.72);
    root.add(l);
    lanterns.push(l);
  }

  return { root, lower, upper, ring, lanterns };
}

export type Island = THREE.Group;

export function createIsland(mats: MatKit, rng: () => number): Island {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.7 + rng() * 0.35, 0),
    mats.stoneDark,
  );
  rock.scale.set(1.6 + rng(), 0.55, 1.1 + rng() * 0.4);
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.16, 8), mats.stone);
  slab.position.y = 0.28;
  slab.castShadow = true;
  g.add(slab);
  const gateL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), mats.stone);
  gateL.position.set(-0.18, 0.58, 0);
  const gateR = gateL.clone();
  gateR.position.x = 0.18;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.1), mats.gold);
  lintel.position.set(0, 0.86, 0);
  g.add(gateL, gateR, lintel);
  return g;
}
