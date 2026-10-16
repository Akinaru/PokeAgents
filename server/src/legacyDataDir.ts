import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { LAYOUT_FILE_DIR, LEGACY_DATA_DIR, SERVER_JSON_NAME } from './constants.js';

/** Live-process files that describe a running server, never worth carrying over. */
const SKIPPED_ENTRIES = new Set([SERVER_JSON_NAME, 'servers']);

/**
 * One-time move to the data folder of the PokeAgents name.
 *
 * Before the rename everything lived in ~/.aagent (config, layout, Pokédex,
 * sprite cache, asset packs, the hook script). When ~/.pokeagents does not
 * exist yet and the old folder does, its content is COPIED over — not moved:
 * the hooks installed in ~/.claude/settings.json still point at the old script
 * until the next install rewrites them, and a missing script would make Claude
 * Code spawn a dead `node` for every event. Absolute paths into the old folder
 * kept in config.json (external asset directories) are pointed at the new one.
 *
 * Must run before anything reads the data folder. Never throws: a failed copy
 * only means starting fresh, and the old folder is left untouched.
 */
export function migrateLegacyDataDir(home: string = os.homedir()): boolean {
  const from = path.join(home, LEGACY_DATA_DIR);
  const to = path.join(home, LAYOUT_FILE_DIR);
  try {
    if (fs.existsSync(to) || !fs.statSync(from, { throwIfNoEntry: false })?.isDirectory()) {
      return false;
    }
    // Copy into a staging folder, then rename: a crash mid-copy must not leave
    // a half-filled ~/.pokeagents that the existence check would then trust.
    const staging = `${to}.migrating`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.cpSync(from, staging, {
      recursive: true,
      filter: (src) => src === from || !SKIPPED_ENTRIES.has(path.relative(from, src)),
    });
    const configPath = path.join(staging, 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      // JSON-escaped, as the paths appear inside the file
      const oldPrefix = JSON.stringify(from + path.sep).slice(1, -1);
      const newPrefix = JSON.stringify(to + path.sep).slice(1, -1);
      fs.writeFileSync(configPath, raw.split(oldPrefix).join(newPrefix));
    }
    fs.renameSync(staging, to);
    console.log(`[PokeAgents] Copied ${from} to ${to}`);
    return true;
  } catch (err) {
    console.warn(`[PokeAgents] Could not copy ${from} to ${to}:`, err);
    return false;
  }
}
