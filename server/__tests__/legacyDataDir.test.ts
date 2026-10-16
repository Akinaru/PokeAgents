import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { migrateLegacyDataDir } from '../src/legacyDataDir.js';

describe('migrateLegacyDataDir', () => {
  let home: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'pokeagents-home-'));
  });
  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  const old = () => path.join(home, '.aagent');
  const neu = () => path.join(home, '.pokeagents');

  it('copies the old folder, skips live server files and repoints asset paths', () => {
    fs.mkdirSync(path.join(old(), 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(old(), 'servers'));
    fs.writeFileSync(path.join(old(), 'hooks', 'claude-hook.js'), 'script');
    fs.writeFileSync(path.join(old(), 'pokedex.json'), '{"species":{}}');
    fs.writeFileSync(path.join(old(), 'server.json'), '{"port":1}');
    const pack = path.join(old(), 'packs', 'bw');
    fs.writeFileSync(
      path.join(old(), 'config.json'),
      JSON.stringify({ externalAssetDirectories: [pack, '/elsewhere/pack'] }),
    );

    expect(migrateLegacyDataDir(home)).toBe(true);

    expect(fs.readFileSync(path.join(neu(), 'pokedex.json'), 'utf-8')).toBe('{"species":{}}');
    expect(fs.existsSync(path.join(neu(), 'hooks', 'claude-hook.js'))).toBe(true);
    expect(fs.existsSync(path.join(neu(), 'server.json'))).toBe(false);
    expect(fs.existsSync(path.join(neu(), 'servers'))).toBe(false);
    const config = JSON.parse(fs.readFileSync(path.join(neu(), 'config.json'), 'utf-8'));
    expect(config.externalAssetDirectories).toEqual([
      path.join(neu(), 'packs', 'bw'),
      '/elsewhere/pack',
    ]);
    // The old folder stays: installed hooks still point at its script
    expect(fs.existsSync(path.join(old(), 'hooks', 'claude-hook.js'))).toBe(true);
  });

  it('does nothing when the new folder already exists or there is nothing to copy', () => {
    expect(migrateLegacyDataDir(home)).toBe(false);
    fs.mkdirSync(old());
    fs.writeFileSync(path.join(old(), 'layout.json'), 'old');
    fs.mkdirSync(neu());
    expect(migrateLegacyDataDir(home)).toBe(false);
    expect(fs.existsSync(path.join(neu(), 'layout.json'))).toBe(false);
  });
});
