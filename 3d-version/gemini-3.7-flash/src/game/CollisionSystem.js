import * as THREE from 'three';
import { PHYSICS } from './constants.js';

export class CollisionSystem {
  constructor() {
    this.invulnerabilityTimer = 0;
  }

  update(delta) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
    }
  }

  /**
   * Check bird collision with ground, ceiling, and active pipes.
   * Returns { hit: boolean, type: 'PIPE' | 'GROUND' | 'CEILING', nearMiss: boolean }
   */
  checkCollisions(bird, pipeManager) {
    const birdPos = bird.position;
    const birdRadius = bird.getHitRadius();

    // 1. World Bounds (Ground & Sky)
    if (birdPos.y - birdRadius <= PHYSICS.WORLD_BOUNDS_Y[0]) {
      return { hit: true, type: 'GROUND', nearMiss: false };
    }
    if (birdPos.y + birdRadius >= PHYSICS.WORLD_BOUNDS_Y[1]) {
      return { hit: true, type: 'CEILING', nearMiss: false };
    }

    if (this.invulnerabilityTimer > 0) {
      return { hit: false, type: null, nearMiss: false };
    }

    const pipes = pipeManager.getActivePipes();
    let nearMiss = false;

    for (let pipe of pipes) {
      // Check if bird is within Z range of pipe
      const zDiff = Math.abs(birdPos.z - pipe.z);
      const pipeRadialReach = PHYSICS.PIPE_RADIUS + birdRadius;

      if (zDiff < pipeRadialReach) {
        // Horizontal distance from pipe center (X=0)
        const xDist = Math.abs(birdPos.x);

        if (xDist < pipeRadialReach) {
          const halfGap = pipe.gapHeight * 0.5;
          const topEdge = pipe.gapCenterY + halfGap;
          const bottomEdge = pipe.gapCenterY - halfGap;

          // Check if bird penetrates top or bottom pipe
          if (birdPos.y + birdRadius * 0.8 > topEdge || birdPos.y - birdRadius * 0.8 < bottomEdge) {
            return { hit: true, type: 'PIPE', nearMiss: false, pipe };
          }

          // Check for Near Miss (close to edges)
          if (!pipe.nearMissLogged) {
            const distToTop = Math.abs(birdPos.y + birdRadius - topEdge);
            const distToBottom = Math.abs(birdPos.y - birdRadius - bottomEdge);
            if (distToTop < 0.45 || distToBottom < 0.45) {
              nearMiss = true;
              pipe.nearMissLogged = true;
            }
          }
        }
      }
    }

    return { hit: false, type: null, nearMiss };
  }

  /**
   * Check for collectibles (Coins, Rings, Powerups)
   */
  checkCollectibles(bird, pipeManager) {
    const birdPos = bird.position;
    const birdRadius = bird.getHitRadius();
    const result = {
      coinsCollected: [],
      ringsPassed: [],
      powerupsCollected: []
    };

    // 1. Coins
    for (let coin of pipeManager.getActiveCoins()) {
      const dist = coin.mesh.position.distanceTo(birdPos);
      if (dist < birdRadius + 0.8) {
        coin.collected = true;
        coin.active = false;
        coin.mesh.visible = false;
        result.coinsCollected.push(coin);
      }
    }

    // 2. Rings (Must pass through the ring plane)
    for (let ring of pipeManager.getActiveRings()) {
      const zDiff = Math.abs(birdPos.z - ring.z);
      if (zDiff < 0.9) {
        const dist2D = Math.hypot(birdPos.x - ring.mesh.position.x, birdPos.y - ring.mesh.position.y);
        if (dist2D < 1.4) {
          ring.collected = true;
          ring.active = false;
          ring.mesh.visible = false;
          result.ringsPassed.push(ring);
        }
      }
    }

    // 3. Powerups
    for (let pup of pipeManager.getActivePowerups()) {
      const dist = pup.mesh.position.distanceTo(birdPos);
      if (dist < birdRadius + 0.9) {
        pup.collected = true;
        pup.active = false;
        pup.mesh.visible = false;
        result.powerupsCollected.push(pup);
      }
    }

    return result;
  }

  triggerInvulnerability(duration = 1.5) {
    this.invulnerabilityTimer = duration;
  }
}
