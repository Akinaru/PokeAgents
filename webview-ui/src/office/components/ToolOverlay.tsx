import { useEffect, useState } from 'react';

import {
  CHARACTER_SITTING_OFFSET_PX,
  HUD_BELOW_GAP_PX,
  HUD_FLIP_BELOW_PX,
  NAMETAG_OFFSET_Y_PX,
  TEAM_LEAD_COLOR,
  TEAM_ROLE_COLOR,
  TOOL_OVERLAY_VERTICAL_OFFSET,
} from '../../constants.js';
import type { SubagentCharacter } from '../../hooks/useExtensionMessages.js';
import { characterPokemon } from '../../pokemon/sprites.js';
import {
  agentLevel,
  agentStatus,
  agentVitals,
  STATUS_DOT,
  STATUS_LABEL,
} from '../../pokemon/status.js';
import type { OfficeState } from '../engine/officeState.js';
import { overlayProjection } from '../projection.js';
import type { ToolActivity } from '../types.js';
import { CharacterState } from '../types.js';

// Both turn-end states show the green checkmark bubble. A finished turn (Stop)
// shows ONLY the checkmark (the label falls through to its normal idle text);
// going idle waiting on the user (Notification(idle_prompt)) additionally
// surfaces this label. Driven by Character.waitingAwaitingInput.
const WAITING_INPUT_ACTIVITY_TEXT = 'Waiting for input';

