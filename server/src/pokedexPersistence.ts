/**
 * The Pokédex: every species that has appeared as an agent, shared by all
 * windows and surfaces in ~/.aagent/pokedex.json. Entries are sets, so
 * re-recording a species (e.g. after a reload) is a no-op.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { LAYOUT_FILE_DIR, POKEDEX_FILE_NAME } from './constants.js';

export interface Pokedex {
  seen: number[];
  shiny: number[];
}

function pokedexPath(): string {
  return path.join(os.homedir(), LAYOUT_FILE_DIR, POKEDEX_FILE_NAME);
}

const intList = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => Number.isInteger(v)) : [];

export function readPokedex(): Pokedex {
  try {
    const raw = JSON.parse(fs.readFileSync(pokedexPath(), 'utf-8')) as Record<string, unknown>;
    return { seen: intList(raw.seen), shiny: intList(raw.shiny) };
  } catch {
    return { seen: [], shiny: [] };
  }
}

export function recordPokemonSeen(dex: number, shiny: boolean): void {
  const pokedex = readPokedex();
  const add = (list: number[]): boolean => !list.includes(dex) && list.push(dex) > 0;
  const addedSeen = add(pokedex.seen);
  const addedShiny = shiny && add(pokedex.shiny);
  if (!addedSeen && !addedShiny) return;
  pokedex.seen.sort((a, b) => a - b);
  pokedex.shiny.sort((a, b) => a - b);
  const file = pokedexPath();
  const tmp = `${file}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(pokedex));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('[aAgent] Failed to write Pokédex:', err);
  }
}
