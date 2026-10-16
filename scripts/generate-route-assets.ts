/**
 * Draws the Pokémon-route tileset as pixel art and writes it into
 * webview-ui/public/assets/: three grayscale floor patterns (colorized at
 * runtime by the layout's tileColors), full-color nature furniture, and the
 * default route map (default-layout-N.json).
 *
 * Everything is procedural and seeded, so the output is reproducible.
 * Run: npx tsx scripts/generate-route-assets.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import type { RGBA } from './lib/pixelCanvas.js';
import { Canvas, gray, hex, jitter, rng, valueNoise } from './lib/pixelCanvas.js';
import type { RouteShapes } from './lib/route1.js';
import { col, COLS, ROUTE_BACKGROUND, ROUTE_SHAPES, row, ROWS, routeDecor } from './lib/route1.js';

const ASSETS_DIR = path.join(__dirname, '..', 'webview-ui', 'public', 'assets');

// ── Floors (grayscale, 16×16, seamless) ─────────────────────

function grassFloor(): Canvas {
  const c = new Canvas(16, 16);
  c.fill(gray(128));
  const r = rng(7);
  // Soft mottling
  for (let i = 0; i < 26; i++) c.setWrap(Math.floor(r() * 16), Math.floor(r() * 16), gray(118));
  for (let i = 0; i < 18; i++) c.setWrap(Math.floor(r() * 16), Math.floor(r() * 16), gray(138));
  // Little grass tufts: a dark "v" with a light tip, as in the 5th-gen routes
  const tufts: Array<[number, number]> = [
    [2, 3],
    [10, 1],
    [6, 8],
    [13, 10],
    [3, 13],
    [9, 14],
  ];
  for (const [x, y] of tufts) {
    c.setWrap(x, y, gray(96));
    c.setWrap(x + 2, y, gray(96));
    c.setWrap(x + 1, y + 1, gray(96));
    c.setWrap(x, y - 1, gray(158));
    c.setWrap(x + 2, y - 1, gray(158));
  }
  return c;
}

function pathFloor(): Canvas {
  const c = new Canvas(16, 16);
  c.fill(gray(150));
  const r = rng(11);
  for (let i = 0; i < 34; i++) c.setWrap(Math.floor(r() * 16), Math.floor(r() * 16), gray(140));
  for (let i = 0; i < 22; i++) c.setWrap(Math.floor(r() * 16), Math.floor(r() * 16), gray(162));
  // Pebbles: light dot with a darker shadow pixel underneath
  const pebbles: Array<[number, number]> = [
    [3, 4],
    [12, 2],
    [8, 10],
    [14, 13],
    [2, 12],
  ];
  for (const [x, y] of pebbles) {
    c.setWrap(x, y, gray(184));
    c.setWrap(x + 1, y, gray(176));
    c.setWrap(x, y + 1, gray(120));
    c.setWrap(x + 1, y + 1, gray(126));
  }
  return c;
}

function tallGrassFloor(): Canvas {
  const c = new Canvas(16, 16);
  c.fill(gray(84));
  // Two staggered rows of pointed leaf clumps (each 8px wide), seamless
  const clump = (ox: number, oy: number): void => {
    const blades: Array<[number, number]> = [
      [1, 2],
      [3, 0],
      [5, 1],
    ];
    for (const [bx, top] of blades) {
      for (let y = top; y < 8; y++) {
        const half = Math.floor((y - top) / 3);
        for (let dx = -half; dx <= half; dx++) {
          const shade = dx < 0 ? 150 : dx === 0 ? 176 : 120;
          c.setWrap(ox + bx + dx, oy + y, gray(shade));
        }
      }
      c.setWrap(ox + bx, oy + top - 1, gray(196)); // bright tip
    }
    for (let x = 0; x < 8; x++) c.setWrap(ox + x, oy + 7, gray(64)); // shadow at the base
  };
  clump(0, 0);
  clump(8, 0);
  clump(4, 8);
  clump(12, 8);
  return c;
}

// ── Furniture (full color, 5th-gen palette) ─────────────────

const SHADOW = hex('#285830', 70);

/** Teal tree canopy, as on the 5th-gen routes: darkest → highlight. */
const TREE_TEAL = [hex('#0c3c34'), hex('#185848'), hex('#207058'), hex('#2a8868'), hex('#40a880')];
/** Tall-grass / hedge greens: darkest → highlight. */
const HEDGE = [hex('#204c28'), hex('#285830'), hex('#387030'), hex('#489840'), hex('#68b858')];
const BARK = [hex('#4a2c18'), hex('#6a4028'), hex('#8a5838'), hex('#a87048')];

