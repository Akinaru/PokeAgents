import { useEffect, useState } from 'react';

import { POKEMON_DIALOG_DONE_SEC } from '../constants.js';
import type { OfficeState } from '../office/engine/officeState.js';
import type { ToolActivity } from '../office/types.js';
import { onPokemonMoment } from '../pokemon/moments.js';
import type { PokemonForm } from '../pokemon/roll.js';
import { animatedPokemonUrl, characterPokemon } from '../pokemon/sprites.js';

interface PokemonDialogProps {
  officeState: OfficeState;
  agentTools: Record<number, ToolActivity[]>;
  onOpenTerminal: (id: number) => void;
}

/** Who a dialogue line is about: shown as a portrait and a name plate. */
interface Speaker {
  name: string;
  folder?: string;
  form: PokemonForm | null;
}

interface DoneNotice {
  key: number;
  speaker: Speaker;
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
        // Capture the form now: the agent may be gone by the time the notice shows
        const ch = officeState.characters.get(m.agentId);
        const speaker = { name: m.name, folder: m.folder, form: ch ? characterPokemon(ch) : null };
        setDone((q) => [...q, { key: nextKey++, speaker, until: 0 }]);
      }),
    [officeState],
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
    const form = characterPokemon(permission);
    const tool = [...(agentTools[permission.id] ?? [])]
      .reverse()
      .find((t) => t.permissionWait && !t.done);
    const speaker = { name: form?.name ?? 'Agent', folder: permission.folderName, form };
    return (
      <DialogFrame
        speaker={speaker}
        choices={
          <>
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
          </>
        }
      >
        Je demande la permission !
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
    return (
      <DialogFrame speaker={done[0].speaker} onClick={() => setDone((q) => q.slice(1))}>
        J'ai terminé ma tâche !
      </DialogFrame>
    );
  }
  return null;
}

function DialogFrame({
  speaker,
  choices,
  children,
  onClick,
}: {
  speaker: Speaker;
  choices?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="bw-dialog-dock" onClick={onClick} role="status">
      <div className="bw-dialog-name">
        {speaker.name.toUpperCase()}
        {speaker.folder && <span className="bw-dialog-folder">{speaker.folder}</span>}
      </div>
      {choices && (
        <div className="bw bw-dialog bw-dialog-choices">
          <div className="bw-dialog-inner">
            <div className="bw-dialog-body flex flex-col gap-2">{choices}</div>
          </div>
        </div>
      )}
      <div className="bw bw-dialog">
        <div className="bw-dialog-inner">
          <div className="bw-dialog-body bw-dialog-row bw-text-dark">
            {speaker.form && (
              <div className="bw-dialog-portrait">
                <img src={animatedPokemonUrl(speaker.form.dex, speaker.form.shiny)} alt="" />
              </div>
            )}
            <div className="bw-dialog-text">{children}</div>
          </div>
        </div>
        <span className="bw-dialog-arrow" />
      </div>
    </div>
  );
}
