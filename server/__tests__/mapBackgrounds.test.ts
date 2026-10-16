import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadAllMapBackgrounds, loadMapBackgrounds } from '../src/mapBackgrounds.js';

describe('map backgrounds from external asset directories', () => {
  const dirs: string[] = [];
  const makeDir = (files: Record<string, string>): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pokeagents-maps-'));
    dirs.push(root);
    fs.mkdirSync(path.join(root, 'assets', 'maps'), { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, 'assets', 'maps', name), content);
    }
    return root;
  };

  beforeEach(() => {
    dirs.length = 0;
  });

  afterEach(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reads <dir>/assets/maps/<name>.png as base64 keyed by name', () => {
    const root = makeDir({ 'route-1.png': 'abc' });
    expect(loadMapBackgrounds(root)).toEqual({ 'route-1': Buffer.from('abc').toString('base64') });
  });

  it('ignores non-PNG files and unsafe names', () => {
    const root = makeDir({ 'notes.txt': 'x', 'Bad Name.png': 'x', '.hidden.png': 'x' });
    expect(loadMapBackgrounds(root)).toEqual({});
  });

  it('returns nothing for a directory without maps', () => {
    expect(loadMapBackgrounds(path.join(os.tmpdir(), 'pokeagents-does-not-exist'))).toEqual({});
  });

  it('lets a later directory override an earlier one', () => {
    const first = makeDir({ 'route-1.png': 'one' });
    const second = makeDir({ 'route-1.png': 'two' });
    expect(loadAllMapBackgrounds([first, second])['route-1']).toBe(
      Buffer.from('two').toString('base64'),
    );
  });
});
