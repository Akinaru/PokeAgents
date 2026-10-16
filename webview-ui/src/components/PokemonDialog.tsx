import { useEffect, useState } from 'react';

import { POKEMON_DIALOG_DONE_SEC } from '../constants.js';
import type { OfficeState } from '../office/engine/officeState.js';
import type { ToolActivity } from '../office/types.js';
import { onPokemonMoment } from '../pokemon/moments.js';
import { characterPokemon } from '../pokemon/sprites.js';

interface PokemonDialogProps {
  officeState: OfficeState;
  agentTools: Record<number, ToolActivity[]>;
  onOpenTerminal: (id: number) => void;
}

interface DoneNotice {
  key: number;
  text: string;
  until: number;
}

let nextKey = 0;

/**
 * The Black/White dialogue box at the bottom of the screen. A pending
 * permission request takes priority and stays until it is answered; finished
 * turns show one after another and close by themselves.
 */
export function PokemonDialog({ officeState, agentTools, onOpenTerminal }: PokemonDialogProps) {
  const [done, setDone] = useState<DoneNotice[]>([]);
  const [later, setLater] = useState<ReadonlySet<number>>(new Set());
  const [, setTick] = useState(0);

  useEffect(
    () =>
      onPokemonMoment((m) => {
        if (m.kind !== 'done') return;
        const text = `Le ${m.name.toUpperCase()}${m.folder ? ` de ${m.folder}` : ''} a terminé sa tâche !`;
        setDone((q) => [...q, { key: nextKey++, text, until: 0 }]);
      }),
    [],
  );

  // Re-check permissions and expire notices a few times a second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDone((q) => {
        if (q.length === 0) return q;
        if (q[0].until === 0)
          return [{ ...q[0], until: now + POKEMON_DIALOG_DONE_SEC * 1000 }, ...q.slice(1)];
        return q[0].until < now ? q.slice(1) : q;
      });
      setTick((n) => n + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const asking = [...officeState.characters.values()].filter(
    (ch) => ch.bubbleType === 'permission' && !ch.isSubagent,
  );
  // Forget "later" for agents whose request was answered
  useEffect(() => {
    const askingIds = new Set(asking.map((ch) => ch.id));
    if ([...later].some((id) => !askingIds.has(id))) {
      setLater(new Set([...later].filter((id) => askingIds.has(id))));
    }
  });
  const permission = asking.find((ch) => !later.has(ch.id));

  if (permission) {
    const pokemon = characterPokemon(permission);
    const tool = [...(agentTools[permission.id] ?? [])]
      .reverse()
      .find((t) => t.permissionWait && !t.done);
    const who = `${(pokemon?.name ?? 'Agent').toUpperCase()}${permission.folderName ? ` de ${permission.folderName}` : ''}`;
    return (
      <DialogFrame>
        <div
          className="absolute bw bw-dialog flex flex-col"
          style={{ right: 0, bottom: 'calc(100% + 8px)', padding: 3 }}
        >
          <div className="bw-dialog-inner" style={{ padding: 2 }}>
            <div
              className="bw-dialog-body flex flex-col gap-2"
              style={{ padding: '6px 14px', fontSize: 19 }}
            >
              <button
                className="bw-text-dark text-left"
                onClick={() => onOpenTerminal(permission.id)}
              >
                ▶ Ouvrir le terminal
              </button>
              <button
                className="bw-text-dark text-left"
                onClick={() => setLater(new Set([...later, permission.id]))}
              >
                &nbsp;&nbsp;Plus tard
              </button>
            </div>
          </div>
        </div>
        Le {who} demande la permission.
        {tool && (
          <>
            <br />
            <span className="bw-highlight">{tool.status}</span>
          </>
        )}
      </DialogFrame>
    );
  }

  if (done.length > 0) {
    return <DialogFrame onClick={() => setDone((q) => q.slice(1))}>{done[0].text}</DialogFrame>;
  }
  return null;
}

function DialogFrame({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bw bw-dialog"
      style={{ bottom: 78, width: 'min(720px, calc(100% - 32px))', zIndex: 45 }}
      onClick={onClick}
      role="status"
    >
      <div className="bw-dialog-inner">
        <div className="bw-dialog-body bw-text-dark">{children}</div>
      </div>
      <span className="bw-dialog-arrow" />
    </div>
  );
}
