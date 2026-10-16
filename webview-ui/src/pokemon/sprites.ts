/**
 * Pokémon overworld sprites for agent characters.
 *
 * Sheets are requested from the server on first use (it downloads and caches
 * them) and decoded once into raw pixels. Frames are cut into SpriteData lazily
 * and memoized, so the regular sprite cache, outline and spawn effect work on
 * Pokémon unchanged — and only frames actually shown are ever built.
 */
import type { PokemonSpritesLoaded } from '../../../core/src/messages.js';
import type { PokemonAnim } from '../../../core/src/pokemon/constants.js';
import { POKEMON_ANIMS } from '../../../core/src/pokemon/constants.js';
import {
  POKEMON_ACTION_SLOWDOWN,
  POKEMON_GROUND_OFFSET_PX,
  POKEMON_IDLE_MAX_SEC,
  POKEMON_IDLE_MIN_SEC,
  POKEMON_TICKS_PER_SEC,
} from '../constants.js';
import { isReadingTool } from '../office/engine/characters.js';
import type { Character, Pet, SpriteData } from '../office/types.js';
import { CharacterState, Direction, PetState } from '../office/types.js';
import { transport } from '../transport/index.js';
import { dailySeed } from './daily.js';
import { startPokemonEffect } from './effects.js';
import { emitPokemonMoment } from './moments.js';
import { markPokemonSeen } from './pokedex.js';
import type { PokemonForm } from './roll.js';
import { evolutionStage, pokemonForm, rollPokemon } from './roll.js';

interface Sheet {
  pixels: Uint8ClampedArray;
  width: number;
  frameWidth: number;
  frameHeight: number;
  rows: number;
  durations: number[];
  totalTicks: number;
  /** Interned '#rrggbb' strings: every frame of the sheet shares one instance per color. */
  colors: Map<number, string>;
  frames: Map<number, SpriteData>;
}

type Entry =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; anims: Record<PokemonAnim, Sheet> };

const entries = new Map<string, Entry>();

/** PMD sheet rows run clockwise from facing down; the engine has 4 directions. */
const DIRECTION_ROW: Record<Direction, number> = {
  [Direction.DOWN]: 0,
  [Direction.RIGHT]: 2,
  [Direction.UP]: 4,
  [Direction.LEFT]: 6,
};

const formKey = (dex: number, shiny: boolean): string => `${dex}${shiny ? 's' : ''}`;