/** Draw an outlined object over a soft ground shadow (the shadow stays un-outlined). */
function withShadow(
  w: number,
  h: number,
  shadow: [cx: number, cy: number, rx: number, ry: number],
  outlineColor: RGBA,
  draw: (c: Canvas) => void,
): Canvas {
  const c = new Canvas(w, h);
  c.ellipse(...shadow, SHADOW);
  const body = new Canvas(w, h);
  draw(body);
  body.outline(outlineColor);
  c.drawOver(body);
  return c;
}

/**
 * One leaf "scale": a small dome lit from the top-left with a dark lower rim.
 * Overlapping rows of scales, drawn top to bottom, give the tiered 5th-gen
 * foliage look. `shades` runs darkest → highlight.
 */
function scale(c: Canvas, cx: number, cy: number, r: number, shades: RGBA[]): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = (x + 0.5 - cx) / (r + 1);
      const dy = (y + 0.5 - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      let idx: number;
      if (dy > 0.55 || d2 > 0.82)
        idx = 1; // lower rim
      else if (dx + dy < -0.55)
        idx = 4; // highlight
      else if (dx + dy < -0.05) idx = 3;
      else idx = 2;
      c.set(x, y, shades[idx]);
    }
  }
  // Dark crease under the scale
  for (let x = Math.ceil(cx - r); x <= cx + r; x++) c.set(x, cy + r, shades[0]);
}

function tree(): Canvas {
  return withShadow(32, 48, [16, 43, 14, 4], TREE_TEAL[0], (c) => {
    // Trunk with root flare (drawn first; the canopy covers its top)
    c.rect(13, 30, 6, 12, BARK[2]);
    c.rect(17, 30, 2, 12, BARK[1]);
    c.rect(13, 30, 1, 12, BARK[3]);
    c.rect(10, 40, 12, 2, BARK[1]);
    c.set(9, 41, BARK[1]);
    c.set(22, 41, BARK[1]);
    c.rect(12, 40, 3, 1, BARK[2]);
    // Canopy: rows of scales, widest in the middle
    const rows: Array<[cy: number, xs: number[]]> = [
      [5, [12, 20]],
      [10, [8, 16, 24]],
      [15, [5, 12, 20, 27]],
      [20, [4, 11, 18, 25, 28]],
      [25, [6, 13, 20, 26]],
      [29, [10, 17, 23]],
    ];
    for (const [cy, xs] of rows) for (const cx of xs) scale(c, cx, cy, 4, TREE_TEAL);
  });
}

function bush(): Canvas {
  return withShadow(16, 16, [8, 14, 7, 2], HEDGE[0], (c) => {
    for (const [cx, cy] of [
      [8, 5],
      [5, 8],
      [11, 8],
      [8, 10],
    ]) {
      scale(c, cx, cy, 3, HEDGE);
    }
  });
}

/** One tall-grass clump: three pointed leaves (left, right, top) over a dark base. */
function grassClump(c: Canvas, cx: number, cy: number): void {
  c.ellipse(cx, cy + 2, 4.5, 2, HEDGE[0]);
  const leaf = (lx: number, ly: number, rx: number, ry: number, body: RGBA): void => {
    c.ellipse(lx, ly, rx, ry, body);
    c.set(lx - 1, ly - ry + 1, HEDGE[4]); // sunlit tip
    c.set(lx, ly + ry - 1, HEDGE[1]); // shaded base
  };
  leaf(cx - 2.5, cy, 2.2, 3.2, HEDGE[2]);
  leaf(cx + 2.5, cy, 2.2, 3.2, HEDGE[2]);
  leaf(cx, cy - 1.5, 2, 3.5, HEDGE[3]);
}

/** Tall-grass blades standing on one tile; leaves rise 8px above it, so a
 *  character walking through is partly hidden as in the games. */
