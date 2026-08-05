# Aether Flap

A 3D reimagining of Flappy Bird — built with **Three.js** as a small creative showcase.

Soar a stylized low-poly bird through floating stone ruins at golden hour. Procedural audio, particle bursts, dynamic lighting, and an endless canyon of glowing archways.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Controls

| Input | Action |
|--------|--------|
| **Space** / **↑** / **W** | Flap |
| **Click** / **Tap** | Flap |
| Same inputs | Start / retry from menu |

## Stack

- [Three.js](https://threejs.org/) — WebGL scene, lighting, meshes, particles
- Vite — zero-config dev server & build
- Web Audio API — procedural SFX (no asset files)

## Project layout

```
src/
  main.js       Game loop, input, states
  bird.js       Bird mesh, physics, wing animation, trail
  world.js      Sky shader, ruins/pipes, clouds, ground
  particles.js  Score & crash bursts
  audio.js      Procedural flap / score / crash tones
  styles.css    HUD & menu chrome
```

## Build

```bash
npm run build
npm run preview
```
