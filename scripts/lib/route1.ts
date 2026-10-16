/**
 * Route 1, the default map: its size, shapes and ground decor, shared by the
 * bundled art (generate-route-assets.ts) and the local Black/White pack
 * (build-bw-pack.ts) so both paint the very same map.
 */
import { jitter, rng } from './pixelCanvas.js';

export const COLS = 24;
export const ROWS = 18;
/** Layout `background` name, and the PNG file name of every painted version. */
export const ROUTE_BACKGROUND = 'route-1';

export interface RouteShapes {
  /** Signed distance (px) into the path: > 0 inside. */
  pathDepth(x: number, y: number): number;
  tallGrass: Array<[col: number, row: number, cols: number, rows: number]>;
  terraces: Array<[col: number, row: number, cols: number, rows: number]>;
}

export const ROUTE_SHAPES: RouteShapes = {
  pathDepth(x, y) {
    // Main path winding north-south through the middle of the map
    const cx = 192 + 10 * Math.sin(y / 46) + 4 * Math.sin(y / 13);
    const main = 15 + jitter(y, 1) * 0.8 - Math.abs(x + 0.5 - cx);
    // Branch west to the clearing, ending in a rounded cap
    let branch = -Infinity;
    if (x <= cx) {
      const cy = 140 + 5 * Math.sin(x / 22);
      const capX = 60;
      const across = 12 + jitter(x, 7) * 0.8 - Math.abs(y + 0.5 - cy);
      branch = x >= capX ? across : 12 - Math.hypot(x - capX, y + 0.5 - cy);
    }
    return Math.max(main, branch);
  },
  tallGrass: [
    [15, 3, 6, 4],
    [3, 12, 5, 3],
  ],
  terraces: [[14, 11, 8, 5]],
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
  const w = COLS * 16;
  const h = ROWS * 16;
  const r = rng(77);
  const tufts: Array<[number, number]> = [];
  for (let tries = 0; tufts.length < 26 && tries < 2000; tries++) {
    const x = 36 + Math.floor(r() * (w - 72));
    const y = 36 + Math.floor(r() * (h - 72));
    if (isOpenGrass(x, y)) tufts.push([x, y]);
  }
  const flowers: Array<[number, number]> = [];
  for (let tries = 0; flowers.length < 14 && tries < 2000; tries++) {
    const x = 40 + Math.floor(r() * (w - 80));
    const y = 40 + Math.floor(r() * (h - 80));
    if (isOpenGrass(x, y) && isOpenGrass(x + 8, y + 6)) flowers.push([x, y]);
  }
  return { tufts, flowers };
}
