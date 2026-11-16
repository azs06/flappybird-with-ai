import * as THREE from "three";
import type { TexKit } from "./textures.ts";

export type BirdView = {
  root: THREE.Group;
  nearWing: THREE.Group;
  farWing: THREE.Group;
  setWingAngle: (radians: number) => void;
};

function makeWingCard(map: THREE.Texture, scale: number, opacity: number): THREE.Group {
  const g = new THREE.Group();
  const w = 0.78 * scale;
  const h = 1.0 * scale;
  const geo = new THREE.PlaneGeometry(w, h);
  // Rivet sits near the lower-left of the painted wing — that is the shoulder pivot.
  const rivetX = -w * 0.5 + w * 0.13;
  const rivetY = h * 0.5 - h * 0.84;
  geo.translate(-rivetX, -rivetY, 0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity,
    }),
  );
  g.add(mesh);
  return g;
}

export function createBirdMesh(tex: TexKit): BirdView {
  const root = new THREE.Group();
  // Source art faces left; flip so the beak points at incoming gates.
  const puppet = new THREE.Group();
  puppet.scale.x = -1;
  root.add(puppet);

  const farWing = makeWingCard(tex.wing, 0.9, 0.78);
  farWing.position.set(0.1, 0.06, -0.07);
  farWing.rotation.y = -0.18;
  puppet.add(farWing);

  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 1.34),
    new THREE.MeshBasicMaterial({
      map: tex.birdBody,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
  );
  puppet.add(body);

  const nearWing = makeWingCard(tex.wing, 1, 1);
  nearWing.position.set(0.08, 0.05, 0.08);
  nearWing.rotation.y = 0.08;
  puppet.add(nearWing);

  const rest = 0.28;
  const setWingAngle = (radians: number) => {
    nearWing.rotation.z = rest + radians;
    farWing.rotation.z = rest + radians * 0.92 - 0.06;
  };
  setWingAngle(0);

  return { root, nearWing, farWing, setWingAngle };
}

/** Signed wing lift. 0 = glide rest. Negative = downstroke. */
export function wingStroke(flapAge: number, time: number, mode: "idle" | "fly" | "dead"): number {
  if (mode === "dead") return -0.85;

  const hz = mode === "idle" ? 1.65 : 1.9;
  const amp = mode === "idle" ? 0.14 : 0.09;
  const hover =
    Math.sin(time * Math.PI * 2 * hz) * amp + Math.sin(time * Math.PI * 2 * hz * 0.5) * amp * 0.22;

  const dur = 0.34;
  if (flapAge >= dur) return hover;

  const u = flapAge / dur;
  if (u < 0.34) {
    const k = 1 - (1 - u / 0.34) ** 2;
    return hover * (1 - k) - k * 0.95;
  }
  const k = (u - 0.34) / 0.66;
  const ease = 1 - (1 - k) ** 3;
  return -0.95 + ease * (0.95 + hover);
}
