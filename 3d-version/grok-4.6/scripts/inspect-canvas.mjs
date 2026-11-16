import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const url = process.argv[2] || "http://127.0.0.1:5188/?debug=1";
const outDir = resolve("qa/screens");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("CONSOLE", m.text());
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1800);

const metrics = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return { error: "no canvas" };
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const w = c.width;
  const h = c.height;
  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let r = 0, g = 0, b = 0, n = 0;
  const step = 16;
  const bins = new Map();
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      n++;
      const key = `${pixels[i] >> 5}-${pixels[i + 1] >> 5}-${pixels[i + 2] >> 5}`;
      bins.set(key, (bins.get(key) || 0) + 1);
    }
  }
  return {
    css: { w: c.clientWidth, h: c.clientHeight },
    buffer: { w, h },
    mean: { r: r / n, g: g / n, b: b / n },
    uniqueBins: bins.size,
    samples: n,
    hook: window.__AURELION ? window.__AURELION.snapshot() : null,
  };
});

await page.screenshot({ path: resolve(outDir, "desktop-title.png") });
await page.evaluate(() => window.__AURELION?.flap());
await page.waitForTimeout(700);
await page.screenshot({ path: resolve(outDir, "desktop-play.png") });

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await mobile.waitForTimeout(1600);
await mobile.screenshot({ path: resolve(outDir, "mobile-title.png") });
await mobile.evaluate(() => window.__AURELION?.flap());
await mobile.waitForTimeout(700);
await mobile.screenshot({ path: resolve(outDir, "mobile-play.png") });

writeFileSync(resolve(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
await browser.close();
