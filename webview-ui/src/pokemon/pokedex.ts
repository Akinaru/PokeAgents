/**
 * Client copy of the persisted Pokédex. Newly seen forms are added locally at
 * once and sent to the server, which stores them in ~/.aagent/pokedex.json.
 */
import { useSyncExternalStore } from 'react';

import type { PokedexLoaded } from '../../../core/src/messages.js';
import { transport } from '../transport/index.js';
import type { PokemonForm } from './roll.js';

interface PokedexSnapshot {
  seen: ReadonlySet<number>;
  shiny: ReadonlySet<number>;
}

let snapshot: PokedexSnapshot = { seen: new Set(), shiny: new Set() };
const listeners = new Set<() => void>();

function update(seen: Iterable<number>, shiny: Iterable<number>): void {
  snapshot = {
    seen: new Set([...snapshot.seen, ...seen]),
    shiny: new Set([...snapshot.shiny, ...shiny]),
  };
  listeners.forEach((notify) => notify());
}

export function markPokemonSeen(form: PokemonForm): void {
  if (snapshot.seen.has(form.dex) && (!form.shiny || snapshot.shiny.has(form.dex))) return;
  update([form.dex], form.shiny ? [form.dex] : []);
  transport.send({ type: 'recordPokemonSeen', dex: form.dex, shiny: form.shiny });
}

export function onPokedexLoaded(msg: PokedexLoaded): void {
  update(msg.seen, msg.shiny);
}

export function requestPokedex(): void {
  transport.send({ type: 'requestPokedex' });
}

const subscribe = (notify: () => void): (() => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export function usePokedex(): PokedexSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
