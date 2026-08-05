import { Sim } from './sim.mjs';
import { CFG, scrollSpeedFor, gapSizeFor } from './sim.mjs';

function makeBot(version) {
  return function bot(sim, dt) {
    const gate = sim.nextGateAfter(CFG.birdX - CFG.pipeRadius - CFG.birdRadius);
    if (!gate) return;
    const bottomSafe = gate.gapCenter - gate.gapSize / 2 + CFG.birdRadius + 0.12;
    const topSafe = gate.gapCenter + gate.gapSize / 2 - CFG.birdRadius - 0.12;
    const speed = scrollSpeedFor(sim.score);

    if (version === 'safe2') {
      const flapH = (CFG.flapVelocity * CFG.flapVelocity) / (2 * Math.abs(CFG.gravity));
      const bottomSafe = gate.gapCenter - gate.gapSize / 2 + CFG.birdRadius + 0.15;
      const topSafe = gate.gapCenter + gate.gapSize / 2 - CFG.birdRadius - 0.15;
      const safeTop = topSafe - flapH;
      const next = sim.nextGateAfter(gate.x);
      let target = gate.gapCenter;
      if (next) {
        const drop = Math.max(-1.6, Math.min(1.6, next.gapCenter - gate.gapCenter));
        const w = gate.x < CFG.birdX ? 0.85 : 0.35;
        target = gate.gapCenter + drop * w;
      }
      target = Math.max(bottomSafe, Math.min(safeTop, target));
      if (sim.y < bottomSafe + 0.06 && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.12;
        return;
      }
      if (sim.y < target && sim.vy < 4 && sim.y <= safeTop && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.1;
      }
      return;
    }

    if (version === 'safe') {
      const flapH = (CFG.flapVelocity * CFG.flapVelocity) / (2 * Math.abs(CFG.gravity));
      const bottomSafe = gate.gapCenter - gate.gapSize / 2 + CFG.birdRadius + 0.15;
      const topSafe = gate.gapCenter + gate.gapSize / 2 - CFG.birdRadius - 0.15;
      const safeTop = topSafe - flapH;
      let target = gate.gapCenter;
      const next = sim.nextGateAfter(gate.x);
      if (next) {
        const bias = Math.max(-1.0, Math.min(1.0, next.gapCenter - gate.gapCenter)) * 0.45;
        target = gate.gapCenter + bias;
      }
      target = Math.max(bottomSafe, Math.min(safeTop, target));
      if (sim.y < bottomSafe + 0.06 && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.12;
        return;
      }
      if (sim.y < target && sim.vy < 4 && sim.y <= safeTop && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.1;
      }
      return;
    }

    if (version === 'band2') {
      const next = sim.nextGateAfter(gate.x);
      const inSlab = gate.x < CFG.birdX + CFG.pipeRadius + CFG.birdRadius;
      if (inSlab) {
        if (sim.y < bottomSafe + 0.08 && sim.vy < 1 && sim.cooldown <= 0) {
          sim.flap();
          sim.cooldown = 0.1;
        }
        return;
      }
      const bigDrop = next && gate.gapCenter - next.gapCenter > 0.9;
      let target;
      if (bigDrop) {
        target = topSafe - 0.75;
      } else {
        target = gate.gapCenter - 0.55;
        if (next) {
          const nextTopSafe = next.gapCenter + next.gapSize / 2 - CFG.birdRadius;
          target = Math.min(target, nextTopSafe - 1.62);
        }
        target = Math.max(target, bottomSafe + 0.05);
      }
      const speed2 = scrollSpeedFor(sim.score);
      const tSlab = Math.max(0, (gate.x - (CFG.birdX + CFG.pipeRadius + CFG.birdRadius)) / speed2);
      if (tSlab < 0.75) {
        const ySlabFlap = sim.y + CFG.flapVelocity * tSlab + 0.5 * CFG.gravity * tSlab * tSlab;
        const ySlabNoFlap = sim.y + sim.vy * tSlab + 0.5 * CFG.gravity * tSlab * tSlab;
        if (ySlabNoFlap > topSafe && sim.vy > -2) return;
        if (ySlabFlap < bottomSafe && ySlabNoFlap < bottomSafe && sim.cooldown <= 0) {
          sim.flap();
          sim.cooldown = 0.1;
          return;
        }
      }
      if (sim.y < target && sim.vy < 6 && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.1;
      }
      return;
    }

    if (version === 'rollout') {
      if (sim.cooldown > 0) return;
      const H = 1.4;
      const sub = 1 / 90;
      const evaluate = (doFlap) => {
        let y = sim.y;
        let vy = doFlap ? CFG.flapVelocity : sim.vy;
        const gates = sim.pipes
          .filter((p) => p.x > -5)
          .map((p) => ({ x: p.x, gc: p.gapCenter, gs: p.gapSize, scored: p.scored }));
        let score = sim.score;
        let minClear = Infinity;
        let centerPull = 0;
        let t = 0;
        while (t < H) {
          let ahead = null;
          for (const g of gates) {
            if (g.x > CFG.birdX - CFG.pipeRadius - CFG.birdRadius && (!ahead || g.x < ahead.x)) ahead = g;
          }
          const floor = ahead ? ahead.gc - ahead.gs / 2 + CFG.birdRadius + 0.28 : CFG.groundY + 1.8;
          if (y < floor && vy < 3) vy = CFG.flapVelocity;
          vy = Math.max(CFG.maxFallSpeed, vy + CFG.gravity * sub);
          y += vy * sub;
          if (y > CFG.ceilingY) {
            y = CFG.ceilingY;
            vy = Math.min(vy, 0);
          }
          if (y - CFG.birdRadius <= CFG.groundY) return t - 10;
          const sp = scrollSpeedFor(score);
          for (const g of gates) {
            g.x -= sp * sub;
            if (!g.scored && g.x < CFG.birdX - CFG.pipeRadius) {
              g.scored = true;
              score++;
            }
            if (Math.abs(g.x - CFG.birdX) < CFG.pipeRadius + CFG.birdRadius) {
              const gb = g.gc - g.gs / 2;
              const gt = g.gc + g.gs / 2;
              const clear = Math.min(y - CFG.birdRadius - gb, gt - (y + CFG.birdRadius));
              if (clear < 0) return t - 10;
              if (clear < minClear) minClear = clear;
              centerPull += Math.abs(y - g.gc) * sub;
            }
          }
          t += sub;
        }
        if (minClear === Infinity) minClear = 2;
        return Math.min(minClear, 1.2) - centerPull * 0.12;
      };
      const flapScore = evaluate(true);
      const noFlapScore = evaluate(false);
      if (flapScore > noFlapScore + 0.02 && sim.vy < 7.5) {
        sim.flap();
        sim.cooldown = 0.09;
      }
      return;
    }

    if (version === 'coast') {
      const tGate = Math.max(0, (gate.x - CFG.birdX) / speed);
      const yCoast = sim.y + sim.vy * tGate + 0.5 * CFG.gravity * tGate * tGate;
      let desired = gate.gapCenter;
      const next = sim.nextGateAfter(gate.x);
      if (next) {
        desired = gate.gapCenter + Math.max(-1.5, Math.min(1.5, next.gapCenter - gate.gapCenter)) * 0.35;
      }
      desired = Math.max(bottomSafe, Math.min(topSafe, desired));
      if (yCoast < desired - 0.15 && sim.vy < 5 && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.1;
      }
      return;
    }

    if (version === 'band') {
      const inSlab = gate.x < CFG.birdX + CFG.pipeRadius + CFG.birdRadius;
      if (inSlab) {
        if (sim.y < bottomSafe + 0.1 && sim.vy < 6 && sim.cooldown <= 0) {
          sim.flap();
          sim.cooldown = 0.1;
        }
        return;
      }
      const tSlab = Math.max(0, (gate.x - (CFG.birdX + CFG.pipeRadius + CFG.birdRadius)) / speed);
      const ySlabNoFlap = sim.y + sim.vy * tSlab + 0.5 * CFG.gravity * tSlab * tSlab;
      if (ySlabNoFlap > topSafe) return;
      if (tSlab < 0.75) {
        const ySlabFlap = sim.y + CFG.flapVelocity * tSlab + 0.5 * CFG.gravity * tSlab * tSlab;
        if (ySlabFlap < bottomSafe && sim.cooldown <= 0) {
          sim.flap();
          sim.cooldown = 0.1;
          return;
        }
      }
      let target = gate.gapCenter - 0.55;
      const next = sim.nextGateAfter(gate.x);
      if (next) {
        const nextTopSafe = next.gapCenter + next.gapSize / 2 - CFG.birdRadius;
        target = Math.min(target, nextTopSafe - 1.62);
      }
      target = Math.max(target, bottomSafe + 0.05);
      if (sim.y < target && sim.vy < 6 && sim.cooldown <= 0) {
        sim.flap();
        sim.cooldown = 0.1;
      }
    }
  };
}

