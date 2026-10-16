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

const species = (over: Record<string, unknown> = {}) => ({
  dex: 1,
  name: 'X',
  captureRate: 45,
  shinyAvailable: true,
  genderRate: 4,
  types: [12],
  genus: 'Pokémon Test',
  legendary: false,
  parent: null,
  evolutions: [],
  ...over,
});

test('a shiny roll only shows shiny on forms that have shiny sprites', () => {
  const form = pokemonForm(
    { line: [species({ shinyAvailable: false })], shiny: true, genderRoll: 0 },
    0,
  );
  assert.equal(form.shiny, false);
});

test('sex follows the species gender ratio, and genderless species have none', () => {
  const roll = (genderRate: number, genderRoll: number) =>
    pokemonForm({ line: [species({ genderRate })], shiny: false, genderRoll }, 0).gender;
  assert.equal(roll(-1, 0.1), null);
  assert.equal(roll(0, 0.01), 'male');
  assert.equal(roll(8, 0.99), 'female');
  assert.equal(roll(4, 0.49), 'female');
  assert.equal(roll(4, 0.51), 'male');
});

test('the next form is named until the end of the line', () => {
  const line = [species({ name: 'A' }), species({ name: 'B' })];
  assert.equal(pokemonForm({ line, shiny: false, genderRoll: 0 }, 0).nextName, 'B');
  assert.equal(pokemonForm({ line, shiny: false, genderRoll: 0 }, 1).nextName, null);
});

test('adding the sex draw keeps existing species and shiny rolls', () => {
  // Seed 42 rolled this species before the gender draw existed
  assert.deepEqual(
    rollPokemon(42).line.map((s) => s.dex),
    [562, 563],
  );
  assert.deepEqual(
    rollPokemon(99).line.map((s) => s.dex),
    [252, 253, 254],
  );
});
