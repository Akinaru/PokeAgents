/**
 * Pokémon moments the UI reacts to: a finished turn (dialogue box), an
 * evolution or a shiny reveal (full-screen scene). Emitted by the message
 * handler and by characterPokemon(), consumed by React components.
 */
import type { PokemonForm } from './roll.js';

export type PokemonMoment =
  | { kind: 'done'; agentId: number; name: string; folder?: string }
  | { kind: 'evolve'; agentId: number; from: PokemonForm; to: PokemonForm; folder?: string }
  | { kind: 'shiny'; agentId: number; form: PokemonForm; folder?: string };

const listeners = new Set<(moment: PokemonMoment) => void>();

export function emitPokemonMoment(moment: PokemonMoment): void {
  listeners.forEach((listener) => listener(moment));
}

export function onPokemonMoment(listener: (moment: PokemonMoment) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
