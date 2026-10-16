/**
 * Deterministic Pokémon roll for an agent.
 *
 * Everything derives from the server-assigned session seed, so a session keeps
 * its Pokémon across reloads and every client agrees without persisting anything.
 */
import { POKEMON_EVOLUTION_THRESHOLDS, POKEMON_SHINY_RATE } from '../constants.js';
import pokedex from './pokedex.json';

/** [dex, frenchName, captureRate, evolvesFrom (0 = none), flags, genderRate, types, genus]
 *  — see scripts/generate-pokedex.ts */
type PokedexEntry = [number, string, number, number, number, number, number[], string];

const FLAG_LEGENDARY = 1;
const FLAG_SHINY_AVAILABLE = 2;

interface Species {
  dex: number;
  name: string;
  captureRate: number;
  shinyAvailable: boolean;
  /** Female chance in eighths; -1 for genderless species. */
  genderRate: number;
  /** PokeAPI type ids, primary first. */
  types: number[];
  /** French category, e.g. "Pokémon Souris". */
  genus: string;
  legendary: boolean;
  parent: Species | null;
  evolutions: Species[];
}

const speciesByDex = new Map<number, Species>();
for (const [
  dex,
  name,
  captureRate,
  ,
  flags,
  genderRate,
  types,
  genus,
] of pokedex as PokedexEntry[]) {
  speciesByDex.set(dex, {
    dex,
    name,
    captureRate,
    shinyAvailable: (flags & FLAG_SHINY_AVAILABLE) !== 0,
    genderRate,
    types,
    genus,
    legendary: (flags & FLAG_LEGENDARY) !== 0,
    parent: null,
    evolutions: [],
  });
}
const baseSpecies: Species[] = [];
for (const [dex, , , evolvesFrom] of pokedex as PokedexEntry[]) {
  const parent = speciesByDex.get(evolvesFrom);
  const species = speciesByDex.get(dex)!;
  species.parent = parent ?? null;
  if (parent) parent.evolutions.push(species);
  else baseSpecies.push(species);
}

/** Species an agent can be (those with every overworld animation). */
export const POKEDEX_SPECIES_COUNT = speciesByDex.size;

export function speciesInfo(dex: number): Species | undefined {
  return speciesByDex.get(dex);
}

/** Every species, in National Dex order. */
export const ALL_SPECIES: readonly Species[] = [...speciesByDex.values()].sort(
  (a, b) => a.dex - b.dex,
);

/** Evolution stage of a species within its line (0 = base form). */
export function speciesStage(species: Species): number {
  let stage = 0;
  for (let s = species.parent; s; s = s.parent) stage++;
  return stage;
}

// Capture rate doubles as encounter weight: common Pokémon ~255, legendaries ~3.
const totalWeight = baseSpecies.reduce((sum, s) => sum + s.captureRate, 0);

export interface RolledPokemon {
  /** Evolution line from base form, one branch chosen by the seed. */
  line: Species[];
  shiny: boolean;
  /** Uniform draw in [0, 1) deciding the sex against each form's gender ratio. */
  genderRoll: number;
}

/** mulberry32: tiny seeded PRNG, uniform in [0, 1). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rollCache = new Map<number, RolledPokemon>();

export function rollPokemon(seed: number): RolledPokemon {
  const cached = rollCache.get(seed);
  if (cached) return cached;

  const rand = prng(seed);
  let pick = rand() * totalWeight;
  let species = baseSpecies[baseSpecies.length - 1];
  for (const s of baseSpecies) {
    pick -= s.captureRate;
    if (pick < 0) {
      species = s;
      break;
    }
  }
  const line = [species];
  while (species.evolutions.length > 0) {
    species = species.evolutions[Math.floor(rand() * species.evolutions.length)];
    line.push(species);
  }
  // Draw order matters: earlier draws keep existing agents' rolls stable.
  const shiny = rand() < POKEMON_SHINY_RATE;
  const rolled = { line, shiny, genderRoll: rand() };
  rollCache.set(seed, rolled);
  return rolled;
}

/**
 * Today's wild Pokémon: `count` different common base species (weighted by
 * capture rate, legendaries excluded), never shiny.
 */
export function rollWildPokemon(seed: number, count: number): PokemonForm[] {
  const rand = prng(seed ^ 0x5eed);
  const pool = baseSpecies.filter((s) => !s.legendary);
  const forms: PokemonForm[] = [];
  while (forms.length < count && pool.length > 0) {
    let pick = rand() * pool.reduce((sum, s) => sum + s.captureRate, 0);
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      pick -= pool[i].captureRate;
      if (pick < 0) {
        index = i;
        break;
      }
    }
    const [species] = pool.splice(index, 1);
    forms.push(pokemonForm({ line: [species], shiny: false, genderRoll: rand() }, 0));
  }
  return forms;
}

/** Evolution stage reached for a context-window fill ratio (0-1). */
export function evolutionStage(rolled: RolledPokemon, contextRatio: number): number {
  let stage = 0;
  for (const threshold of POKEMON_EVOLUTION_THRESHOLDS) {
    if (contextRatio >= threshold) stage++;
  }
  return Math.min(stage, rolled.line.length - 1);
}

export type PokemonGender = 'male' | 'female' | null;

export interface PokemonForm {
  dex: number;
  name: string;
  /** Shiny only when this form has shiny sprites. */
  shiny: boolean;
  gender: PokemonGender;
  types: number[];
  genus: string;
  /** Name of the next form along the rolled line, if any. */
  nextName: string | null;
}

export function pokemonForm(rolled: RolledPokemon, stage: number): PokemonForm {
  const index = Math.min(stage, rolled.line.length - 1);
  const species = rolled.line[index];
  const gender: PokemonGender =
    species.genderRate < 0 ? null : rolled.genderRoll < species.genderRate / 8 ? 'female' : 'male';
  return {
    dex: species.dex,
    name: species.name,
    shiny: rolled.shiny && species.shinyAvailable,
    gender,
    types: species.types,
    genus: species.genus,
    nextName: rolled.line[index + 1]?.name ?? null,
  };
}
