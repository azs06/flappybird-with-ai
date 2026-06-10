#!/usr/bin/env node
/**
 * Generates the root index.html — a "level select" gallery of every
 * Flappy Bird implementation in this repo, grouped by model.
 *
 * Discovery rules:
 *  - Walks each top-level model directory (max depth 3) looking for
 *    playable entries: a directory containing index.html, or a
 *    standalone *.html file.
 *  - `archive/` is rendered in its own dimmed section.
 *  - `3d-version/` hosts its own sub-site (see 3d-version/build.sh) and
 *    is linked as a unit plus its individual games.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const EXCLUDED_TOP = new Set([
  "node_modules",
  "dist",
  "archive",
  "3d-version",
  "logs",
]);
const EXCLUDED_NESTED = new Set(["node_modules", "dist", "assets", "src", "styles", "scripts", "sounds", "images", "js", "css"]);
const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"];
const MAX_DEPTH = 3;

const MODEL_META = {
  "claude-sonnet-4": { name: "Claude Sonnet 4", vendor: "anthropic", blurb: "Claude Code and GitHub Copilot runs of Sonnet 4." },
  "claude-sonnet-4.6": { name: "Claude Sonnet 4.6", vendor: "anthropic", blurb: "One build per effort level, low through max, via Claude Code." },
  "cursor-auto": { name: "Cursor Auto", vendor: "cursor", blurb: "Cursor's automatic model routing." },
  deepseek: { name: "DeepSeek R1", vendor: "deepseek", blurb: "DeepSeek's reasoning model." },
  "gemini-2.5-pro": { name: "Gemini 2.5 Pro", vendor: "google", blurb: "Gemini CLI, Code Assistant and Copilot harnesses." },
  "gemini-3.5-flash": { name: "Gemini 3.5 Flash", vendor: "google", blurb: "Antigravity CLI runs across effort levels." },
  "gpt-4o": { name: "GPT-4o", vendor: "openai", blurb: "The 2024-era baseline, via GitHub Copilot." },
  "gpt-5-mini": { name: "GPT-5 Mini", vendor: "openai", blurb: "Small-tier GPT-5." },
  "gpt-5.3-codex-spark": { name: "GPT-5.3 Codex Spark", vendor: "openai", blurb: "Codex Spark via the Pi harness." },
  "gpt-5.5": { name: "GPT-5.5", vendor: "openai", blurb: "Codex app vs Pi harness, low through xhigh effort." },
  "gpt-5.5-pro": { name: "GPT-5.5 Pro", vendor: "openai", blurb: "Pro-tier single build." },
  grok: { name: "Grok 3", vendor: "xai", blurb: "Grok web single-file build." },
  "grok-code-fast": { name: "Grok Code Fast", vendor: "xai", blurb: "Fast coding model via GitHub Copilot." },
  "kat-coder-pro-v1": { name: "KAT Coder Pro V1", vendor: "kwaipilot", blurb: "Kwaipilot's coding model, single-file build." },
};

const ARCHIVE_META = {
  "flappybird-augment": "Augment — most polished of the 2025 batch",
  "flappybird-cline": "Cline with xAI — spec-driven build",
  "flappybird-roocode": "RooCode with DeepSeek R1",
  "flappybird-windsurf": "Windsurf SE-1",
};

/* ---------------------------------------------------------------- scan */

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// Recursively collect playable entries inside a model directory.
// Returns [{ href, segments: ["codex","high"] }]
function findEntries(absDir, relDir, depth) {
  const entries = [];
  const items = listDir(absDir);

  if (items.some((i) => i.isFile() && i.name === "index.html")) {
    entries.push({ href: `${relDir}/`, segments: [] });
    return entries; // a playable leaf; don't descend further
  }

  for (const item of items) {
    if (item.name.startsWith(".")) continue;
    if (item.isFile() && item.name.endsWith(".html")) {
      entries.push({
        href: `${relDir}/${item.name}`,
        segments: [item.name.replace(/\.html$/, "")],
      });
    } else if (item.isDirectory() && depth < MAX_DEPTH && !EXCLUDED_NESTED.has(item.name)) {
      for (const child of findEntries(path.join(absDir, item.name), `${relDir}/${item.name}`, depth + 1)) {
        entries.push({ href: child.href, segments: [item.name, ...child.segments] });
      }
    }
  }
  return entries;
}

