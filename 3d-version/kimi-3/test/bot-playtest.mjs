// Bot playtest: runs the autopilot across several seeds for up to N seconds,
// recording time-to-first-fail, score progression, and softlock evidence.
// Usage: node test/bot-playtest.mjs [--url http://127.0.0.1:5188] [--seconds 60]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARTIFACTS = path.join(ROOT, 'test', 'artifacts');
mkdirSync(ARTIFACTS, { recursive: true });

const argUrl = process.argv.find((a) => a.startsWith('--url='));
const argSecs = process.argv.find((a) => a.startsWith('--seconds='));
const BASE = argUrl ? argUrl.split('=')[1] : 'http://127.0.0.1:5188';
const MAX_SECONDS = argSecs ? parseInt(argSecs.split('=')[1], 10) : 60;
const SEEDS = [7, 42, 1999];

async function waitForServer(url, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

let server = null;
if (!argUrl) {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5188'], { cwd: ROOT, stdio: 'pipe' });
}

const runs = [];
try {
  if (!(await waitForServer(BASE))) throw new Error('preview server did not start');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const seed of SEEDS) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await page.goto(`${BASE}/?seed=${seed}&bot=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.mouse.click(640, 360); // start run

    const t0 = Date.now();
    let last = { state: 'playing', score: 0, speed: 0 };
    let diedAt = null;
    while ((Date.now() - t0) / 1000 < MAX_SECONDS) {
      await page.waitForTimeout(500);
      last = await page.evaluate(() => window.__game.info());
      if (last.state === 'gameover') { diedAt = (Date.now() - t0) / 1000; break; }
    }
    const aliveFor = diedAt ?? MAX_SECONDS;
    runs.push({
      seed,
      survived: diedAt === null,
      aliveSeconds: Math.round(aliveFor * 10) / 10,
      score: last.score,
      finalSpeed: last.speed,
      softlock: !diedAt && last.score === 0, // never scored and never died = stuck
    });
    console.log(`seed=${seed}  alive=${aliveFor.toFixed(1)}s  score=${last.score}  ${diedAt ? 'crashed' : 'survived'}`);
    await page.close();
  }
  await browser.close();
} finally {
  if (server) server.kill();
}

const scores = runs.map((r) => r.score);
const summary = {
  runs,
  minScore: Math.min(...scores),
  avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
  anySoftlock: runs.some((r) => r.softlock),
};
writeFileSync(path.join(ARTIFACTS, 'bot-playtest.json'), JSON.stringify(summary, null, 2));
console.log(`\nmin=${summary.minScore} avg=${summary.avgScore} softlock=${summary.anySoftlock}`);
process.exit(summary.minScore >= 3 && !summary.anySoftlock ? 0 : 1);
