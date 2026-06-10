import type {
  BirdState,
  PipeState,
  SimulationEvent,
  SimulationSnapshot,
  SparkState,
  WorldConfig
} from "./types";

const WORLD: WorldConfig = {
  birdRadius: 0.27,
  birdX: -1.75,
  floorY: -2.25,
  ceilingY: 2.75,
  pipeWidth: 0.66,
  pipeDepth: 1.34,
  pipeSpawnX: 4.75,
  pipeRecycleX: -4.25
};

const GRAVITY = -8.6;
const FLAP_VELOCITY = 4.35;
const READY_BOB_HEIGHT = 0.16;
const PIPE_SPACING = 3.05;
const BASE_SPEED = 2.28;
const MAX_SPEED = 3.18;
const BASE_GAP = 1.52;
const MIN_GAP = 1.18;
const PIPE_COUNT = 4;

export class FlappySimulation {
  private phase: SimulationSnapshot["phase"] = "ready";
  private bird: BirdState = this.createBird();
  private pipes: PipeState[] = [];
  private sparks: SparkState[] = [];
  private score = 0;
  private best = 0;
  private elapsed = 0;
  private shake = 0;
  private eventPulse = 0;
  private nextPipeId = 1;
  private nextSparkId = 1;
  private runSeed = Math.random() * 1000;

  constructor(bestScore: number) {
    this.best = Number.isFinite(bestScore) ? Math.max(0, Math.floor(bestScore)) : 0;
    this.resetRun();
  }

  flap(): SimulationEvent[] {
    const events: SimulationEvent[] = [];

    if (this.phase === "gameOver") {
      this.resetRun();
      events.push({ type: "reset" });
    }

    if (this.phase === "ready") {
      this.phase = "playing";
      events.push({ type: "start" });
    }

    if (this.phase === "playing") {
      this.bird.velocityY = FLAP_VELOCITY;
      this.eventPulse = 1;
      this.emitSparks(this.bird.x - 0.22, this.bird.y - 0.06, 5, 0);
      events.push({ type: "flap" });
    }

    return events;
  }

  tick(deltaSeconds: number): SimulationEvent[] {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.034);
    const events: SimulationEvent[] = [];

    this.elapsed += dt;
    this.eventPulse = Math.max(0, this.eventPulse - dt * 4);
    this.shake = Math.max(0, this.shake - dt * 2.8);
    this.updateSparks(dt);

    if (this.phase === "ready") {
      this.bird.y = 0.46 + Math.sin((this.elapsed + this.runSeed) * 3.2) * READY_BOB_HEIGHT;
      this.bird.velocityY = 0;
      this.bird.roll = Math.sin((this.elapsed + this.runSeed) * 4.5) * 0.09;
      this.bird.wingBeat += dt * 10.5;
      return events;
    }

    if (this.phase !== "playing") {
      this.bird.roll = Math.min(1.1, this.bird.roll + dt * 1.3);
      this.bird.wingBeat += dt * 4;
      return events;
    }

    const speed = this.currentSpeed();
    this.bird.velocityY += GRAVITY * dt;
    this.bird.y += this.bird.velocityY * dt;
    this.bird.roll = this.bird.velocityY > 0
      ? Math.min(0.55, this.bird.velocityY / FLAP_VELOCITY * 0.5)
      : Math.max(-1.08, this.bird.velocityY / 7.5);
    this.bird.wingBeat += dt * (this.bird.velocityY > 0 ? 18 : 11);

    for (const pipe of this.pipes) {
      pipe.x -= speed * dt;

      if (!pipe.scored && pipe.x + WORLD.pipeWidth * 0.5 < WORLD.birdX) {
        pipe.scored = true;
        this.score += 1;
        this.eventPulse = 1;
        this.emitSparks(WORLD.birdX + 0.34, this.bird.y, 9, 1);
        events.push({ type: "score", score: this.score });
      }
    }

    this.recyclePipes();

    if (this.hasCrashed()) {
      this.phase = "gameOver";
      this.bird.velocityY = Math.min(this.bird.velocityY, -2.2);
      this.best = Math.max(this.best, this.score);
      this.shake = 1;
      this.emitSparks(this.bird.x, this.bird.y, 22, 2);
      events.push({ type: "crash", best: this.best });
    }