function effortRank(segment) {
  const i = EFFORT_ORDER.indexOf(segment);
  return i === -1 ? null : i;
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    const len = Math.max(a.segments.length, b.segments.length);
    for (let i = 0; i < len; i++) {
      const sa = a.segments[i] ?? "";
      const sb = b.segments[i] ?? "";
      if (sa === sb) continue;
      const ra = effortRank(sa);
      const rb = effortRank(sb);
      if (ra !== null && rb !== null) return ra - rb;
      return sa.localeCompare(sb);
    }
    return 0;
  });
}

function prettyLabel(segments) {
  if (segments.length === 0) return "play";
  return segments
    .map((s) => s.replace(/^flappybird-/, "").replace(/-/g, " "))
    .join(" · ");
}

function scanModels() {
  const models = [];
  for (const item of listDir(ROOT)) {
    if (!item.isDirectory() || item.name.startsWith(".") || EXCLUDED_TOP.has(item.name)) continue;
    const entries = sortEntries(findEntries(path.join(ROOT, item.name), item.name, 0));
    if (entries.length === 0) continue;
    const meta = MODEL_META[item.name] || {};
    models.push({
      dir: item.name,
      name: meta.name || item.name.replace(/-/g, " "),
      vendor: meta.vendor || "other",
      blurb: meta.blurb || "AI-generated Flappy Bird build.",
      entries,
    });
  }
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

function scanArchive() {
  const archiveDir = path.join(ROOT, "archive");
  const out = [];
  for (const item of listDir(archiveDir)) {
    if (!item.isDirectory()) continue;
    if (fs.existsSync(path.join(archiveDir, item.name, "index.html"))) {
      out.push({
        href: `archive/${item.name}/`,
        name: item.name.replace(/^flappybird-/, "").replace(/-/g, " "),
        blurb: ARCHIVE_META[item.name] || "Pre-reorganization build (tool known, model unrecorded).",
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function scan3d() {
  const dir = path.join(ROOT, "3d-version");
  if (!fs.existsSync(path.join(dir, "index.html"))) return null;
  const games = [];
  const known = {
    "claude-fable-5": { name: "PAPERWING", by: "Claude Fable 5" },
    "gemini-3.5-flash-high": { name: "Cyber Flight", by: "Gemini 3.5 Flash" },
    "gpt-5.5-xhigh": { name: "Flappy Voxel", by: "GPT-5.5 xhigh" },
  };
  for (const item of listDir(dir)) {
    if (!item.isDirectory() || !known[item.name]) continue;
    games.push({ href: `3d-version/${item.name}/`, ...known[item.name] });
  }
  return { href: "3d-version/", games };
}

/* ------------------------------------------------------------- render */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function chip(entry) {
  const label = prettyLabel(entry.segments);
  const last = entry.segments[entry.segments.length - 1];
  const effort = effortRank(last) !== null ? ` data-effort="${last}"` : "";
  return `<a class="chip" href="${esc(entry.href)}"${effort}>${esc(label)}</a>`;
}

function modelCard(model) {
  return `
      <article class="card" data-vendor="${esc(model.vendor)}">
        <header class="card-head">
          <h3>${esc(model.name)}</h3>
          <span class="vendor">${esc(model.vendor)}</span>
        </header>
        <p class="blurb">${esc(model.blurb)}</p>
        <div class="chips">
          ${model.entries.map(chip).join("\n          ")}
        </div>
      </article>`;
}

function render({ models, archive, three }) {
  const buildCount = models.reduce((n, m) => n + m.entries.length, 0);
  const threeCount = three ? three.games.length : 0;

  return `<!DOCTYPE html>
<!-- Generated by generate-index.js — do not edit by hand. Run: npm run generate -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Flappy Bird × AI — every model, one prompt</title>
<meta name="description" content="${buildCount + threeCount} Flappy Bird clones built by different AI models from the same prompt. Pick a cabinet and play.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 17 12'%3E%3Cg shape-rendering='crispEdges'%3E%3Crect x='3' y='2' width='8' height='2' fill='%23ffd64f'/%3E%3Crect x='2' y='4' width='10' height='4' fill='%23ffd64f'/%3E%3Crect x='10' y='2' width='3' height='3' fill='%23ffffff'/%3E%3Crect x='12' y='3' width='1' height='1' fill='%230a1a2c'/%3E%3Crect x='11' y='6' width='5' height='2' fill='%23ff8f3f'/%3E%3Crect x='3' y='8' width='8' height='2' fill='%23e0b33a'/%3E%3Crect x='1' y='5' width='5' height='3' fill='%23ffe9a3'/%3E%3C/g%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --night-0: #050d16;
    --night-1: #0a1a2c;
    --night-2: #122a42;
    --pipe: #5ec639;
    --pipe-dark: #3e8f24;
    --bird: #ffd64f;
    --beak: #ff8f3f;
    --cream: #f4ead8;
    --dim: #8aa3b8;
    --line: #1f3a55;
    --card: #0d2136;
    --anthropic: #e8855d;
    --openai: #6fd6c3;
    --google: #7aa7ff;
    --xai: #d9dee4;
    --cursor: #c5a3ff;
    --deepseek: #5e8bff;
    --kwaipilot: #ff7ab8;
    --other: #8aa3b8;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: "IBM Plex Mono", monospace;
    color: var(--cream);
    background:
      radial-gradient(1px 1px at 12% 18%, #ffffffcc 50%, transparent 51%),
      radial-gradient(1px 1px at 38% 9%, #ffffff88 50%, transparent 51%),
      radial-gradient(2px 2px at 61% 22%, #ffffff66 50%, transparent 51%),
      radial-gradient(1px 1px at 83% 12%, #ffffffaa 50%, transparent 51%),
      radial-gradient(1px 1px at 71% 38%, #ffffff55 50%, transparent 51%),
      radial-gradient(1px 1px at 25% 33%, #ffffff77 50%, transparent 51%),
      linear-gradient(180deg, var(--night-0) 0%, var(--night-1) 45%, var(--night-2) 100%);
    background-attachment: fixed;
    min-height: 100vh;
  }
  body::after { /* scanlines */
    content: "";
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.12) 3px 4px);
    pointer-events: none; z-index: 50;
  }
  a { color: inherit; }

  /* ---------------- hero ---------------- */
  .hero {
    position: relative;
    overflow: hidden;
    padding: 88px 24px 130px;
    text-align: center;
    border-bottom: 4px solid var(--pipe-dark);
  }
  .hero h1 {
    font-family: "Silkscreen", monospace;
    font-size: clamp(2rem, 7vw, 4.5rem);
    line-height: 1.05;
    color: var(--bird);
    text-shadow: 3px 3px 0 #b8860b, 6px 6px 0 #00000055;
    animation: rise .7s cubic-bezier(.2,.9,.3,1.2) both;
  }
  .hero h1 .x-ai {
    color: var(--pipe);
    text-shadow: 3px 3px 0 var(--pipe-dark), 6px 6px 0 #00000055;
  }
  .tagline {
    margin: 22px auto 0;
    max-width: 560px;
    color: var(--dim);
    font-size: .95rem;
    animation: rise .7s .15s cubic-bezier(.2,.9,.3,1.2) both;
  }
  .tagline strong { color: var(--cream); }
  .stats {
    display: inline-flex; flex-wrap: wrap; justify-content: center;
    gap: 10px; margin-top: 28px;
    animation: rise .7s .3s cubic-bezier(.2,.9,.3,1.2) both;
  }
  .stat {
    font-family: "Silkscreen", monospace;
    font-size: .7rem;
    padding: 8px 14px;
    border: 2px solid var(--line);
    background: #0a1a2cdd;
    box-shadow: 3px 3px 0 #00000066;
  }
  .stat b { color: var(--bird); font-size: .9rem; margin-right: 6px; }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

  /* pixel bird */
  .bird {
    position: absolute; left: 50%; top: 30px;
    width: 68px; height: 48px; margin-left: -34px;
    image-rendering: pixelated;
    animation: hover-bob 1.6s ease-in-out infinite;
    z-index: 2;
  }
  @keyframes hover-bob { 0%,100% { transform: translateY(0) rotate(-4deg);} 50% { transform: translateY(-12px) rotate(5deg);} }
  .bird .wing { animation: flap .45s steps(2) infinite; transform-origin: 30% 60%; }
  @keyframes flap { 0% { transform: scaleY(1);} 100% { transform: scaleY(-.6) translateY(-8px);} }

  /* decorative pipes */
  .pipe-deco {
    position: absolute; bottom: 0; width: 92px;
    background: linear-gradient(90deg, var(--pipe-dark) 0 8%, var(--pipe) 8% 55%, #8fe65f 55% 70%, var(--pipe) 70% 92%, var(--pipe-dark) 92%);
    border: 3px solid #143a06;
    border-bottom: none;
  }
  .pipe-deco::before {
    content: ""; position: absolute; top: -34px; left: -12px; right: -12px; height: 34px;
    background: linear-gradient(90deg, var(--pipe-dark) 0 8%, var(--pipe) 8% 55%, #8fe65f 55% 70%, var(--pipe) 70% 92%, var(--pipe-dark) 92%);
    border: 3px solid #143a06;
  }
  .pipe-l { left: 6%; height: 130px; } .pipe-l2 { left: 16%; height: 64px; }
  .pipe-r { right: 7%; height: 150px; } .pipe-r2 { right: 17%; height: 80px; }
  @media (max-width: 720px) { .pipe-l2, .pipe-r2 { display: none; } .pipe-l { left: 2%; } .pipe-r { right: 2%; } }

  /* scrolling ground */
  .ground {
    position: absolute; left: 0; right: 0; bottom: 0; height: 26px;
    background:
      repeating-linear-gradient(-45deg, #9be05f 0 14px, #79c93e 14px 28px);
    border-top: 4px solid #143a06;
    animation: scroll-ground 1.4s linear infinite;
    background-size: 40px 26px;
  }
  @keyframes scroll-ground { from { background-position-x: 0; } to { background-position-x: -40px; } }

  /* ---------------- sections ---------------- */
  main { max-width: 1100px; margin: 0 auto; padding: 30px 24px 80px; }
  section { margin-top: 64px; }
  .sec-head {
    display: flex; align-items: baseline; gap: 16px; margin-bottom: 26px;
  }
  .sec-head h2 {
    font-family: "Silkscreen", monospace;
    font-size: clamp(1rem, 2.6vw, 1.4rem);
    color: var(--cream);
    text-shadow: 2px 2px 0 #00000088;
    white-space: nowrap;
  }
  .sec-head .rule { flex: 1; height: 4px; background: repeating-linear-gradient(90deg, var(--line) 0 14px, transparent 14px 22px); }
  .sec-head .count { font-family: "Silkscreen", monospace; font-size: .7rem; color: var(--dim); }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .card {
    background: var(--card);
    border: 2px solid var(--line);
    box-shadow: 5px 5px 0 #00000059;
    padding: 20px;
    display: flex; flex-direction: column; gap: 12px;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    position: relative;
  }
  .card:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 #00000073; }
  .card::before { /* vendor accent bar */
    content: ""; position: absolute; left: -2px; top: -2px; bottom: -2px; width: 6px;
    background: var(--accent, var(--other));
  }
  .card[data-vendor="anthropic"] { --accent: var(--anthropic); }
  .card[data-vendor="openai"]    { --accent: var(--openai); }
  .card[data-vendor="google"]    { --accent: var(--google); }
  .card[data-vendor="xai"]       { --accent: var(--xai); }
  .card[data-vendor="cursor"]    { --accent: var(--cursor); }
  .card[data-vendor="deepseek"]  { --accent: var(--deepseek); }
  .card[data-vendor="kwaipilot"] { --accent: var(--kwaipilot); }
  .card:hover { border-color: var(--accent, var(--line)); }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .card-head h3 { font-family: "Silkscreen", monospace; font-size: .85rem; letter-spacing: .02em; }
  .vendor {
    font-size: .62rem; text-transform: uppercase; letter-spacing: .12em;
    color: var(--accent, var(--dim));
  }
  .blurb { font-size: .8rem; color: var(--dim); line-height: 1.5; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
  .chip {
    font-family: "Silkscreen", monospace;
    font-size: .62rem;
    text-decoration: none;
    padding: 7px 11px 6px;
    background: #0a1a2c;
    border: 2px solid var(--line);
    box-shadow: 0 3px 0 #000000aa;
    transition: transform .08s ease, box-shadow .08s ease, background .12s, color .12s;
  }
  .chip:hover { background: var(--accent, var(--pipe)); color: #06131f; border-color: transparent; }
  .chip:active { transform: translateY(3px); box-shadow: 0 0 0 #000; }
  .chip[data-effort]::before {
    content: ""; display: inline-block; width: 8px; height: 8px; margin-right: 7px;
    background: var(--lvl, var(--dim));
  }
  .chip[data-effort="low"]    { --lvl: #6fd6c3; }
  .chip[data-effort="medium"] { --lvl: #7aa7ff; }
  .chip[data-effort="high"]   { --lvl: #ffd64f; }
  .chip[data-effort="xhigh"]  { --lvl: #ff8f3f; }
  .chip[data-effort="max"]    { --lvl: #ff5d5d; }

  /* 3D arcade banner */
  .arcade {
    border: 2px solid var(--line);
    background:
      linear-gradient(120deg, #0d2136 0%, #112b46 50%, #16213e 100%);
    box-shadow: 5px 5px 0 #00000059;
    padding: 26px 24px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 18px;
  }
  .arcade .cube {
    font-family: "Silkscreen", monospace; font-size: 1.6rem; color: var(--bird);
    animation: spin-y 4s linear infinite; display: inline-block;
  }
  @keyframes spin-y { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .arcade-info { flex: 1 1 320px; }
  .arcade-info h3 { font-family: "Silkscreen", monospace; font-size: .95rem; margin-bottom: 6px; }
  .arcade-info p { font-size: .8rem; color: var(--dim); }
  .arcade .chips { margin: 0; }
  .chip.gold { border-color: #b8860b; color: var(--bird); }
  .chip.gold:hover { background: var(--bird); color: #06131f; }

  /* archive */
  .archive .card { opacity: .68; }
  .archive .card:hover { opacity: 1; }

  footer {
    border-top: 4px solid var(--pipe-dark);
    margin-top: 80px;
    padding: 30px 24px 110px;
    text-align: center;
    font-size: .75rem; color: var(--dim);
    position: relative;
  }
  footer a { color: var(--pipe); }
  footer .ground { height: 22px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>

<header class="hero">
  <svg class="bird" viewBox="0 0 17 12" aria-hidden="true">
    <!-- pixel bird, 1 unit = 1 px cell -->
    <g shape-rendering="crispEdges">
      <rect x="3" y="2" width="8" height="2" fill="#ffd64f"/>
      <rect x="2" y="4" width="10" height="4" fill="#ffd64f"/>
      <rect x="10" y="2" width="3" height="3" fill="#ffffff"/>
      <rect x="12" y="3" width="1" height="1" fill="#0a1a2c"/>
      <rect x="11" y="6" width="5" height="2" fill="#ff8f3f"/>
      <rect x="3" y="8" width="8" height="2" fill="#e0b33a"/>
      <rect class="wing" x="1" y="5" width="5" height="3" fill="#ffe9a3"/>
    </g>
  </svg>
  <div class="pipe-deco pipe-l"></div>
  <div class="pipe-deco pipe-l2"></div>
  <div class="pipe-deco pipe-r"></div>
  <div class="pipe-deco pipe-r2"></div>

  <h1>FLAPPY BIRD<br><span class="x-ai">X AI</span></h1>
  <p class="tagline">One prompt. Every model. <strong>${buildCount + threeCount} playable builds</strong> comparing what AI coding tools produce from the <a href="https://github.com/azs06/flappybird-with-ai">same spec</a>.</p>
  <div class="stats">
    <span class="stat"><b>${models.length}</b>MODELS</span>
    <span class="stat"><b>${buildCount}</b>2D BUILDS</span>
    <span class="stat"><b>${threeCount}</b>3D BUILDS</span>
    <span class="stat"><b>${archive.length}</b>ARCHIVED</span>
  </div>
  <div class="ground"></div>
</header>

<main>
${
  three
    ? `  <section aria-label="3D arcade">
    <div class="arcade">
      <span class="cube">◆</span>
      <div class="arcade-info">
        <h3>3D ARCADE</h3>
        <p>Three models asked to go full 3D — Three.js cranes, voxels and neon tunnels. Hosted as its own mini-site.</p>
      </div>
      <div class="chips">
        <a class="chip gold" href="${esc(three.href)}">enter arcade</a>
        ${three.games.map((g) => `<a class="chip" href="${esc(g.href)}">${esc(g.name.toLowerCase())} · ${esc(g.by.toLowerCase())}</a>`).join("\n        ")}
      </div>
    </div>
  </section>
`
    : ""
}
  <section aria-label="Model roster">
    <div class="sec-head">
      <h2>MODEL ROSTER</h2>
      <div class="rule"></div>
      <span class="count">${buildCount} BUILDS</span>
    </div>
    <div class="grid">
${models.map(modelCard).join("\n")}
    </div>
  </section>

${
  archive.length > 0
    ? `  <section class="archive" aria-label="Archive">
    <div class="sec-head">
      <h2>ARCHIVE</h2>
      <div class="rule"></div>
      <span class="count">RETIRED CABINETS</span>
    </div>
    <div class="grid">
${archive
  .map(
    (a) => `      <article class="card">
        <header class="card-head"><h3>${esc(a.name)}</h3><span class="vendor">2025</span></header>
        <p class="blurb">${esc(a.blurb)}</p>
        <div class="chips"><a class="chip" href="${esc(a.href)}">play</a></div>
      </article>`,
  )
  .join("\n")}
    </div>
  </section>
`
    : ""
}</main>

<footer>
  <p>An experiment in AI code generation — <a href="https://github.com/azs06/flappybird-with-ai">github.com/azs06/flappybird-with-ai</a></p>
  <div class="ground"></div>
</footer>

</body>
</html>
`;
}

/* --------------------------------------------------------------- main */

const models = scanModels();
const archive = scanArchive();
const three = scan3d();

fs.writeFileSync(path.join(ROOT, "index.html"), render({ models, archive, three }));

const buildCount = models.reduce((n, m) => n + m.entries.length, 0);
console.log(`✅ index.html generated`);
console.log(`   ${models.length} models, ${buildCount} 2D builds, ${three ? three.games.length : 0} 3D games, ${archive.length} archived`);
for (const m of models) {
  console.log(`   - ${m.dir}: ${m.entries.map((e) => prettyLabel(e.segments)).join(", ")}`);
}
