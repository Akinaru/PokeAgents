import assert from 'node:assert/strict';

import { test } from 'vitest';

import { tiltCamera } from '../src/office/camera.js';
import { TILE_SIZE } from '../src/office/types.js';

const COLS = 24;
const ROWS = 18;
const ZOOM = 3;
const camera = tiltCamera(100, 50, COLS, ROWS, ZOOM);
const center = { x: (COLS * TILE_SIZE) / 2, y: (ROWS * TILE_SIZE) / 2 };

const close = (a: number, b: number, eps = 1e-6): void =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('the map center stays where the flat view puts it, at scale 1', () => {
  const p = camera.project(center.x, center.y);
  close(p.x, 100 + center.x * ZOOM);
  close(p.y, 50 + center.y * ZOOM);
  close(p.scale, 1);
});

test('far rows shrink and squeeze together; near rows grow', () => {
  const far = camera.project(center.x, 0);
  const near = camera.project(center.x, ROWS * TILE_SIZE);
  assert.ok(far.scale < 1 && near.scale > 1);
  const farRowHeight = camera.project(0, TILE_SIZE).y - camera.project(0, 0).y;
  const nearRowHeight =
    camera.project(0, ROWS * TILE_SIZE).y - camera.project(0, (ROWS - 1) * TILE_SIZE).y;
  assert.ok(farRowHeight < nearRowHeight);
  assert.ok(nearRowHeight < TILE_SIZE * ZOOM * near.scale, 'rows are foreshortened by the tilt');
});

test('unproject inverts project across the map', () => {
  for (const [x, y] of [
    [0, 0],
    [37, 120],
    [COLS * TILE_SIZE, ROWS * TILE_SIZE],
  ]) {
    const p = camera.project(x, y);
    const back = camera.unproject(p.x, p.y)!;
    close(back.x, x, 1e-6);
    close(back.y, y, 1e-6);
  }
});

test('nothing is under a screen point above the horizon', () => {
  assert.equal(camera.unproject(0, -1e7), null);
});

test('billboardPoint maps the anchor to itself and scales offsets by distance', () => {
  const anchor = { x: 40, y: 30 };
  const p = camera.project(anchor.x, anchor.y);
  const same = camera.billboardPoint(p.x, p.y, anchor.x, anchor.y);
  close(same.x, anchor.x);
  close(same.y, anchor.y);
  // 10 world px up the sprite is 10·zoom·scale screen px up
  const up = camera.billboardPoint(p.x, p.y - 10 * ZOOM * p.scale, anchor.x, anchor.y);
  close(up.y, anchor.y - 10);
});
