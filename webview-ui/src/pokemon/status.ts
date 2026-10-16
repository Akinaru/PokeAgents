/**
 * What the Black/White UI shows for an agent: its status badge, level, HP
 * (context left) and EXP (progress to its next evolution).
 */
import { POKEMON_EVOLUTION_THRESHOLDS } from '../constants.js';
import type { Character } from '../office/types.js';

/** ACT working · SOM resting (asleep) · ATT waiting for a permission · FINI turn just finished */
export type AgentStatus = 'act' | 'som' | 'att' | 'fini';

export const STATUS_LABEL: Record<AgentStatus, string> = {
  act: 'ACT',
  som: 'SOM',
  att: 'ATT',
  fini: 'FINI',
};

/** Dot colors on nametags (CSS custom properties from bw.css). */
export const STATUS_DOT: Record<AgentStatus, string> = {
  act: 'var(--bw-act-top)',
  som: 'var(--bw-som-top)',
  att: 'var(--bw-att-top)',
  fini: 'var(--bw-fini-top)',
};

export function agentStatus(ch: Character): AgentStatus {
  if (ch.bubbleType === 'permission') return 'att';
  if (ch.bubbleType === 'waiting' && !ch.waitingAwaitingInput) return 'fini';
  return ch.isActive ? 'act' : 'som';
}

/** Level: one per turn the agent finished this session. */
export function agentLevel(ch: Character): number {
  return 1 + ch.tasksDone;
}

export interface AgentVitals {
  /** Share of the context window still free, 0-1. */
  hp: number;
  hpTier: 'ok' | 'warn' | 'low';
  /** Share of the context window used, 0-1. */
  used: number;
  /** "837k / 1M" — tokens used over the window. */
  contextText: string;
  /** Progress toward the next evolution threshold, 0-1 (1 when fully evolved). */
  exp: number;
}

const kTokens = (n: number): string =>
  n >= 1_000_000 ? `${Number((n / 1_000_000).toFixed(1))}M` : `${Math.round(n / 1000)}k`;

export function agentVitals(ch: Character): AgentVitals {
  const used = ch.maxContextTokens > 0 ? Math.min(1, ch.contextTokens / ch.maxContextTokens) : 0;
  const hp = 1 - used;
  const next = POKEMON_EVOLUTION_THRESHOLDS.findIndex((t) => used < t);
  const from = next <= 0 ? 0 : POKEMON_EVOLUTION_THRESHOLDS[next - 1];
  const exp = next < 0 ? 1 : (used - from) / (POKEMON_EVOLUTION_THRESHOLDS[next] - from);
  return {
    hp,
    hpTier: hp > 0.5 ? 'ok' : hp > 0.2 ? 'warn' : 'low',
    used,
    contextText: `${kTokens(ch.contextTokens)} / ${kTokens(ch.maxContextTokens)}`,
    exp,
  };
}
