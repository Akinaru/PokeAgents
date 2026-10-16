/**
 * Painted map backgrounds from external asset directories.
 *
 * A directory may ship `assets/maps/<name>.png`; a layout whose `background`
 * is `<name>` then shows it instead of the background bundled in the webview.
 * This is how a local, never-published asset pack restyles a map.
 */
import * as fs from 'fs';
import * as path from 'path';

import { MAX_MAP_BACKGROUND_PNG_SIZE } from './constants.js';

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** name → base64 PNG, for every valid background in `<root>/assets/maps/`. */
export function loadMapBackgrounds(root: string): Record<string, string> {
  const dir = path.join(root, 'assets', 'maps');
  const backgrounds: Record<string, string> = {};
  if (!fs.existsSync(dir)) return backgrounds;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.png')) continue;
    const name = file.slice(0, -'.png'.length);
    if (!NAME_PATTERN.test(name)) continue;
    const filePath = path.join(dir, file);
    try {
      if (fs.statSync(filePath).size > MAX_MAP_BACKGROUND_PNG_SIZE) {
        console.warn(`[AssetLoader] Skipping oversized map background ${filePath}`);
        continue;
      }
      backgrounds[name] = fs.readFileSync(filePath).toString('base64');
    } catch (err) {
      console.warn(`[AssetLoader] Cannot read map background ${filePath}:`, err);
    }
  }
  return backgrounds;
}

/** Backgrounds from every external directory; later directories win on a name clash. */
export function loadAllMapBackgrounds(externalDirs: string[]): Record<string, string> {
  return Object.assign({}, ...externalDirs.map(loadMapBackgrounds));
}