    return events;
  }

  getSnapshot(): SimulationSnapshot {
    return {
      phase: this.phase,
      bird: { ...this.bird },
      pipes: this.pipes.map((pipe) => ({ ...pipe })),
      sparks: this.sparks.map((spark) => ({ ...spark })),
      score: this.score,
      best: this.best,
      elapsed: this.elapsed,
      speed: this.currentSpeed(),
      shake: this.shake,
      world: WORLD,
      eventPulse: this.eventPulse
    };
  }

  private resetRun(): void {
    this.phase = "ready";
    this.bird = this.createBird();
    this.pipes = [];
    this.sparks = [];
    this.score = 0;
    this.elapsed = 0;
    this.shake = 0;
    this.eventPulse = 0;
    this.runSeed = Math.random() * 1000;

    for (let i = 0; i < PIPE_COUNT; i += 1) {
      this.pipes.push(this.createPipe(WORLD.pipeSpawnX + i * PIPE_SPACING));
    }
  }

  private createBird(): BirdState {
    return {
      x: WORLD.birdX,
      y: 0.45,
      velocityY: 0,
      roll: 0,
      wingBeat: 0
    };
  }

  private createPipe(x: number): PipeState {
    const margin = 0.88;
    const span = WORLD.ceilingY - WORLD.floorY - margin * 2;
    const wave = Math.sin((this.nextPipeId + this.runSeed) * 1.73) * 0.5 + 0.5;
    const wobble = (Math.random() - 0.5) * 0.44;
    const gapY = WORLD.floorY + margin + span * wave + wobble;

    const pipe: PipeState = {
      id: this.nextPipeId,
      x,
      gapY: Math.min(WORLD.ceilingY - margin, Math.max(WORLD.floorY + margin, gapY)),
      gapHeight: this.currentGapHeight(),
      scored: false,
      skin: this.nextPipeId % 4
    };

    this.nextPipeId += 1;
    return pipe;
  }

  private recyclePipes(): void {
    let furthestX = Math.max(...this.pipes.map((pipe) => pipe.x));

    for (const pipe of this.pipes) {
      if (pipe.x < WORLD.pipeRecycleX) {
        const replacement = this.createPipe(furthestX + PIPE_SPACING);
        pipe.id = replacement.id;
        pipe.x = replacement.x;
        pipe.gapY = replacement.gapY;
        pipe.gapHeight = replacement.gapHeight;
        pipe.scored = false;
        pipe.skin = replacement.skin;
        furthestX = pipe.x;
      }
    }
  }

  private hasCrashed(): boolean {
    const radius = WORLD.birdRadius;

    if (this.bird.y - radius <= WORLD.floorY || this.bird.y + radius >= WORLD.ceilingY) {
      return true;
    }

    for (const pipe of this.pipes) {
      const inPipeX =
        WORLD.birdX + radius > pipe.x - WORLD.pipeWidth * 0.5 &&
        WORLD.birdX - radius < pipe.x + WORLD.pipeWidth * 0.5;

      if (!inPipeX) {
        continue;
      }

      const gapBottom = pipe.gapY - pipe.gapHeight * 0.5;
      const gapTop = pipe.gapY + pipe.gapHeight * 0.5;

      if (this.bird.y - radius < gapBottom || this.bird.y + radius > gapTop) {
        return true;
      }
    }

    return false;
  }

  private currentSpeed(): number {
    return Math.min(MAX_SPEED, BASE_SPEED + this.score * 0.035 + this.elapsed * 0.008);
  }

  private currentGapHeight(): number {
    return Math.max(MIN_GAP, BASE_GAP - this.score * 0.012);
  }

  private emitSparks(x: number, y: number, count: number, tone: number): void {
    for (let i = 0; i < count; i += 1) {
      this.sparks.push({
        id: this.nextSparkId,
        x,
        y,
        z: (Math.random() - 0.5) * 0.7,
        age: 0,
        ttl: 0.36 + Math.random() * 0.34,
        scale: 0.05 + Math.random() * 0.08,
        tone
      });
      this.nextSparkId += 1;
    }
  }

  private updateSparks(dt: number): void {
    for (const spark of this.sparks) {
      spark.age += dt;
      spark.x -= (0.35 + spark.tone * 0.14) * dt;
      spark.y += (0.14 + spark.scale) * dt;
      spark.z += Math.sin((spark.age + spark.id) * 8) * dt * 0.25;
    }

    this.sparks = this.sparks.filter((spark) => spark.age < spark.ttl);
  }
}
