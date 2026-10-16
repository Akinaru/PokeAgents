import { useEffect, useState } from 'react';

import {
  AGENT_BALLS,
  BATTLE_PARTY_SLOTS,
  ITEM_ICON_URL,
  POKEMON_EVOLUTION_THRESHOLDS,
  POKEMON_TYPES,
} from '../constants.js';
import { getActivityText } from '../office/agentActivityText.js';
import type { OfficeState } from '../office/engine/officeState.js';
import type { Character, ToolActivity } from '../office/types.js';
import { agentStats, MOVE_IDS, MOVES, natureOf } from '../pokemon/activity.js';
import type { PokemonForm } from '../pokemon/roll.js';
import { speciesInfo, speciesStage } from '../pokemon/roll.js';
import { animatedPokemonUrl, characterPokemon } from '../pokemon/sprites.js';
import type { AgentStatus } from '../pokemon/status.js';
import { agentLevel, agentStatus, agentVitals, STATUS_LABEL } from '../pokemon/status.js';

interface AgentBattleProps {
  officeState: OfficeState;
  /** Agent ids, in party order. */
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  agentId: number;
  routeName: string | undefined;
  onSelectAgent: (id: number) => void;
  onOpenTerminal: (id: number) => void;
  onOpenParty: () => void;
  onClose: () => void;
}

type Tab = 'infos' | 'memo' | 'moves' | 'stats';

const TABS: Array<[Tab, string, string]> = [
  ['infos', 'INFOS', 'xtransceiver'],
  ['memo', 'MÉMO', 'vs-recorder'],
  ['moves', 'CAPACITÉS', 'tm-normal'],
  ['stats', 'STATS', 'exp-share'],
];

const item = (name: string): string => `${ITEM_ICON_URL}/${name}.png`;
const animated = (form: PokemonForm): string => animatedPokemonUrl(form.dex, form.shiny);
const ballOf = (ch: Character): string => AGENT_BALLS[(ch.seed ?? ch.id) % AGENT_BALLS.length];
const pad = (n: number, width = 3): string => String(n).padStart(width, '0');
const clock = (ms: number): string =>
  new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function TypeBadge({ typeId }: { typeId: number }) {
  const t = POKEMON_TYPES[typeId];
  if (!t) return null;
  return (
    <span
      className="ab-type"
      style={{ ['--type' as string]: t.color, ['--type-top' as string]: t.top }}
    >
      {t.name}
    </span>
  );
}

function Sex({ form }: { form: PokemonForm | null }) {
  if (!form?.gender) return null;
  return <span className={`bw-gender ${form.gender}`}>{form.gender === 'male' ? '♂' : '♀'}</span>;
}

/** What the battle text box says, by status. */
function headline(name: string, status: AgentStatus): string {
  switch (status) {
    case 'att':
      return `${name} demande la permission !`;
    case 'som':
      return `${name} dort profondément…`;
    case 'fini':
      return `${name} a terminé sa tâche !`;
    default:
      return `Que doit faire ${name} ?`;
  }
}

function evolutionText(form: PokemonForm): string {
  const species = speciesInfo(form.dex);
  const threshold = species ? POKEMON_EVOLUTION_THRESHOLDS[speciesStage(species)] : undefined;
  if (!form.nextName || threshold === undefined) return 'Forme finale';
  return `${form.nextName.toUpperCase()} à ${Math.round(threshold * 100)} %`;
}

/**
 * Black/White battle screen for one agent, opened by clicking its Pokémon: the
 * battle top screen beside the touch menu, and its Summary with four tabs.
 */
