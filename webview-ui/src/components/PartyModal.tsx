import { useEffect, useState } from 'react';

import { POKEMON_MINI_ICON_URL } from '../constants.js';
import type { OfficeState } from '../office/engine/officeState.js';
import type { Character } from '../office/types.js';
import { characterPokemon } from '../pokemon/sprites.js';
import type { AgentStatus } from '../pokemon/status.js';
import { agentLevel, agentStatus, agentVitals, STATUS_LABEL } from '../pokemon/status.js';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  officeState: OfficeState;
  agents: number[];
  /** Select the agent, follow it with the camera and focus its terminal. */
  onSelectAgent: (id: number) => void;
}

/** Agents needing the user first, then working ones, then sleeping ones. */
const STATUS_ORDER: Record<AgentStatus, number> = { att: 0, fini: 1, act: 2, som: 3 };

/** The Black/White party screen: one slot per agent. */
export function PartyModal({
  isOpen,
  onClose,
  officeState,
  agents,
  onSelectAgent,
}: PartyModalProps) {
  // Agents change state continuously; refresh the slots while open
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setTick((n) => n + 1), 500);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const members = agents
    .map((id) => officeState.characters.get(id))
    .filter((ch): ch is Character => !!ch && !ch.isSubagent)
    .sort((a, b) => STATUS_ORDER[agentStatus(a)] - STATUS_ORDER[agentStatus(b)]);
  const sleeping = members.filter((ch) => agentStatus(ch) === 'som').length;

  return (
    <>
      <div className="fixed inset-0 bg-black/55" style={{ zIndex: 60 }} onClick={onClose} />
      <div
        className="bw bw-modal bw-party"
        style={{ width: 'min(820px, 94vw)', maxHeight: '88vh' }}
        role="dialog"
        aria-label="Équipe"
      >
        <div className="bw-modal-head bw-text-light">
          <span style={{ fontWeight: 700 }}>ÉQUIPE</span>
          <span className="ml-auto bw-dim-light" style={{ fontSize: 15 }}>
            {members.length} agent{members.length > 1 ? 's' : ''} · {sleeping} endormi
            {sleeping > 1 ? 's' : ''}
          </span>
        </div>
        <div
          className="grid gap-10 p-12 overflow-y-auto pixel-scrollbar"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))' }}
        >
          {members.length === 0 && (
            <p className="bw-text-light" style={{ fontSize: 20, margin: 8 }}>
              Aucun agent pour l'instant. Lance-en un avec la Poké Ball !
            </p>
          )}
          {members.map((ch) => (
            <PartySlot key={ch.id} ch={ch} onSelect={() => onSelectAgent(ch.id)} />
          ))}
        </div>
        <div className="bw-modal-foot party">
          <span className="bw-text-light" style={{ fontSize: 17 }}>
            Touche un Pokémon pour ouvrir son terminal.
          </span>
          <button
            className="bw-btn danger ml-auto"
            style={{ fontSize: 16, padding: '4px 22px' }}
            onClick={onClose}
          >
            RETOUR
          </button>
        </div>
      </div>
    </>
  );
}

function PartySlot({ ch, onSelect }: { ch: Character; onSelect: () => void }) {
  const pokemon = characterPokemon(ch);
  const status = agentStatus(ch);
  const vitals = agentVitals(ch);
  return (
    <button className={`bw-slot ${status}`} onClick={onSelect}>
      <div className="grid place-items-center" style={{ gridRow: 'span 3' }}>
        {pokemon ? (
          <img
            src={`${POKEMON_MINI_ICON_URL}/${pokemon.dex}.png`}
            alt=""
            width={56}
            height={42}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span className="bw-ball mini" />
        )}
      </div>
      <div className="flex items-baseline gap-6" style={{ fontSize: 18, fontWeight: 700 }}>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap bw-slot-name">
          {(pokemon?.name ?? 'Agent').toUpperCase()}
        </span>
        {pokemon?.gender && (
          <span className={`bw-gender ${pokemon.gender}`}>
            {pokemon.gender === 'male' ? '♂' : '♀'}
          </span>
        )}
        {pokemon?.shiny && <span className="bw-star">★</span>}
        <span className="ml-auto" style={{ fontSize: 15 }}>
          N.{agentLevel(ch)}
        </span>
      </div>
      <div className="flex items-center gap-6 bw-sub" style={{ fontSize: 14 }}>
        <span className={`bw-badge ${status}`}>{STATUS_LABEL[status]}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {ch.folderName ?? '—'}
        </span>
        <span className="ml-auto">{vitals.contextText}</span>
      </div>
      <div className="bw-hp">
        <span className="bw-hp-label">PV</span>
        <div className="bw-hp-track">
          <div className={`bw-hp-fill ${vitals.hpTier}`} style={{ width: `${vitals.hp * 100}%` }} />
        </div>
      </div>
    </button>
  );
}
