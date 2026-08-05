# Aether Flap — 3D Flappy Bird

A browser-based 3D Flappy Bird clone built with **Three.js + Vite + TypeScript**.

## Play

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Controls

| Input | Action |
|-------|--------|
| **Space** / **Click** / **Tap** | Flap |
| **Enter** / **R** | Restart from game over |
| **Play** button | Start from title |

## Goal

Guide the crest-bird through glowing gate rings between emerald towers. Each gate scores a point. Speed rises and gaps shrink as your score climbs. Hit a tower, the floor, or the ceiling and you crash.

## Stack

- Three.js WebGL renderer (ACES tone mapping, soft shadows, fog)
- Procedural mesh bird, pipes, ground kit, clouds, particles
- Procedural Web Audio SFX (no asset downloads)
- Mobile-friendly HUD + touch input
- Seeded RNG + `window.__AETHER_FLAP__` test hooks

## Scripts

```bash
npm run dev       # development server
npm run build     # typecheck + production bundle
npm run preview   # serve production build
```

## Test hooks

```js
window.__AETHER_FLAP__.start()
window.__AETHER_FLAP__.flap()
window.__AETHER_FLAP__.getScore()
window.__AETHER_FLAP__.getMode()
```
