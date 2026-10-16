/**
 * What an agent did this session, for its Summary screen: tool use grouped
 * into four "moves", a short journal, and the nature those habits give it.
 * Kept in the webview only — it restarts with the panel.
 */

/** The four moves an agent's tools fall into, in display order. */
export const MOVE_IDS = ['edit', 'read', 'command', 'search'] as const;
export type MoveId = (typeof MOVE_IDS)[number];

export interface MoveInfo {
  name: string;
  /** PokeAPI type id of its badge (see POKEMON_TYPES). */
  typeId: number;
  /** TM item whose disc icon shows the move. */
  tm: string;
  category: 'Physique' | 'Spéciale' | 'Statut';
  description: string;
}

export const MOVES: Record<MoveId, MoveInfo> = {
  edit: {
    name: 'Édition',
    typeId: 1,
    tm: 'tm-normal',
    category: 'Physique',
    description: 'Modifie des fichiers du projet.',
  },
  read: {
    name: 'Lecture',
    typeId: 14,
    tm: 'tm-psychic',
    category: 'Spéciale',
    description: 'Lit des fichiers pour comprendre le code avant d’agir.',
  },
  command: {
    name: 'Commande',
    typeId: 2,
    tm: 'tm-fighting',
    category: 'Physique',
    description: 'Lance une commande dans le terminal : tests, build, git…',
  },
  search: {
    name: 'Recherche',
    typeId: 3,
    tm: 'tm-flying',
    category: 'Statut',
    description: 'Fouille le code et le web à la recherche d’indices.',
  },
};

const TOOL_MOVES: Record<string, MoveId> = {
  Edit: 'edit',
  MultiEdit: 'edit',
  Write: 'edit',
  NotebookEdit: 'edit',
  Read: 'read',
  NotebookRead: 'read',
  Bash: 'command',
  BashOutput: 'command',
  Grep: 'search',
  Glob: 'search',
  LS: 'search',
  WebFetch: 'search',
  WebSearch: 'search',
};

/** Real Black/White natures, picked by the agent's favorite move. */
const NATURES: Record<MoveId | 'none', { nature: string; habit: string }> = {
  edit: { nature: 'Rigide', habit: 'Il adore modifier des fichiers.' },
  read: { nature: 'Modeste', habit: 'Il lit toujours avant d’agir.' },
  command: { nature: 'Brave', habit: 'Il n’hésite jamais à lancer une commande.' },
  search: { nature: 'Timide', habit: 'Il fouille partout avant de se décider.' },
  none: { nature: 'Sérieux', habit: 'Il observe encore les lieux.' },
};

export interface AgentActivity {
  /** When the agent first appeared in this panel. */
  metAt: number;
  moves: Record<MoveId, { count: number; last: number }>;
  /** Most recent first, capped at ACTIVITY_JOURNAL_SIZE. */
  journal: Array<{ at: number; text: string }>;
  /** Tool ids already counted (a tool can be announced by the hook and the transcript). */
  seenToolIds: Set<string>;
}

const ACTIVITY_JOURNAL_SIZE = 30;
const SEEN_TOOL_IDS_MAX = 500;

export function createActivity(now: number = Date.now()): AgentActivity {
  return {
    metAt: now,
    moves: {
      edit: { count: 0, last: 0 },
      read: { count: 0, last: 0 },
      command: { count: 0, last: 0 },
      search: { count: 0, last: 0 },
    },
    journal: [],
    seenToolIds: new Set(),
  };
}

export function moveOf(toolName: string | null): MoveId | null {
  return toolName ? (TOOL_MOVES[toolName] ?? null) : null;
}

function addJournal(activity: AgentActivity, text: string, at: number): void {
  activity.journal.unshift({ at, text });
  if (activity.journal.length > ACTIVITY_JOURNAL_SIZE)
    activity.journal.length = ACTIVITY_JOURNAL_SIZE;
}

/** Count a tool start (once per tool id) and log it in the journal. */
export function recordToolUse(
  activity: AgentActivity,
  toolId: string,
  toolName: string | null,
  status: string,
  now: number = Date.now(),
): void {
  if (activity.seenToolIds.has(toolId)) return;
  if (activity.seenToolIds.size >= SEEN_TOOL_IDS_MAX) activity.seenToolIds.clear();
  activity.seenToolIds.add(toolId);
  const move = moveOf(toolName);
  if (move) {
    activity.moves[move].count++;
    activity.moves[move].last = now;
  }
  addJournal(activity, status, now);
}

export function recordTaskDone(activity: AgentActivity, now: number = Date.now()): void {
  addJournal(activity, 'Tâche terminée ♪', now);
}

export function favoriteMove(activity: AgentActivity): MoveId | null {
  let best: MoveId | null = null;
  for (const id of MOVE_IDS) {
    if (activity.moves[id].count > (best ? activity.moves[best].count : 0)) best = id;
  }
  return best;
}

export function natureOf(activity: AgentActivity): { nature: string; habit: string } {
  return NATURES[favoriteMove(activity) ?? 'none'];
}

/** Six stats for the hexagon, each 0-1, with the value shown beside it. */
export function agentStats(
  activity: AgentActivity,
  contextFree: number,
  tasksDone: number,
  now: number = Date.now(),
): Array<{ label: string; value: string; ratio: number; hint: string }> {
  const counts = MOVE_IDS.map((id) => activity.moves[id].count);
  const peak = Math.max(1, ...counts);
  const hours = Math.max((now - activity.metAt) / 3_600_000, 1 / 60);
  const perHour = tasksDone / hours;
  const rel = (n: number) => n / peak;
  return [
    {
      label: 'PV',
      value: `${Math.round(contextFree * 100)} %`,
      ratio: contextFree,
      hint: 'Contexte libre',
    },
    {
      label: 'ATTAQUE',
      value: String(activity.moves.edit.count),
      ratio: rel(activity.moves.edit.count),
      hint: 'Éditions',
    },
    {
      label: 'DÉFENSE',
      value: String(activity.moves.read.count),
      ratio: rel(activity.moves.read.count),
      hint: 'Lectures',
    },
    {
      label: 'VITESSE',
      value: `${perHour.toFixed(1).replace('.', ',')}/h`,
      ratio: Math.min(1, perHour / 6),
      hint: 'Tâches par heure',
    },
    {
      label: 'DÉF. SPÉ.',
      value: String(activity.moves.search.count),
      ratio: rel(activity.moves.search.count),
      hint: 'Recherches',
    },
    {
      label: 'ATQ. SPÉ.',
      value: String(activity.moves.command.count),
      ratio: rel(activity.moves.command.count),
      hint: 'Commandes',
    },
  ];
}
