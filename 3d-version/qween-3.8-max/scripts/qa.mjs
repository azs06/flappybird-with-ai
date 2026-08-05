import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const URL = process.env.QA_URL ?? 'http://127.0.0.1:5173/';
const CHROME = process.env.QA_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve('qa/screenshots');
const BOT_SECONDS = Number(process.env.QA_BOT_SECONDS ?? 45);

const results = {
  url: URL,
  consoleErrors: [],
  pageErrors: [],
  screenshots: [],
  checks: {},
  metrics: {}
};

function check(name, ok, detail = '') {
  results.checks[name] = { ok, detail };
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function attachErrorListeners(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => results.pageErrors.push(String(err)));
}

async function waitForApi(page) {
  await page.waitForFunction(() => typeof window.__FLAPPY__ !== 'undefined', null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 15000 });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file });
  results.screenshots.push(file);
}

async function waitState(page, state, timeout = 8000) {
  await page.waitForFunction((s) => window.__FLAPPY__.state === s, state, { timeout });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=metal'] });

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  attachErrorListeners(page);

  await page.goto(URL, { waitUntil: 'load' });
  await waitForApi(page);
  await page.evaluate(() => window.__FLAPPY__.setSeed(1234));
  await page.waitForTimeout(900);
  const readyState = await page.evaluate(() => window.__FLAPPY__.state);
  check('desktop: boots into ready state', readyState === 'ready', `state=${readyState}`);
  await shot(page, 'desktop-ready.png');

  const readyPixels = await page.evaluate(() => window.__FLAPPY__.samplePixels(400));
  check(
    'desktop ready: canvas nonblank',
    readyPixels.unique > 40 && readyPixels.avgLuma > 20 && readyPixels.avgLuma < 240 && readyPixels.nonBlackPct > 60,
    JSON.stringify(readyPixels)
  );

  await page.evaluate(() => {
    window.__FLAPPY__.setAutopilot(true);
    window.__FLAPPY__.start();
  });
  await page.waitForTimeout(2800);
  const playingState = await page.evaluate(() => window.__FLAPPY__.state);
  const playingScore = await page.evaluate(() => window.__FLAPPY__.score);
  check('desktop: input starts play and scores progress', playingState === 'playing' && playingScore >= 1, `state=${playingState} score=${playingScore}`);
  await shot(page, 'desktop-playing.png');

  const midPixels = await page.evaluate(() => window.__FLAPPY__.samplePixels(400));
  check(
    'desktop playing: canvas nonblank and varied',
    midPixels.unique > 60 && midPixels.nonBlackPct > 60,
    JSON.stringify(midPixels)
  );

  console.log(`Bot playtest running for ${BOT_SECONDS}s...`);
  await page.waitForTimeout(BOT_SECONDS * 1000);
  const botState = await page.evaluate(() => window.__FLAPPY__.state);
  const botScore = await page.evaluate(() => window.__FLAPPY__.score);
  check('bot playtest: survives and progresses', botState === 'playing' && botScore >= BOT_SECONDS * 0.7, `state=${botState} score=${botScore} after ${BOT_SECONDS}s`);
  results.metrics.bot = { state: botState, score: botScore, seconds: BOT_SECONDS };
  await shot(page, 'desktop-playing-late.png');

  const info = await page.evaluate(() => window.__FLAPPY__.rendererInfo());
  results.metrics.renderer = info;
  check('renderer budget: draw calls', info.calls <= 120, `calls=${info.calls} tris=${info.triangles}`);
  check('renderer budget: fps', info.fps >= 45, `fps=${info.fps}`);

  await page.evaluate(() => {
    window.__FLAPPY__.setAutopilot(false);
    window.__FLAPPY__.forceDeath();
  });
  await waitState(page, 'gameover', 10000);
  await page.waitForTimeout(700);
  check('fail path: reaches gameover', true);
  const overText = await page.evaluate(() => document.querySelector('#over .panel').innerText);
  check('gameover panel shows score and best', /SCORE/.test(overText) && /BEST/.test(overText), overText.replace(/\n/g, ' | '));
  await shot(page, 'desktop-gameover.png');

  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  const restarted = await page.evaluate(() => window.__FLAPPY__.state);
  check('restart: returns to ready', restarted === 'ready', `state=${restarted}`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const replaying = await page.evaluate(() => window.__FLAPPY__.state);
  check('restart: plays again', replaying === 'playing', `state=${replaying}`);

  await page.evaluate(() => window.__FLAPPY__.setMuted(true));
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const mpage = await mobile.newPage();
  attachErrorListeners(mpage);
  await mpage.goto(URL, { waitUntil: 'load' });
  await waitForApi(mpage);
  await mpage.waitForTimeout(900);
  await shot(mpage, 'mobile-ready.png');

  await mpage.evaluate(() => {
    window.__FLAPPY__.setSeed(777);
    window.__FLAPPY__.setAutopilot(true);
    window.__FLAPPY__.start();
  });
  await mpage.waitForTimeout(4500);
  const mState = await mpage.evaluate(() => window.__FLAPPY__.state);
  const mScore = await mpage.evaluate(() => window.__FLAPPY__.score);
  check('mobile: touch context plays', mState === 'playing' && mScore >= 2, `state=${mState} score=${mScore}`);
  await shot(mpage, 'mobile-playing.png');

  const mInfo = await mpage.evaluate(() => window.__FLAPPY__.rendererInfo());
  results.metrics.mobileRenderer = mInfo;

  await mpage.evaluate(() => {
    window.__FLAPPY__.setAutopilot(false);
    window.__FLAPPY__.forceDeath();
  });
  await waitState(mpage, 'gameover', 10000);
  await mpage.waitForTimeout(700);
  await shot(mpage, 'mobile-gameover.png');

  const btn = mpage.locator('#restart');
  const box = await btn.boundingBox();
  check('mobile: restart button target >= 40px', !!box && box.width >= 40 && box.height >= 40, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'no box');
  await mobile.close();
} finally {
  await browser.close();
}

results.checks['no console errors'] = { ok: results.consoleErrors.length === 0, detail: results.consoleErrors.join(' ; ') };
results.checks['no page errors'] = { ok: results.pageErrors.length === 0, detail: results.pageErrors.join(' ; ') };
console.log(`${results.consoleErrors.length === 0 ? 'PASS' : 'FAIL'}  no console errors${results.consoleErrors.length ? ` (${results.consoleErrors.join(' ; ')})` : ''}`);
console.log(`${results.pageErrors.length === 0 ? 'PASS' : 'FAIL'}  no page errors${results.pageErrors.length ? ` (${results.pageErrors.join(' ; ')})` : ''}`);

await writeFile(path.resolve('qa/report.json'), JSON.stringify(results, null, 2));

const failed = Object.entries(results.checks).filter(([, v]) => !v.ok);
console.log(`\n${failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECKS FAILED`}`);
process.exit(failed.length === 0 ? 0 : 1);
