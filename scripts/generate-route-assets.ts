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
import { PNG } from 'pngjs';

const ASSETS_DIR = path.join(__dirname, '..', 'webview-ui', 'public', 'assets');

type RGBA = [number, number, number, number];

const hex = (h: string, a = 255): RGBA => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  a,
];
const gray = (v: number): RGBA => [v, v, v, 255];

class Canvas {
  readonly data: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h * 4);
  }

  set(x: number, y: number, c: RGBA): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = c[3] / 255;
    const under = this.data[i + 3] / 255;
    // Alpha-composite so translucent shadows stack under opaque shapes correctly.
    const outA = a + under * (1 - a);
    for (let k = 0; k < 3; k++) {
      this.data[i + k] = outA === 0 ? 0 : (c[k] * a + this.data[i + k] * under * (1 - a)) / outA;
    }
    this.data[i + 3] = Math.round(outA * 255);
  }

  /** Same as set, but wraps around the edges (for seamless floor tiles). */
  setWrap(x: number, y: number, c: RGBA): void {
    this.set(((x % this.w) + this.w) % this.w, ((y % this.h) + this.h) % this.h, c);
  }

  opaque(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[(y * this.w + x) * 4 + 3] > 0;
  }

  fill(c: RGBA): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c);
  }

  rect(x0: number, y0: number, w: number, h: number, c: RGBA): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
  }

  /** Paint a 1px outline around every opaque region (outside pixels only). */
  outline(c: RGBA): void {
    const edge: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) continue;
        if (
          this.opaque(x - 1, y) ||
          this.opaque(x + 1, y) ||
          this.opaque(x, y - 1) ||
          this.opaque(x, y + 1)
        ) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, c);
  }

  /** Composite another canvas of the same size on top of this one. */
  drawOver(top: Canvas): void {
    for (let i = 0; i < top.data.length; i += 4) {
      if (top.data[i + 3] === 0) continue;
      const p = i / 4;
      this.set(p % this.w, Math.floor(p / this.w), [
        top.data[i],
        top.data[i + 1],
        top.data[i + 2],
        top.data[i + 3],
      ]);
    }
  }

  save(file: string): void {
    const png = new PNG({ width: this.w, height: this.h });
    png.data.set(this.data);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
  }
}

/** mulberry32 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

// ── Furniture (full color) ──────────────────────────────────

const OUTLINE = hex('#203820');
const LEAVES = [hex('#2c6a34'), hex('#3c8a3c'), hex('#58a848'), hex('#88d060')];
const SHADOW = hex('#000000', 60);

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

/** Round canopy shaded by distance to a top-left light source. */
function canopy(
  c: Canvas,
  blobs: Array<[number, number, number]>,
  light: [number, number],
  palette: RGBA[],
): void {
  const r = rng(blobs.length * 31 + light[0]);
  for (const [cx, cy, rad] of blobs) {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > rad * rad) continue;
        // Light falls on each blob from the top-left; jitter gives a leafy edge.
        const lx = x - (cx - rad * 0.35 + (light[0] - 16) * 0.1);
        const ly = y - (cy - rad * 0.4 + (light[1] - 16) * 0.1);
        const d = Math.sqrt(lx * lx + ly * ly) / rad + (r() - 0.5) * 0.18;
        const idx = d < 0.35 ? 3 : d < 0.7 ? 2 : d < 1.05 ? 1 : 0;
        c.set(x, y, palette[idx]);
      }
    }
  }
}

function tree(): Canvas {
  return withShadow(32, 48, [16, 44, 12, 3.5], OUTLINE, (c) => {
    canopy(
      c,
      [
        [16, 13, 10],
        [8, 22, 8],
        [24, 22, 8],
        [16, 26, 9],
        [11, 13, 6],
        [21, 12, 6],
      ],
      [10, 8],
      LEAVES,
    );
    // Trunk, drawn after the canopy so it shows below it
    c.rect(13, 34, 6, 10, hex('#8a5a30'));
    c.rect(17, 34, 2, 10, hex('#6a4020'));
    c.rect(13, 34, 1, 10, hex('#a87040'));
    c.rect(12, 42, 8, 2, hex('#6a4020'));
  });
}

function bush(): Canvas {
  return withShadow(16, 16, [8, 14, 7, 2], OUTLINE, (c) =>
    canopy(
      c,
      [
        [8, 9, 6],
        [4.5, 10.5, 4],
        [11.5, 10.5, 4],
      ],
      [5, 5],
      LEAVES,
    ),
  );
}

function flowers(): Canvas {
  const c = new Canvas(16, 16);
  const flower = (x: number, y: number, petal: RGBA, petalShade: RGBA): void => {
    c.set(x, y + 2, hex('#3c7a30'));
    c.set(x, y + 3, hex('#3c7a30'));
    c.set(x - 1, y, petal);
    c.set(x + 1, y, petal);
    c.set(x, y - 1, petal);
    c.set(x, y + 1, petalShade);
    c.set(x, y, hex('#f8d030'));
  };
  flower(3, 4, hex('#f85858'), hex('#c03838'));
  flower(11, 3, hex('#f8f8f8'), hex('#c8c8d8'));
  flower(7, 10, hex('#f8f8f8'), hex('#c8c8d8'));
  flower(13, 11, hex('#f85858'), hex('#c03838'));
  flower(2, 12, hex('#f8a8d0'), hex('#d078a0'));
  return c;
}

