import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, validateConnection, backendRequest } from '../src/connection.ts';

test('production URL validation protects credentials and limits development HTTP', () => {
  assert.equal(normalizeUrl('https://speech.example/', false), 'https://speech.example');
  assert.equal(normalizeUrl('http://localhost:3001', true), 'http://localhost:3001');
  assert.equal(normalizeUrl('http://192.168.0.20:3001', true), 'http://192.168.0.20:3001');
  for (const value of ['http://localhost:3001', 'https://user:password@speech.example', 'https://speech.example/path', 'https://speech.example?token=bad', 'javascript:alert(1)']) assert.throws(() => normalizeUrl(value, false));
  assert.throws(() => normalizeUrl('http://speech.example', true));
  assert.throws(() => validateConnection('https://speech.example', '', false));
});

test('backend maps authorization/usage failures and does not follow redirects', async t => {
  let status = 401;
  let options;
  t.mock.method(globalThis, 'fetch', async (_url, value) => { options = value; return new Response('', { status }); });
  const connection = { url: 'https://speech.example', token: 'a'.repeat(64) };
  await assert.rejects(backendRequest(connection, 'speech', 'hello', 'en'), /auth/);
  assert.equal(options.redirect, 'error');
  assert.equal(JSON.parse(options.body).language, 'en');
  status = 429;
  await assert.rejects(backendRequest(connection, 'speech', 'hello', 'en'), /limit/);
  status = 502;
  await assert.rejects(backendRequest(connection, 'speech', 'hello', 'en'), /network/);
});

test('prediction cancellation aborts the underlying fetch', async t => {
  let fetchSignal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => { fetchSignal = options.signal; return new Response('{}'); });
  const controller = new AbortController();
  controller.abort();
  await backendRequest({ url: 'https://speech.example', token: 'a'.repeat(64) }, 'predictions', 'hello', 'en', controller.signal);
  assert.equal(fetchSignal.aborted, true);
});