function tallGrass(): Canvas {
  const c = new Canvas(16, 24);
  grassClump(c, 4, 11);
  grassClump(c, 12, 11);
  grassClump(c, 8, 17);
  return c;
}

/** A pair of white 5th-gen flowers (petals around a yellow heart). */
function flower(c: Canvas, x: number, y: number): void {
  const petal = hex('#f8f8e8');
  const shade = hex('#d0d0c0');
  c.rect(x - 1, y - 2, 3, 1, petal);
  c.rect(x - 2, y - 1, 5, 3, petal);
  c.rect(x - 1, y + 2, 3, 1, shade);
  c.set(x + 2, y + 1, shade);
  c.set(x, y, hex('#f8c850'));
  c.set(x + 1, y, hex('#e8a838'));
}

function flowers(): Canvas {
  const c = new Canvas(16, 16);
  flower(c, 5, 5);
  flower(c, 10, 10);
  return c;
}

function sign(): Canvas {
  return withShadow(16, 32, [8, 30, 7, 2], hex('#585850'), (c) => {
    const light = hex('#e8e8e0');
    const mid = hex('#c0c0b8');
    const dark = hex('#909088');
    // Legs
    c.rect(2, 20, 2, 9, dark);
    c.rect(12, 20, 2, 9, dark);
    // Board with a bevelled frame and a recessed panel
    c.rect(0, 11, 16, 11, mid);
    c.rect(0, 11, 16, 2, light);
    c.rect(0, 20, 16, 2, dark);
    c.rect(2, 14, 12, 5, hex('#a8a8a0'));
    c.rect(3, 15, 6, 1, hex('#787870'));
    c.rect(3, 17, 9, 1, hex('#787870'));
  });
}

function stump(): Canvas {
  return withShadow(16, 16, [8, 13, 7, 2.5], BARK[0], (c) => {
    c.rect(3, 7, 10, 6, BARK[2]);
    c.rect(10, 7, 3, 6, BARK[1]);
    c.rect(3, 7, 1, 6, BARK[3]);
    c.ellipse(8, 7, 5, 2.5, hex('#e0c088'));
    c.ellipse(8, 7, 3, 1.5, hex('#c8a068'));
    c.set(8, 7, BARK[3]);
  });
}

function rock(): Canvas {
  return withShadow(16, 16, [8, 13, 7, 2.5], hex('#505860'), (c) => {
    c.ellipse(8, 9, 6, 5, hex('#98a0a8'));
    c.ellipse(7, 8, 4, 3.5, hex('#b8c0c8'));
    c.ellipse(6, 7, 2, 1.5, hex('#d8e0e8'));
    c.rect(9, 11, 4, 2, hex('#788088'));
  });
}

function fence(): Canvas {
  return withShadow(16, 16, [8, 15, 8, 1], hex('#787060'), (c) => {
    const wood = hex('#f0e8d8');
    const shade = hex('#c0b8a0');
    for (const px of [1, 12]) {
      c.rect(px, 3, 3, 11, wood);
      c.rect(px + 2, 3, 1, 11, shade);
    }
    c.rect(0, 5, 16, 2, wood);
    c.rect(0, 10, 16, 2, wood);
    c.rect(0, 7, 16, 1, shade);
    c.rect(0, 12, 16, 1, shade);
  });
}

// ── Painted map background (5th-gen route look) ─────────────

const GRASS_SHADES = ['#88d880', '#90d888', '#98e088', '#a0e888', '#a8e890', '#b0f090'].map((h) =>
  hex(h),
);
const SAND_SHADES = ['#d8c890', '#e0c898', '#e0d098', '#e0d8a0', '#e8e0b0'].map((h) => hex(h));
const PATH_RIM = hex('#c8b898');
const PATH_EDGE = hex('#a8a898');
const GRASS_SHADOW = hex('#80d078');
const TERRACE_LINE = hex('#70b060');
const TERRACE_LIGHT = hex('#c0f8a0');

/** 4×4 Bayer matrix, for the soft ordered dithering of the 5th-gen games. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

/** Pick a shade for value v in [0, 1], dithered at pixel (x, y). */
function dithered(shades: RGBA[], v: number, x: number, y: number): RGBA {
  const t = v * (shades.length - 1) + BAYER[(y % 4) * 4 + (x % 4)] * 0.9;
  return shades[Math.max(0, Math.min(shades.length - 1, Math.round(t)))];
}

