import assert from 'node:assert/strict';

import { test } from 'vitest';

import { farthestSeats } from '../src/office/engine/seatPlacement.js';
import { buildWorkSpots, pickWorkSpot } from '../src/office/engine/workSpots.js';
import { Direction } from '../src/office/types.js';
import { rollWildPokemon } from '../src/pokemon/roll.js';

const SIZES: Record<string, { w: number; h: number; bgRows: number }> = {
  ROUTE_SIGN: { w: 1, h: 2, bgRows: 1 },
  TALL_GRASS: { w: 1, h: 1, bgRows: 1 },
  ROCK: { w: 1, h: 1, bgRows: 0 },
};
const footprint = (type: string) => SIZES[type];
const blocked = new Set(['5,6', '9,9']);
const walkable = (c: number, r: number) =>
  c >= 0 && r >= 0 && c < 20 && r < 20 && !blocked.has(`${c},${r}`);

test('a sign is read from below, facing up; tall grass is searched from inside', () => {
  const spots = buildWorkSpots(
    [
      { type: 'ROUTE_SIGN', col: 5, row: 5 },
      { type: 'TALL_GRASS', col: 2, row: 2 },
      { type: 'STUMP', col: 1, row: 1 },
    ],
    footprint,
    walkable,
    new Set(),
  );
  const below = spots.find((s) => s.col === 5 && s.row === 7);
  assert.deepEqual(below, { col: 5, row: 7, dir: Direction.UP, move: 'read' });
  // The sign's walk-through top row hosts no spot of its own
  assert.ok(!spots.some((s) => s.col === 5 && s.row === 4));
  assert.deepEqual(
    spots.find((s) => s.col === 2 && s.row === 2),
    { col: 2, row: 2, dir: Direction.DOWN, move: 'search' },
  );
  assert.ok(!spots.some((s) => s.col === 1 && s.row === 1), 'stumps host no spot');
});

test('spots skip blocked tiles and seats', () => {
  const spots = buildWorkSpots(
    [{ type: 'ROCK', col: 9, row: 8 }],
    footprint,
    walkable,
    new Set(['10,8']),
  );
  assert.ok(!spots.some((s) => s.col === 9 && s.row === 9), 'blocked');
  assert.ok(!spots.some((s) => s.col === 10 && s.row === 8), 'seat');
  assert.ok(spots.some((s) => s.col === 8 && s.row === 8 && s.dir === Direction.RIGHT));
});

test('pickWorkSpot prefers the fitting move and keeps agents apart', () => {
  const spots = [
    { col: 3, row: 3, dir: Direction.DOWN, move: 'search' as const },
    { col: 4, row: 3, dir: Direction.UP, move: 'read' as const },
    { col: 15, row: 3, dir: Direction.UP, move: 'read' as const },
  ];
  assert.equal(pickWorkSpot(spots, 0, 12, 'search', [], 6, 16)?.move, 'search');
  // Another agent stands next to the near spots: only the far one is left
  const pick = pickWorkSpot(spots, 0, 12, 'search', [{ col: 3, row: 4 }], 6, 16);
  assert.deepEqual(pick, spots[2]);
  assert.equal(
    pickWorkSpot(
      spots,
      0,
      0,
      null,
      [
        { col: 11, row: 3 },
        { col: 3, row: 3 },
      ],
      6,
      16,
    ),
    null,
  );
});

test('new agents take the seat farthest from taken ones', () => {
  const seats = new Map([
    ['a', { seatCol: 0, seatRow: 0, assigned: true }],
    ['b', { seatCol: 2, seatRow: 0, assigned: false }],
    ['c', { seatCol: 9, seatRow: 0, assigned: false }],
  ]);
  assert.deepEqual(farthestSeats(['b', 'c'], seats), ['c']);
});

test('wild Pokémon: distinct, non-shiny, stable for a day', () => {
  const wild = rollWildPokemon(20261016, 5);
  assert.equal(wild.length, 5);
  assert.equal(new Set(wild.map((f) => f.dex)).size, 5);
  assert.ok(wild.every((f) => !f.shiny));
  assert.deepEqual(rollWildPokemon(20261016, 5), wild);
});
