/** PMDCollab SpriteCollab animations an agent's Pokémon uses. Only these sheets
 *  are downloaded, keeping the per-species cache around 30 KB. */
export const POKEMON_ANIMS = ['Walk', 'Idle', 'Sleep', 'Charge'] as const;
export type PokemonAnim = (typeof POKEMON_ANIMS)[number];

/** Highest National Dex number a sprite request may name. */
export const POKEMON_MAX_DEX = 1025;
