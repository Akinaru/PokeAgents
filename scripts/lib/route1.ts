/**
 * Route 1, the default map: its size, shapes and ground decor, shared by the
 * bundled art (generate-route-assets.ts) and the local Black/White pack
 * (build-bw-pack.ts) so both paint the very same map.
 */
import { jitter, rng } from './pixelCanvas.js';

export const COLS = 52;
export const ROWS = 26;
const MAP_W = COLS * 16;
const MAP_H = ROWS * 16;
/** Tile column / row at a fraction of the map, so the layout scales with its size. */
export const col = (f: number): number => Math.round(f * COLS);
export const row = (f: number): number => Math.round(f * ROWS);
/** Layout `background` name, and the PNG file name of every painted version. */
export const ROUTE_BACKGROUND = 'route-1';

export interface RouteShapes {
  /** Signed distance (px) into the path: > 0 inside. */
  pathDepth(x: number, y: number): number;
  tallGrass: Array<[col: number, row: number, cols: number, rows: number]>;
  terraces: Array<[col: number, row: number, cols: number, rows: number]>;
}

/** Signed distance into a horizontal side path along y = cy(x), from the
 *  main path out to a rounded cap at capX. */
function sideBranch(
  x: number,
  y: number,
  mainX: number,
  capX: number,
  cy: (x: number) => number,
): number {
  const toward = capX < mainX ? x <= mainX : x >= mainX;
  if (!toward) return -Infinity;
  const pastCap = capX < mainX ? x < capX : x > capX;
  if (pastCap) return 12 - Math.hypot(x - capX, y + 0.5 - cy(capX));
  return 12 + jitter(x, 7) * 0.8 - Math.abs(y + 0.5 - cy(x));
}

export const ROUTE_SHAPES: RouteShapes = {
  pathDepth(x, y) {
    // Main path winding north-south through the middle of the map
    const cx = MAP_W / 2 + 12 * Math.sin(y / 46) + 4 * Math.sin(y / 13);
    const main = 15 + jitter(y, 1) * 0.8 - Math.abs(x + 0.5 - cx);
    // Side paths: west to the meadow, east to the clearing
    const west = sideBranch(x, y, cx, MAP_W * 0.22, (px) => MAP_H * 0.44 + 5 * Math.sin(px / 22));
    const east = sideBranch(x, y, cx, MAP_W * 0.8, (px) => MAP_H * 0.72 + 4 * Math.sin(px / 19));
    return Math.max(main, west, east);
  },
  tallGrass: [
    [col(0.6), 3, 9, 5],
    [col(0.16), row(0.6), 7, 4],
    [col(0.84), row(0.42), 5, 6],
    [3, 3, 5, 4],
    [col(0.34), row(0.8), 6, 3],
  ],
  terraces: [[col(0.2), 2, 9, 5]],
};

/** Whether (x, y) is plain grass, clear of the path and tall grass. */
function isOpenGrass(x: number, y: number): boolean {
  return (
    ROUTE_SHAPES.pathDepth(x, y) < -4 &&
    !ROUTE_SHAPES.tallGrass.some(
      ([tc, tr, tw, th]) =>
        x >= tc * 16 - 4 && x < (tc + tw) * 16 + 4 && y >= tr * 16 - 4 && y < (tr + th) * 16 + 6,
    )
  );
}

/** Seeded positions (world px) of small grass tufts and flower pairs on open grass. */
export function routeDecor(): { tufts: Array<[number, number]>; flowers: Array<[number, number]> } {
  const w = MAP_W;
  const h = MAP_H;
  const r = rng(77);
  // About one tuft per 16 tiles and one flower pair per 30 tiles
  const tuftCount = Math.round((COLS * ROWS) / 16);
  const flowerCount = Math.round((COLS * ROWS) / 30);
  const tufts: Array<[number, number]> = [];
  for (let tries = 0; tufts.length < tuftCount && tries < 2000; tries++) {
    const x = 36 + Math.floor(r() * (w - 72));
    const y = 36 + Math.floor(r() * (h - 72));
    if (isOpenGrass(x, y)) tufts.push([x, y]);
  }
  const flowers: Array<[number, number]> = [];
  for (let tries = 0; flowers.length < flowerCount && tries < 2000; tries++) {
    const x = 40 + Math.floor(r() * (w - 80));
    const y = 40 + Math.floor(r() * (h - 80));
    if (isOpenGrass(x, y) && isOpenGrass(x + 8, y + 6)) flowers.push([x, y]);
  }
  return { tufts, flowers };
}
