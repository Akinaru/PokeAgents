import assert from 'node:assert/strict';

import { test } from 'vitest';

import { POKEMON_SHINY_RATE } from '../src/constants.js';
import { evolutionStage, pokemonForm, rollPokemon } from '../src/pokemon/roll.js';

const SAMPLE = 20_000;

test('the same seed always rolls the same Pokémon', () => {
  for (const seed of [0, 1, 42, 0xffffffff]) {
    assert.deepEqual(rollPokemon(seed), rollPokemon(seed));
  }
});

test('different seeds spread across many species', () => {
  const bases = new Set<number>();
  for (let seed = 0; seed < 1000; seed++) bases.add(rollPokemon(seed).line[0].dex);
  assert.ok(bases.size > 200, `only ${bases.size} distinct species in 1000 rolls`);
});

test('shiny rate matches POKEMON_SHINY_RATE', () => {
  let shinies = 0;
  for (let seed = 0; seed < SAMPLE; seed++) if (rollPokemon(seed * 2654435761).shiny) shinies++;
  const rate = shinies / SAMPLE;
  assert.ok(Math.abs(rate - POKEMON_SHINY_RATE) < POKEMON_SHINY_RATE * 0.35, `rate ${rate}`);
});

test('common Pokémon are rolled far more often than legendaries', () => {
  // Mewtwo (capture rate 3) vs Rattata (255)
  let mewtwo = 0;
  let rattata = 0;
  for (let seed = 0; seed < SAMPLE; seed++) {
    const dex = rollPokemon(seed).line[0].dex;
    if (dex === 150) mewtwo++;
    if (dex === 19) rattata++;
  }
  assert.ok(rattata > 10 * Math.max(mewtwo, 1), `rattata ${rattata} vs mewtwo ${mewtwo}`);
});

test('the evolution line starts at a base form and follows parent links', () => {
  for (let seed = 0; seed < 500; seed++) {
    const { line } = rollPokemon(seed);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i - 1].evolutions.includes(line[i]), `${line[i - 1].name} -> ${line[i].name}`);
    }
  }
});

test('evolution stage grows with context and stops at the last form', () => {
  let seed = 0;
  while (rollPokemon(seed).line.length < 3) seed++;
  const rolled = rollPokemon(seed);
  assert.equal(evolutionStage(rolled, 0), 0);
  assert.equal(evolutionStage(rolled, 0.45), 1);
  assert.equal(evolutionStage(rolled, 0.95), 2);

  while (rollPokemon(seed).line.length !== 1) seed++;
  assert.equal(evolutionStage(rollPokemon(seed), 1), 0);
});

test('a shiny roll only shows shiny on forms that have shiny sprites', () => {
  const form = pokemonForm(
    {
      line: [{ dex: 1, name: 'X', captureRate: 45, shinyAvailable: false, evolutions: [] }],
      shiny: true,
    },
    0,
  );
  assert.equal(form.shiny, false);
});
