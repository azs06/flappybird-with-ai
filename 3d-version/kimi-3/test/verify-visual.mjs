// Visual verification harness: boots the production preview in real Chrome,
// exercises menu → gameplay (bot) → death → gameover, captures screenshots,
// samples canvas pixels for nonblank/varied output, collects console errors
// and renderer diagnostics, and verifies the bot can actually progress.
//
// Usage: node test/verify-visual.mjs [--url http://127.0.0.1:5188]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARTIFACTS = path.join(ROOT, 'test', 'artifacts');
mkdirSync(ARTIFACTS, { recursive: true });

const argUrl = process.argv.find((a) => a.startsWith('--url='));
const BASE = argUrl ? argUrl.split('=')[1] : 'http://127.0.0.1:5188';

const results = { checks: [], errors: [], artifacts: [], diagnostics: {} };
function check(name, ok, detail = '') {
  results.checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// Sample the WebGL canvas via a 2D probe canvas (preserveDrawingBuffer=true).
async function sampleCanvas(page) {
  return page.evaluate(() => {
    const gl = document.getElementById('gl');
    const probe = document.createElement('canvas');
    const w = 96, h = 54;
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext('2d');
    ctx.drawImage(gl, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let sum = [0, 0, 0];
    let sumSq = [0, 0, 0];
    const colors = new Set();
    const n = w * h;
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = data[i + c];
        sum[c] += v;
        sumSq[c] += v * v;
      }
      colors.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
    }
    const mean = sum.map((s) => s / n);
    const std = sumSq.map((s, c) => Math.sqrt(Math.max(0, s / n - mean[c] * mean[c])));
    return {
      mean: mean.map((m) => Math.round(m)),
      std: std.map((s) => Math.round(s * 10) / 10),
      distinctColors: colors.size,
      nonblank: mean.some((m) => m > 8) && std.some((s) => s > 4),
    };
  });
}

async function runViewport(browser, label, viewport, { mobile = false } = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: mobile,
    isMobile: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(`${BASE}/?seed=7&bot=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // --- menu state ---
  const menuVisible = await page.isVisible('#screen-menu');
  check(`${label}: menu visible on load`, menuVisible);
  const menuShot = path.join(ARTIFACTS, `${label}-1-menu.png`);
  await page.screenshot({ path: menuShot });
  results.artifacts.push(menuShot);

  // --- start run via primary input ---
  if (mobile) await page.tap('body'); else await page.mouse.click(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(400);
  const stateAfterTap = await page.evaluate(() => window.__game.state);
  check(`${label}: tap starts run`, stateAfterTap === 'playing', `state=${stateAfterTap}`);

  // --- bot gameplay for a while ---
  await page.waitForTimeout(9000);
  const info = await page.evaluate(() => window.__game.info());
  results.diagnostics[label] = info;
  check(`${label}: bot progressed (score>=3)`, info.score >= 3, `score=${info.score} state=${info.state}`);
  check(`${label}: hud score visible`, await page.isVisible('#score'));

  const playShot = path.join(ARTIFACTS, `${label}-2-gameplay.png`);
  await page.screenshot({ path: playShot });
  results.artifacts.push(playShot);

  const playPixels = await sampleCanvas(page);
  check(`${label}: gameplay canvas nonblank+varied`, playPixels.nonblank && playPixels.distinctColors > 40,
    `mean=${playPixels.mean} std=${playPixels.std} colors=${playPixels.distinctColors}`);

  // --- force death → game over ---
  await page.evaluate(() => window.__game.kill());
  await page.waitForTimeout(2400);
  const goVisible = await page.isVisible('#screen-gameover');
  check(`${label}: gameover panel after death`, goVisible);
  const goShot = path.join(ARTIFACTS, `${label}-3-gameover.png`);
  await page.screenshot({ path: goShot });
  results.artifacts.push(goShot);

  // --- restart via retry button ---
  await page.click('#retry-btn');
  await page.waitForTimeout(400);
  const stateAfterRetry = await page.evaluate(() => window.__game.state);
  check(`${label}: retry returns to menu`, stateAfterRetry === 'menu', `state=${stateAfterRetry}`);

  // --- UI overlap sanity: key elements within viewport ---
  const overflow = await page.evaluate(() => {
    const ids = ['#score', '#mute-btn'];
    const out = [];
    for (const sel of ids) {
      const el = document.querySelector(sel);
      if (!el || el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1) out.push(sel);
    }
    return out;
  });
  check(`${label}: HUD within viewport`, overflow.length === 0, overflow.join(',') || 'ok');

  check(`${label}: no console/page errors`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'ok');
  if (consoleErrors.length) results.errors.push({ label, consoleErrors });
  await context.close();
}

// ---------------------------------------------------------------------------

let server = null;
if (!argUrl) {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5188'], {
    cwd: ROOT, stdio: 'pipe',
  });
  server.stderr.on('data', (d) => process.stderr.write(d));
}

try {
  const up = await waitForServer(BASE);
  if (!up) throw new Error(`preview server did not start at ${BASE}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  await runViewport(browser, 'desktop', { width: 1440, height: 810 });
  await runViewport(browser, 'mobile', { width: 390, height: 844 }, { mobile: true });
  await browser.close();
} catch (err) {
  check('harness completed', false, String(err));
} finally {
  if (server) server.kill();
}

const failed = results.checks.filter((c) => !c.ok);
writeFileSync(path.join(ARTIFACTS, 'results.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed. Artifacts → test/artifacts/`);
process.exit(failed.length ? 1 : 0);
