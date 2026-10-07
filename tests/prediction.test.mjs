import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { createPredictionScheduler, validWords } from '../src/prediction.ts';

test('clear invalidates a response even when the provider ignores abort', async () => {
  let resolve;
  const seen = [];
  const scheduler = createPredictionScheduler(() => new Promise(done => { resolve = done; }), words => seen.push(words), 1);
  scheduler.schedule('I need');
  await wait(10);
  scheduler.schedule('');
  resolve(['water']);
  await wait(10);
  assert.deepEqual(seen, [[], []]);
  scheduler.cancel();
});

test('new typing invalidates old predictions during the debounce interval', async () => {
  const pending = [];
  const seen = [];
  const scheduler = createPredictionScheduler((text, signal) => new Promise(resolve => pending.push({ text, signal, resolve })), words => seen.push(words), 1);
  scheduler.schedule('I');
  await wait(10);
  scheduler.schedule('I need');
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(['am']);
  await wait(10);
  pending[1].resolve(['water']);
  await wait(10);
  assert.deepEqual(seen, [[], [], ['water']]);
  scheduler.cancel();
});

test('cancel on mode/language/unmount prevents state updates', async () => {
  let resolve;
  const seen = [];
  const scheduler = createPredictionScheduler(() => new Promise(done => { resolve = done; }), value => seen.push(value), 1);
  scheduler.schedule('hello');
  await wait(10);
  scheduler.cancel();
  resolve(['friend']);
  await wait(10);
  assert.deepEqual(seen, [[]]);
});

test('prediction suggestions are short words, unique, and limited to three', () => {
  assert.deepEqual(validWords(['вода', 'вода', 'hello world', '<script>', 23, 'rest', 'please', 'extra']), ['вода', 'rest', 'please']);
  assert.deepEqual(validWords({ words: ['water'] }), []);
});
