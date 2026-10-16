import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readPokedex, recordPokemonSeen } from '../src/pokedexPersistence.js';
import {
  agentPokemonSeed,
  isValidPokemonRequest,
  parseAnimData,
  pokemonSeed,
} from '../src/pokemonSprites.js';
import type { AgentState } from '../src/types.js';

const ANIM_XML = `<AnimData><Anims>
  <Anim><Name>Walk</Name><FrameWidth>32</FrameWidth><FrameHeight>40</FrameHeight>
    <Durations><Duration>8</Duration><Duration>10</Duration></Durations></Anim>
  <Anim><Name>Idle</Name><FrameWidth>40</FrameWidth><FrameHeight>56</FrameHeight>
    <Durations><Duration>40</Duration></Durations></Anim>
  <Anim><Name>Sleep</Name><CopyOf>Idle</CopyOf></Anim>
  <Anim><Name>Charge</Name><FrameWidth>40</FrameWidth><FrameHeight>40</FrameHeight>
    <Durations><Duration>2</Duration><Duration>4</Duration></Durations></Anim>
</Anims></AnimData>`;

describe('parseAnimData', () => {
  it('reads frame sizes and durations of the animations we render', () => {
    const anims = parseAnimData(ANIM_XML);
    expect(anims.map((a) => a.name)).toEqual(['Walk', 'Idle', 'Sleep', 'Charge']);
    expect(anims[0]).toMatchObject({ frameWidth: 32, frameHeight: 40, durations: [8, 10] });
  });

  it('follows CopyOf to the sheet it aliases', () => {
    const sleep = parseAnimData(ANIM_XML).find((a) => a.name === 'Sleep')!;
    expect(sleep).toMatchObject({ sheet: 'Idle', frameWidth: 40, frameHeight: 56 });
  });

  it('rejects a species missing a required animation', () => {
    expect(() => parseAnimData(ANIM_XML.replace(/<Anim><Name>Charge[\s\S]*?<\/Anim>/, ''))).toThrow(
      /Charge/,
    );
  });
});

describe('Pokémon request validation and seeds', () => {
  it('accepts only an integer dex in range with a boolean shiny flag', () => {
    expect(isValidPokemonRequest(25, true)).toBe(true);
    expect(isValidPokemonRequest(0, false)).toBe(false);
    expect(isValidPokemonRequest(1026, false)).toBe(false);
    expect(isValidPokemonRequest(2.5, false)).toBe(false);
    expect(isValidPokemonRequest('25', false)).toBe(false);
    expect(isValidPokemonRequest(25, 'yes')).toBe(false);
  });

  it('derives a stable seed from the transcript and keeps it after a /clear', () => {
    const agent = { id: 1, sessionId: 'abc', jsonlFile: '/p/abc.jsonl' } as AgentState;
    const seed = agentPokemonSeed(agent);
    expect(seed).toBe(pokemonSeed('abc.jsonl'));
    agent.jsonlFile = '/p/def.jsonl';
    expect(agentPokemonSeed(agent)).toBe(seed);
  });
});

describe('Pokédex persistence', () => {
  let home: string;
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.HOME;
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'aagent-pokedex-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('starts empty', () => {
    expect(readPokedex()).toEqual({ seen: [], shiny: [] });
  });

  it('records species once, sorted, and tracks shinies separately', () => {
    recordPokemonSeen(25, false);
    recordPokemonSeen(1, true);
    recordPokemonSeen(25, false);
    expect(readPokedex()).toEqual({ seen: [1, 25], shiny: [1] });
  });

  it('adds the shiny flag to an already seen species', () => {
    recordPokemonSeen(25, false);
    recordPokemonSeen(25, true);
    expect(readPokedex()).toEqual({ seen: [25], shiny: [25] });
  });

  it('ignores a corrupt file instead of throwing', () => {
    fs.mkdirSync(path.join(home, '.aagent'), { recursive: true });
    fs.writeFileSync(path.join(home, '.aagent', 'pokedex.json'), '{oops');
    expect(readPokedex()).toEqual({ seen: [], shiny: [] });
  });
});
