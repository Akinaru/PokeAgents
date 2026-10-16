/**
 * Pokémon overworld sprites from PMDCollab SpriteCollab, downloaded on demand
 * and cached under ~/.aagent/pokemon/ so each species is fetched once.
 *
 * Only the POKEMON_ANIMS sheets are kept (~30 KB per species) and the cache is
 * capped at POKEMON_CACHE_MAX_ENTRIES species, oldest-used evicted first.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { POKEMON_ANIMS, POKEMON_MAX_DEX } from '../../core/src/pokemon/constants.js';
import {
  LAYOUT_FILE_DIR,
  POKEMON_CACHE_DIR_NAME,
  POKEMON_CACHE_MAX_ENTRIES,
  POKEMON_FETCH_TIMEOUT_MS,
  POKEMON_SPRITE_BASE_URL,
} from './constants.js';
import type { AgentState } from './types.js';

export interface PokemonAnimSheet {
  name: string;
  frameWidth: number;
  frameHeight: number;
  /** Per-frame durations in 60 Hz ticks. */
  durations: number[];
  /** Base64-encoded PNG sheet: one row per direction, one column per frame. */
  png: string;
}

type AnimMeta = Omit<PokemonAnimSheet, 'png'>;

const META_FILE = 'anims.json';

export function isValidPokemonRequest(dex: unknown, shiny: unknown): dex is number {
  return (
    typeof dex === 'number' &&
    Number.isInteger(dex) &&
    dex >= 1 &&
    dex <= POKEMON_MAX_DEX &&
    typeof shiny === 'boolean'
  );
}

/** Stable per-session seed (FNV-1a) the webview rolls the agent's Pokémon from. */
export function pokemonSeed(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The agent's Pokémon seed, derived once from its session transcript (or id). */
export function agentPokemonSeed(agent: AgentState): number {
  agent.seed ??= pokemonSeed(path.basename(agent.jsonlFile) || agent.sessionId || String(agent.id));
  return agent.seed;
}

function cacheRoot(): string {
  return path.join(os.homedir(), LAYOUT_FILE_DIR, POKEMON_CACHE_DIR_NAME);
}

function remotePath(dex: number, shiny: boolean): string {
  const id = String(dex).padStart(4, '0');
  return shiny ? `${id}/0000/0001` : id;
}

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(POKEMON_FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/** Parse the anims we use out of AnimData.xml, following `CopyOf` aliases.
 *  Returns each anim's metadata plus the sheet name to download for it. */
export function parseAnimData(xml: string): Array<AnimMeta & { sheet: string }> {
  const blocks = new Map<string, string>();
  for (const [, body] of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const name = /<Name>([^<]+)<\/Name>/.exec(body)?.[1];
    if (name) blocks.set(name, body);
  }
  return POKEMON_ANIMS.map((name) => {
    let sheet: string = name;
    let body = blocks.get(sheet);
    // CopyOf chains are one level deep in practice; the guard stops a malformed loop.
    for (let hops = 0; body && hops < POKEMON_ANIMS.length; hops++) {
      const copyOf = /<CopyOf>([^<]+)<\/CopyOf>/.exec(body)?.[1];
      if (!copyOf) break;
      sheet = copyOf;
      body = blocks.get(sheet);
    }
    if (!body) throw new Error(`AnimData.xml has no "${name}" animation`);
    const int = (tag: string): number =>
      Number(new RegExp(`<${tag}>(\\d+)</${tag}>`).exec(body)?.[1]);
    const durations = [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((m) => Number(m[1]));
    const frameWidth = int('FrameWidth');
    const frameHeight = int('FrameHeight');
    if (!frameWidth || !frameHeight || durations.length === 0) {
      throw new Error(`AnimData.xml "${sheet}" is missing frame size or durations`);
    }
    return { name, sheet, frameWidth, frameHeight, durations };
  });
}

async function download(dex: number, shiny: boolean, dir: string): Promise<void> {
  const base = `${POKEMON_SPRITE_BASE_URL}/${remotePath(dex, shiny)}`;
  const anims = parseAnimData(await (await fetchOk(`${base}/AnimData.xml`)).text());
  const sheets = [...new Set(anims.map((a) => a.sheet))];
  const pngs = await Promise.all(
    sheets.map(async (sheet) =>
      Buffer.from(await (await fetchOk(`${base}/${sheet}-Anim.png`)).arrayBuffer()),
    ),
  );

  // Write into a temp dir and rename, so a crash never leaves a half-filled entry.
  const tmp = `${dir}.tmp-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  sheets.forEach((sheet, i) => fs.writeFileSync(path.join(tmp, `${sheet}.png`), pngs[i]));
  const meta = anims.map(({ name, sheet, frameWidth, frameHeight, durations }) => ({
    name,
    sheet,
    frameWidth,
    frameHeight,
    durations,
  }));
  fs.writeFileSync(path.join(tmp, META_FILE), JSON.stringify(meta));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmp, dir);
}

function readCached(dir: string): PokemonAnimSheet[] {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, META_FILE), 'utf-8')) as Array<
    AnimMeta & { sheet: string }
  >;
  const now = new Date();
  fs.utimesSync(dir, now, now); // mark as recently used for eviction
  return meta.map(({ sheet, ...anim }) => ({
    ...anim,
    png: fs.readFileSync(path.join(dir, `${sheet}.png`)).toString('base64'),
  }));
}

function evictOldEntries(root: string): void {
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.includes('.tmp-'))
    .map((e) => ({
      dir: path.join(root, e.name),
      mtime: fs.statSync(path.join(root, e.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const { dir } of entries.slice(POKEMON_CACHE_MAX_ENTRIES)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const inFlight = new Map<string, Promise<PokemonAnimSheet[]>>();

/** Sprite sheets for one species/shininess, from cache or downloaded once. */
export function loadPokemonSprites(dex: number, shiny: boolean): Promise<PokemonAnimSheet[]> {
  const key = `${dex}${shiny ? 's' : ''}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const root = cacheRoot();
    const dir = path.join(root, key);
    if (!fs.existsSync(path.join(dir, META_FILE))) {
      fs.mkdirSync(root, { recursive: true });
      await download(dex, shiny, dir);
      evictOldEntries(root);
    }
    return readCached(dir);
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** Build the `pokemonSpritesLoaded` reply for a client request. Never throws:
 *  a failed download reports `error` so the client keeps its fallback sprite. */
export async function pokemonSpritesMessage(
  dex: number,
  shiny: boolean,
): Promise<Record<string, unknown>> {
  try {
    return {
      type: 'pokemonSpritesLoaded',
      dex,
      shiny,
      anims: await loadPokemonSprites(dex, shiny),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[aAgent] Pokémon #${dex}${shiny ? ' (shiny)' : ''} sprites failed: ${error}`);
    return { type: 'pokemonSpritesLoaded', dex, shiny, anims: [], error };
  }
}
