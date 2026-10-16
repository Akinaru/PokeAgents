/**
 * Work spots: where a working agent goes to keep busy on the route. Each spot
 * is a tile beside (or in) a piece of scenery, faced toward it, and tied to the
 * move it fits — reading the sign, rummaging in tall grass, cutting a tree,
 * smashing a rock. Pure helpers (no DOM, no catalog) so they unit test in Node.
 */
import type { MoveId } from '../../pokemon/activity.js';
import { Direction } from '../types.js';

export interface WorkSpot {
  col: number;
  row: number;
  /** Direction the agent faces while working there. */
  dir: Direction;
  move: MoveId;
}

/** Scenery that hosts spots, and whether the agent stands IN it (tall grass) or beside it. */
const SPOT_SCENERY: Record<string, { move: MoveId; inside: boolean }> = {
  ROUTE_SIGN: { move: 'read', inside: false },
  TALL_GRASS: { move: 'search', inside: true },
  BUSH: { move: 'search', inside: false },
  TREE: { move: 'edit', inside: false },
  ROCK: { move: 'command', inside: false },
};

export interface SceneryItem {
  type: string;
  col: number;
  row: number;
}

const NEIGHBOURS: Array<{ dc: number; dr: number; dir: Direction }> = [
  // Offset from the scenery tile to the standing tile, and the way back to it
  { dc: 0, dr: 1, dir: Direction.UP },
  { dc: -1, dr: 0, dir: Direction.RIGHT },
  { dc: 1, dr: 0, dir: Direction.LEFT },
  { dc: 0, dr: -1, dir: Direction.DOWN },
];

/**
 * Every spot of a layout. `footprint` gives an item's size and its walk-through
 * top rows; `walkable` and `reserved` (seats) come from the office state.
 */
export function buildWorkSpots(
  items: SceneryItem[],
  footprint: (type: string) => { w: number; h: number; bgRows: number } | undefined,
  walkable: (col: number, row: number) => boolean,
  reserved: Set<string>,
): WorkSpot[] {
  const spots = new Map<string, WorkSpot>();
  const add = (col: number, row: number, dir: Direction, move: MoveId): void => {
    const key = `${col},${row}`;
    if (spots.has(key) || reserved.has(key) || !walkable(col, row)) return;
    spots.set(key, { col, row, dir, move });
  };
  for (const item of items) {
    const scenery = SPOT_SCENERY[item.type];
    const size = scenery && footprint(item.type);
    if (!scenery || !size) continue;
    if (scenery.inside) {
      add(item.col, item.row, Direction.DOWN, scenery.move);
      continue;
    }
    // Stand next to the solid part of the item (below its walk-through rows)
    for (let dr = size.bgRows; dr < size.h; dr++) {
      for (let dc = 0; dc < size.w; dc++) {
        for (const n of NEIGHBOURS) {
          const c = item.col + dc + n.dc;
          const r = item.row + dr + n.dr;
          const inItem =
            c >= item.col && c < item.col + size.w && r >= item.row && r < item.row + size.h;
          if (!inItem) add(c, r, n.dir, scenery.move);
        }
      }
    }
  }
  return [...spots.values()];
}

/**
 * The next spot for an agent at (col, row): one fitting `move` when possible,
 * nearby when possible, at least `minSpacing` away from where it stands,
 * and never within `minSpacing` of another agent (`others` holds their tiles and the spots they are heading to).
 */
export function pickWorkSpot(
  spots: readonly WorkSpot[],
  col: number,
  row: number,
  move: MoveId | null,
  others: ReadonlyArray<{ col: number; row: number }>,
  minSpacing: number,
  maxDistance: number,
  random: () => number = Math.random,
): WorkSpot | null {
  const free = spots.filter(
    (s) =>
      // A real move away from where it stands, too, so the change shows
      Math.max(Math.abs(col - s.col), Math.abs(row - s.row)) >= minSpacing &&
      others.every((o) => Math.max(Math.abs(o.col - s.col), Math.abs(o.row - s.row)) >= minSpacing),
  );
  const near = (list: WorkSpot[]): WorkSpot[] =>
    list.filter((s) => Math.abs(s.col - col) + Math.abs(s.row - row) <= maxDistance);
  const fitting = move ? free.filter((s) => s.move === move) : [];
  for (const pool of [near(fitting), near(free), fitting, free]) {
    if (pool.length === 0) continue;
    // Even out the moves first: tall grass alone would otherwise win most draws
    const moves = [...new Set(pool.map((s) => s.move))];
    const pick = moves[Math.floor(random() * moves.length)];
    const ofMove = pool.filter((s) => s.move === pick);
    return ofMove[Math.floor(random() * ofMove.length)];
  }
  return null;
}
