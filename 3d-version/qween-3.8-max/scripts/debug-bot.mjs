import { chromium } from 'playwright-core';

const URL = process.env.QA_URL ?? 'http://localhost:5173/';
const CHROME = process.env.QA_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SECONDS = Number(process.env.QA_BOT_SECONDS ?? 60);
const SEED = Number(process.env.QA_SEED ?? 1);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.__FLAPPY__ !== 'undefined');
await page.waitForTimeout(800);

const result = await page.evaluate(async ({ secs, seed }) => {
  const api = window.__FLAPPY__;
  api.setMuted(true);
  api.setSeed(seed);
  api.restart();
  api.setAutopilot(true);
  let minMargin = Infinity;
  let worstT = 0;
  const t0 = performance.now();
  const iv = setInterval(() => {
    const s = api.debugState();
    if (s.nextGapCenter !== null && s.nextGapSize !== null && api.state === 'playing') {
      const margin = s.nextGapSize / 2 - 0.42 - Math.abs(s.y - s.nextGapCenter);
      if (margin < minMargin) {
        minMargin = margin;
        worstT = Math.round(performance.now() - t0);
      }
    }
  }, 120);
  api.start();
  await new Promise((r) => setTimeout(r, secs * 1000));
  clearInterval(iv);
  return { state: api.state, score: api.score, minMargin: Number(minMargin.toFixed(3)), worstT, fps: api.fps };
}, { secs: SECONDS, seed: SEED });

console.log(JSON.stringify({ seconds: SECONDS, seed: SEED, ...result }));
await browser.close();
