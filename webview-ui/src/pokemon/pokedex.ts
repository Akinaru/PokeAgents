/**
 * Client copy of the persisted Pokédex. Newly seen forms are added locally at
 * once and sent to the server, which stores them in ~/.pokeagents/pokedex.json.
 */
import { useSyncExternalStore } from 'react';

import type { PokedexEntry, PokedexLoaded } from '../../../core/src/messages.js';
import { transport } from '../transport/index.js';
import type { PokemonForm } from './roll.js';

let entries: ReadonlyMap<number, PokedexEntry> = new Map();
const listeners = new Set<() => void>();
/** Sightings already reported this session (seed + form), sent only once. */
const reported = new Set<string>();

function publish(next: Map<number, PokedexEntry>): void {
  entries = next;
  listeners.forEach((notify) => notify());
}

export function markPokemonSeen(
  form: PokemonForm,
  project: string | undefined,
  seed: number,
): void {
  const key = `${seed}:${form.dex}:${form.shiny}`;
  if (reported.has(key)) return;
  reported.add(key);
  const next = new Map(entries);
  const known = next.get(form.dex);
  next.set(form.dex, {
    dex: form.dex,
    count: (known?.count ?? 0) + 1,
    shiny: (known?.shiny ?? false) || form.shiny,
    first: known?.first ?? new Date().toISOString(),
    projects: project
      ? [...(known?.projects ?? []).filter((p) => p !== project), project]
      : (known?.projects ?? []),
  });
  publish(next);
  transport.send({ type: 'recordPokemonSeen', dex: form.dex, shiny: form.shiny, seed, project });
}

export function onPokedexLoaded(msg: PokedexLoaded): void {
  publish(new Map(msg.entries.map((e) => [e.dex, e])));
}

export function requestPokedex(): void {
  transport.send({ type: 'requestPokedex' });
}

const subscribe = (notify: () => void): (() => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export function usePokedex(): ReadonlyMap<number, PokedexEntry> {
  return useSyncExternalStore(subscribe, () => entries);
}
