import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { createRNG } from './core/rng.js';
import { CONFIG } from './game/config.js';
import { Game, State } from './game/game.js';
import { Bird } from './entities/bird.js';
import { PipeField } from './entities/pipes.js';
import { Environment } from './entities/environment.js';
import { SparkPool, FeatherPool } from './entities/particles.js';
import { Effects } from './systems/effects.js';
import { AudioSys } from './systems/audio.js';
import { UI } from './ui/hud.js';

// URL params: ?seed=7 (deterministic runs) ?bot=1 (QA autopilot) ?debug=1 (stats overlay)
const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1337', 10);
const botMode = params.get('bot') === '1';
const debugMode = params.get('debug') === '1';

const canvas = document.getElementById('gl');
const engine = new Engine(canvas);
const rng = createRNG(seed);

const env = new Environment(engine.scene, rng);
const pipes = new PipeField(engine.scene, rng);
const bird = new Bird(engine.scene);
const sparks = new SparkPool(engine.scene);
const feathers = new FeatherPool(engine.scene);
const effects = new Effects(engine.camera, CONFIG.camera.fov);
const audio = new AudioSys();
const ui = new UI();

const game = new Game({ engine, bird, pipes, env, sparks, feathers, effects, audio, ui, bot: botMode });

// ------------------------------ input wiring ------------------------------

const input = new Input(window);
input.onPress(() => {
  // First gesture also unlocks audio.
  audio.init();
  game.press();
});

ui.onMuteToggle(() => {
  audio.init();
  audio.setMuted(!audio.muted);
  ui.setMuted(audio.muted);
  audio.click();
});
ui.setMuted(audio.muted);

ui.onRetry(() => {
  audio.init();
  audio.click();
  if (game.state === State.GAMEOVER) game.press();
});

// Auto-pause when the tab loses focus mid-run.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});
window.addEventListener('blur', () => game.pause());

// Menu medal shelf reflects the stored best.
game._medalFor && ui.setMenuBestMedal(null);

// ------------------------------ boot + loop ------------------------------

// Everything is procedural, so "loading" is one warm-up frame: compile
// shaders and upload textures before revealing the menu.
ui.showScreen('loading');
engine.renderer.compile(engine.scene, engine.camera);
requestAnimationFrame(() => ui.showScreen('menu'));

let debugAcc = 0;

function frame() {
  const dt = engine.tick();
  game.update(dt);
  engine.render();

  if (debugMode) {
    debugAcc += dt;
    if (debugAcc > 0.25) {
      debugAcc = 0;
      const d = game.getDebugInfo();
      ui.setDebug(
        `fps ${d.renderer.fps}  draws ${d.renderer.drawCalls}  tris ${d.renderer.triangles}\n` +
        `state ${d.state}  score ${d.score}  speed ${d.speed}  dpr ${d.renderer.dpr}`
      );
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ------------------------------ QA hooks ------------------------------

window.__game = {
  get state() { return game.state; },
  get score() { return game.score; },
  press: () => game.press(),
  kill: () => game.debugKill(),
  info: () => game.getDebugInfo(),
};
