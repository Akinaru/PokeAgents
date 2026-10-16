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
import { POKEMON_GROUND_OFFSET_PX, POKEMON_TICKS_PER_SEC } from '../constants.js';
import { isReadingTool } from '../office/engine/characters.js';
import type { Character, SpriteData } from '../office/types.js';
import { CharacterState, Direction } from '../office/types.js';
import { transport } from '../transport/index.js';
import { startPokemonEffect } from './effects.js';
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

function sheetFrame(sheet: Sheet, dir: Direction, ticks: number): SpriteData {
  let t = ticks % sheet.totalTicks;
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

function animFor(ch: Character): PokemonAnim {
  switch (ch.state) {
    case CharacterState.WALK:
      return 'Walk';
    case CharacterState.TYPE:
      if (!ch.isActive) return 'Sleep'; // resting on its spot between turns
      return isReadingTool(ch.currentTool) ? 'Idle' : 'Charge';
    default:
      return ch.bubbleType === 'waiting' && ch.waitingAwaitingInput ? 'Sleep' : 'Idle';
  }
}

/** Highest stage each character reached, so a compacted context never devolves it. */
const reachedStage = new WeakMap<Character, number>();

/** The form a character shows right now, or null when it has no Pokémon seed. */
export function characterPokemon(ch: Character): PokemonForm | null {
  if (ch.seed === undefined) return null;
  const rolled = rollPokemon(ch.seed);
  // Sub-agents are the base form of their parent's line.
  if (ch.isSubagent) return pokemonForm(rolled, 0);
  const ratio = ch.maxContextTokens > 0 ? ch.contextTokens / ch.maxContextTokens : 0;
  const previous = reachedStage.get(ch);
  const stage = Math.max(previous ?? 0, evolutionStage(rolled, ratio));
  const form = pokemonForm(rolled, stage);
  if (previous === undefined || stage > previous) {
    reachedStage.set(ch, stage);
    markPokemonSeen(form);
    if (previous !== undefined) startPokemonEffect(ch, 'evolve');
    else if (form.shiny) startPokemonEffect(ch, 'shiny');
  }
  return form;
}

/** Current Pokémon frame for a character, or null to fall back to the human
 *  sprite (no seed, sheets still loading, or download failed). */
export function getPokemonSprite(ch: Character, timeSec: number): SpriteData | null {
  const form = characterPokemon(ch);
  if (!form) return null;
  const key = formKey(form.dex, form.shiny);
  const entry = entries.get(key);
  if (!entry) {
    entries.set(key, { status: 'loading' });
    transport.send({ type: 'requestPokemonSprites', dex: form.dex, shiny: form.shiny });
    return null;
  }
  if (entry.status !== 'ready') return null;
  // Offset each character's clock so identical Pokémon don't animate in lockstep.
  const ticks = Math.floor(timeSec * POKEMON_TICKS_PER_SEC) + Math.abs(ch.id) * 7;
  return sheetFrame(entry.anims[animFor(ch)], ch.dir, ticks);
}
