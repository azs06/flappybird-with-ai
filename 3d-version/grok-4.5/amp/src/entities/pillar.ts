import * as THREE from 'three';
import type { MaterialKit } from '../assets/materials';

export type PillarPair = {
  group: THREE.Group;
  gapY: number;
  gapSize: number;
  z: number;
  scored: boolean;
  active: boolean;
  // Collision AABBs in world space (updated each frame)
  topMinY: number;
  topMaxY: number;
  botMinY: number;
  botMaxY: number;
  halfW: number;
  halfD: number;
};

const PILLAR_HEIGHT = 14;
const PILLAR_HALF_W = 0.72;
const PILLAR_HALF_D = 0.72;

/**
 * Neon gate pillars with bevelled shafts, energy rings, and cap lights.
 * Pooled and recycled as the world scrolls.
 */
export class PillarPool {
  readonly root = new THREE.Group();
  private readonly pool: PillarPair[] = [];
  private readonly mats: MaterialKit;
  private readonly shaftGeo: THREE.BoxGeometry;
  private readonly edgeGeo: THREE.BoxGeometry;
  private readonly capGeo: THREE.BoxGeometry;
  private readonly ringGeo: THREE.TorusGeometry;
  private readonly finGeo: THREE.BoxGeometry;

  constructor(mats: MaterialKit, poolSize = 8) {
    this.mats = mats;
    this.shaftGeo = new THREE.BoxGeometry(PILLAR_HALF_W * 2, PILLAR_HEIGHT, PILLAR_HALF_D * 2);
    this.edgeGeo = new THREE.BoxGeometry(0.08, PILLAR_HEIGHT * 0.92, 0.08);
    this.capGeo = new THREE.BoxGeometry(PILLAR_HALF_W * 2.35, 0.28, PILLAR_HALF_D * 2.35);
    this.ringGeo = new THREE.TorusGeometry(1.05, 0.06, 8, 32);
    this.finGeo = new THREE.BoxGeometry(0.12, 1.4, 0.35);

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(this.createPair());
    }
  }

  private createPair(): PillarPair {
    const group = new THREE.Group();
    group.visible = false;

    const makeColumn = (sign: 1 | -1): THREE.Group => {
      const col = new THREE.Group();
      const shaft = new THREE.Mesh(this.shaftGeo, this.mats.pillar);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      col.add(shaft);

      // Neon edge trims
      const offsets = [
        [PILLAR_HALF_W, PILLAR_HALF_D],
        [PILLAR_HALF_W, -PILLAR_HALF_D],
        [-PILLAR_HALF_W, PILLAR_HALF_D],
        [-PILLAR_HALF_W, -PILLAR_HALF_D],
      ] as const;
      for (const [x, z] of offsets) {
        const edge = new THREE.Mesh(this.edgeGeo, this.mats.pillarAccent);
        edge.position.set(x * 0.92, 0, z * 0.92);
        col.add(edge);
      }

      // Cap toward gap
      const cap = new THREE.Mesh(this.capGeo, this.mats.pillarCap);
      cap.position.y = sign > 0 ? -PILLAR_HEIGHT / 2 + 0.1 : PILLAR_HEIGHT / 2 - 0.1;
      col.add(cap);

      // Side fins
      for (const sx of [-1, 1]) {
        const fin = new THREE.Mesh(this.finGeo, this.mats.pillarAccent);
        fin.position.set(sx * (PILLAR_HALF_W + 0.08), cap.position.y * 0.15, 0);
        col.add(fin);
      }

      // Point light near gap mouth
      const light = new THREE.PointLight(sign > 0 ? 0xff4fd8 : 0x5cf0ff, 1.4, 8, 2);
      light.position.set(0, cap.position.y, 0.5);
      col.add(light);

      return col;
    };

    const top = makeColumn(1);
    top.name = 'top';
    const bot = makeColumn(-1);
    bot.name = 'bot';

    const ring = new THREE.Mesh(this.ringGeo, this.mats.ring);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'ring';

    group.add(top, bot, ring);
    this.root.add(group);

    return {
      group,
      gapY: 0,
      gapSize: 2.6,
      z: 0,
      scored: false,
      active: false,
      topMinY: 0,
      topMaxY: 0,
      botMinY: 0,
      botMaxY: 0,
      halfW: PILLAR_HALF_W,
      halfD: PILLAR_HALF_D,
    };
  }

  spawn(z: number, gapY: number, gapSize: number): PillarPair {
    const pair = this.pool.find((p) => !p.active) ?? this.pool[0]!;
    pair.active = true;
    pair.scored = false;
    pair.z = z;
    pair.gapY = gapY;
    pair.gapSize = gapSize;
    pair.group.visible = true;
    pair.group.position.set(0, 0, z);

    const halfGap = gapSize / 2;
    const top = pair.group.getObjectByName('top') as THREE.Group;
    const bot = pair.group.getObjectByName('bot') as THREE.Group;
    const ring = pair.group.getObjectByName('ring') as THREE.Mesh;

    // Top column sits above gap
    const topCenterY = gapY + halfGap + PILLAR_HEIGHT / 2;
    const botCenterY = gapY - halfGap - PILLAR_HEIGHT / 2;
    top.position.y = topCenterY;
    bot.position.y = botCenterY;
    ring.position.set(0, gapY, 0);
    ring.scale.setScalar(0.85 + gapSize * 0.08);

    pair.topMinY = gapY + halfGap;
    pair.topMaxY = topCenterY + PILLAR_HEIGHT / 2;
    pair.botMaxY = gapY - halfGap;
    pair.botMinY = botCenterY - PILLAR_HEIGHT / 2;

    return pair;
  }

  release(pair: PillarPair): void {
    pair.active = false;
    pair.group.visible = false;
  }

  activePairs(): PillarPair[] {
    return this.pool.filter((p) => p.active);
  }

  update(dt: number, scrollSpeed: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      // World scrolls toward +Z so gates approach the bird (camera looks down -Z).
      p.z += scrollSpeed * dt;
      p.group.position.z = p.z;

      // Gentle ring spin / pulse
      const ring = p.group.getObjectByName('ring') as THREE.Mesh | undefined;
      if (ring) {
        ring.rotation.z += dt * 1.2;
        const s = 0.85 + p.gapSize * 0.08 + Math.sin(performance.now() * 0.004 + p.z) * 0.04;
        ring.scale.setScalar(s);
      }
    }
  }

  /** Sphere vs pillar AABB (two boxes + floor/ceil handled outside). */
  collides(cx: number, cy: number, cz: number, r: number): boolean {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (this.sphereBox(cx, cy, cz, r, p.z, p.topMinY, p.topMaxY, p.halfW, p.halfD)) return true;
      if (this.sphereBox(cx, cy, cz, r, p.z, p.botMinY, p.botMaxY, p.halfW, p.halfD)) return true;
    }
    return false;
  }

  private sphereBox(
    cx: number,
    cy: number,
    cz: number,
    r: number,
    boxZ: number,
    minY: number,
    maxY: number,
    halfW: number,
    halfD: number,
  ): boolean {
    const minX = -halfW;
    const maxX = halfW;
    const minZ = boxZ - halfD;
    const maxZ = boxZ + halfD;
    const closestX = Math.max(minX, Math.min(cx, maxX));
    const closestY = Math.max(minY, Math.min(cy, maxY));
    const closestZ = Math.max(minZ, Math.min(cz, maxZ));
    const dx = cx - closestX;
    const dy = cy - closestY;
    const dz = cz - closestZ;
    return dx * dx + dy * dy + dz * dz < r * r;
  }

  dispose(): void {
    this.shaftGeo.dispose();
    this.edgeGeo.dispose();
    this.capGeo.dispose();
    this.ringGeo.dispose();
    this.finGeo.dispose();
  }
}
