/**
 * Tiny RGBA canvas and seeded noise helpers for the procedural pixel-art
 * generators (scripts/generate-route-assets.ts, scripts/build-bw-pack.ts).
 */
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';

export type RGBA = [number, number, number, number];

export const hex = (h: string, a = 255): RGBA => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  a,
];
export const gray = (v: number): RGBA => [v, v, v, 255];

export class Canvas {
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

  static fromPng(file: string): Canvas {
    const png = PNG.sync.read(fs.readFileSync(file));
    const c = new Canvas(png.width, png.height);
    c.data.set(png.data);
    return c;
  }

  /** The pixel at (x, y), wrapping around the edges (tiles repeat seamlessly). */
  sample(x: number, y: number): RGBA {
    const i =
      ((((y % this.h) + this.h) % this.h) * this.w + (((x % this.w) + this.w) % this.w)) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Composite `src` with its top-left at (dx, dy), optionally squashed to
   *  `height` rows (nearest neighbour) and faded by `alpha` (0-1). */
  drawImage(src: Canvas, dx: number, dy: number, height = src.h, alpha = 1): void {
    for (let y = 0; y < height; y++) {
      const sy = Math.floor((y * src.h) / height);
      for (let x = 0; x < src.w; x++) {
        const [r, g, b, a] = src.sample(x, sy);
        if (a > 0) this.set(dx + x, dy + y, [r, g, b, Math.round(a * alpha)]);
      }
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
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic -1/0/1 jitter (worn path borders, irregular grass clumps). */
export const jitter = (i: number, salt: number): number =>
  ((Math.imul(i + salt, 2654435761) >>> 29) % 3) - 1;

/** Smooth 2D value noise in [0, 1]. */
export function valueNoise(seed: number): (x: number, y: number) => number {
  const hash = (ix: number, iy: number): number => {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const top = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx;
    const bottom = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
}
