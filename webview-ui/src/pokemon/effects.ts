/** Short-lived visual effects on Pokémon characters (evolution flash, shiny sparkle). */
import { POKEMON_EVOLVE_EFFECT_SEC, POKEMON_SHINY_EFFECT_SEC } from '../constants.js';
import type { Character } from '../office/types.js';

export type PokemonEffectKind = 'evolve' | 'shiny';

const DURATION_SEC: Record<PokemonEffectKind, number> = {
  evolve: POKEMON_EVOLVE_EFFECT_SEC,
  shiny: POKEMON_SHINY_EFFECT_SEC,
};

const active = new WeakMap<Character, { kind: PokemonEffectKind; startSec: number }>();

export function startPokemonEffect(ch: Character, kind: PokemonEffectKind): void {
  active.set(ch, { kind, startSec: performance.now() / 1000 });
}

/** The character's running effect and its progress (0-1), or null once finished. */
export function pokemonEffect(
  ch: Character,
  nowSec: number,
): { kind: PokemonEffectKind; progress: number } | null {
  const effect = active.get(ch);
  if (!effect) return null;
  const progress = (nowSec - effect.startSec) / DURATION_SEC[effect.kind];
  if (progress >= 1) {
    active.delete(ch);
    return null;
  }
  return { kind: effect.kind, progress };
}
