import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5188/?debug=1";
const seconds = Number(process.argv[3] || 35);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => window.__AURELION, null, { timeout: 20000 });
await page.evaluate(() => {
  window.__AURELION.setSeed(0xA7E110);
  window.__AURELION.setMuted(true);
});
await page.waitForTimeout(400);
await page.evaluate(() => window.__AURELION.flap());

const t0 = Date.now();
let deaths = 0;
let lastPhase = "playing";
let maxScore = 0;
let firstFail = null;

while ((Date.now() - t0) / 1000 < seconds) {
  const snap = await page.evaluate(() => {
    const g = window.__AURELION;
    return g.snapshot();
  });
  maxScore = Math.max(maxScore, snap.score);
  if (snap.phase === "dead" && lastPhase !== "dead") {
    deaths += 1;
    if (firstFail == null) firstFail = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__AURELION.flap());
  } else if (snap.phase === "playing" || snap.phase === "title") {
    // heuristic: flap if falling below a gentle hover
    if (snap.y < 0.55 || snap.vy < -4.5) {
      await page.evaluate(() => window.__AURELION.flap());
    }
  }
  lastPhase = snap.phase;
  await page.waitForTimeout(70);
}

const result = {
  seconds,
  deaths,
  maxScore,
  firstFailSec: firstFail,
  softlock: lastPhase === "dying" || lastPhase === "boot",
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.softlock ? 2 : 0);
