import { useEffect, useMemo, useRef, useState } from 'react';

import type { PokedexEntry } from '../../../core/src/messages.js';
import {
  POKEMON_EVOLUTION_THRESHOLDS,
  POKEMON_MINI_ICON_URL,
  POKEMON_SHINY_RATE,
  POKEMON_TYPES,
} from '../constants.js';
import { requestPokedex, usePokedex } from '../pokemon/pokedex.js';
import type { Rarity } from '../pokemon/roll.js';
import {
  ALL_SPECIES,
  encounterRate,
  POKEDEX_SPECIES_COUNT,
  speciesInfo,
  speciesRarity,
  speciesStage,
} from '../pokemon/roll.js';
import { animatedPokemonUrl } from '../pokemon/sprites.js';

interface PokedexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pad = (dex: number): string => String(dex).padStart(3, '0');
/** "1 sur 21 125": odds a new agent lands on this species. */
const odds = (rate: number): string => `1 sur ${Math.round(1 / rate).toLocaleString('fr-FR')}`;

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  veryRare: 'Très rare',
  legendary: 'Légendaire',
};

type Filter = 'all' | 'seen' | 'missing' | 'legendary' | 'shiny';
const FILTERS: Array<[Filter, string]> = [
  ['all', 'TOUS'],
  ['seen', 'VUS'],
  ['missing', 'À TROUVER'],
  ['legendary', '◆ LÉGENDAIRES'],
  ['shiny', '★ CHROMAS'],
];
const LEGENDARY_COUNT = ALL_SPECIES.filter((s) => s.legendary).length;

/** Black/White Pokédex: species list on the left, the selected species' card on the right. */
export function PokedexModal({ isOpen, onClose }: PokedexModalProps) {
  const entries = usePokedex();
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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
  const legendarySeen = useMemo(
    () => [...entries.keys()].filter((dex) => speciesInfo(dex)?.legendary).length,
    [entries],
  );
  const shown = useMemo(
    () =>
      ALL_SPECIES.filter((s) => {
        const seen = entries.get(s.dex);
        if (filter === 'seen') return !!seen;
        if (filter === 'missing') return !seen;
        if (filter === 'legendary') return s.legendary;
        if (filter === 'shiny') return !!seen?.shiny;
        return true;
      }),
    [entries, filter],
  );
  if (!isOpen) return null;

  const current = selected ?? [...entries.keys()].sort((a, b) => a - b)[0] ?? ALL_SPECIES[0]?.dex;

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
            VUS {entries.size} / {POKEDEX_SPECIES_COUNT} · ◆ {legendarySeen} / {LEGENDARY_COUNT} · ★{' '}
            {shinyCount}
          </span>
        </div>

        <div
          className="flex-1 min-h-0 grid gap-12 p-12"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)' }}
        >
          <div className="min-h-0 flex flex-col gap-6">
            <div className="flex flex-wrap gap-4">
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  className={`bw-dex-filter ${filter === id ? 'active' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto pixel-scrollbar flex flex-col gap-3 pr-4"
            >
              {shown.map((s) => {
                const seen = entries.get(s.dex);
                return (
                  <button
                    key={s.dex}
                    className={`bw-dex-row r-${speciesRarity(s)} ${seen ? '' : 'unseen'} ${s.dex === current ? 'current' : ''}`}
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
                    </span>
                    <span className="bw-dex-marks">
                      {s.legendary && <span className="bw-dex-legend">◆</span>}
                      {seen?.shiny && <span className="bw-star">★</span>}
                    </span>
                  </button>
                );
              })}
              {shown.length === 0 && (
                <div className="bw-text-light" style={{ fontSize: 16, padding: 8 }}>
                  Rien ici pour l'instant.
                </div>
              )}
            </div>
          </div>

          {current !== undefined && <SpeciesCard dex={current} entry={entries.get(current)} />}
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

function SpeciesCard({ dex, entry }: { dex: number; entry?: PokedexEntry }) {
  const species = speciesInfo(dex);
  if (!species) return null;
  const next = species.evolutions.map((e) => e.name).join(' ou ');
  const threshold = POKEMON_EVOLUTION_THRESHOLDS[speciesStage(species)];
  const rarity = speciesRarity(species);
  const since = entry ? new Date(entry.first) : null;
  const sinceText = since && since.getTime() > 0 ? since.toLocaleDateString('fr-FR') : '—';

  return (
    <div className="flex flex-col gap-10 min-h-0">
      <div className="bw-dex-card">
        <div className="bw-dex-card-head">
          <span>
            N°{pad(dex)} {species.name.toUpperCase()}
          </span>
          <span className="flex gap-6">
            {species.legendary && <span className="bw-dex-legend">◆</span>}
            {entry?.shiny && <span className="bw-star">★</span>}
          </span>
        </div>
        <div className="grid gap-8 p-10" style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}>
          <div className={`bw-sprite-stage ${entry ? '' : 'unseen'}`}>
            <img
              src={animatedPokemonUrl(dex, !!entry?.shiny)}
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
            <Stat label="Rareté" value={RARITY_LABEL[rarity]} tone={`r-${rarity}`} />
            <Stat label="Chance / agent" value={odds(encounterRate(species))} />
            <Stat label="Rencontres" value={entry ? String(entry.count) : '0'} />
            <Stat
              label="Chromatique"
              value={entry?.shiny ? 'Obtenu ★' : `Pas encore (${odds(POKEMON_SHINY_RATE)})`}
            />
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
          {!entry
            ? 'Pas encore rencontré.'
            : entry.projects.length > 0
              ? `Apparu dans ${entry.projects.join(', ')}.`
              : 'Apparu dans tes projets.'}{' '}
          {species.parent && `S'obtient en faisant évoluer ${species.parent.name.toUpperCase()}.`}{' '}
          {next && threshold !== undefined
            ? `Il évolue en ${next.toUpperCase()} à ${Math.round(threshold * 100)} % de contexte.`
            : 'Il n’évolue pas.'}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bw-stat">
      <span className="bw-muted">{label}</span>
      <span className={tone} style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