async function decodeSheet(anim: {
  png: string;
  frameWidth: number;
  frameHeight: number;
  durations: number[];
}): Promise<Sheet> {
  const bytes = Uint8Array.from(atob(anim.png), (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return {
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    width: canvas.width,
    frameWidth: anim.frameWidth,
    frameHeight: anim.frameHeight,
    rows: Math.max(1, Math.floor(canvas.height / anim.frameHeight)),
    durations: anim.durations,
    totalTicks: anim.durations.reduce((sum, d) => sum + d, 0),
    colors: new Map(),
    frames: new Map(),
  };
}

/** Handle the server's `pokemonSpritesLoaded` reply. */
export async function onPokemonSpritesLoaded(msg: PokemonSpritesLoaded): Promise<void> {
  const key = formKey(msg.dex, msg.shiny);
  try {
    const byName = new Map(msg.anims.map((a) => [a.name, a]));
    const decoded = await Promise.all(
      POKEMON_ANIMS.map((name) => {
        const anim = byName.get(name);
        if (!anim) throw new Error(`missing ${name} sheet`);
        return decodeSheet(anim);
      }),
    );
    entries.set(key, {
      status: 'ready',
      anims: Object.fromEntries(POKEMON_ANIMS.map((name, i) => [name, decoded[i]])) as Record<
        PokemonAnim,
        Sheet
      >,
    });
  } catch (err) {
    console.warn(`[aAgent] Pokémon #${msg.dex} sprites unusable:`, err);
    entries.set(key, { status: 'failed' });
  }
}

/** Cut one frame, cropped at the ground line so the engine's bottom-center
 *  anchor puts the Pokémon's feet on the tile. */
function buildFrame(sheet: Sheet, row: number, col: number): SpriteData {
  const height = Math.min(sheet.frameHeight, sheet.frameHeight / 2 + POKEMON_GROUND_OFFSET_PX);
  const x0 = col * sheet.frameWidth;
  const y0 = row * sheet.frameHeight;
  const frame: SpriteData = [];
  for (let y = 0; y < height; y++) {
    const line: string[] = new Array<string>(sheet.frameWidth);
    for (let x = 0; x < sheet.frameWidth; x++) {
      const i = ((y0 + y) * sheet.width + x0 + x) * 4;
      if (sheet.pixels[i + 3] === 0) {
        line[x] = '';
        continue;
      }
      const rgb = (sheet.pixels[i] << 16) | (sheet.pixels[i + 1] << 8) | sheet.pixels[i + 2];
      let color = sheet.colors.get(rgb);
      if (!color) {
        color = `#${rgb.toString(16).padStart(6, '0')}`;
        sheet.colors.set(rgb, color);
      }
      line[x] = color;
    }
    frame.push(line);
  }
  return frame;
}

/** Frame of a sheet at `ticks` into the animation (clamped to the last frame). */
function sheetFrame(sheet: Sheet, dir: Direction, ticks: number): SpriteData {
  let t = ticks;
  let col = 0;
  while (col < sheet.durations.length - 1 && t >= sheet.durations[col]) {
    t -= sheet.durations[col];
    col++;
  }
  const row = sheet.rows === 1 ? 0 : Math.min(DIRECTION_ROW[dir], sheet.rows - 1);
  const key = row * sheet.durations.length + col;
  let frame = sheet.frames.get(key);
  if (!frame) {
    frame = buildFrame(sheet, row, col);
    sheet.frames.set(key, frame);
  }
  return frame;
}

/**
 * Animation pacing. Looping PMD idle/charge sheets reads as constant fidgeting,
 * so a still Pokémon holds its rest pose (Idle frame 0) and only plays:
 *  - its Idle cycle once every few seconds, as a small sign of life;
 *  - its Charge cycle once, slowed down, each time it starts a writing tool.
 */
interface Pacing {
  oneShot: { anim: PokemonAnim; startSec: number } | null;
  nextIdleSec: number;
  lastTool: string | null;
}

const pacing = new WeakMap<Character, Pacing>();

const randomIdleDelay = (): number =>
  POKEMON_IDLE_MIN_SEC + Math.random() * (POKEMON_IDLE_MAX_SEC - POKEMON_IDLE_MIN_SEC);

/** A resting agent's Pokémon sleeps wherever it settled (it still walks to its spot). */
export function isPokemonAsleep(ch: Character): boolean {
  return !ch.isActive && ch.state !== CharacterState.WALK;
}

function pokemonFrame(
  ch: Character,
  anims: Record<PokemonAnim, Sheet>,
  timeSec: number,
): SpriteData {
  const loopTicks = (sheet: Sheet): number =>
    Math.floor(timeSec * POKEMON_TICKS_PER_SEC) % sheet.totalTicks;
  if (ch.state === CharacterState.WALK)
    return sheetFrame(anims.Walk, ch.dir, loopTicks(anims.Walk));
  if (isPokemonAsleep(ch)) return sheetFrame(anims.Sleep, ch.dir, loopTicks(anims.Sleep));

  let p = pacing.get(ch);
  if (!p) {
    p = { oneShot: null, nextIdleSec: timeSec + randomIdleDelay(), lastTool: null };
    pacing.set(ch, p);
  }
  if (ch.currentTool !== p.lastTool) {
    p.lastTool = ch.currentTool;
    if (ch.state === CharacterState.TYPE && ch.currentTool && !isReadingTool(ch.currentTool)) {
      p.oneShot = { anim: 'Charge', startSec: timeSec };
      startPokemonEffect(ch, 'work');
    }
  }
  if (!p.oneShot && timeSec >= p.nextIdleSec) {
    p.oneShot = { anim: 'Idle', startSec: timeSec };
    p.nextIdleSec = timeSec + randomIdleDelay();
  }
  if (p.oneShot) {
    const sheet = anims[p.oneShot.anim];
    const slowdown = p.oneShot.anim === 'Charge' ? POKEMON_ACTION_SLOWDOWN : 1;
    const ticks = ((timeSec - p.oneShot.startSec) * POKEMON_TICKS_PER_SEC) / slowdown;
    if (ticks < sheet.totalTicks) return sheetFrame(sheet, ch.dir, ticks);
    p.oneShot = null;
  }
  return sheetFrame(anims.Idle, ch.dir, 0);
}

/** Highest stage each character reached with today's Pokémon, so a compacted
 *  context never devolves it. A new day (new seed) starts over. */
const reachedStage = new WeakMap<Character, { seed: number; stage: number }>();

/** The form a character shows right now, or null when it has no Pokémon seed. */
export function characterPokemon(ch: Character): PokemonForm | null {
  if (ch.seed === undefined) return null;
  // A new Pokémon every day: the session seed is mixed with today's date
  const seed = dailySeed(ch.seed);
  const rolled = rollPokemon(seed);
  // Sub-agents are the base form of their parent's line.
  if (ch.isSubagent) return pokemonForm(rolled, 0);
  const ratio = ch.maxContextTokens > 0 ? ch.contextTokens / ch.maxContextTokens : 0;
  const reached = reachedStage.get(ch);
  const previous = reached?.seed === seed ? reached.stage : undefined;
  const stage = Math.max(previous ?? 0, evolutionStage(rolled, ratio));
  const form = pokemonForm(rolled, stage);
  if (previous === undefined || stage > previous) {
    reachedStage.set(ch, { seed, stage });
    markPokemonSeen(form, ch.folderName, seed);
    if (previous !== undefined) {
      startPokemonEffect(ch, 'evolve');
      const from = pokemonForm(rolled, previous);
      emitPokemonMoment({ kind: 'evolve', agentId: ch.id, from, to: form, folder: ch.folderName });
    } else if (form.shiny) {
      startPokemonEffect(ch, 'shiny');
      emitPokemonMoment({ kind: 'shiny', agentId: ch.id, form, folder: ch.folderName });
    }
  }
  return form;
}

/** Current Pokémon frame for a character, or null to fall back to the human
 *  sprite (no seed, sheets still loading, or download failed). */
export function getPokemonSprite(ch: Character, timeSec: number): SpriteData | null {
  const form = characterPokemon(ch);
  const anims = form && formAnims(form);
  return anims ? pokemonFrame(ch, anims, timeSec) : null;
}

/** A form's decoded sheets, requested from the server on first use. */
function formAnims(form: PokemonForm): Record<PokemonAnim, Sheet> | null {
  const key = formKey(form.dex, form.shiny);
  const entry = entries.get(key);
  if (!entry) {
    entries.set(key, { status: 'loading' });
    transport.send({ type: 'requestPokemonSprites', dex: form.dex, shiny: form.shiny });
    return null;
  }
  return entry.status === 'ready' ? entry.anims : null;
}

/** Per wild Pokémon: when its next Idle cycle plays. */
const wildIdle = new WeakMap<Pet, { startSec: number; nextSec: number }>();

/** Frame of a wild Pokémon (a Pet with `pokemon` set), or null while loading. */
export function getWildPokemonSprite(pet: Pet, timeSec: number): SpriteData | null {
  const anims = pet.pokemon && formAnims(pet.pokemon);
  if (!anims) return null;
  if (pet.state !== PetState.IDLE) {
    const walk = anims.Walk;
    return sheetFrame(walk, pet.dir, Math.floor(timeSec * POKEMON_TICKS_PER_SEC) % walk.totalTicks);
  }
  // Same pacing as agents: rest pose, with its Idle cycle now and then
  let idle = wildIdle.get(pet);
  if (!idle) {
    idle = { startSec: -Infinity, nextSec: timeSec + randomIdleDelay() };
    wildIdle.set(pet, idle);
  }
  if (timeSec >= idle.nextSec) {
    idle.startSec = timeSec;
    idle.nextSec = timeSec + randomIdleDelay();
  }
  const ticks = (timeSec - idle.startSec) * POKEMON_TICKS_PER_SEC;
  return sheetFrame(anims.Idle, pet.dir, ticks < anims.Idle.totalTicks ? ticks : 0);
}