function paintRoute(cols: number, rows: number, shapes: RouteShapes): Canvas {
  const w = cols * 16;
  const h = rows * 16;
  const c = new Canvas(w, h);
  const broad = valueNoise(3);
  const fine = valueNoise(5);
  const inTerrace = (x: number, y: number): boolean =>
    shapes.terraces.some(
      ([tc, tr, tw, th]) =>
        x >= tc * 16 && x < (tc + tw) * 16 && y >= tr * 16 && y < (tr + th) * 16,
    );

  // Grass: long diagonal sheen bands broken up by noise, ordered-dithered
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // u runs along the diagonal sheen, v across it: noise stretched along u
      // reads as long brush strokes, like the 5th-gen grass.
      const u = (x + y * 0.6) / 1.17;
      const v0 = (y - x * 0.6) / 1.17;
      const band = Math.sin(v0 / 11 + broad(u / 60, v0 / 30) * 4);
      let v = 0.5 + band * 0.2 + (fine(u / 22, v0 / 3) - 0.5) * 0.5;
      if (inTerrace(x, y)) v += 0.12; // raised meadows catch more light
      c.set(x, y, dithered(GRASS_SHADES, Math.max(0, Math.min(1, v)), x, y));
    }
  }

  // Terraces: zigzag ledge line along each raised meadow's edge
  for (const [tc, tr, tw, th] of shapes.terraces) {
    const x0 = tc * 16;
    const y0 = tr * 16;
    const x1 = (tc + tw) * 16 - 1;
    const y1 = (tr + th) * 16 - 1;
    const zig = (i: number): number => [0, 1, 2, 1][i % 4];
    // A 2px dark zigzag with a light lip on its inner side, as on 5th-gen ledges
    for (let x = x0; x <= x1; x++) {
      for (const [y, dir] of [
        [y0 + zig(x), 1],
        [y1 - zig(x), -1],
      ]) {
        c.set(x, y, TERRACE_LINE);
        c.set(x, y + dir, TERRACE_LINE);
        c.set(x, y + 2 * dir, TERRACE_LIGHT);
      }
      c.set(x, y1 + 1, GRASS_SHADOW);
    }
    for (let y = y0; y <= y1; y++) {
      for (const [x, dir] of [
        [x0 + zig(y), 1],
        [x1 - zig(y), -1],
      ]) {
        c.set(x, y, TERRACE_LINE);
        c.set(x + dir, y, TERRACE_LINE);
        c.set(x + 2 * dir, y, TERRACE_LIGHT);
      }
    }
  }

  // Path: sandy fill, light rim, grey edge and a soft grass shadow around it
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = shapes.pathDepth(x, y);
      if (d < -3) continue;
      if (d < -1) c.set(x, y, GRASS_SHADOW);
      else if (d < 0) c.set(x, y, PATH_EDGE);
      else if (d < 1) c.set(x, y, PATH_RIM);
      else {
        const v = 0.55 + (fine(x / 5, y / 3) - 0.5) * 0.7 + Math.min(d, 6) * 0.02;
        c.set(x, y, dithered(SAND_SHADES, Math.max(0, Math.min(1, v)), x, y));
      }
    }
  }

  // Tall grass: dense staggered leaf scales, clipped to each patch
  for (const [tc, tr, tw, th] of shapes.tallGrass) {
    const x0 = tc * 16;
    const y0 = tr * 16;
    const patch = new Canvas(w, h);
    patch.rect(x0, y0, tw * 16, th * 16, HEDGE[0]);
    // Clumps in staggered rows; each later row overlaps the one above it
    for (let y = y0 + 3, row = 0; y < y0 + th * 16 + 3; y += 5, row++) {
      for (let x = x0 + (row % 2 ? 7 : 3); x < x0 + tw * 16 + 3; x += 8) {
        // Slight jitter keeps the patch from reading as a regular weave
        grassClump(patch, x + jitter(x * 3 + y, 11), y + jitter(x + y * 5, 13));
      }
    }
    for (let y = y0; y < y0 + th * 16; y++) {
      for (let x = x0; x < x0 + tw * 16; x++) {
        const i = (y * w + x) * 4;
        c.set(x, y, [patch.data[i], patch.data[i + 1], patch.data[i + 2], 255]);
      }
    }
    // Bumpy top edge, and the patch's shadow below it
    for (let x = x0; x < x0 + tw * 16; x++) {
      const bump = [0, 1, 2, 2, 2, 1, 0, 0][(x - x0) % 8];
      for (let k = 1; k <= bump; k++) c.set(x, y0 - k, k === bump ? HEDGE[3] : HEDGE[2]);
      c.set(x, y0 + th * 16, HEDGE[1]);
      c.set(x, y0 + th * 16 + 1, GRASS_SHADOW);
    }
  }

  // Grass tufts and white flower pairs on open grass
  const decor = routeDecor();
  for (const [x, y] of decor.tufts) {
    for (const [dx, dy, color] of [
      [0, 0, '#70b868'],
      [1, -1, '#70b868'],
      [2, 0, '#70b868'],
      [3, -1, '#70b868'],
      [4, 0, '#70b868'],
      [1, -2, '#c0f0a8'],
      [3, -2, '#c0f0a8'],
    ] as const) {
      c.set(x + dx, y + dy, hex(color));
    }
  }
  for (const [x, y] of decor.flowers) {
    flower(c, x, y);
    flower(c, x + 6, y + 4);
  }
  return c;
}

