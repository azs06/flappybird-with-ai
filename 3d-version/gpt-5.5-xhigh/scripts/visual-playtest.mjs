import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const TARGET_URL = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const ARTIFACT_DIR = process.env.PLAYTEST_ARTIFACT_DIR ?? "/private/tmp/flappy-bird-3d-playtest";

function analyzePng(buffer) {
  const png = PNG.sync.read(buffer);
  const colors = new Set();
  let saturated = 0;
  let bright = 0;
  let dark = 0;
  const stepX = Math.max(1, Math.floor(png.width / 80));
  const stepY = Math.max(1, Math.floor(png.height / 80));

  for (let y = 0; y < png.height; y += stepY) {
    for (let x = 0; x < png.width; x += stepX) {
      const idx = (png.width * y + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const average = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);

      if (spread > 50) {
        saturated += 1;
      }

      if (average > 210) {
        bright += 1;
      }

      if (average < 70) {
        dark += 1;
      }

      colors.add(`${r >> 3},${g >> 3},${b >> 3}`);
    }
  }

  return {
    width: png.width,
    height: png.height,
    uniqueBuckets: colors.size,
    saturated,
    bright,
    dark
  };
}

function rectsOverlap(a, b) {
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}

async function inspectDom(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const hud = document.querySelector(".hud");
    const chips = Array.from(document.querySelectorAll(".score-chip"));
    const score = document.querySelector("#score");
    const best = document.querySelector("#best");
    const button = document.querySelector("#action-button");
    const banner = document.querySelector("#state-banner");
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom
      };
    };

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      },
      canvas: canvas
        ? {
            rect: rect(canvas),
            width: canvas.width,
            height: canvas.height
          }
        : null,
      hud: hud ? rect(hud) : null,
      chips: chips.map(rect),
      scoreText: score?.textContent ?? null,
      bestText: best?.textContent ?? null,
      button: button
        ? {
            rect: rect(button),
            hidden: button.classList.contains("hidden"),
            label: button.getAttribute("aria-label")
          }
        : null,
      banner: banner
        ? {
            rect: rect(banner),
            hidden: banner.classList.contains("hidden"),
            text: banner.textContent
          }
        : null
    };
  });
}

async function capture(page, label, phase) {
  const screenshot = await page.screenshot({ fullPage: false });
  const file = join(ARTIFACT_DIR, `${label}-${phase}.png`);
  await writeFile(file, screenshot);
  return {
    file,
    pixels: analyzePng(screenshot)
  };
}

function assertBoot(label, dom, captureResult, failures) {
  if (dom.canvas === null) {
    failures.push(`${label}: canvas was not mounted`);
    return;
  }

  if (dom.canvas.rect.width !== dom.viewport.width || dom.canvas.rect.height !== dom.viewport.height) {
    failures.push(`${label}: canvas does not fill the viewport`);
  }

  if (dom.viewport.scrollWidth > dom.viewport.width + 1) {
    failures.push(`${label}: document has horizontal overflow`);
  }

  if (dom.button?.hidden !== false || dom.button.label !== "Start game") {
    failures.push(`${label}: start button is not visible with the expected label`);
  }

  if (dom.banner?.text !== "Ready" || dom.banner.hidden !== false) {
    failures.push(`${label}: ready banner is not visible`);
  }

  if (dom.scoreText !== "0" || dom.bestText === null) {
    failures.push(`${label}: score HUD did not initialize`);
  }

  if (dom.chips.length === 2 && rectsOverlap(dom.chips[0], dom.chips[1])) {
    failures.push(`${label}: score chips overlap`);
  }

  if (captureResult.pixels.uniqueBuckets < 40 || captureResult.pixels.saturated < 600) {
    failures.push(`${label}: screenshot pixel check looks blank or under-rendered`);
  }
}

function assertPlaying(label, dom, captureResult, failures) {
  if (dom.button?.hidden !== true) {
    failures.push(`${label}: action button did not hide during play`);
  }

  if (dom.banner?.hidden !== true) {
    failures.push(`${label}: state banner did not hide during play`);
  }

  if (captureResult.pixels.uniqueBuckets < 40 || captureResult.pixels.saturated < 600) {
    failures.push(`${label}: active-play screenshot pixel check looks blank or under-rendered`);
  }
}

async function inspectPage(browser, label, options, failures, browserErrors) {
  const page = await browser.newPage(options);
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`${label} pageerror: ${error.message}`);
  });

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas");
  await page.waitForTimeout(900);

  const bootDom = await inspectDom(page);
  const bootCapture = await capture(page, label, "ready");
  assertBoot(label, bootDom, bootCapture, failures);

  await page.keyboard.press("Space");
  await page.waitForTimeout(360);

  const playDom = await inspectDom(page);
  const playCapture = await capture(page, label, "playing");
  assertPlaying(label, playDom, playCapture, failures);
  await page.close();

  return {
    label,
    ready: {
      dom: bootDom,
      pixels: bootCapture.pixels,
      screenshot: bootCapture.file
    },
    playing: {
      dom: playDom,
      pixels: playCapture.pixels,
      screenshot: playCapture.file
    }
  };
}

await mkdir(ARTIFACT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];
const browserErrors = [];
const results = [];

try {
  results.push(
    await inspectPage(
      browser,
      "desktop",
      { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
      failures,
      browserErrors
    )
  );
  results.push(
    await inspectPage(
      browser,
      "mobile",
      {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      },
      failures,
      browserErrors
    )
  );
} finally {
  await browser.close();
}

const summary = {
  targetUrl: TARGET_URL,
  artifactDir: ARTIFACT_DIR,
  failures,
  browserErrors,
  results
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0 || browserErrors.length > 0) {
  process.exitCode = 1;
}