export function AgentBattle({
  officeState,
  agents,
  agentTools,
  agentId,
  routeName,
  onSelectAgent,
  onOpenTerminal,
  onOpenParty,
  onClose,
}: AgentBattleProps) {
  const [view, setView] = useState<'battle' | 'summary'>('battle');
  const [tab, setTab] = useState<Tab>('infos');
  const [move, setMove] = useState(0);
  // Agents keep working while the screen is open: refresh twice a second
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 500);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const party = agents
    .map((id) => officeState.characters.get(id))
    .filter((c): c is Character => !!c && !c.isSubagent);
  const ch = officeState.characters.get(agentId);
  if (!ch) return null;
  const form = characterPokemon(ch);
  const name = (form?.name ?? 'Agent').toUpperCase();
  const status = agentStatus(ch);
  const vitals = agentVitals(ch);
  const activity = getActivityText(
    ch.id,
    agentTools,
    ch.isActive,
    ch.bubbleType,
    ch.waitingAwaitingInput ?? false,
  );
  const cycle = (step: number) => {
    const i = party.findIndex((c) => c.id === agentId);
    if (party.length > 0) onSelectAgent(party[(i + step + party.length) % party.length].id);
  };

  return (
    <div
      className="ab-overlay bw"
      onClick={onClose}
      role="dialog"
      aria-label={`${name} · ${ch.folderName ?? ''}`}
    >
      <div className="ab-ds" onClick={(e) => e.stopPropagation()}>
        {view === 'battle' ? (
          <>
            <Screen>
              <div className="ab-battle-bg" />
              <div className="ab-plat" />
              {form && (
                <img
                  className={`ab-foe ${status === 'som' ? 'asleep' : ''}`}
                  src={animated(form)}
                  alt={form.name}
                />
              )}
              {status === 'att' && (
                <span className="ab-emote ab-l" style={{ left: '78%', top: '12%' }}>
                  !
                </span>
              )}
              {status === 'som' && (
                <span className="ab-zz ab-l" style={{ left: '80%', top: '14%' }}>
                  Z<span style={{ fontSize: '.7em' }}>z</span>
                </span>
              )}
              <div className="ab-foe-hud">
                <div className="ab-row bw-text-dark ab-l">
                  <span className="ab-grow">{name}</span>
                  <Sex form={form} />
                  <span className="ab-m">
                    <span className="ab-lv">N.</span>
                    {agentLevel(ch)}
                  </span>
                </div>
                <div className="ab-row ab-xs">
                  <span className={`bw-badge ${status}`}>{STATUS_LABEL[status]}</span>
                  <span className="bw-text-dark ab-grow">{ch.folderName}</span>
                  <span className="bw-text-dark">{vitals.contextText}</span>
                </div>
                <div className="ab-hp ab-s">
                  <b>PV</b>
                  <span>
                    <i className={vitals.hpTier} style={{ width: `${vitals.hp * 100}%` }} />
                  </span>
                </div>
              </div>
              <div className="ab-textbox bw-text-light ab-l">
                <div>
                  {headline(name, status)}
                  <span className="ab-arrow" />
                </div>
                <div className="sub ab-s">{activity}</div>
              </div>
            </Screen>
            <div className="ab-hinge" />
            <Screen>
              <div className="ab-touch-bg" />
              <TopBar count={party.length} />
              <div className="ab-party">
                {Array.from({ length: Math.max(BATTLE_PARTY_SLOTS, party.length) }, (_, i) => {
                  const member = party[i];
                  if (!member) return <span key={`empty-${i}`} className="ab-ball empty" />;
                  const st = agentStatus(member);
                  return (
                    <button
                      key={member.id}
                      className={`ab-ball ${st} ${member.id === agentId ? 'on' : ''}`}
                      title={`${characterPokemon(member)?.name ?? 'Agent'} · ${member.folderName ?? ''}`}
                      onClick={() => onSelectAgent(member.id)}
                    >
                      <img src={item(ballOf(member))} alt="" />
                      {st === 'att' && <span className="tag">!</span>}
                      {st === 'som' && <span className="tag">Z</span>}
                    </button>
                  );
                })}
              </div>
              <button className="ab-oct ab-fight ab-xl" onClick={() => onOpenTerminal(ch.id)}>
                <span className="shine" />
                {status === 'att' ? 'RÉPONDRE !' : 'TERMINAL !'}
                <small>
                  {status === 'att'
                    ? 'Ouvre le terminal pour répondre'
                    : `Ouvre le terminal de ${ch.folderName ?? 'l’agent'}`}
                </small>
              </button>
              <button className="ab-oct ab-btn3 a ab-m" onClick={() => setView('summary')}>
                <img src={item('xtransceiver')} alt="" />
                RÉSUMÉ
              </button>
              <button className="ab-oct ab-btn3 b ab-m" onClick={onOpenParty}>
                <img src={item(ballOf(ch))} alt="" />
                ÉQUIPE
              </button>
              <button className="ab-oct ab-btn3 c ab-m" onClick={onClose}>
                <img src={item('escape-rope')} alt="" />
                FUITE
              </button>
            </Screen>
          </>
        ) : (
          <>
            <Screen>
              <SummaryTop ch={ch} form={form} name={name} status={status} />
            </Screen>
            <div className="ab-hinge" />
            <Screen>
              <div className="ab-sum-touch-bg" />
              <div className="ab-tabs" role="tablist">
                {TABS.map(([id, label, icon]) => (
                  <button
                    key={id}
                    className="ab-tab ab-xs"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    <img src={item(icon)} alt="" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="ab-panel" role="tabpanel">
                {tab === 'infos' && <InfosPage ch={ch} form={form} />}
                {tab === 'memo' && <MemoPage ch={ch} routeName={routeName} />}
                {tab === 'moves' && <MovesPage ch={ch} selected={move} onSelect={setMove} />}
                {tab === 'stats' && <StatsPage ch={ch} />}
              </div>
              <div className="ab-navbar ab-s">
                <button className="ab-oct" onClick={() => cycle(-1)} aria-label="Agent précédent">
                  ◀
                </button>
                <button className="ab-oct" onClick={() => cycle(1)} aria-label="Agent suivant">
                  ▶
                </button>
                <button className="ab-oct back" onClick={() => setView('battle')}>
                  <img src={item('escape-rope')} alt="" />
                  RETOUR
                </button>
              </div>
            </Screen>
          </>
        )}
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="ab-bezel">
      <div className="ab-screen">{children}</div>
    </div>
  );
}

function TopBar({ count }: { count: number }) {
  const now = new Date();
  return (
    <div className="ab-topbar ab-xs">
      <span>
        {pad(now.getHours(), 2)} : {pad(now.getMinutes(), 2)}
      </span>
      <span className="off">
        <i className="led" />
        IR
      </span>
      <span>
        <i className="led" />
        INTERNET
      </span>
      <span className="off">
        <i className="led" />
        SANS FIL
      </span>
      <span style={{ marginLeft: 'auto' }}>
        {count} AGENT{count > 1 ? 'S' : ''}
      </span>
      <span className="ab-battery" style={{ marginLeft: '.4em' }}>
        <i />
      </span>
    </div>
  );
}

function SummaryTop({
  ch,
  form,
  name,
  status,
}: {
  ch: Character;
  form: PokemonForm | null;
  name: string;
  status: AgentStatus;
}) {
  const species = form ? speciesInfo(form.dex) : undefined;
  const vitals = agentVitals(ch);
  const usedAll = MOVE_IDS.every((id) => ch.activity.moves[id].count > 0);
  const marks: Array<[string, boolean, string]> = [
    ['●', status === 'act', 'Au travail'],
    ['▲', !!species && speciesStage(species) > 0, 'A évolué'],
    ['■', usedAll, 'A utilisé ses 4 capacités'],
    ['♥', ch.tasksDone >= 10, '10 tâches finies'],
    ['★', !!form?.shiny, 'Chromatique'],
    ['◆', !!species?.legendary, 'Légendaire'],
  ];
  return (
    <>
      <div className="ab-sum-bg" />
      <div className="ab-plate bw-text-light ab-l">
        <img src={item(ballOf(ch))} alt="" />
        <span className="ab-grow">{name}</span>
        <Sex form={form} />
        <span className="ab-m">N.{agentLevel(ch)}</span>
      </div>
      <div className="ab-window">
        <div className="rays" />
        {form && <img src={animated(form)} alt={form.name} />}
      </div>
      <div className="ab-side ab-s">
        <div className="ab-box ab-row">
          {form?.types.map((t) => (
            <TypeBadge key={t} typeId={t} />
          ))}
        </div>
        <div className="ab-box ab-row bw-text-dark">
          <span className={`bw-badge ${status}`}>{STATUS_LABEL[status]}</span>
          <span className="ab-grow">{ch.folderName}</span>
        </div>
        <div className="ab-box bw-text-dark">
          <div className="ab-muted ab-xs">Vers l'évolution</div>
          <div className="ab-gauge">
            <i style={{ width: `${vitals.exp * 100}%` }} />
          </div>
        </div>
        <div className="ab-box ab-marks ab-m">
          {marks.map(([glyph, on, hint]) => (
            <span key={glyph} className={on ? 'on' : ''} title={hint}>
              {glyph}
            </span>
          ))}
        </div>
      </div>
      <div className="ab-ribbon bw-text-light ab-s">
        {form && <span>N° {pad(form.dex)}</span>}
        <span className="genus ab-grow">{form?.genus}</span>
        {form?.shiny && <span>★ CHROMATIQUE</span>}
      </div>
    </>
  );
}

function InfosPage({ ch, form }: { ch: Character; form: PokemonForm | null }) {
  const vitals = agentVitals(ch);
  return (
    <>
      <div className="ab-kv bw-text-dark ab-s">
        <b>N° POKéDEX</b>
        <span>{form ? `${pad(form.dex)} · ${form.name.toUpperCase()}` : '—'}</span>
      </div>
      <div className="ab-kv bw-text-dark ab-s">
        <b>TYPE</b>
        <span className="ab-row">
          {form?.types.map((t) => (
            <TypeBadge key={t} typeId={t} />
          ))}
        </span>
      </div>
      <div className="ab-kv blue bw-text-dark ab-s">
        <b>D.O.</b>
        <span className="ab-grow">{ch.folderName ?? '—'}</span>
      </div>
      <div className="ab-kv blue bw-text-dark ab-s">
        <b>N° ID</b>
        <span>{pad((ch.seed ?? ch.id) % 100000, 5)}</span>
      </div>
      <div className="ab-kv green bw-text-dark ab-s">
        <b>CONTEXTE</b>
        <span className="ab-row">
          <span className="ab-gauge context" style={{ flex: 1, height: '.6em' }}>
            <i style={{ width: `${vitals.used * 100}%` }} />
          </span>
          {vitals.contextText}
        </span>
      </div>
      <div className="ab-kv purple bw-text-dark ab-s">
        <b>ÉVOLUTION</b>
        <span>{form ? evolutionText(form) : '—'}</span>
      </div>
    </>
  );
}

function MemoPage({ ch, routeName }: { ch: Character; routeName: string | undefined }) {
  const { nature, habit } = natureOf(ch.activity);
  return (
    <>
      <div className="ab-memo ab-s">
        Nature <b>{nature}</b>. Rencontré sur la {(routeName ?? 'Route 1').toUpperCase()}{' '}
        aujourd'hui à {clock(ch.activity.metAt)}, au N.1. {habit}
      </div>
      <div className="ab-log ab-xs bw-text-dark">
        {ch.activity.journal.length === 0 && (
          <span className="ab-muted">Rien à signaler pour l'instant.</span>
        )}
        {ch.activity.journal.slice(0, 6).map((entry, i) => (
          <div key={`${entry.at}-${i}`}>
            <span className="ab-muted">{clock(entry.at)}</span>
            <span>{entry.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function MovesPage({
  ch,
  selected,
  onSelect,
}: {
  ch: Character;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const id = MOVE_IDS[selected];
  const info = MOVES[id];
  const stat = ch.activity.moves[id];
  return (
    <div className="ab-moves">
      <div className="ab-mlist ab-s">
        {MOVE_IDS.map((moveId, i) => {
          const m = MOVES[moveId];
          const t = POKEMON_TYPES[m.typeId];
          return (
            <button
              key={moveId}
              className={`ab-move ${i === selected ? 'sel' : ''}`}
              style={{ ['--type' as string]: t?.color, ['--type-top' as string]: t?.top }}
              onClick={() => onSelect(i)}
            >
              <img src={item(m.tm)} alt="" />
              <span className="ab-grow">{m.name}</span>
              <span className="pp">PP {ch.activity.moves[moveId].count}</span>
            </button>
          );
        })}
      </div>
      <div className="ab-mdetail bw-text-dark ab-s">
        <div className="ab-row">
          <TypeBadge typeId={info.typeId} />
          <span className="ab-cat">{info.category}</span>
        </div>
        <div className="ab-row" style={{ justifyContent: 'space-between' }}>
          <span className="ab-muted">Utilisée</span>
          <span>{stat.count} fois</span>
        </div>
        <div className="ab-row" style={{ justifyContent: 'space-between' }}>
          <span className="ab-muted">Dernière</span>
          <span>{stat.last ? clock(stat.last) : '—'}</span>
        </div>
        <div className="ab-xs ab-muted" style={{ lineHeight: 1.4, whiteSpace: 'normal' }}>
          {info.description}
        </div>
      </div>
    </div>
  );
}

function StatsPage({ ch }: { ch: Character }) {
  const stats = agentStats(ch.activity, agentVitals(ch).hp, ch.tasksDone);
  const point = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${100 + Math.cos(angle) * r},${100 + Math.sin(angle) * r}`;
  };
  const ring = (f: number) => stats.map((_, i) => point(i, 12 + f * 70)).join(' ');
  return (
    <div className="ab-radar">
      <svg viewBox="0 0 200 200" role="img" aria-label="Stats">
        {[1, 0.66, 0.33].map((f) => (
          <polygon key={f} className="grid" points={ring(f)} />
        ))}
        <polygon
          className="shape"
          points={stats.map((s, i) => point(i, 12 + s.ratio * 70)).join(' ')}
        />
        {stats.map((s, i) => {
          const [x, y] = point(i, 92).split(',').map(Number);
          return (
            <text key={s.label} x={x} y={y + 4} textAnchor="middle">
              {s.label.replace('DÉF. SPÉ.', 'DÉF.S').replace('ATQ. SPÉ.', 'ATQ.S')}
            </text>
          );
        })}
      </svg>
      <div className="ab-stl ab-xs bw-text-dark">
        {stats.map((s) => (
          <div key={s.label} title={s.hint}>
            <span className="ab-muted">{s.label}</span>
            <span>{s.value}</span>
          </div>
        ))}
        <span className="ab-muted" style={{ whiteSpace: 'normal' }}>
          PV contexte libre · ATT éditions · DÉF lectures · ATQ.S commandes · DÉF.S recherches · VIT
          tâches/h
        </span>
      </div>
    </div>
  );
}
