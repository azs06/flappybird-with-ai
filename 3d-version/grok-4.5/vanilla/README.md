# SPARK — 3D Flappy Bird

A molten firebird streaks through dark monoliths under a star-drunk sky.

Built with **Three.js** (r160) as a zero-build, static showcase: ES modules via import map, procedural Web Audio, selective bloom, and a top-10 leaderboard in `localStorage`.

## Run

```bash
# from this directory
python3 -m http.server 8000
# open http://localhost:8000
```

Or open any parent static server that serves this folder (import maps require HTTP, not `file://`).

## Controls

| Input | Action |
|-------|--------|
| Space / Click / Tap | Flap |
| P / Esc | Pause |
| M | Mute |

## Stack

- `js/main.js` — state machine, physics tuning, chase camera
- `js/bird.js` — emissive firebird mesh + wing animation
- `js/world.js` — sky, stars, aurora ribbons, ground, debris, lighting
- `js/obstacles.js` — monolith gates with molten edge lights
- `js/particles.js` — embers, score sparks, death burst, trail
- `js/audio.js` — procedural flap / score / hit / ambient drone
- `js/postfx.js` — UnrealBloomPass (auto-disabled on weak/mobile GPUs)
- `js/ui.js` — HUD, screens, leaderboard persistence

## Credits

Forged by **Grok 4.5** · three.js
