import { useEffect } from 'react';

import { POKEMON_ICON_URL } from '../constants.js';
import { requestPokedex, usePokedex } from '../pokemon/pokedex.js';
import { POKEDEX_SPECIES_COUNT, speciesName } from '../pokemon/roll.js';
import { Modal } from './ui/Modal.js';

interface PokedexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Every species that has appeared as an agent, across all sessions. */
export function PokedexModal({ isOpen, onClose }: PokedexModalProps) {
  const { seen, shiny } = usePokedex();

  useEffect(() => {
    if (isOpen) requestPokedex();
  }, [isOpen]);

  const species = [...seen].sort((a, b) => a - b);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pokédex ${seen.size} / ${POKEDEX_SPECIES_COUNT}${shiny.size ? ` · ★ ${shiny.size}` : ''}`}
    >
      {species.length === 0 ? (
        <p className="text-base px-10 py-8 m-0">No Pokémon seen yet. Start an agent!</p>
      ) : (
        <div
          className="p-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 8,
            width: 'min(640px, 85vw)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {species.map((dex) => {
            const isShiny = shiny.has(dex);
            return (
              <div key={dex} className="flex flex-col items-center text-2xs text-center">
                <img
                  src={`${POKEMON_ICON_URL}/${isShiny ? 'shiny/' : ''}${dex}.png`}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span>
                  #{dex} {speciesName(dex) ?? ''}
                  {isShiny ? ' ★' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
