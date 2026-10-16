/**
 * Regenerates webview-ui/src/pokemon/pokedex.json — the compact species table the
 * webview uses to roll an agent's Pokémon.
 *
 * Joins two sources:
 *   - PMDCollab SpriteCollab tracker: which species have every overworld
 *     animation we render (and whether a shiny recolor exists).
 *   - PokeAPI GraphQL: French name, capture rate, legendary flag, evolution parent.
 *
 * Run: npx tsx scripts/generate-pokedex.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import { POKEMON_ANIMS } from '../core/src/pokemon/constants.js';

const TRACKER_URL = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/tracker.json';
const POKEAPI_GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2';
const OUT_FILE = path.join(
  import.meta.dirname,
  '..',
  'webview-ui',
  'src',
  'pokemon',
  'pokedex.json',
);

interface TrackerNode {
  sprite_files: Record<string, boolean>;
  subgroups: Record<string, TrackerNode>;
}

interface ApiSpecies {
  id: number;
  capture_rate: number;
  is_legendary: boolean;
  is_mythical: boolean;
  evolves_from_species_id: number | null;
  pokemonspeciesnames: Array<{ name: string }>;
}

const hasAllAnims = (node: TrackerNode | undefined): boolean =>
  !!node && POKEMON_ANIMS.every((anim) => anim in node.sprite_files);

async function main(): Promise<void> {
  const tracker = (await (await fetch(TRACKER_URL)).json()) as Record<string, TrackerNode>;

  const query = `query {
    pokemonspecies(order_by: { id: asc }) {
      id capture_rate is_legendary is_mythical evolves_from_species_id
      pokemonspeciesnames(where: { language: { name: { _eq: "fr" } } }) { name }
    }
  }`;
  const res = await fetch(POKEAPI_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const { data } = (await res.json()) as { data: { pokemonspecies: ApiSpecies[] } };

  // [dex, frenchName, captureRate, evolvesFrom (0 = none), flags]
  // flags: bit 0 = legendary or mythical, bit 1 = shiny sprites available
  const species: Array<[number, string, number, number, number]> = [];
  for (const s of data.pokemonspecies) {
    const node = tracker[String(s.id).padStart(4, '0')];
    if (!hasAllAnims(node)) continue;
    const shiny = hasAllAnims(node.subgroups['0000']?.subgroups['0001']);
    const flags = (s.is_legendary || s.is_mythical ? 1 : 0) | (shiny ? 2 : 0);
    const name = s.pokemonspeciesnames[0]?.name ?? String(s.id);
    species.push([s.id, name, s.capture_rate, s.evolves_from_species_id ?? 0, flags]);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(species) + '\n');
  console.log(`Wrote ${species.length} species to ${path.relative(process.cwd(), OUT_FILE)}`);
}

void main();
