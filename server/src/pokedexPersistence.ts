/**
 * The Pokédex: every species that has appeared as an agent, shared by all
 * windows and surfaces in ~/.aagent/pokedex.json.
 *
 * Encounters are counted by session seed, so a reload re-showing the same
 * agent never inflates them. Files written before entries existed
 * ({ seen: number[], shiny: number[] }) are read as one encounter each.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  LAYOUT_FILE_DIR,
  POKEDEX_FILE_NAME,
  POKEDEX_MAX_PROJECTS,
  POKEDEX_MAX_SEEDS,
} from './constants.js';
import { isValidPokemonRequest } from './pokemonSprites.js';

/** Longest project folder name accepted from a client. */
const POKEDEX_MAX_PROJECT_NAME = 200;

export interface PokedexEntry {
  dex: number;
  /** Distinct sessions this species appeared in (capped at POKEDEX_MAX_SEEDS). */
  count: number;
  shiny: boolean;
  /** ISO date of the first encounter. */
  first: string;
  /** Project folders it appeared in, most recent last. */
  projects: string[];
}

interface StoredEntry {
  seeds: number[];
  shiny: boolean;
  first: string;
  projects: string[];
}

type Store = Record<string, StoredEntry>;

function pokedexPath(): string {
  return path.join(os.homedir(), LAYOUT_FILE_DIR, POKEDEX_FILE_NAME);
}

const intList = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => Number.isInteger(v)) : [];

function readStore(): Store {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(pokedexPath(), 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
  if (raw.species && typeof raw.species === 'object') {
    const store: Store = {};
    for (const [dex, value] of Object.entries(raw.species as Record<string, unknown>)) {
      const v = value as Partial<StoredEntry>;
      if (!/^\d+$/.test(dex) || !v || typeof v !== 'object') continue;
      store[dex] = {
        seeds: intList(v.seeds),
        shiny: v.shiny === true,
        first: typeof v.first === 'string' ? v.first : new Date(0).toISOString(),
        projects: Array.isArray(v.projects)
          ? v.projects.filter((p): p is string => typeof p === 'string')
          : [],
      };
    }
    return store;
  }
  // Legacy { seen, shiny } sets
  const shiny = new Set(intList(raw.shiny));
  const store: Store = {};
  for (const dex of intList(raw.seen)) {
    store[dex] = {
      seeds: [0],
      shiny: shiny.has(dex),
      first: new Date(0).toISOString(),
      projects: [],
    };
  }
  return store;
}

function writeStore(store: Store): void {
  const file = pokedexPath();
  const tmp = `${file}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify({ species: store }));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('[aAgent] Failed to write Pokédex:', err);
  }
}

/** Validates a client's recordPokemonSeen payload (untrusted). */
export function isValidPokemonSeen(msg: Record<string, unknown>): msg is {
  dex: number;
  shiny: boolean;
  seed: number;
  project?: string;
} {
  return (
    isValidPokemonRequest(msg.dex, msg.shiny) &&
    Number.isInteger(msg.seed) &&
    (msg.project === undefined ||
      (typeof msg.project === 'string' && msg.project.length <= POKEDEX_MAX_PROJECT_NAME))
  );
}

export function readPokedex(): PokedexEntry[] {
  return Object.entries(readStore())
    .map(([dex, e]) => ({
      dex: Number(dex),
      count: e.seeds.length,
      shiny: e.shiny,
      first: e.first,
      projects: e.projects,
    }))
    .sort((a, b) => a.dex - b.dex);
}

export function recordPokemonSeen(
  dex: number,
  shiny: boolean,
  seed: number,
  project: string | undefined,
): void {
  const store = readStore();
  const entry = (store[dex] ??= {
    seeds: [],
    shiny: false,
    first: new Date().toISOString(),
    projects: [],
  });
  let changed = !entry.seeds.length;
  if (!entry.seeds.includes(seed) && entry.seeds.length < POKEDEX_MAX_SEEDS) {
    entry.seeds.push(seed);
    changed = true;
  }
  if (shiny && !entry.shiny) {
    entry.shiny = true;
    changed = true;
  }
  if (project && entry.projects[entry.projects.length - 1] !== project) {
    entry.projects = [...entry.projects.filter((p) => p !== project), project].slice(
      -POKEDEX_MAX_PROJECTS,
    );
    changed = true;
  }
  if (changed) writeStore(store);
}