const VERSION = process.env.BOT ?? 'band';
const SECONDS = Number(process.env.SIM_SECONDS ?? 180);
const RUNS = Number(process.env.SIM_RUNS ?? 24);
const TRACE_SEED = process.env.TRACE_SEED ? Number(process.env.TRACE_SEED) : null;
const bot = makeBot(VERSION);

if (TRACE_SEED !== null) {
  const sim = new Sim(TRACE_SEED, bot);
  const trace = [];
  sim.start();
  let t = 0;
  let n = 0;
  while (sim.state === 'playing' && t < SECONDS) {
    sim.step(CFG.fixedDt);
    t += CFG.fixedDt;
    n++;
    if (n % 4 === 0) {
      const gate = sim.nextGateAfter(CFG.birdX - CFG.pipeRadius - CFG.birdRadius);
      trace.push([t.toFixed(2), sim.y.toFixed(2), sim.vy.toFixed(1), sim.score, gate ? gate.x.toFixed(2) : '-', gate ? gate.gapCenter.toFixed(2) : '-', gate ? gate.gapSize.toFixed(2) : '-']);
    }
  }
  console.log('t, y, vy, score, gateX, center, gap  | death cause:', sim.cause, 'score', sim.score);
  for (const row of trace.slice(-50)) console.log(row.join(' '));
  process.exit(0);
}

let failures = 0;
let worst = { score: Infinity };
let total = 0;
for (let i = 0; i < RUNS; i++) {
  const seed = (i * 7919 + 13) >>> 0;
  const sim = new Sim(seed, bot);
  const r = sim.run(SECONDS);
  total++;
  if (r.cause !== 'timeout') {
    failures++;
    if (r.score < worst.score) worst = { seed, ...r };
    if (failures <= 5) console.log(`DEATH seed=${seed} score=${r.score} t=${r.time.toFixed(1)}s cause=${r.cause}`);
  }
}
console.log(`bot=${VERSION} runs=${total} deaths=${failures} worst=${JSON.stringify(worst)} (target: survive ${SECONDS}s)`);
