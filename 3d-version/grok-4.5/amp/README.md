# Aether Flap — 3D Flappy Bird

A neon cyber-sky Flappy Bird clone built with **Three.js** + TypeScript + Vite.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://127.0.0.1:5173`).

Production preview:

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
|--------|--------|
| **Space** / **Click** / **Tap** | Flap |
| **P** / **Esc** | Pause |
| **M** | Mute |

## Stack

- Three.js (WebGL renderer, shadows, ACES tone mapping, bloom)
- Procedural audio (Web Audio API — no asset downloads)
- Seeded RNG for pillar layouts
- Object pooling for pillars & particles
- Responsive HUD with safe-area insets

## Project layout

```
src/
  core/       input, RNG, shake, storage
  entities/   bird, pillars, world
  systems/    particles
  audio/      synth SFX + pad
  assets/     shared materials
  game/       config + main loop / state machine
  ui/         HUD overlays
```
