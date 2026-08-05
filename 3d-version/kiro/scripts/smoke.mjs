/**
 * End-to-end smoke test: builds nothing, serves the app with Vite, drives it in
 * a real headless Chrome (WebGL via SwiftShader), plays a run with an autopilot
 * and asserts the whole state machine. Also dumps screenshots for eyeballing.
 *
 *   npm run smoke
 */
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { CFG } from '../src/config.js';

const CFG_BASE_SPEED = CFG.baseSpeed;

const SHOTS = path.resolve('.tmp/shots');
const results = [];
let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await rm(SHOTS, { recursive: true, force: true });
  await mkdir(SHOTS, { recursive: true });

  const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'warn' });
  await server.listen();
  const url = `http://localhost:5199/`;

  const browser = await chromium.launch({
    channel: 'chrome',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  const warnings = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    if (m.type() === 'warning') warnings.push(m.text());
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.game), null, { timeout: 15_000 });
  await sleep(800);

  // --- Boot ---------------------------------------------------------------
  const boot = await page.evaluate(() => {
    const gl = window.game.renderer.getContext();
    return {
      state: window.game.state,
      hasWebGL: Boolean(gl),
      renderer: window.game.renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl1',
      drawCallsGeometries: window.game.renderer.info.memory.geometries,
      canvasW: window.game.renderer.domElement.width,
      titleVisible: !document.getElementById('titleScreen').hasAttribute('data-hidden'),
      sceneChildren: window.game.scene.children.length,
    };
  });
  check('WebGL context created', boot.hasWebGL, boot.renderer);
  check('canvas sized to viewport', boot.canvasW > 0, `width=${boot.canvasW}`);
  check('starts in ready state', boot.state === 'ready', boot.state);
  check('title screen visible', boot.titleVisible);
  check('scene populated', boot.sceneChildren >= 5, `${boot.sceneChildren} children`);
  await page.screenshot({ path: path.join(SHOTS, '1-title.png') });

  // --- Frames actually advance --------------------------------------------
  const f1 = await page.evaluate(() => window.game.renderer.info.render.frame);
  await sleep(600);
  const f2 = await page.evaluate(() => window.game.renderer.info.render.frame);
  check('render loop is running', f2 > f1 + 5, `${f1} → ${f2}`);

  // --- Start via keyboard --------------------------------------------------
  await page.keyboard.press('Space');
  await sleep(200);
  check(
    'space starts the run',
    (await page.evaluate(() => window.game.state)) === 'playing',
  );

  // --- Autopilot -----------------------------------------------------------
  // The bot decides at physics rate (not render rate) so a slow SwiftShader
  // frame budget doesn't make the game look unfair.
  await page.evaluate(() => {
    const g = window.game;
    window.__bot = true;
    window.__maxSpeed = 0;
    const originalStep = g.step.bind(g);
    g.step = (dt) => {
      if (window.__bot && g.state === 'playing') {
        window.__maxSpeed = Math.max(window.__maxSpeed, g.speed);
        const gap = g.pipes.nearestGapAhead();
        const target = gap ? gap.y - 0.55 : 0.2;
        const nearFloor = g.bird.y < -3.4;
        if (nearFloor || (g.bird.y < target && g.bird.velocity <= 0)) g.flap();
      }
      originalStep(dt);
    };
  });

  let shotTaken = false;
  const deadline = Date.now() + 60_000;
  let snapshot = null;
  while (Date.now() < deadline) {
    await sleep(400);
    snapshot = await page.evaluate(() => ({
      score: window.game.score,
      state: window.game.state,
      palette: window.game.world.to.name,
      maxSpeed: window.__maxSpeed,
      geometries: window.game.renderer.info.memory.geometries,
      textures: window.game.renderer.info.memory.textures,
      activePipes: window.game.pipes.pipes.filter((p) => p.active).length,
    }));
    if (!shotTaken && snapshot.score >= 2) {
      await page.screenshot({ path: path.join(SHOTS, '2-playing.png') });
      shotTaken = true;
    }
    if (snapshot.state !== 'playing' || snapshot.score >= 14) break;
  }

  check('autopilot clears 14 pipes without dying', snapshot.score >= 14, `score=${snapshot.score}`);
  check('still alive after scoring', snapshot.state === 'playing', snapshot.state);
  check(
    'speed ramps with score',
    snapshot.maxSpeed > CFG_BASE_SPEED,
    `maxSpeed=${snapshot.maxSpeed.toFixed(2)}`,
  );
  check(
    'palette advanced with score',
    snapshot.score < 12 || snapshot.palette !== 'day',
    `palette=${snapshot.palette} @ ${snapshot.score}`,
  );
  check('pipe pool bounded', snapshot.activePipes <= 9, `active=${snapshot.activePipes}`);
  check(
    'no geometry/texture leak',
    snapshot.geometries < 60 && snapshot.textures < 12,
    `geo=${snapshot.geometries} tex=${snapshot.textures}`,
  );

  const scoreText = await page.textContent('#score');
  check('HUD score matches state', Number(scoreText) === snapshot.score, `hud=${scoreText}`);

  // The remaining checks need a live run; revive if the bot died early.
  const ensurePlaying = async () => {
    const state = await page.evaluate(() => window.game.state);
    if (state === 'playing') return;
    if (state === 'over') await page.click('#retryBtn');
    await page.waitForFunction(() => window.game.state === 'ready', null, { timeout: 10_000 });
    await page.evaluate(() => window.game.beginRun());
    await sleep(300);
  };
  await ensurePlaying();

  // --- Pause / resume ------------------------------------------------------
  await page.keyboard.press('KeyP');
  await sleep(120);
  const pausedState = await page.evaluate(() => ({
    paused: window.game.paused,
    visible: !document.getElementById('pauseScreen').hasAttribute('data-hidden'),
    score: window.game.score,
  }));
  await sleep(700);
  const afterHold = await page.evaluate(() => window.game.score);
  check('pause stops the simulation', pausedState.paused && afterHold === pausedState.score);
  check('pause overlay shown', pausedState.visible);
  await page.screenshot({ path: path.join(SHOTS, '3-paused.png') });
  await page.keyboard.press('KeyP');
  await sleep(150);
  check('resume works', (await page.evaluate(() => window.game.paused)) === false);

  // --- Mute toggle ---------------------------------------------------------
  const muteBefore = await page.evaluate(() => window.game.muted);
  await page.click('#muteBtn');
  const muteAfter = await page.evaluate(() => ({
    muted: window.game.muted,
    pressed: document.getElementById('muteBtn').getAttribute('aria-pressed'),
    stored: localStorage.getItem('flappy-three.best.muted'),
  }));
  check('mute toggles', muteAfter.muted !== muteBefore, `${muteBefore} → ${muteAfter.muted}`);
  check('mute is announced to AT', muteAfter.pressed === String(muteAfter.muted));
  check('mute persists', muteAfter.stored === (muteAfter.muted ? '1' : '0'));
  await page.click('#muteBtn'); // restore sound

  // --- Death ---------------------------------------------------------------
  const scoreAtDeath = await page.evaluate(() => {
    window.__bot = false;
    return window.game.score;
  });
  await page.waitForFunction(() => window.game.state !== 'playing', null, { timeout: 10_000 });
  const terminal = await page.evaluate(() => window.game.state);
  check('collision ends the run', terminal === 'dying' || terminal === 'over', terminal);
  await page.waitForFunction(() => window.game.state === 'over', null, { timeout: 8000 });
  await sleep(400);

  const over = await page.evaluate(() => ({
    state: window.game.state,
    overVisible: !document.getElementById('overScreen').hasAttribute('data-hidden'),
    hudHidden: document.getElementById('hud').hasAttribute('data-hidden'),
    finalScore: document.getElementById('finalScore').textContent,
    bestScore: document.getElementById('bestScore').textContent,
    medal: document.getElementById('medal').dataset.tier,
    stored: localStorage.getItem('flappy-three.best'),
    focused: document.activeElement?.id,
    birdY: window.game.bird.y,
  }));
  check('game over screen shown', over.overVisible && over.hudHidden);
  check('final score reported', Number(over.finalScore) === scoreAtDeath, `${over.finalScore} vs ${scoreAtDeath}`);
  check('best score persisted', Number(over.stored) === scoreAtDeath, `stored=${over.stored}`);
  check('best score displayed', Number(over.bestScore) === scoreAtDeath);
  check('medal tier assigned', typeof over.medal === 'string', `tier=${over.medal}`);
  check('focus moved to retry button', over.focused === 'retryBtn', `focus=${over.focused}`);
  check('bird rests on the ground, not below', over.birdY >= -4.8, `y=${over.birdY.toFixed(2)}`);
  await page.screenshot({ path: path.join(SHOTS, '4-gameover.png') });

  // --- Restart -------------------------------------------------------------
  await page.click('#retryBtn');
  await sleep(300);
  const restarted = await page.evaluate(() => ({
    state: window.game.state,
    score: window.game.score,
    hudVisible: !document.getElementById('hud').hasAttribute('data-hidden'),
    hintVisible: !document.getElementById('readyHint').hasAttribute('data-hidden'),
    activePipes: window.game.pipes.pipes.filter((p) => p.active).length,
    palette: window.game.world.to.name,
    birdY: window.game.bird.y,
  }));
  check('restart returns to ready', restarted.state === 'ready', restarted.state);
  check('score reset', restarted.score === 0);
  check('field cleared on restart', restarted.activePipes === 0);
  check('palette reset to day', restarted.palette === 'day', restarted.palette);
  check('ready hint shown', restarted.hudVisible && restarted.hintVisible);
  check('bird repositioned', Math.abs(restarted.birdY - 0.5) < 1.2, `y=${restarted.birdY.toFixed(2)}`);

  // --- Responsive layout ---------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(400);
  const portrait = await page.evaluate(() => {
    const g = window.game;
    const halfFov = (g.camera.fov * Math.PI) / 360;
    const halfWidth = Math.tan(halfFov) * g.camDist * g.camera.aspect;
    return {
      aspect: g.camera.aspect,
      dist: g.camDist,
      spawnX: g.pipes.spawnX,
      rightEdge: g.camX + halfWidth,
      leadUnits: g.camX + halfWidth - -1.9,
      canvasW: g.renderer.domElement.width,
    };
  });
  check(
    'camera pull-back stays capped',
    portrait.dist > 14 && portrait.dist <= 20.5,
    `dist=${portrait.dist.toFixed(1)}`,
  );
  check(
    'pipes spawn beyond the visible edge',
    portrait.spawnX > portrait.rightEdge,
    `spawn=${portrait.spawnX.toFixed(1)} edge=${portrait.rightEdge.toFixed(1)}`,
  );
  check(
    'portrait still gives reaction time',
    portrait.leadUnits > 6,
    `${portrait.leadUnits.toFixed(1)} units ahead`,
  );
  check('canvas resized', portrait.canvasW > 0 && portrait.canvasW <= 390 * 2);
  await page.screenshot({ path: path.join(SHOTS, '5-portrait.png') });

  // Night palette shot for visual review.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    window.game.beginRun();
    window.game.world.setPalette(2);
    window.__bot = true;
  });
  await sleep(2600);
  await page.screenshot({ path: path.join(SHOTS, '6-night.png') });

  // --- Console hygiene -----------------------------------------------------
  check('no runtime errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  await browser.close();
  await server.close();

  console.log(`\n${results.join('\n')}`);
  if (warnings.length) console.log(`\nwarnings (${warnings.length}):\n  ${warnings.slice(0, 6).join('\n  ')}`);
  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  console.log(`screenshots → ${SHOTS}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
