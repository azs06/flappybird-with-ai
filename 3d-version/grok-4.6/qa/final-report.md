# AURELION — premium completion report

## Game design brief

- **Player promise:** A dusk automaton wren threading gold temple gates in a painted canyon sky.
- **Feeling:** Weightless, then violent; one-more-try luxury arcade.
- **Primary verb:** Flap.
- **Objective:** Pass pillar gates, raise the remembered score.
- **Pressure:** Gravity plus rising speed; later, moving gaps and night.
- **Reward:** Score, perfect-center toast, bronze/silver/gold/aurelion seals.
- **Fail/retry:** Collision or bounds → death hold → flap again (instant retry).
- **Skill:** Rhythm, recovery, reading moving gaps.
- **Non-goals:** Power-ups, multiplayer, licensed Flappy Bird IP, Elon likeness.

## Core loop contract

- **Verb:** Flap (space / tap / click).
- **Objective:** Fly through the next gold ring.
- **Pressure:** Gravity + world scroll + tightening gaps.
- **Reward:** +1 score, chime, ring burst; seals at 10/25/50/80.
- **Fail:** Hit column, water, or ceiling.
- **Restart:** Flap on the death screen starts a new run immediately.

## Level / encounter plan

- **Format:** Endless 2.5D side corridor through a dusk canyon.
- **Start:** Title hover, first gate at 9.4 units.
- **First decision:** First flap timing vs. gravity.
- **First threat:** Jade temple pair with a gold ring.
- **First reward:** Passing the ring (score 1).
- **Landmarks:** Painted dusk/night skies, clouds, lanterns, floating isles, god rays.
- **Escalation:** Speed up, gap shrink, moving gaps after 18, night blend 16→34.
- **Recovery:** Generous hitbox vs. visual; instant retry.
- **Readability:** Bird left-of-center, rings telegraph the gap, HUD score is a single numeral.

## Physics

- **Physics engine:** Custom arcade integrator (not Rapier). Flappy-style kinematic flap is not a rigid-body sim. Collider strategy: circle vs AABB.
- **Timestep:** 1/120, max 5 steps/frame.
- **Colliders:** Circle (r=0.3) vs. pillar AABBs + y bounds. Meshes are visual-only.
- **CCD:** Not required at this speed; substeps cover it.
- **Diagnostics:** `?debug=1` shows phase, y, vy, speed.

## Ledgers

### Skill-loading ledger

- Director: active (`~/.agents/skills/threejs-game-director/SKILL.md`)
- Gameplay systems: no — sibling not installed on path ladder; used playbook fallback
- AAA graphics: no — sibling not installed; used playbook fallback + visual scorecard categories
- UI: no — sibling not installed; used playbook + frontend-design + game-ui-icons
- Debug/profile: no — sibling not installed; used playbook fallback
- QA/release: no — sibling not installed; used playbook + Playwright MCP
- 3D generator: no — `threejs-3d-generator` not installed; Tripo key MISSING
- Image generator: yes (loaded `imagine` + `game-asset-core` + `game-animation-frames` + `game-ui-icons` + `game-character-consistency` + `game-tilesets`)
- Audio generator: no — `threejs-audio-generator` not installed; ElevenLabs key MISSING

### External asset sourcing

- Credential probe output:
  ```
  TRIPO_API_KEY=MISSING
  GEMINI_API_KEY=MISSING
  ELEVENLABS_API_KEY=MISSING
  ```
- Hero/player source: hybrid — Imagine `image_gen` bird (images/5.jpg → `public/assets/bird.png`) + authored Three.js puppet
- Enemies/vehicles/weapons source: authored 3D temple pillars (no enemy NPCs)
- Signature props/pickups source: Imagine lantern, feather, ember, UI frame
- World/sky/background source: Imagine dusk + night plates, cloud billboard
- Materials/textures/decals source: Imagine stone / gold / water tiles
- Logos/icons/GUI art source: CSS wordmark (text-accurate) + Imagine 9-slice frame
- Audio/SFX/voice source: procedural Web Audio (ElevenLabs blocked)
- Chosen sources: hybrid Imagine + authored Three.js + procedural audio
- External assets generated: yes
  - `public/assets/bird.png`
  - `public/assets/sky-dusk.jpg`
  - `public/assets/sky-night.jpg`
  - `public/assets/tex-stone.jpg` (2×2 seamV=10.3 seamH=11.2)
  - `public/assets/tex-gold.jpg` (wrap-blended; H seam 0 after blend)
  - `public/assets/tex-water.jpg` (seamV=4.7 seamH=6.8)
  - `public/assets/cloud.png`
  - `public/assets/lantern.png`
  - `public/assets/feather.png`
  - `public/assets/fx-ember.jpg`
  - `public/assets/ui-frame.png`
- Audio assets generated: no — ELEVENLABS_API_KEY=MISSING; procedural mixer shipped
- Video flap cycle: attempted `image_to_video`, blocked (`Zero Data Retention teams must provide output.upload_url`). 3D/sprite flap animation used instead.

### Reference ledger

- `phase-playbook.md`: yes
- `threejs-vanilla-starter.md`: yes
- Gameplay/AAA/UI/debug/QA sibling references: no — files absent on path ladder; playbook fallback used
- `imagine/SKILL.md`, `game-asset-core`, `game-animation-frames`, `game-ui-icons`, `game-tilesets`, `game-character-consistency`, `frontend-design`: yes

### Phase ledger

