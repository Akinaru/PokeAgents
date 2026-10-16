import assert from 'node:assert/strict';

import { test } from 'vitest';

import { dailySeed, dayKey } from '../src/pokemon/daily.js';
import { rollPokemon } from '../src/pokemon/roll.js';

test('dayKey is the local calendar day as YYYYMMDD', () => {
  assert.equal(dayKey(new Date(2026, 9, 16, 23, 59)), 20261016);
  assert.equal(dayKey(new Date(2026, 9, 17, 0, 1)), 20261017);
});

test('an agent keeps its Pokémon all day and gets a new one the next day', () => {
  const session = 123456789;
  assert.equal(dailySeed(session, 20261016), dailySeed(session, 20261016));
  // Over a month, nearly every day brings a different species
  const species = new Set<number>();
  for (let d = 1; d <= 30; d++)
    species.add(rollPokemon(dailySeed(session, 20261100 + d)).line[0].dex);
  assert.ok(species.size >= 20, `only ${species.size} species in 30 days`);
});

test('two agents on the same day get independent Pokémon', () => {
  const day = 20261016;
  const species = new Set<number>();
  for (let s = 0; s < 40; s++) species.add(rollPokemon(dailySeed(s * 7919, day)).line[0].dex);
  assert.ok(species.size >= 25, `only ${species.size} species across 40 agents`);
});
