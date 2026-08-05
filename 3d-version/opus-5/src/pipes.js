import * as THREE from 'three';
import { CFG } from './config.js';
import { getDifficulty, nextGapCenter } from './difficulty.js';

/**
 * Radial-gradient glow sprite.
 *
 * A transparent additive *sphere* adds a uniform amount of light across its
 * whole silhouette, which at night reads as a hard-edged olive disc. A gradient
 * texture on a camera-facing sprite falls off smoothly, which is what a glow
 * actually looks like — and it's one quad instead of 140 triangles.
 */
function makeGlowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.62)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * One pipe pair plus its optional bonus gem.
 *
 * Geometry is created once at unit height and scaled per-layout, so changing
 * the gap never touches a vertex buffer.
 */
class PipePair {
  constructor(shared) {
    this.group = new THREE.Group();

    const mk = (geo, m) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    this.topBody = mk(shared.bodyGeo, shared.bodyMat);
    this.botBody = mk(shared.bodyGeo, shared.bodyMat);
    this.topCap = mk(shared.capGeo, shared.capMat);
    this.botCap = mk(shared.capGeo, shared.capMat);

    // Emissive lip rings sit exactly at the opening. They read as a target even
    // at night, when the diffuse-lit pipe body goes almost black.
    this.topRim = new THREE.Mesh(shared.rimGeo, shared.rimMat);
    this.botRim = new THREE.Mesh(shared.rimGeo, shared.rimMat);
    this.topRim.rotation.x = Math.PI / 2;
    this.botRim.rotation.x = Math.PI / 2;
    this.group.add(this.topRim, this.botRim);

    this.gem = new THREE.Mesh(shared.gemGeo, shared.gemMat);
    this.gem.castShadow = true;
    this.group.add(this.gem);

    // The halo is a sibling, not a child: as a child it would inherit the gem's
    // tumbling rotation, and a rotating billboard shears on screen.
    this.gemHalo = new THREE.Sprite(shared.haloMat);
    this.gemHalo.scale.setScalar(2.5);
    this.group.add(this.gemHalo);

    this.x = 0;
    this.gapCenter = 0;
    this.gap = 6;
    this.scored = false;
    this.gemAlive = false;
  }

  layout(x, gapCenter, gap, withGem) {
    const P = CFG.pipes;
    this.x = x;
    this.gapCenter = gapCenter;
    this.gap = gap;
    this.scored = false;

    const top = gapCenter + gap / 2;
    const bot = gapCenter - gap / 2;
    const h = P.bodyHeight;

    this.group.position.x = x;
    this.topBody.position.set(0, top + h / 2, 0);
    this.botBody.position.set(0, bot - h / 2, 0);
    this.topCap.position.set(0, top + P.capHeight / 2, 0);
    this.botCap.position.set(0, bot - P.capHeight / 2, 0);
    this.topRim.position.set(0, top + 0.02, 0);
    this.botRim.position.set(0, bot - 0.02, 0);

    this.gemAlive = withGem;
    this.gem.visible = withGem;
    this.gemHalo.visible = withGem;
    this.gem.position.set(0, gapCenter, 0);
    this.gemHalo.position.set(0, gapCenter, 0);
    this.gemY = gapCenter;
  }

  animate(dt, t) {
    if (!this.gemAlive) return;
    this.gem.rotation.y += dt * 2.1;
    this.gem.rotation.x += dt * 0.9;
    // Phase-offset by x so neighbouring gems don't bob in lockstep.
    const y = this.gemY + Math.sin(t * 2.4 + this.x) * 0.28;
    this.gem.position.y = y;
    this.gemHalo.position.y = y;
    this.gemHalo.scale.setScalar(2.5 + Math.sin(t * 5 + this.x) * 0.3);
  }

  collectGem() {
    this.gemAlive = false;
    this.gem.visible = false;
    this.gemHalo.visible = false;
  }
}