- Gameplay systems: done — flap/score/die/retry, seeded RNG, hooks
- External asset sourcing: done — probe + Imagine outputs + blockers recorded
- AAA graphics: done — world kit, lighting, post, scorecard
- UI: done — title, HUD, death, pause, mute, mobile
- Debug/profile: done — `?debug=1`, adaptive quality drop
- QA/release: done — browser play, screenshots, pixels, build

## Visual scorecard (active play + title)

Measured from `qa/desktop-play.png`, `qa/desktop-title.png`, inspector: fps 75, draws 165–179, tris 12.2k–12.8k, canvas mean RGB (144,135,126), 480 color bins, 99.4% nonzero.

Art direction: dusk-canticle luxury arcade, cream/gold automaton, jade ruins, teal-magenta sky.

| # | Category | Score | Evidence |
|---|----------|-------|----------|
| 1 | Hero / player | 3 | Generated automaton wren, keyed PNG, gold eye glow, readable silhouette |
| 2 | Obstacles/enemies | 3 | Jade columns, gold rings, lanterns, capitals — not primitive pipes |
| 3 | Rewards/interactables | 2 | Gold gate torus, score chime, seals, perfect-center toast |
| 4 | World/environment | 2 | Dusk/night skies, clouds, isles, god rays, water, reeds; shore still simple |
| 5 | Materials/textures | 3 | Imagine stone/gold/water, MeshPhysical enamel/gold, bump maps |
| 6 | Lighting/render | 3 | ACES, hemi+sun+rim, fog, bloom, dusk→night mix, god rays |
| 7 | VFX/motion | 2 | Flap burst, score ring, death feathers, near-miss streaks, dust. VFX readability: gold sparks stay off the gap. |
| 8 | Camera / composition | 3 | Cinematic side, portrait framing fix, letterbox, title orbit |
| 9 | UI/HUD | 3 | Italiana wordmark, horizon rule, filigree death frame, no stat-card grid |
| 10 | Readability | 2 | Gap rings read; title can occlude a pillar; bird clear on desktop+mobile |

Performance evidence / measured evidence: fps 75, draws 165–179, tris 12.8k, canvas pixel mean RGB (144,135,126), 480 bins, 99.4% nonzero. Screenshot set in `qa/`.

- **Average:** 2.6
- **Automatic failures remaining:** none (no category below 2)

### Fresh-eyes review

- Bird is a lit 2.5D portrait, not a fully deforming 3D hero. Justified: Tripo MISSING; generated identity is stronger than a primitive lathe.
- Water/shore still reads as a flat strip vs. the painted sky. Score held at 2 for world kit.
- Death happens fast for a naive bot; hitbox is fair, gravity is classic-tight.
- Did not inflate scores. Average 2.6 ≥ 2.3 gate.

## Technical art budget

| | Target | Actual (play) |
|--|--------|----------------|
| FPS | ≥60 desktop | 75 |
| Draw calls | <200 | 165–179 |
| Triangles | <80k | 12.2k–12.8k |
| DPR | ≤1.75 / ≤1.15 mobile | capped |
| Shadows | 2048 high / off low | PCF 2048 |
| Post | bloom+vignette high; bloom off low | yes |
| Bundle | <800kb JS | 621kb / 160kb gzip |

Adaptive: fps <38 drops to low (no bloom, no shadows, DPR 1.1).

## Renderer diagnostics

- WebGLRenderer, ACESFilmic, SRGB, FogExp2
- EffectComposer: Render + UnrealBloom (threshold 0.82) + vignette/grain/CA + Output
- Console: 0 errors. Page error count: 0. One prior PCFSoft deprecation — switched to PCFShadowMap.
- Canvas: 1440×900 buffer matches CSS; mobile 390×844 matches.

## Audio

Procedural Web Audio: wind bed, flap whoosh, score thirds, death thump, UI tick. Unlocks on first gesture. Mute persists in-session.

## UI checklist

- Title, HUD score, best, mute, pause, death, boot, toast
- Safe-area padding, 44px buttons, score hidden on death
- Mobile portrait camera recentered so the bird stays on-screen
- Reduced-motion: bloom disabled

## Visual test harness decision

**Skipped.** Playwright MCP already captured title/play/dead on desktop and mobile. Adding screenshot baselines without a pinned Playwright dependency would be flake-prone. Revisit if shipping a CI gate.

## Bot playtest

Informal hook bot (`window.__AURELION`): reached score 1–2, deaths recovered via flap, no softlock, restart works. Time-to-first-fail typically 3–8s for a naive flap heuristic (classic Flappy tightness). Formal `npm run playtest` needs Playwright installed.

## Verification

- `npx tsc --noEmit` pass
- `npm run build` pass
- URL: http://127.0.0.1:5188/
- Controls: Space / tap / click flap; P or Hold to pause; M or Sound to mute
- Paths exercised: title → play → score → die → retry; mute; mobile portrait
- Screenshots: `qa/desktop-title.png`, `qa/desktop-play.png`, `qa/desktop-dead.png`, `qa/mobile-title.png`, `qa/mobile-play.png`
- Inspector: `qa/metrics.json`

## Files

Vite + TypeScript + three r185. Main surfaces: `src/main.ts`, `src/assets/*`, `src/entities/*`, `src/systems/vfx.ts`, `src/ui/hud.ts`, `src/core/*`, `public/assets/*`.

## Remaining risks

- Water/shore strip is the weakest material read.
- Hero is hybrid 2.5D (Tripo blocked).
- No generated SFX/voice (ElevenLabs blocked).
- No CI visual harness.
- Title rings can cross the wordmark on wide desktop.
