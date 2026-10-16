import {
  DEFAULT_MAX_CONTEXT_TOKENS,
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
  WORK_SPOT_DWELL_MAX_SEC,
  WORK_SPOT_DWELL_MIN_SEC,
  WORK_SPOT_FIRST_MAX_SEC,
  WORK_SPOT_FIRST_MIN_SEC,
  WORK_SPOT_RETURN_SEC,
} from '../../constants.js';
import { createActivity } from '../../pokemon/activity.js';
import { findPath } from '../layout/tileMap.js';
import type { CharacterSprites } from '../sprites/spriteData.js';
import { isReadingToolName } from '../toolUtils.js';
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '../types.js';
import { CharacterState, Direction, TILE_SIZE } from '../types.js';
import type { WorkSpot } from './workSpots.js';

/** The part of the map agents keep to (see OfficeState.setViewArea). */
export interface AgentArea {
  /** The next spot of a working agent, or of one that must get back in view. */
  nextWorkSpot(ch: Character): WorkSpot | null;
  inView(col: number, row: number): boolean;
}

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

/** Delay before a working agent leaves for its first spot. */
export const firstWorkDelay = (): number =>
  randomRange(WORK_SPOT_FIRST_MIN_SEC, WORK_SPOT_FIRST_MAX_SEC);

/** Whether a tool should show the reading animation (vs typing). Taxonomy comes
 *  from the active HookProvider via the `providerCapabilities` message. */
export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return isReadingToolName(tool);
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1;
  const row = seat ? seat.seatRow : 1;
  const center = tileCenter(col, row);
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    isActive: true,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    contextTokens: 0,
    maxContextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
    tasksDone: 0,
    activity: createActivity(),
    workSpot: null,
    workTimer: firstWorkDelay(),
  };
}

export function updateCharacter(
  ch: Character,
  dt: number,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  /** Where agents may go; omitted, they keep to their seat. */
  area?: AgentArea,
): void {
  ch.frameTimer += dt;
  // Where the agent belongs right now: its work spot, else its seat
  const seat = ch.seatId ? seats.get(ch.seatId) : undefined;
  const home = ch.workSpot
    ? { col: ch.workSpot.col, row: ch.workSpot.row, dir: ch.workSpot.dir }
    : seat
      ? { col: seat.seatCol, row: seat.seatRow, dir: seat.facingDir }
      : null;

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 2;
      }
      // A resting agent stays where it is: its Pokémon sleeps there until the
      // next turn. A working one moves from spot to spot to keep busy.
      // Out of view (an old spot, a seat off screen), it walks back in at once.
      if (!area || ch.isSubagent) break;
      const outOfView = !area.inView(ch.tileCol, ch.tileRow);
      if (!ch.isActive && !outOfView) break;
      if (outOfView) ch.workTimer = Math.min(ch.workTimer, WORK_SPOT_RETURN_SEC);
      ch.workTimer -= dt;
      if (ch.workTimer > 0) break;
      ch.workTimer = randomRange(WORK_SPOT_DWELL_MIN_SEC, WORK_SPOT_DWELL_MAX_SEC);
      {
        const spot = area.nextWorkSpot(ch);
        if (!spot) break;
        const path = findPath(ch.tileCol, ch.tileRow, spot.col, spot.row, tileMap, blockedTiles);
        if (path.length === 0) break;
        ch.workSpot = spot;
        ch.path = path;
        ch.moveProgress = 0;
        ch.state = CharacterState.WALK;
        ch.frame = 0;
        ch.frameTimer = 0;
      }
      break;
    }

    case CharacterState.IDLE: {
      // No idle animation — static pose
      ch.frame = 0;
      // A resting agent sleeps where it stands; a working one heads home.
      if (!ch.isActive || !home) {
        ch.state = CharacterState.TYPE;
        ch.frameTimer = 0;
        break;
      }
      {
        const path = findPath(ch.tileCol, ch.tileRow, home.col, home.row, tileMap, blockedTiles);
        if (path.length > 0) {
          ch.path = path;
          ch.moveProgress = 0;
          ch.state = CharacterState.WALK;
          ch.frame = 0;
          ch.frameTimer = 0;
        } else {
          // Already home or no path — settle here
          ch.state = CharacterState.TYPE;
          if (ch.tileCol === home.col && ch.tileRow === home.row) ch.dir = home.dir;
          ch.frame = 0;
          ch.frameTimer = 0;
        }
      }
      break;
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 4;
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow);
        ch.x = center.x;
        ch.y = center.y;

        // Arrived, or stopped on the way: work or sleep right here
        ch.state = CharacterState.TYPE;
        if (home && ch.tileCol === home.col && ch.tileRow === home.row) ch.dir = home.dir;
        ch.frame = 0;
        ch.frameTimer = 0;
        break;
      }

      // Move toward next tile in path
      const nextTile = ch.path[0];
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row);

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
      const toCenter = tileCenter(nextTile.col, nextTile.row);
      const t = Math.min(ch.moveProgress, 1);
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col;
        ch.tileRow = nextTile.row;
        ch.x = toCenter.x;
        ch.y = toCenter.y;
        ch.path.shift();
        ch.moveProgress = 0;
      }

      // If its destination changed while walking, repath there
      if (ch.isActive && home) {
        const lastStep = ch.path[ch.path.length - 1];
        if (!lastStep || lastStep.col !== home.col || lastStep.row !== home.row) {
          const newPath = findPath(
            ch.tileCol,
            ch.tileRow,
            home.col,
            home.row,
            tileMap,
            blockedTiles,
          );
          if (newPath.length > 0) {
            ch.path = newPath;
            ch.moveProgress = 0;
          }
        }
      }
      break;
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2];
      }
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4];
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1];
    default:
      return sprites.walk[ch.dir][1];
  }
}