export class PipeField {
  constructor(scene) {
    const P = CFG.pipes;

    const glowTex = makeGlowTexture();

    // Radial segments are generous because the pipes are the closest, largest
    // objects on screen — faceting shows there before anywhere else.
    this.shared = {
      bodyGeo: new THREE.CylinderGeometry(P.radius, P.radius, P.bodyHeight, 28, 1, true),
      capGeo: new THREE.CylinderGeometry(P.capRadius, P.capRadius, P.capHeight, 28),
      rimGeo: new THREE.TorusGeometry(P.capRadius * 0.94, 0.075, 8, 32),
      gemGeo: new THREE.OctahedronGeometry(0.52, 0),
      glowTex,
      // Front-face only. The cylinder is open-ended, but the cap disc seals the
      // opening, so the inner wall is never actually visible — rendering it
      // double-sided only made the pipes read as hollow tubes you could fly
      // into, and cost double-sided lighting for nothing.
      bodyMat: new THREE.MeshStandardMaterial({
        color: 0x4bbf5a,
        roughness: 0.62,
        metalness: 0.05,
      }),
      // The cap's underside faces away from every light, so it renders pure
      // black and reads as a hole. A touch of self-emission keeps it solid.
      capMat: new THREE.MeshStandardMaterial({
        color: 0x3da84c,
        emissive: 0x1d5226,
        emissiveIntensity: 0.55,
        roughness: 0.5,
        metalness: 0.08,
      }),
      rimMat: new THREE.MeshStandardMaterial({
        color: 0xd8ffe2,
        emissive: 0x69ffa0,
        emissiveIntensity: 1.1,
        roughness: 0.4,
      }),
      gemMat: new THREE.MeshStandardMaterial({
        // ACES tone mapping rolls very bright emissives toward white, so the
        // colour has to stay saturated and the intensity moderate to read gold.
        color: 0xffcf4a,
        emissive: 0xffa815,
        emissiveIntensity: 1.35,
        roughness: 0.15,
        metalness: 0.4,
        flatShading: true,
      }),
      haloMat: new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffc93f,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    };

    this.pipes = [];
    for (let i = 0; i < P.count; i++) {
      const p = new PipePair(this.shared);
      scene.add(p.group);
      this.pipes.push(p);
    }

    this.reset();
  }

  reset() {
    const d = getDifficulty(0);
    this.lastCenter = 0;
    this.nextX = CFG.pipes.firstX;
    for (const p of this.pipes) {
      this.lastCenter = nextGapCenter(this.lastCenter, d);
      p.layout(this.nextX, this.lastCenter, d.gap, Math.random() < CFG.pipes.gemChance);
      this.nextX += d.spacing;
    }
  }

  /** Recycle any pipe that has fallen behind the player. */
  update(dt, t, birdX, score) {
    const d = getDifficulty(score);
    for (const p of this.pipes) {
      if (p.x < birdX - 26) {
        this.lastCenter = nextGapCenter(this.lastCenter, d);
        p.layout(this.nextX, this.lastCenter, d.gap, Math.random() < CFG.pipes.gemChance);
        this.nextX += d.spacing;
      }
      p.animate(dt, t);
    }
  }

  /**
   * Sphere-vs-pipe test.
   *
   * A vertical cylinder is symmetric around its axis, and the bird never leaves
   * z = 0, so the horizontal test collapses to a single |dx| comparison. If the
   * bird overlaps the column at all, it must be inside the gap to survive.
   */
  hits(pos, radius) {
    for (const p of this.pipes) {
      const dx = Math.abs(pos.x - p.x);
      if (dx > CFG.pipes.capRadius + radius) continue;

      // Use the wider cap radius only near the lips, the body radius elsewhere.
      const top = p.gapCenter + p.gap / 2;
      const bot = p.gapCenter - p.gap / 2;
      const nearLip = pos.y > top - CFG.pipes.capHeight || pos.y < bot + CFG.pipes.capHeight;
      const r = nearLip ? CFG.pipes.capRadius : CFG.pipes.radius;
      if (dx > r + radius) continue;

      if (pos.y + radius > top || pos.y - radius < bot) return p;
    }
    return null;
  }

  /** Returns the pipe whose gem was just collected, or null. */
  collectGems(pos, radius) {
    for (const p of this.pipes) {
      if (!p.gemAlive) continue;
      const dx = pos.x - p.x;
      if (Math.abs(dx) > 1.4) continue;
      const dy = pos.y - p.gem.position.y;
      if (dx * dx + dy * dy < (radius + 0.85) ** 2) {
        p.collectGem();
        return p;
      }
    }
    return null;
  }

  /** Award a point for every pipe the bird has just passed. */
  tallyPassed(birdX) {
    let gained = 0;
    for (const p of this.pipes) {
      if (!p.scored && birdX > p.x) {
        p.scored = true;
        gained++;
      }
    }
    return gained;
  }
}
