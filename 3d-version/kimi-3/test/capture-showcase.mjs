// Showcase capture: high-speed gameplay + medal-earning game over.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARTIFACTS = path.join(ROOT, 'test', 'artifacts');
mkdirSync(ARTIFACTS, { recursive: true });
const BASE = 'http://127.0.0.1:5188';

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5188'], { cwd: ROOT, stdio: 'pipe' });
try {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
  await page.goto(`${BASE}/?seed=7&bot=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.mouse.click(720, 405);

  // Let the bot climb the difficulty curve (~35s → speed ~14.5, score ~17+).
  await page.waitForTimeout(33000);
  const mid = await page.evaluate(() => window.__game.info());
  console.log('mid-run:', JSON.stringify(mid));
  await page.screenshot({ path: path.join(ARTIFACTS, 'showcase-highspeed.png') });

  // Crash → medal-earning game over.
  await page.evaluate(() => window.__game.kill());
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(ARTIFACTS, 'showcase-gameover.png') });
  console.log('final:', await page.evaluate(() => JSON.stringify(window.__game.info())));
  await browser.close();
} finally {
  server.kill();
}