function sign(): Canvas {
  return withShadow(16, 32, [8, 30, 6, 1.5], hex('#3a2010'), (c) => {
    // Posts
    c.rect(3, 18, 2, 12, hex('#6a4020'));
    c.rect(11, 18, 2, 12, hex('#6a4020'));
    // Board
    c.rect(1, 12, 14, 9, hex('#a87040'));
    c.rect(1, 12, 14, 2, hex('#c89058'));
    c.rect(1, 19, 14, 2, hex('#8a5a30'));
    // Lettering hint
    c.rect(4, 15, 8, 1, hex('#6a4020'));
    c.rect(4, 17, 5, 1, hex('#6a4020'));
  });
}

function stump(): Canvas {
  return withShadow(16, 16, [8, 13, 7, 2.5], hex('#3a2010'), (c) => {
    c.rect(3, 7, 10, 6, hex('#8a5a30'));
    c.rect(10, 7, 3, 6, hex('#6a4020'));
    c.rect(3, 7, 1, 6, hex('#a87040'));
    c.ellipse(8, 7, 5, 2.5, hex('#d8b070'));
    c.ellipse(8, 7, 3, 1.5, hex('#c09050'));
    c.set(8, 7, hex('#a87040'));
  });
}

function rock(): Canvas {
  return withShadow(16, 16, [8, 13, 7, 2.5], hex('#383840'), (c) => {
    c.ellipse(8, 9, 6, 5, hex('#8890a0'));
    c.ellipse(7, 8, 4, 3.5, hex('#a8b0c0'));
    c.ellipse(6, 7, 2, 1.5, hex('#c8d0d8'));
    c.rect(9, 11, 4, 2, hex('#687080'));
  });
}

function fence(): Canvas {
  return withShadow(16, 16, [8, 15, 8, 1], hex('#585040'), (c) => {
    const wood = hex('#e8e0d0');
    const shade = hex('#b0a890');
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
const ROUTE_LAYOUT_REVISION = 2;
const COLS = 24;
const ROWS = 18;
const GRASS = 7;
const PATH = 8;
const TALL_GRASS = 9;
const FLOOR_COLORS: Record<number, { h: number; s: number; b: number; c: number }> = {
  [GRASS]: { h: 98, s: 48, b: 4, c: 0 },
  [PATH]: { h: 36, s: 42, b: 10, c: 0 },
  [TALL_GRASS]: { h: 110, s: 52, b: -4, c: 10 },
};

function routeLayout(): Record<string, unknown> {
  const tiles = new Array<number>(COLS * ROWS).fill(GRASS);
  const paint = (c0: number, r0: number, w: number, h: number, tile: number): void => {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) tiles[r * COLS + c] = tile;
  };
  paint(11, 0, 2, ROWS, PATH); // main north-south path
  paint(3, 8, 9, 2, PATH); // branch west to the clearing
  paint(15, 3, 6, 5, TALL_GRASS);
  paint(3, 12, 5, 3, TALL_GRASS);

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
  const isPath = (c: number, r: number): boolean => tiles[r * COLS + c] === PATH;

  // Tree border, leaving the path open at both ends
  for (let c = 0; c < COLS; c += 2) {
    if (c === 10 || c === 12) continue;
    place('TREE', c, 0);
    place('TREE', c, ROWS - 2);
  }
  for (let r = 2; r < ROWS - 2; r += 2) {
    place('TREE', 0, r);
    place('TREE', COLS - 2, r);
  }

  // Spots where working Pokémon stand
  for (const [c, r] of [
    [4, 4],
    [6, 4],
    [8, 4],
    [14, 11],
    [16, 11],
    [18, 11],
    [15, 14],
    [18, 14],
  ]) {
    place('STUMP', c, r);
  }
  place('ROUTE_SIGN', 13, 2);
  for (let c = 14; c <= 21; c++) place('FENCE', c, 10);
  for (const [c, r] of [
    [9, 5],
    [3, 10],
    [20, 15],
    [2, 6],
  ]) {
    place('BUSH', c, r);
  }
  place('ROCK', 8, 14);
  place('ROCK', 19, 2);

  // Scatter flowers on free plain grass
  const r = rng(2024);
  let flowersLeft = 16;
  for (let tries = 0; flowersLeft > 0 && tries < 500; tries++) {
    const c = 2 + Math.floor(r() * (COLS - 4));
    const row = 2 + Math.floor(r() * (ROWS - 4));
    if (tiles[row * COLS + c] !== GRASS || isPath(c, row)) continue;
    if (place('FLOWERS', c, row)) flowersLeft--;
  }

  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    layoutRevision: ROUTE_LAYOUT_REVISION,
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
  fs.writeFileSync(
    path.join(ASSETS_DIR, `default-layout-${ROUTE_LAYOUT_REVISION}.json`),
    JSON.stringify(routeLayout()) + '\n',
  );
  console.log(`Wrote 3 floors, ${furniture.length} furniture items and the route layout`);
}

main();
