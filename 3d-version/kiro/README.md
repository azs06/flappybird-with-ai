# Flappy Three

A Flappy Bird clone rendered in 3D with [three.js](https://threejs.org/). No image, model
or audio assets — the bird, pipes, terrain textures and sound effects are all generated
at runtime.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` / `npm run preview` | Production build / serve it |
| `npm test` | Gameplay logic tests (`node --test`, no browser) |
| `npm run smoke` | Drives the real game in headless Chrome, 39 assertions + screenshots in `.tmp/shots` |

## Controls

- **Space / click / tap / ArrowUp / W** — flap
- **P** or **Esc** — pause, **M** — mute (both persisted)

## How it plays

Classic rules: one input, gravity does the rest, one point per pipe cleared, one mistake
ends the run. Best score is kept in `localStorage`.

Difficulty ramps continuously — scroll speed climbs from 4.4 to 8.2 world units/second
and the gap narrows from 3.3 to 2.45 — and the scene cross-fades through day → sunset →
night → dawn every 12 points, including light colour, fog, terrain tint and stars.

## How it is built

The bird never actually moves forward. It sits at a fixed `x` and the world scrolls past
it, which keeps it permanently inside the shadow frustum and makes the level infinite
without any bookkeeping. Everything is pooled — 9 pipe pairs, 56 particles, and fixed
decoration bands that wrap around — so a long run allocates nothing.

| File | Responsibility |
| --- | --- |
| `src/config.js` | Every tunable number and the four colour palettes |
| `src/game.js` | State machine (`ready → playing → dying → over`), fixed-step loop, camera |
| `src/bird.js` | Bird mesh, vertical physics, pitch and wing animation |
| `src/pipes.js` | Pipe pool, gap generation, scoring, collision |
| `src/world.js` | Sky shader, lights, ground, parallax bands, palette cross-fade |
| `src/particles.js` | Flap puffs and death feathers |
| `src/audio.js` | WebAudio synthesis for flap / score / hit / die |
| `src/ui.js` | DOM overlay (HUD, panels, medals) |

Simulation runs on a fixed 120 Hz accumulator with a clamped frame delta, so physics is
frame-rate independent and a backgrounded tab can't teleport the bird through a pipe.
Rendering, camera smoothing and parallax run at display rate.

Gap generation is constrained rather than purely random: each gap stays at least
1.2 units from the ceiling and the grass, and no more than 2.7 units from the previous
gap's centre, so every sequence is actually flyable. `npm test` asserts this over 400
generated gaps.

## Accessibility

Keyboard playable end to end, focus moves to *Play again* on game over, visible focus
rings, the score is an `aria-live` region, the mute button reports `aria-pressed`, and
panel animations respect `prefers-reduced-motion`.
