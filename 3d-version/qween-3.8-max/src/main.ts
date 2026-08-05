import * as THREE from 'three';
import { Game } from './game/game';
import { Hud, type HudRefs } from './game/hud';
import { CFG } from './game/config';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

const hud = new Hud({
  root: $('hud'),
  score: $('score'),
  ready: $('ready'),
  over: $('over'),
  overScore: $('over-score'),
  overBest: $('over-best'),
  medal: $('medal'),
  medalLabel: $('medal-label'),
  newBest: $('new-best'),
  restart: $('restart'),
  flash: $('flash'),
  mute: $('mute')
} satisfies HudRefs);

const canvas = $('canvas') as HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  $('fatal').classList.remove('hidden');
  throw err;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x8fd4f8);

const isCoarse = window.matchMedia('(pointer: coarse)').matches;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const dprCap = isCoarse ? 1.75 : 2;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
const game = new Game(camera, hud);

function fit(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const hFov = THREE.MathUtils.degToRad(72);
  let vFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hFov / 2) / aspect));
  vFov = THREE.MathUtils.clamp(vFov, 42, 78);
  camera.fov = vFov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  const g = game as unknown as { baseFov: number; camDist: number };
  g.baseFov = vFov;
  g.camDist = Math.min(19, 12.2 * (aspect < 0.8 ? Math.pow(0.8 / aspect, 0.7) : 1));
}
fit();
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));

function primaryAction(): void {
  game.sounds.unlock();
  if (game.state === 'gameover') {
    if (game.canRestart()) game.restart();
    return;
  }
  if (game.autopilot) return;
  game.flap();
}

window.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('button')) return;
  primaryAction();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (e.repeat) return;
    primaryAction();
  } else if (e.code === 'KeyR' && game.state === 'gameover') {
    game.restart();
  } else if (e.code === 'KeyM') {
    game.sounds.unlock();
    game.sounds.setMuted(!game.sounds.muted);
    hud.setMuted(game.sounds.muted);
  }
});
$('restart').addEventListener('click', () => {
  game.sounds.unlock();
  if (game.state === 'gameover') game.restart();
});
$('mute').addEventListener('click', () => {
  game.sounds.unlock();
  game.sounds.setMuted(!game.sounds.muted);
  hud.setMuted(game.sounds.muted);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clock.stop();
  else clock.start();
});

const clock = new THREE.Clock();
let fps = 0;
let fpsFrames = 0;
let fpsTime = 0;
const debug = new URLSearchParams(location.search).has('debug');
const statsEl = $('stats');

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  game.update(dt);
  renderer.render(game.scene, camera);
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
    if (debug) {
      const info = renderer.info.render;
      statsEl.textContent = `${fps} fps · ${info.calls} calls · ${info.triangles} tris`;
      statsEl.classList.remove('hidden');
    }
  }
});

function samplePixels(samples = 400): { unique: number; avgLuma: number; nonBlackPct: number } {
  const size = 96;
  const rt = new THREE.WebGLRenderTarget(size, size);
  renderer.setRenderTarget(rt);
  renderer.render(game.scene, camera);
  const buf = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
  renderer.setRenderTarget(null);
  rt.dispose();
  const colors = new Set<string>();
  let luma = 0;
  let nonBlack = 0;
  for (let i = 0; i < samples; i++) {
    const p = Math.floor(Math.random() * size * size) * 4;
    const r = buf[p];
    const g = buf[p + 1];
    const b = buf[p + 2];
    colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (r + g + b > 24) nonBlack++;
  }
  return {
    unique: colors.size,
    avgLuma: Math.round(luma / samples),
    nonBlackPct: Math.round((nonBlack / samples) * 100)
  };
}

interface FlappyApi {
  version: string;
  seed: number;
  get state(): string;
  get score(): number;
  get best(): number;
  get fps(): number;
  flap(): void;
  start(): void;
  restart(): void;
  forceDeath(): void;
  setSeed(seed: number): void;
  setAutopilot(on: boolean): void;
  setMuted(m: boolean): void;
  rendererInfo(): { calls: number; triangles: number; geometries: number; textures: number; fps: number; pixelRatio: number };
  samplePixels(samples?: number): { unique: number; avgLuma: number; nonBlackPct: number };
  debugState(): { y: number; vy: number; state: string; score: number; nextGapCenter: number | null; nextGapSize: number | null; nextGateX: number | null };
  config: typeof CFG;
}

const api: FlappyApi = {
  version: '1.0.0',
  seed: 0xc0ffee,
  get state() {
    return game.state;
  },
  get score() {
    return game.score;
  },
  get best() {
    return game.best;
  },
  get fps() {
    return fps;
  },
  flap() {
    game.sounds.unlock();
    game.flap();
  },
  start() {
    game.sounds.unlock();
    if (game.state === 'ready') game.flap();
  },
  restart() {
    game.restart();
  },
  forceDeath() {
    game.forceDeath();
  },
  setSeed(seed: number) {
    api.seed = seed;
    game.setSeed(seed);
  },
  setAutopilot(on: boolean) {
    game.autopilot = on;
  },
  setMuted(m: boolean) {
    game.sounds.setMuted(m);
    hud.setMuted(m);
  },
  rendererInfo() {
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps,
      pixelRatio: renderer.getPixelRatio()
    };
  },
  samplePixels,
  debugState() {
    const gate = game.world.nextGateAfter(CFG.birdX - CFG.pipeRadius - CFG.birdRadius);
    return {
      y: game.bird.y,
      vy: game.bird.vy,
      state: game.state,
      score: game.score,
      nextGapCenter: gate ? gate.gapCenter : null,
      nextGapSize: gate ? gate.gapSize : null,
      nextGateX: gate ? gate.x : null
    };
  },
  config: CFG
};

(window as unknown as { __FLAPPY__: FlappyApi }).__FLAPPY__ = api;
$('loading').classList.add('hidden');
