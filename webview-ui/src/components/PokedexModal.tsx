import { useEffect, useMemo, useRef, useState } from 'react';

import type { PokedexEntry } from '../../../core/src/messages.js';
import {
  POKEMON_ANIMATED_URL,
  POKEMON_EVOLUTION_THRESHOLDS,
  POKEMON_MINI_ICON_URL,
  POKEMON_TYPES,
} from '../constants.js';
import { requestPokedex, usePokedex } from '../pokemon/pokedex.js';
import { ALL_SPECIES, POKEDEX_SPECIES_COUNT, speciesInfo, speciesStage } from '../pokemon/roll.js';

interface PokedexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const spriteUrl = (dex: number, shiny: boolean): string =>
  `${POKEMON_ANIMATED_URL}/${shiny ? 'shiny/' : ''}${dex}.gif`;
const pad = (dex: number): string => String(dex).padStart(3, '0');

/** Black/White Pokédex: species list on the left, the selected species' card on the right. */
export function PokedexModal({ isOpen, onClose }: PokedexModalProps) {
  const entries = usePokedex();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) requestPokedex();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bring the selected species into view when the Pokédex opens
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() =>
      listRef.current?.querySelector('.current')?.scrollIntoView({ block: 'center' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [isOpen, entries.size]);

  const shinyCount = useMemo(() => [...entries.values()].filter((e) => e.shiny).length, [entries]);
  if (!isOpen) return null;

  const current = selected !== null && entries.has(selected) ? selected : [...entries.keys()][0];
  const entry = current !== undefined ? entries.get(current) : undefined;

  return (
    <>
      <div className="fixed inset-0 bg-black/55" style={{ zIndex: 60 }} onClick={onClose} />
      <div
        className="bw bw-modal bw-dex-grid"
        style={{ width: 'min(900px, 94vw)', height: 'min(600px, 88vh)' }}
        role="dialog"
        aria-label="Pokédex"
      >
        <div className="bw-modal-head dex bw-text-light">
          <span className="bw-ball mini" aria-hidden="true" />
          <span style={{ fontWeight: 700 }}>POKéDEX NATIONAL</span>
          <span className="ml-auto bw-counter" style={{ fontSize: 17 }}>
            VUS {entries.size} / {POKEDEX_SPECIES_COUNT} · ★ {shinyCount}
          </span>
        </div>

        <div
          className="flex-1 min-h-0 grid gap-12 p-12"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)' }}
        >
          <div
            ref={listRef}
            className="min-h-0 overflow-y-auto pixel-scrollbar flex flex-col gap-3 pr-4"
          >
            {ALL_SPECIES.map((s) => {
              const seen = entries.get(s.dex);
              return seen ? (
                <button
                  key={s.dex}
                  className={`bw-dex-row ${s.dex === current ? 'current' : ''}`}
                  onClick={() => setSelected(s.dex)}
                >
                  <img
                    src={`${POKEMON_MINI_ICON_URL}/${s.dex}.png`}
                    alt=""
                    width={40}
                    height={30}
                    loading="lazy"
                    style={{ imageRendering: 'pixelated', margin: '-8px 0' }}
                  />
                  <span>{pad(s.dex)}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {s.name}
                    {seen.shiny ? ' ★' : ''}
                  </span>
                </button>
              ) : (
                <div
                  key={s.dex}
                  className="bw-dex-row unseen"
                  aria-label={`N° ${pad(s.dex)} inconnu`}
                >
                  <span />
                  <span>{pad(s.dex)}</span>
                  <span>– – –</span>
                </div>
              );
            })}
          </div>

          {entry ? (
            <SpeciesCard entry={entry} />
          ) : (
            <div className="bw-info-box self-start">
              <div className="bw-text-light">
                Aucun Pokémon rencontré pour l'instant. Lance un agent avec la Poké Ball !
              </div>
            </div>
          )}
        </div>

        <div className="bw-modal-foot justify-end">
          <button
            className="bw-btn danger"
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

function SpeciesCard({ entry }: { entry: PokedexEntry }) {
  const species = speciesInfo(entry.dex);
  if (!species) return null;
  const next = species.evolutions.map((e) => e.name).join(' ou ');
  const threshold = POKEMON_EVOLUTION_THRESHOLDS[speciesStage(species)];
  const since = new Date(entry.first);
  const sinceText = since.getTime() > 0 ? since.toLocaleDateString('fr-FR') : '—';

  return (
    <div className="flex flex-col gap-10 min-h-0">
      <div className="bw-dex-card">
        <div className="bw-dex-card-head">
          <span>
            N°{pad(entry.dex)} {species.name.toUpperCase()}
          </span>
          {entry.shiny && <span className="bw-star">★</span>}
        </div>
        <div className="grid gap-8 p-10" style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}>
          <div className="bw-sprite-stage">
            <img
              src={spriteUrl(entry.dex, entry.shiny)}
              alt={species.name}
              width={144}
              height={144}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="flex flex-col gap-6 bw-text-dark" style={{ fontSize: 16 }}>
            <span className="bw-genus">{species.genus}</span>
            <div className="flex gap-4 flex-wrap">
              {species.types.map((t) => (
                <span
                  key={t}
                  className="bw-type"
                  style={{
                    ['--type' as string]: POKEMON_TYPES[t]?.color,
                    ['--type-top' as string]: POKEMON_TYPES[t]?.top,
                  }}
                >
                  {POKEMON_TYPES[t]?.name}
                </span>
              ))}
            </div>
            <Stat label="Rencontres" value={String(entry.count)} />
            <Stat label="Chromatique" value={entry.shiny ? 'Oui ★' : 'Non'} />
            <Stat label="Depuis" value={sinceText} />
            <Stat
              label="Évolue"
              value={next && threshold !== undefined ? `${Math.round(threshold * 100)} %` : '—'}
            />
          </div>
        </div>
      </div>
      <div className="bw-info-box">
        <div className="bw-text-light">
          {entry.projects.length > 0
            ? `Apparu dans ${entry.projects.join(', ')}.`
            : 'Apparu dans tes projets.'}{' '}
          {next && threshold !== undefined
            ? `Il évolue en ${next.toUpperCase()} à ${Math.round(threshold * 100)} % de contexte.`
            : 'Il n’évolue pas.'}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bw-stat">
      <span className="bw-muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