interface ToolOverlayProps {
  officeState: OfficeState;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  subagentTools: Record<number, Record<string, ToolActivity[]>>;
  subagentCharacters: SubagentCharacter[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  onCloseAgent: (id: number) => void;
  alwaysShowOverlay: boolean;
  /** Whether the canvas uses the tilted camera (everywhere but the layout editor). */
  tilted: boolean;
}

/** Derive a short human-readable activity string from tools/status */
function getActivityText(
  agentId: number,
  agentTools: Record<number, ToolActivity[]>,
  isActive: boolean,
  bubbleType: 'permission' | 'waiting' | null,
  waitingAwaitingInput: boolean,
): string {
  if (bubbleType === 'permission') return 'Needs approval';
  // Only the idle case ("Waiting for input") gets a dedicated label. A finished
  // turn (Stop, waitingAwaitingInput=false) falls through so the checkmark alone
  // signals "done", same as the original behavior.
  if (bubbleType === 'waiting' && waitingAwaitingInput) return WAITING_INPUT_ACTIVITY_TEXT;

  const tools = agentTools[agentId];
  if (tools && tools.length > 0) {
    // Find the latest non-done tool
    const activeTool = [...tools].reverse().find((t) => !t.done);
    if (activeTool) {
      if (activeTool.permissionWait) return 'Needs approval';
      return activeTool.status;
    }
    // All tools done but agent still active (mid-turn) — keep showing last tool status
    if (isActive) {
      const lastTool = tools[tools.length - 1];
      if (lastTool) return lastTool.status;
    }
  }

  return 'Idle';
}

export function ToolOverlay({
  officeState,
  agents,
  agentTools,
  subagentTools,
  subagentCharacters,
  containerRef,
  zoom,
  panRef,
  onCloseAgent,
  alwaysShowOverlay,
  tilted,
}: ToolOverlayProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const el = containerRef.current;
  if (!el) return null;
  const project = overlayProjection(
    officeState.getLayout(),
    el.getBoundingClientRect(),
    zoom,
    panRef.current,
    window.devicePixelRatio || 1,
    tilted,
  );

  const selectedId = officeState.selectedAgentId;
  const hoveredId = officeState.hoveredAgentId;

  // All character IDs
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id)];

  return (
    <>
      {/* Always-visible nametag under each agent: its full project folder name */}
      {agents.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch?.folderName || ch.isSubagent) return null;
        return (
          <div
            key={`tag-${id}`}
            className="absolute -translate-x-1/2 bw bw-nametag"
            style={{
              left: project.toScreen(ch.x, ch.y).x,
              top: project.toScreen(ch.x, ch.y, -NAMETAG_OFFSET_Y_PX).y,
              pointerEvents: 'none',
              zIndex: 40,
            }}
            data-testid="agent-nametag"
          >
            <span className="bw-dot" style={{ ['--dot' as string]: STATUS_DOT[agentStatus(ch)] }} />
            {ch.folderName}
          </div>
        );
      })}
      {allIds.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch) return null;

        const isSelected = selectedId === id;
        const isHovered = hoveredId === id;
        const isSub = ch.isSubagent;

        // Only show for hovered or selected agents (unless always-show is on)
        if (!alwaysShowOverlay && !isSelected && !isHovered) return null;

        // Position above character
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
        const { x: screenX, y: screenY } = project.toScreen(
          ch.x,
          ch.y + sittingOffset,
          TOOL_OVERLAY_VERTICAL_OFFSET,
        );

        // A "Done" agent (finished turn: waiting bubble without awaitingInput)
        // shows ONLY its floating green checkmark bubble, never the label panel
        // (the panel would cover the bubble). Render an empty positioned marker
        // so overlay counts stay stable and hover/select can still bring the
        // panel back. When always-show is off, the early return above already
        // keeps the panel hidden for idle agents.
        const isDone = ch.bubbleType === 'waiting' && !ch.waitingAwaitingInput;
        if (isDone && !isSelected && !isHovered) {
          return (
            <div
              key={id}
              className="absolute"
              style={{ left: screenX, top: screenY, pointerEvents: 'none' }}
              data-testid="agent-overlay"
              data-agent-id={id}
            />
          );
        }

        // Get activity text
        const hasWaitingBubble = ch.bubbleType === 'waiting';
        const subHasPermission = isSub && ch.bubbleType === 'permission';
        let activityText: string;
        if (hasWaitingBubble && ch.waitingAwaitingInput) {
          // Idle, waiting on the user -> dedicated label. A finished turn (Stop)
          // shows only the checkmark and falls through to the normal idle text.
          activityText = WAITING_INPUT_ACTIVITY_TEXT;
        } else if (isSub) {
          if (subHasPermission) {
            activityText = 'Needs approval';
          } else {
            // Hover shows the subtask title; SELECTING the sub reveals its live
            // tool activity (watched sub-agents stream it via subagentToolStart).
            const sub = subagentCharacters.find((s) => s.id === id);
            const rows = sub ? subagentTools[sub.parentAgentId]?.[sub.parentToolId] : undefined;
            const activeRow =
              isSelected && rows ? [...rows].reverse().find((t) => !t.done) : undefined;
            activityText = activeRow?.status ?? (sub?.label || 'Subtask');
          }
        } else {
          activityText = getActivityText(
            id,
            agentTools,
            ch.isActive,
            ch.bubbleType,
            ch.waitingAwaitingInput ?? false,
          );
        }

        // Team info
        const teamRoleLabel = ch.isTeamLead ? 'LEAD' : ch.agentName || null;
        const pokemon = characterPokemon(ch);
        const status = agentStatus(ch);
        const vitals = agentVitals(ch);
        // Context gauge. Every agent gets one — lead, teammate, adopted,
        // headless — as soon as it has taken a turn. Sub-agents never do: they
        // have no session of their own, so contextTokens stays 0.
        const contextRatio = ch.contextTokens / ch.maxContextTokens;
        const showContextGauge = !isSub && ch.contextTokens > 0;

        // The battle HUD plate of Black/White: name, sex, level, status, the
        // context left as HP and the progress to the next evolution as EXP.
        // Near the top edge the plate would be cut off: show it under the nametag instead
        const below = screenY < HUD_FLIP_BELOW_PX;
        return (
          <div
            key={id}
            className={`absolute -translate-x-1/2 bw ${below ? '' : '-translate-y-full'}`}
            style={{
              left: screenX,
              top: below
                ? project.toScreen(ch.x, ch.y, -NAMETAG_OFFSET_Y_PX).y + HUD_BELOW_GAP_PX
                : screenY,
              pointerEvents: isSelected ? 'auto' : 'none',
              opacity: alwaysShowOverlay && !isSelected && !isHovered ? (isSub ? 0.55 : 0.8) : 1,
              zIndex: isSelected ? 42 : 41,
            }}
            data-testid="agent-overlay"
            data-agent-id={id}
          >
            <div className="bw-hud" style={{ minWidth: 300, maxWidth: 400 }}>
              <div className="bw-hud-row bw-text-dark" style={{ fontSize: 24, fontWeight: 700 }}>
                <span className="overflow-hidden text-ellipsis">
                  {(pokemon?.name ?? (isSub ? 'Sous-agent' : 'Agent')).toUpperCase()}
                </span>
                {pokemon?.gender && (
                  <span className={`bw-gender ${pokemon.gender}`} style={{ textShadow: 'none' }}>
                    {pokemon.gender === 'male' ? '♂' : '♀'}
                  </span>
                )}
                {pokemon?.shiny && <span className="bw-star">★</span>}
                <span className="ml-auto" style={{ fontSize: 20 }}>
                  N.{agentLevel(ch)}
                </span>
              </div>
              <div className="bw-hud-row" style={{ marginTop: 3 }}>
                <span className={`bw-badge ${status}`}>{STATUS_LABEL[status]}</span>
                <span
                  className="bw-text-dark overflow-hidden text-ellipsis"
                  style={{ fontSize: 18, fontStyle: isSub ? 'italic' : undefined }}
                >
                  {activityText}
                </span>
              </div>
              {showContextGauge && (
                <div
                  style={{ marginTop: 5 }}
                  title={`${Math.round(contextRatio * 100)}% context used (${(ch.contextTokens / 1000).toFixed(0)}k of ${(ch.maxContextTokens / 1000).toFixed(0)}k tokens)`}
                  data-testid="context-gauge"
                  data-context-pct={Math.round(contextRatio * 100)}
                >
                  <div className="bw-hp">
                    <span className="bw-hp-label">PV</span>
                    <div className="bw-hp-track">
                      <div
                        className={`bw-hp-fill ${vitals.hpTier}`}
                        style={{ width: `${vitals.hp * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bw-hud-row bw-text-dark" style={{ fontSize: 16, marginTop: 2 }}>
                    <span style={{ fontSize: 14 }}>EXP</span>
                    <div className="bw-exp" style={{ flex: 1 }}>
                      <div style={{ width: `${vitals.exp * 100}%` }} />
                    </div>
                    <span>{vitals.hpText}</span>
                  </div>
                </div>
              )}
              <div className="bw-hud-row bw-meta" style={{ fontSize: 16, marginTop: 4 }}>
                {ch.folderName && (
                  <span className="overflow-hidden text-ellipsis">{ch.folderName}</span>
                )}
                {teamRoleLabel && (
                  <span style={{ color: ch.isTeamLead ? TEAM_LEAD_COLOR : TEAM_ROLE_COLOR }}>
                    {teamRoleLabel}
                  </span>
                )}
                {isSelected && !isSub && (
                  <button
                    className="ml-auto bw-text-dark"
                    style={{ fontSize: 22, lineHeight: 1, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseAgent(id);
                    }}
                    title="Close agent"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
