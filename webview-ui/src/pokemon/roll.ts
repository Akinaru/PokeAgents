/**
 * Deterministic Pokémon roll for an agent.
 *
 * Everything derives from the server-assigned session seed, so a session keeps
 * its Pokémon across reloads and every client agrees without persisting anything.
 */
import { POKEMON_EVOLUTION_THRESHOLDS, POKEMON_SHINY_RATE } from '../constants.js';
import pokedex from './pokedex.json';

/** [dex, frenchName, captureRate, evolvesFrom (0 = none), flags] — see scripts/generate-pokedex.ts */
type PokedexEntry = [number, string, number, number, number];

const FLAG_SHINY_AVAILABLE = 2;

interface Species {
  dex: number;
  name: string;
  captureRate: number;
  shinyAvailable: boolean;
  evolutions: Species[];
}

const speciesByDex = new Map<number, Species>();
for (const [dex, name, captureRate, , flags] of pokedex as PokedexEntry[]) {
  speciesByDex.set(dex, {
    dex,
    name,
    captureRate,
    shinyAvailable: (flags & FLAG_SHINY_AVAILABLE) !== 0,
    evolutions: [],
  });
}
const baseSpecies: Species[] = [];
for (const [dex, , , evolvesFrom] of pokedex as PokedexEntry[]) {
  const parent = speciesByDex.get(evolvesFrom);
  const species = speciesByDex.get(dex)!;
  if (parent) parent.evolutions.push(species);
  else baseSpecies.push(species);
}
// Capture rate doubles as encounter weight: common Pokémon ~255, legendaries ~3.
const totalWeight = baseSpecies.reduce((sum, s) => sum + s.captureRate, 0);

export interface RolledPokemon {
  /** Evolution line from base form, one branch chosen by the seed. */
  line: Species[];
  shiny: boolean;
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
  const rolled = { line, shiny: rand() < POKEMON_SHINY_RATE };
  rollCache.set(seed, rolled);
  return rolled;
}

/** Evolution stage reached for a context-window fill ratio (0-1). */
export function evolutionStage(rolled: RolledPokemon, contextRatio: number): number {
  let stage = 0;
  for (const threshold of POKEMON_EVOLUTION_THRESHOLDS) {
    if (contextRatio >= threshold) stage++;
  }
  return Math.min(stage, rolled.line.length - 1);
}

export interface PokemonForm {
  dex: number;
  name: string;
  /** Shiny only when this form has shiny sprites. */
  shiny: boolean;
}

export function pokemonForm(rolled: RolledPokemon, stage: number): PokemonForm {
  const species = rolled.line[Math.min(stage, rolled.line.length - 1)];
  return {
    dex: species.dex,
    name: species.name,
    shiny: rolled.shiny && species.shinyAvailable,
  };
}
