# PAPERWING — a 3D Flappy Bird, folded from paper

A Flappy Bird clone reimagined in 3D as an **origami papercraft world**: you fly a
folded paper crane through gates of stacked washi-paper towers, past flat-shaded
ridge mountains, drifting paper clouds, and a big red paper sun.

Built by **Claude (Fable 5)** as a creative-freedom experiment.

## Run it

No build step. Either open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

(Requires internet access for the Three.js CDN and Google Fonts.)

## Deploy to Cloudflare

The parent directory (`claude-fable-5/`) is configured as a Cloudflare
**Workers static-assets** app (`wrangler.jsonc` points `assets.directory`
at this folder). From `claude-fable-5/`:

```bash
npm install          # installs wrangler
npm run dev          # local preview at http://localhost:8787
npm run deploy       # deploy as a Worker  → https://paperwing.<your-subdomain>.workers.dev
npm run deploy:pages # or deploy to Cloudflare Pages instead
```

The first deploy will prompt you to log in (`wrangler login`). Caching and
security headers live in `_headers`, which both Workers and Pages honor.

> **Note:** if `npm install` fails while compiling `sharp` (a transitive
> wrangler dependency) and you have libvips installed via Homebrew, run
> `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install` to use the prebuilt binary.

## Controls

| Input | Action |
|---|---|
| `Space` / `↑` / click / tap | Flap |
| `P` / `Esc` | Pause / resume |
| `M` | Mute / unmute |

## Features

- **True 3D presentation, classic 2D feel** — the simulation is the original
  1-axis Flappy physics (gravity + impulse); the world streams toward a soft
  chase camera on the Z axis, so the famous tight game feel survives the move to 3D.
- **Procedural everything** — no image, model, or audio files. The crane is
  low-poly primitives on wing pivots; towers, mountains, clouds, and trees are
  generated geometry; every sound is synthesized live with the Web Audio API
  (paper-rustle flaps, koto-pluck scoring, an ambient pentatonic drift).
- **Difficulty curve** — gaps narrow and wander wider, and the world speeds up,
  as your score climbs.
- **Pause/resume**, auto-pause on tab switch.
- **Top-ten leaderboard** with initials, persisted in `localStorage`, plus best
  score tracking.
- **Object pooling throughout** (tower segments, trees, clouds, paper-scrap
  particles) — steady-state play allocates nothing, keeping 60fps stable.

## Files

```
index.html        markup: canvas + HUD + paper-card screens
style.css         papercraft UI (washi cream, sumi ink, hanko red)
js/main.js        state machine, physics tuning, camera rig, input, loop
js/world.js       sky gradient, sun, ridges, ground, clouds, trees
js/bird.js        the origami crane (pivot-driven wing flaps)
js/obstacles.js   pooled paper-tower gates, collision, difficulty curve
js/particles.js   pooled paper-scrap particles (flap puffs, crash burst)
js/audio.js       Web Audio synthesis for all sfx + ambient plucks
js/ui.js          HUD, screens, persistent top-ten leaderboard
```

## Tuning

Game feel lives in one block at the top of `js/main.js` (`TUNING`) and the
difficulty curve in `ObstacleField.gapFor()` — both are deliberately small and
commented for experimentation.