interface FurnitureSpec {
  id: string;
  name: string;
  category: 'decor' | 'chairs';
  canvas: Canvas;
  footprintW: number;
  footprintH: number;
  backgroundTiles: number;
}

const furniture: FurnitureSpec[] = [
  {
    id: 'TREE',
    name: 'Tree',
    category: 'decor',
    canvas: tree(),
    footprintW: 2,
    footprintH: 2,
    backgroundTiles: 1,
  },
  {
    id: 'BUSH',
    name: 'Bush',
    category: 'decor',
    canvas: bush(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 0,
  },
  {
    id: 'TALL_GRASS',
    name: 'Tall Grass',
    category: 'decor',
    canvas: tallGrass(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 1,
  },
  {
    id: 'FLOWERS',
    name: 'Flowers',
    category: 'decor',
    canvas: flowers(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 1,
  },
  {
    id: 'ROUTE_SIGN',
    name: 'Route Sign',
    category: 'decor',
    canvas: sign(),
    footprintW: 1,
    footprintH: 2,
    backgroundTiles: 1,
  },
  {
    id: 'ROCK',
    name: 'Rock',
    category: 'decor',
    canvas: rock(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 0,
  },
  {
    id: 'FENCE',
    name: 'Fence',
    category: 'decor',
    canvas: fence(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 0,
  },
  // A stump is a "chair": working agents stand on it
  {
    id: 'STUMP',
    name: 'Stump',
    category: 'chairs',
    canvas: stump(),
    footprintW: 1,
    footprintH: 1,
    backgroundTiles: 0,
  },
];

// ── Default map: "Route 1" ──────────────────────────────────

/** Bump to replace users' saved layouts with this map on their next load. */
const ROUTE_LAYOUT_REVISION = 6;
const BACKGROUNDS_DIR = path.join(__dirname, '..', 'webview-ui', 'src', 'assets', 'maps');
const GRASS = 7;
const PATH = 8;
const TALL_GRASS = 9;
/** Floor colors only show if the painted background is unavailable. */
const FLOOR_COLORS: Record<number, { h: number; s: number; b: number; c: number }> = {
  [GRASS]: { h: 98, s: 48, b: 4, c: 0 },
  [PATH]: { h: 36, s: 42, b: 10, c: 0 },
  [TALL_GRASS]: { h: 110, s: 52, b: -4, c: 10 },
};

function routeLayout(): Record<string, unknown> {
  const tiles = new Array<number>(COLS * ROWS).fill(GRASS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (ROUTE_SHAPES.pathDepth(c * 16 + 8, r * 16 + 8) > 0) tiles[r * COLS + c] = PATH;
    }
  }
  for (const [c0, r0, w, h] of ROUTE_SHAPES.tallGrass) {
    for (let r = r0; r < r0 + h; r++)
      for (let c = c0; c < c0 + w; c++) tiles[r * COLS + c] = TALL_GRASS;
  }

  const sizes = new Map(furniture.map((f) => [f.id, [f.footprintW, f.footprintH]]));
  const occupied = new Set<string>();
  const placed: Array<{ uid: string; type: string; col: number; row: number }> = [];
  const place = (type: string, col: number, row: number): boolean => {
    const [w, h] = sizes.get(type)!;
    const cells: string[] = [];
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS || occupied.has(`${c},${r}`)) return false;
        cells.push(`${c},${r}`);
      }
    }
    cells.forEach((cell) => occupied.add(cell));
    placed.push({ uid: `route-${type.toLowerCase()}-${placed.length}`, type, col, row });
    return true;
  };

  // Forest border, leaving the path open at both ends
  const pathCol = COLS / 2;
  for (let c = 0; c < COLS; c += 2) {
    if (c === pathCol - 2 || c === pathCol) continue;
    place('TREE', c, 0);
    place('TREE', c, ROWS - 2);
  }
  for (let r = 2; r < ROWS - 2; r += 2) {
    place('TREE', 0, r);
    place('TREE', COLS - 2, r);
  }
  // Groves thickening the forest on both sides
  for (const [c, r] of [
    [2, 8],
    [2, 11],
    [4, 15],
    [2, 18],
    [5, 21],
    [col(0.92), 3],
    [col(0.92), 6],
    [col(0.92), 16],
    [col(0.88), 20],
    [col(0.75), 21],
    [col(0.45), 3],
  ]) {
    place('TREE', c, r);
  }

  // Tall grass blades standing on every tile of each patch
  for (const [c0, r0, w, h] of ROUTE_SHAPES.tallGrass) {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) place('TALL_GRASS', c, r);
  }

  // Spots where working Pokémon stand: the west meadow and the east clearing
  const meadowC = col(0.2);
  const clearingC = col(0.62);
  const clearingR = row(0.55);
  for (const [c, r] of [
    [meadowC + 1, 4],
    [meadowC + 3, 4],
    [meadowC + 5, 4],
    [meadowC + 2, 6],
    [meadowC + 4, 6],
    [clearingC, clearingR],
    [clearingC + 3, clearingR],
    [clearingC + 6, clearingR],
  ]) {
    place('STUMP', c, r);
  }
  place('ROUTE_SIGN', COLS / 2 + 2, 2);
  for (const [c, r] of [
    [col(0.42), 7],
    [col(0.15), row(0.42)],
    [col(0.72), row(0.38)],
    [col(0.55), row(0.86)],
    [col(0.3), row(0.55)],
  ]) {
    place('BUSH', c, r);
  }
  place('ROCK', col(0.38), row(0.74));
  place('ROCK', col(0.8), 2);
  place('ROCK', col(0.12), row(0.52));

  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    layoutRevision: ROUTE_LAYOUT_REVISION,
    background: ROUTE_BACKGROUND,
    tiles,
    tileColors: tiles.map((t) => FLOOR_COLORS[t]),
    furniture: placed,
  };
}

