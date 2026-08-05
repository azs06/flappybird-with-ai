import { chromium } from 'playwright-core';
const URL = process.env.QA_URL ?? 'http://localhost:5173/';
const CHROME = process.env.QA_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.__FLAPPY__ !== 'undefined');
await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const api = window.__FLAPPY__;
  api.setMuted(true);
  api.setAutopilot(true);
  const t0 = performance.now();
  const scoreTimes = [];
  let last = 0;
  const iv = setInterval(() => {
    if (api.score !== last) {
      for (let s = last + 1; s <= api.score; s++) scoreTimes.push(Math.round(performance.now() - t0));
      last = api.score;
    }
  }, 40);
  api.start();
  await new Promise((r) => setTimeout(r, 7000));
  clearInterval(iv);
  const dbg = api.debugState();
  return { scoreTimes, finalScore: api.score, dbg, fps: api.fps };
});
console.log('score hit times (ms):', out.scoreTimes.join(', '));
const gaps = out.scoreTimes.map((t, i) => (i ? t - out.scoreTimes[i - 1] : t));
console.log('intervals (ms):', gaps.join(', '));
console.log('final', JSON.stringify(out.dbg), 'fps', out.fps);
await browser.close();
