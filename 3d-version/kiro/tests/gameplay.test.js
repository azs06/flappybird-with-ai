/**
 * Headless gameplay-logic tests. These import the real modules (no DOM needed
 * for bird/pipes/particles) and assert the rules of the game.
 *
 *   node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { CFG } from '../src/config.js';
import { Bird } from '../src/bird.js';
import { PipeField } from '../src/pipes.js';
import { Particles } from '../src/particles.js';

const DT = 1 / 120;

test('flap reverses fall and gravity pulls the bird back down', () => {
  const bird = new Bird();
  for (let i = 0; i < 60; i++) bird.updatePlaying(DT);
  assert.ok(bird.velocity < 0, 'bird should be falling after half a second');

  bird.flap();
  assert.equal(bird.velocity, CFG.flapVelocity);

  const yAfterFlap = bird.y;
  for (let i = 0; i < 20; i++) bird.updatePlaying(DT);
  assert.ok(bird.y > yAfterFlap, 'bird rises right after a flap');

  for (let i = 0; i < 300; i++) bird.updatePlaying(DT);
  assert.ok(bird.velocity >= CFG.terminalVelocity, 'fall speed is capped');
});

test('bird is clamped at the ceiling', () => {
  const bird = new Bird();
  for (let i = 0; i < 400; i++) {
    bird.flap();
    bird.updatePlaying(DT);
  }
  assert.ok(bird.y <= CFG.ceiling + 1e-6, `y=${bird.y} should not exceed ceiling`);
});

test('pitch points up when climbing and down when diving', () => {
  const bird = new Bird();
  bird.flap();
  for (let i = 0; i < 12; i++) bird.updatePlaying(DT);
  const climbing = bird.group.rotation.z;
  for (let i = 0; i < 240; i++) bird.updatePlaying(DT);
  const diving = bird.group.rotation.z;
  assert.ok(climbing > 0, `climbing pitch should be positive, got ${climbing}`);
  assert.ok(diving < climbing, 'diving pitch should be lower than climbing pitch');
  assert.ok(diving >= CFG.bird.maxPitchDown - 1e-6, 'pitch stays within limits');
});

test('gap size shrinks with score but never below the floor', () => {
  const field = new PipeField(new Scene());
  assert.equal(field.gapSizeFor(0), CFG.pipe.gapStart);
  assert.ok(field.gapSizeFor(10) < CFG.pipe.gapStart);
  assert.equal(field.gapSizeFor(10_000), CFG.pipe.gapMin);
});

test('every generated gap stays reachable and inside the playfield', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);

  let previousCenter = null;
  for (let score = 0; score < 400; score++) {
    const gap = field.gapSizeFor(score);
    // Drive the private generator through a spawn.
    field.reset();
    field.lastCenter = previousCenter ?? 0;
    field.update(DT, CFG.baseSpeed, score, 0, true);
    const pipe = field.pipes.find((p) => p.active);
    assert.ok(pipe, 'a pipe should have spawned');

    const center = (pipe.gapTop + pipe.gapBottom) / 2;
    assert.ok(
      pipe.gapBottom >= CFG.groundY + CFG.pipe.edgeMargin - 1e-6,
      `gap bottom ${pipe.gapBottom} too close to the ground`,
    );
    assert.ok(
      pipe.gapTop <= CFG.ceiling - CFG.pipe.edgeMargin + 1e-6,
      `gap top ${pipe.gapTop} too close to the ceiling`,
    );
    assert.ok(Math.abs(pipe.gapTop - pipe.gapBottom - gap) < 1e-6, 'gap size matches difficulty');
    if (previousCenter !== null) {
      assert.ok(
        Math.abs(center - previousCenter) <= CFG.pipe.maxCenterDelta + 1e-6,
        `gap jumped ${Math.abs(center - previousCenter)} units`,
      );
    }
    previousCenter = center;
  }
});

test('flying through a gap scores exactly one point and does not collide', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);
  field.reset();
  field.update(DT, CFG.baseSpeed, 0, 0, true);
  const pipe = field.pipes.find((p) => p.active);
  const center = (pipe.gapTop + pipe.gapBottom) / 2;

  let score = 0;
  let hits = 0;
  for (let i = 0; i < 4000; i++) {
    const res = field.update(DT, CFG.baseSpeed, 0, center, true);
    score += res.scored;
    if (res.hit) hits += 1;
    // Isolate the pipe under test: newly spawned ones are parked immediately.
    for (const other of field.pipes) if (other !== pipe && other.active) other.retire();
    if (pipe.group.position.x < CFG.bird.x - 4) break;
  }
  assert.equal(hits, 0, 'centre of the gap must be safe');
  assert.equal(score, 1, 'one pipe cleared = one point');
});

test('a pipe body registers a collision', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);
  field.reset();
  field.update(DT, CFG.baseSpeed, 0, 0, true);
  const pipe = field.pipes.find((p) => p.active);
  pipe.group.position.x = CFG.bird.x; // align horizontally

  const inside = field.update(0, 0, 0, pipe.gapTop + 1.5, false);
  assert.equal(inside.hit, true, 'above the gap is solid pipe');

  const below = field.update(0, 0, 0, pipe.gapBottom - 1.5, false);
  assert.equal(below.hit, true, 'below the gap is solid pipe');

  const safe = field.update(0, 0, 0, (pipe.gapTop + pipe.gapBottom) / 2, false);
  assert.equal(safe.hit, false, 'the gap itself is safe');
});

test('grazing tolerance matches the collision radius', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);
  field.reset();
  field.update(DT, CFG.baseSpeed, 0, 0, true);
  const pipe = field.pipes.find((p) => p.active);
  pipe.group.position.x = CFG.bird.x;

  const justInside = pipe.gapTop - CFG.bird.radius * 0.9;
  const justOutside = pipe.gapTop - CFG.bird.radius * 1.1;
  assert.equal(field.update(0, 0, 0, justInside, false).hit, true, 'clipping the lip hits');
  assert.equal(field.update(0, 0, 0, justOutside, false).hit, false, 'a hair of clearance is safe');
});

test('pipes are recycled, never allocated', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);
  field.reset();
  const poolSize = field.pipes.length;
  for (let i = 0; i < 20_000; i++) field.update(DT, CFG.maxSpeed, 50, 0.5, true);
  assert.equal(field.pipes.length, poolSize, 'pool size is fixed');
  assert.ok(
    field.pipes.filter((p) => p.active).length <= poolSize,
    'active pipes never exceed the pool',
  );
});

test('pipe spacing stays consistent while scrolling', () => {
  const field = new PipeField(new Scene());
  field.setBounds(0.5, 12);
  field.reset();
  for (let i = 0; i < 2000; i++) field.update(DT, CFG.baseSpeed, 0, 0.5, true);
  const xs = field.pipes
    .filter((p) => p.active)
    .map((p) => p.group.position.x)
    .sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    assert.ok(d > CFG.pipe.spacing - 0.6 && d < CFG.pipe.spacing + 0.6, `spacing drifted: ${d}`);
  }
});

test('dying bird lands on the ground and stops', () => {
  const bird = new Bird();
  bird.velocity = 0;
  let landed = false;
  for (let i = 0; i < 1200 && !landed; i++) landed = bird.updateDying(DT);
  assert.equal(landed, true, 'bird eventually lands');
  assert.equal(bird.velocity, 0);
  assert.ok(bird.y >= CFG.groundY, 'bird does not fall through the floor');
});

test('particles stay pooled and fade out', () => {
  const particles = new Particles(new Scene(), 20);
  const size = particles.pool.length;
  for (let i = 0; i < 50; i++) {
    particles.puff(0, 0);
    particles.burst(0, 0, 10);
    particles.update(DT, 4);
  }
  assert.equal(particles.pool.length, size);
  for (let i = 0; i < 400; i++) particles.update(DT, 4);
  assert.equal(
    particles.pool.filter((p) => p.life > 0).length,
    0,
    'all particles expire',
  );
  particles.clear();
  assert.equal(particles.pool.every((p) => !p.mesh.visible), true);
});
