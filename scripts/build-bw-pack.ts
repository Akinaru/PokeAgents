/**
 * Builds the local "Pokémon Black/White" asset pack from textures ripped from
 * the game, and registers it as an external asset directory.
 *
 * The textures are Nintendo / GAME FREAK property: they are read from a local
 * folder (default tmp/bw/matrix1, git-ignored) and the pack is written to
 * ~/.pokeagents/packs/pokemon-bw — never into this repository. The pack overrides
 * the bundled Route 1 ground and its TREE / TALL_GRASS / FLOWERS / ROUTE_SIGN
 * furniture by name; delete the folder (or remove it in Settings) to go back.
 *
 * Expected input: the map textures of the Black/White overworld model
 * (matrix1_*.png), e.g. from github.com/one-om-jha/PokemonBlack/models/maps/matrix1.
 *
 * Run: npx tsx scripts/build-bw-pack.ts [textureDir]
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { readConfig, writeConfig } from '../server/src/configPersistence.js';
import { Canvas } from './lib/pixelCanvas.js';
import { COLS, ROUTE_BACKGROUND, ROUTE_SHAPES, ROWS, routeDecor } from './lib/route1.js';

const TEXTURE_DIR = path.resolve(
  process.argv[2] ?? path.join(__dirname, '..', 'tmp', 'bw', 'matrix1'),
);
const PACK_DIR = path.join(os.homedir(), '.pokeagents', 'packs', 'pokemon-bw');

function texture(name: string): Canvas {
  const file = path.join(TEXTURE_DIR, `matrix1_${name}.png`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing texture ${file} — download the Black/White map textures first.`);
  }
  return Canvas.fromPng(file);
}

/** Route 1 ground: tiled game grass, the sandy path with the game's own grass
 *  fringe along its edges, leafy tall-grass beds, flowers and tufts. */
function paintGround(): Canvas {
  const grass = texture('grass01ax');
  const sand = texture('michi01b');
  const edge = texture('michi01a'); // grass fringe (top rows) fading into sand
  const leaves = texture('kusa_ec1');
  const w = COLS * 16;
  const h = ROWS * 16;
  const c = new Canvas(w, h);
  const FRINGE_OUT = 6; // px of the fringe that lie outside the path
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = ROUTE_SHAPES.pathDepth(x, y);
      if (d >= edge.h - FRINGE_OUT) c.set(x, y, sand.sample(x, y));
      else if (d >= -FRINGE_OUT) c.set(x, y, edge.sample(x + y, Math.floor(d) + FRINGE_OUT));
      else c.set(x, y, grass.sample(x, y));
    }
  }
  // Tall-grass beds: a dense carpet of leaves under the standing blades
  for (const [tc, tr, tw, th] of ROUTE_SHAPES.tallGrass) {
    for (let y = tr * 16 - 4; y < (tr + th) * 16; y += 6) {
      for (let x = tc * 16 + ((y / 6) % 2 ? 4 : -4); x < (tc + tw) * 16; x += 8) {
        c.drawImage(leaves, x, y);
      }
    }
  }
  const decor = routeDecor();
  const tuft = texture('ue_grass00');
  const flowers = texture('hana01_1');
  for (const [x, y] of decor.tufts) c.drawImage(tuft, x - 8, y - 12);
  for (const [x, y] of decor.flowers) c.drawImage(flowers, x - 4, y - 4);
  return c;
}

/** Conifer billboard over its ground shadow (the top-down shadow, flattened). */
function tree(): Canvas {
  const trunk = texture('ki02ax');
  const shadow = texture('ki02c');
  const c = new Canvas(32, 72);
  c.drawImage(shadow, 0, 60, 12, 0.7);
  c.drawImage(trunk, 0, 3);
  return c;
}

function tallGrass(): Canvas {
  const c = new Canvas(16, 24);
  c.drawImage(texture('kusa_ec1s'), 0, 0);
  c.drawImage(texture('kusa_ec1'), 0, 8);
  return c;
}

function routeSign(): Canvas {
  const c = new Canvas(32, 40);
  const post = [112, 112, 104, 255] as const;
  c.rect(5, 30, 3, 10, [...post]);
  c.rect(24, 30, 3, 10, [...post]);
  c.drawImage(texture('sign01a_lm1'), 0, 0);
  return c;
}

interface PackItem {
  id: string;
  name: string;
  canvas: Canvas;
  footprintW: number;
  footprintH: number;
  backgroundTiles: number;
}

function main(): void {
  const items: PackItem[] = [
    {
      id: 'TREE',
      name: 'Tree (B/W)',
      canvas: tree(),
      footprintW: 2,
      footprintH: 2,
      backgroundTiles: 1,
    },
    {
      id: 'TALL_GRASS',
      name: 'Tall Grass (B/W)',
      canvas: tallGrass(),
      footprintW: 1,
      footprintH: 1,
      backgroundTiles: 1,
    },
    {
      id: 'FLOWERS',
      name: 'Flowers (B/W)',
      canvas: texture('hana01_1'),
      footprintW: 1,
      footprintH: 1,
      backgroundTiles: 1,
    },
    {
      id: 'ROUTE_SIGN',
      name: 'Route Sign (B/W)',
      canvas: routeSign(),
      footprintW: 1,
      footprintH: 2,
      backgroundTiles: 1,
    },
  ];

  fs.rmSync(PACK_DIR, { recursive: true, force: true });
  for (const item of items) {
    const dir = path.join(PACK_DIR, 'assets', 'furniture', item.id);
    item.canvas.save(path.join(dir, `${item.id}.png`));
    const manifest = {
      id: item.id,
      name: item.name,
      category: 'decor',
      type: 'asset',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: item.backgroundTiles,
      width: item.canvas.w,
      height: item.canvas.h,
      footprintW: item.footprintW,
      footprintH: item.footprintH,
    };
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  paintGround().save(path.join(PACK_DIR, 'assets', 'maps', `${ROUTE_BACKGROUND}.png`));

  const config = readConfig();
  if (!config.externalAssetDirectories.includes(PACK_DIR)) {
    config.externalAssetDirectories.push(PACK_DIR);
    writeConfig(config);
  }
  console.log(`Built the Black/White pack in ${PACK_DIR} and enabled it.`);
}

main();