function main(): void {
  // Floor slots 6-8 (tile types 7-9) become the route floors.
  grassFloor().save(path.join(ASSETS_DIR, 'floors', 'floor_6.png'));
  pathFloor().save(path.join(ASSETS_DIR, 'floors', 'floor_7.png'));
  tallGrassFloor().save(path.join(ASSETS_DIR, 'floors', 'floor_8.png'));

  for (const f of furniture) {
    const dir = path.join(ASSETS_DIR, 'furniture', f.id);
    f.canvas.save(path.join(dir, `${f.id}.png`));
    const manifest = {
      id: f.id,
      name: f.name,
      category: f.category,
      type: 'asset',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: f.backgroundTiles,
      width: f.canvas.w,
      height: f.canvas.h,
      footprintW: f.footprintW,
      footprintH: f.footprintH,
    };
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  paintRoute(COLS, ROWS, ROUTE_SHAPES).save(path.join(BACKGROUNDS_DIR, `${ROUTE_BACKGROUND}.png`));
  fs.writeFileSync(
    path.join(ASSETS_DIR, `default-layout-${ROUTE_LAYOUT_REVISION}.json`),
    JSON.stringify(routeLayout()) + '\n',
  );
  console.log(`Wrote 3 floors, ${furniture.length} furniture items and the route map`);
}

main();
