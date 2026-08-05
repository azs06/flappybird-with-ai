# Flappy 3D

A 3D take on Flappy Bird built with [three.js](https://threejs.org). No build step,
no asset pipeline, no network calls — every mesh, texture and sound is generated
at runtime, so the whole thing runs offline.

```bash
npm install
npm start          # → http://localhost:5173
```

`npm start` runs `server.mjs`, a ~50-line static file server using only Node
built-ins. A server is required because ES modules can't be loaded over
`file://`; any static server works.

## Controls

| Action  | Input                          |
| ------- | ------------------------------ |
| Flap    | `Space` · `W` · `↑` · click · tap |
| Pause   | `P` · `Esc`                    |
| Mute    | `M` · speaker button           |
| Restart | `R` · **Fly Again**            |

Pass a pipe for **1 point**; catch a floating gem for **2**. Best score persists
in `localStorage`. The game auto-pauses when the tab loses focus.

## How it fits together

```
index.html        import map + DOM overlay (score, panels, buttons)
styles.css        HUD styling and CSS keyframe effects
server.mjs        zero-dependency static server
src/
  main.js         game loop, state machine, camera rig, system wiring
  config.js       every tuning constant in one table
  difficulty.js   the escalation curve  ← the interesting knob
  world.js        sky shader, lighting, ground, recycled scenery, palettes
  bird.js         procedural bird mesh + flight physics + flap animation
  pipes.js        pooled pipe pairs, gems, collision queries
  particles.js    GPU point-sprite pool (one draw call)
  audio.js        procedural WebAudio SFX
  input.js        keyboard / mouse / touch → one `onFlap`
  hud.js          DOM overlay updates
```

### Design notes

**No bundler.** The `<script type="importmap">` in `index.html` maps the bare
specifier `three` to `./node_modules/three/build/three.module.js`. That's the one
job a bundler would be doing here, and it takes four lines of JSON. Swap the
value for a CDN URL if you'd rather not vendor the dependency.

**Fixed-timestep physics.** Flappy Bird's entire difficulty lives in the
gravity-to-impulse ratio. Integrating against a variable `deltaTime` makes the
jump arc differ between a 60 Hz and a 144 Hz display, so `main.js` accumulates
real time and steps the simulation at a fixed 1/120 s. Visual concerns (camera,
particles, scenery) still update per-frame at whatever rate the display runs.

**Collision is one comparison.** Pipes are vertical cylinders and the bird never
leaves `z = 0`. A cylinder is radially symmetric about its axis, so "sphere vs.
pipe" reduces to `|birdX - pipeX|` plus a gap test on Y. No physics engine, no
rotated bounding boxes. The hitbox is also ~10% smaller than the rendered bird,
so near-misses feel like skill rather than like the game cheating.

**Nothing allocates during play.** The 12 pipe pairs and ~1000 particles are
created once and recycled forever — pipes teleport to the front of the queue when
they fall behind, particles use a ring-buffer cursor. Allocating meshes mid-game
means GC pauses, and a GC pause in a twitch game is a death.

**One draw call for all particles.** `particles.js` keeps positions, colours,
sizes and lifetimes in flat `Float32Array`s and renders them as a single
`THREE.Points` with a custom shader. The fragment shader carves a soft disc out
of the square point sprite, so there's no texture to load.

**An infinite world made of 50 objects.** The ground plane rides along with the
bird while its texture offset scrolls the opposite way — the surface never
leaves the camera, but the pattern streams past. Clouds and hills wrap around a
fixed span. Distant hills opt out of scene fog entirely and are hand-tinted
toward the horizon colour instead, because real fog at that distance would erase
them.

**Day/night from the score.** The world lerps through five palettes as you play,
one full cycle every 60 points. Because the sun drops to 0.9 intensity at night,
the pipe lips carry emissive rings and the bird has a faint self-emission —
without those, both silhouette to black exactly when you need to see them.

## Tuning it

`src/config.js` holds every constant. `src/difficulty.js` holds the escalation
curve, marked `YOUR DIAL` — one function returning gap size, pipe spacing,
vertical range and speed for a given score. The baseline eases in over the first
30 points (`ramp = t * t`) so newcomers get a forgiving start; swapping that for
`Math.sqrt(t)` makes the game bite immediately instead.

`window.game` is exposed for the devtools console:

```js
game.score = 40            // jump the difficulty + day/night cycle forward
game.bird.position.y = 6   // teleport
game.renderer.info.render  // draw calls, triangles
```

## Performance

Measured at 1280×760 on desktop Chrome: 60 fps (16.6 ms median, 19 ms worst),
226 draw calls, 43k triangles, 5 textures. If the frame rate can't be sustained,
the renderer drops to 1× pixel ratio and then disables shadows, once each — it
never oscillates.

## License

MIT
