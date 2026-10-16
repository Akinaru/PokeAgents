import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  agentStats,
  createActivity,
  favoriteMove,
  moveOf,
  natureOf,
  recordTaskDone,
  recordToolUse,
} from '../src/pokemon/activity.js';

test('tools map to the four moves', () => {
  assert.equal(moveOf('Edit'), 'edit');
  assert.equal(moveOf('Write'), 'edit');
  assert.equal(moveOf('Read'), 'read');
  assert.equal(moveOf('Bash'), 'command');
  assert.equal(moveOf('Grep'), 'search');
  assert.equal(moveOf('WebSearch'), 'search');
  assert.equal(moveOf('Task'), null);
  assert.equal(moveOf(null), null);
});

test('a tool announced twice (hook + transcript) counts once', () => {
  const a = createActivity(0);
  recordToolUse(a, 't1', 'Read', 'Reading a.ts', 1000);
  recordToolUse(a, 't1', 'Read', 'Reading a.ts', 1001);
  recordToolUse(a, 't2', 'Edit', 'Editing a.ts', 2000);
  assert.equal(a.moves.read.count, 1);
  assert.equal(a.moves.edit.count, 1);
  assert.equal(a.moves.edit.last, 2000);
  assert.deepEqual(
    a.journal.map((e) => e.text),
    ['Editing a.ts', 'Reading a.ts'],
  );
});

test('the journal keeps the latest entries, newest first', () => {
  const a = createActivity(0);
  for (let i = 0; i < 40; i++) recordToolUse(a, `t${i}`, 'Read', `step ${i}`, i);
  recordTaskDone(a, 99);
  assert.equal(a.journal.length, 30);
  assert.equal(a.journal[0].text, 'Tâche terminée ♪');
  assert.equal(a.journal[1].text, 'step 39');
});

test('nature follows the favorite move', () => {
  const a = createActivity(0);
  assert.equal(natureOf(a).nature, 'Sérieux');
  recordToolUse(a, 'a', 'Bash', 'x');
  recordToolUse(a, 'b', 'Bash', 'x');
  recordToolUse(a, 'c', 'Read', 'x');
  assert.equal(favoriteMove(a), 'command');
  assert.equal(natureOf(a).nature, 'Brave');
});

test('stats are relative to the most used move and show context left as HP', () => {
  const a = createActivity(0);
  for (let i = 0; i < 4; i++) recordToolUse(a, `e${i}`, 'Edit', 'x');
  recordToolUse(a, 'r', 'Read', 'x');
  const stats = agentStats(a, 0.25, 6, 3_600_000);
  const by = Object.fromEntries(stats.map((s) => [s.label, s]));
  assert.equal(by.PV.ratio, 0.25);
  assert.equal(by.ATTAQUE.ratio, 1);
  assert.equal(by['DÉFENSE'].ratio, 0.25);
  assert.equal(by.VITESSE.value, '6,0/h');
  assert.equal(stats.length, 6);
});
