import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenMatches, parseDays, logFilesFor } from '../../site/lib/bot-log-download.ts';

test('the bot log download checks the token in constant time form and picks files by day', () => {
  assert.equal(tokenMatches('Bearer abc', 'abc'), true);
  assert.equal(tokenMatches('Bearer abd', 'abc'), false);
  assert.equal(tokenMatches('Bearer ab', 'abc'), false);
  assert.equal(tokenMatches('abc', 'abc'), false);
  assert.equal(tokenMatches(null, 'abc'), false);
  assert.equal(tokenMatches('Bearer abc', undefined), false);
  assert.equal(tokenMatches('Bearer ', ''), false);
  assert.deepEqual([parseDays(null), parseDays('x'), parseDays('0'), parseDays('28'), parseDays('500')], [7, 7, 7, 28, 90]);
  const names = ['bots-2026-10-01.jsonl', 'bots-2026-10-30.jsonl', 'bots-2026-11-02.jsonl', 'other.txt'];
  assert.deepEqual(logFilesFor(names, 7, new Date('2026-11-03T10:00:00Z')), ['bots-2026-10-30.jsonl', 'bots-2026-11-02.jsonl']);
});

