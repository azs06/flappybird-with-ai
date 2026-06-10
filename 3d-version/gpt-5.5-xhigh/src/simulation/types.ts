export type GamePhase = "ready" | "playing" | "gameOver";

export interface BirdState {
  x: number;
  y: number;
  velocityY: number;
  roll: number;
  wingBeat: number;
}

export interface PipeState {
  id: number;
  x: number;
  gapY: number;
  gapHeight: number;
  scored: boolean;
  skin: number;
}

export interface SparkState {
  id: number;
  x: number;
  y: number;
  z: number;
  age: number;
  ttl: number;
  scale: number;
  tone: number;
}

export interface SimulationSnapshot {
  phase: GamePhase;
  bird: BirdState;
  pipes: PipeState[];
  sparks: SparkState[];
  score: number;
  best: number;
  elapsed: number;
  speed: number;
  shake: number;
  world: WorldConfig;
  eventPulse: number;
}

export interface WorldConfig {
  birdRadius: number;
  birdX: number;
  floorY: number;
  ceilingY: number;
  pipeWidth: number;
  pipeDepth: number;
  pipeSpawnX: number;
  pipeRecycleX: number;
}

export type SimulationEvent =
  | { type: "flap" }
  | { type: "score"; score: number }
  | { type: "crash"; best: number }
  | { type: "reset" }
  | { type: "start" };
