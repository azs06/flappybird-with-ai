import "./styles.css";
import { SoundEngine } from "./audio/SoundEngine";
import { InputController } from "./input/InputController";
import { SceneRenderer } from "./render/SceneRenderer";
import { FlappySimulation } from "./simulation/FlappySimulation";
import type { SimulationEvent } from "./simulation/types";
import { Hud } from "./ui/Hud";

const BEST_SCORE_KEY = "flappy-bird-3d-best-score";

const sceneRoot = document.querySelector<HTMLElement>("#scene-root");
const score = document.querySelector<HTMLElement>("#score");
const best = document.querySelector<HTMLElement>("#best");
const actionButton = document.querySelector<HTMLButtonElement>("#action-button");
const stateBanner = document.querySelector<HTMLElement>("#state-banner");
const app = document.querySelector<HTMLElement>("#app");

if (
  sceneRoot === null ||
  score === null ||
  best === null ||
  actionButton === null ||
  stateBanner === null ||
  app === null
) {
  throw new Error("Missing required game markup");
}

const storedBest = Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY) ?? "0", 10);
const simulation = new FlappySimulation(storedBest);
const renderer = new SceneRenderer(sceneRoot, simulation.getSnapshot().world);
const hud = new Hud({ score, best, actionButton, stateBanner });
const sound = new SoundEngine();

function persistBest(events: SimulationEvent[]): void {
  for (const event of events) {
    if (event.type === "crash") {
      window.localStorage.setItem(BEST_SCORE_KEY, String(event.best));
    }
  }
}

function handleAction(): void {
  const events = simulation.flap();
  persistBest(events);
  sound.handleEvents(events);
  hud.update(simulation.getSnapshot());
}

const input = new InputController(app, actionButton, handleAction);

let previousTime = performance.now();

function frame(now: number): void {
  const deltaSeconds = (now - previousTime) / 1000;
  previousTime = now;

  const events = simulation.tick(deltaSeconds);
  persistBest(events);
  sound.handleEvents(events);

  const snapshot = simulation.getSnapshot();
  hud.update(snapshot);
  renderer.render(snapshot);
  requestAnimationFrame(frame);
}

hud.update(simulation.getSnapshot());
requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => {
  input.dispose();
  renderer.dispose();
});
