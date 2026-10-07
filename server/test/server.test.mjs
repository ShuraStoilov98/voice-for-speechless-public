import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../app.mjs';
import { readConfig } from '../config.mjs';
import { createUsageStore } from '../usage.mjs';
import { createProviders, parsePredictions } from '../providers.mjs';

const token = 'a'.repeat(64);
const tokenHash = createHash('sha256').update(token).digest('hex');
const base = { tokenHashes: [tokenHash], dbPath: ':memory:', dailyRequests: 100, dailyCharacters: 10000, perMinute: 10, concurrency: 2, timeout: 1000, origins: ['http://localhost:8081'] };
const headers = { authorization: `Bearer ${token}` };
const payload = { text: 'I need water', language: 'en' };
function fixture(t, config = {}, providers = { speech: async () => Buffer.from('synthetic-audio'), predictions: async () => ['water'] }) {
  const app = buildApp({ ...base, ...config }, { providers });
  t.after(() => app.close());
  return app;
}

test('health is minimal and paid endpoints fail before provider work when unauthenticated', async t => {
  let calls = 0;
  const app = fixture(t, {}, { speech: async () => { calls++; return Buffer.from('audio'); } });
  assert.deepEqual((await app.inject('/health')).json(), { status: 'ok' });
  for (const route of ['speech', 'predictions']) {
    assert.equal((await app.inject({ method: 'POST', url: `/v1/${route}`, payload })).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url: `/v1/${route}`, payload, headers: { authorization: `Bearer ${'b'.repeat(64)}` } })).statusCode, 401);
  }
  assert.equal(calls, 0);
});

test('input schemas reject whitespace, long text, unexpected keys, and languages', async t => {
  const app = fixture(t);
  for (const body of [{ ...payload, text: '' }, { ...payload, text: ' ' }, { ...payload, text: 'x'.repeat(501) }, { ...payload, text: 123 }, { ...payload, language: 'xx' }, { ...payload, voiceId: 'other-person' }]) {
    const response = await app.inject({ method: 'POST', url: '/v1/speech', payload: body, headers });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'invalid_request' });
  }
  assert.equal((await app.inject({ method: 'POST', url: '/v1/speech', payload: '{', headers: { ...headers, 'content-type': 'application/json' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/speech', payload: 'x'.repeat(9000), headers: { ...headers, 'content-type': 'application/json' } })).statusCode, 413);
});

test('connected speech returns audio and suggestions are a separate endpoint', async t => {
  const app = fixture(t);
  const speech = await app.inject({ method: 'POST', url: '/v1/speech', payload, headers });
  assert.equal(speech.statusCode, 200);
  assert.match(speech.headers['content-type'], /audio\/mpeg/);
  assert.equal(speech.headers['cache-control'], 'no-store');
  assert.equal(speech.body, 'synthetic-audio');
  assert.deepEqual((await app.inject({ method: 'POST', url: '/v1/predictions', payload, headers })).json(), { words: ['water'] });
});

test('per-credential minute and global request/character limits reject further paid work', async t => {
  for (const limits of [{ perMinute: 1 }, { dailyRequests: 1 }, { dailyCharacters: payload.text.length }]) {
    const app = fixture(t, limits);
    assert.equal((await app.inject({ method: 'POST', url: '/v1/speech', payload, headers })).statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: '/v1/predictions', payload, headers })).statusCode, 429);
  }
});

test('SQLite daily and minute quotas survive restarts and shared-file connections', t => {
  const directory = mkdtempSync(join(tmpdir(), 'speech-quota-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'usage.sqlite');
  const limits = { ...base, dailyRequests: 2, perMinute: 2 };
  let now = new Date('2026-01-01T12:00:00Z');
  let store = createUsageStore(path, limits, () => now);
  assert.equal(store.reserve('fixture', 5), true);
  store.close();
  store = createUsageStore(path, limits, () => now);
  const second = createUsageStore(path, limits, () => now);
  assert.equal(second.reserve('fixture', 5), true);
  assert.equal(store.reserve('fixture', 5), false);
  now = new Date('2026-01-02T00:00:00Z');
  assert.equal(store.reserve('fixture', 5), true);
  store.close(); second.close();
});

test('usage database failures fail closed before providers are called', async t => {
  let calls = 0;
  const app = buildApp(base, { usage: { reserve() { throw new Error('disk unavailable'); }, close() {} }, providers: { speech: async () => { calls++; } } });
  t.after(() => app.close());
  const result = await app.inject({ method: 'POST', url: '/v1/speech', payload, headers });
  assert.equal(result.statusCode, 503);
  assert.equal(calls, 0);
  assert.deepEqual(result.json(), { error: 'service_unavailable' });
});

test('timeout and provider errors have controlled responses; failed work consumes quota', async t => {
  const timeout = fixture(t, { timeout: 5 }, { speech: async () => new Promise(() => {}) });
  assert.equal((await timeout.inject({ method: 'POST', url: '/v1/speech', payload, headers })).statusCode, 504);
  const failing = fixture(t, { dailyRequests: 1 }, { speech: async () => { throw new Error('private upstream details'); } });
  const result = await failing.inject({ method: 'POST', url: '/v1/speech', payload, headers });
  assert.equal(result.statusCode, 502);
  assert.equal(result.body.includes('private upstream'), false);
  assert.equal((await failing.inject({ method: 'POST', url: '/v1/speech', payload, headers })).statusCode, 429);
});

test('global concurrency bounds upstream work', async t => {
  let release;
  const app = fixture(t, { concurrency: 1 }, { speech: async () => new Promise(resolve => { release = () => resolve(Buffer.from('audio')); }) });
  const first = app.inject({ method: 'POST', url: '/v1/speech', payload, headers });
  await new Promise(resolve => setTimeout(resolve, 20));
  const second = await app.inject({ method: 'POST', url: '/v1/speech', payload, headers });
  assert.equal(second.statusCode, 429);
  release();
  assert.equal((await first).statusCode, 200);
});

test('provider adapter keeps voice selection on the server and limits response data', async () => {
  let calledUrl, options;
  const config = { voiceId: 'fixtureVoice', speechModel: 'eleven_multilingual_v2', elevenLabsKey: 'fixture', anthropicKey: '' };
  const providers = createProviders(config, async (url, value) => { calledUrl = url; options = value; return new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }); });
  const signal = new AbortController().signal;
  assert.equal((await providers.speech(payload, signal)).toString(), 'audio');
  assert.match(calledUrl, /fixtureVoice/);
  assert.equal(JSON.parse(options.body).language_code, 'en');
  assert.equal(options.redirect, 'error');
  assert.deepEqual(await providers.predictions(payload, signal), []);
  const oversized = createProviders(config, async () => new Response('audio', { headers: { 'content-type': 'audio/mpeg', 'content-length': '3000000' } }));
  await assert.rejects(oversized.speech(payload, signal), /response_too_large/);
  const malformed = createProviders({ ...config, anthropicKey: 'fixture' }, async () => new Response('bad-json'));
  await assert.rejects(malformed.predictions(payload, signal), /provider_unavailable/);
});

test('prediction parsing rejects non-JSON and filters unsafe/non-word suggestions', () => {
  assert.deepEqual(parsePredictions('Here are words: ["water"]'), []);
  assert.deepEqual(parsePredictions('["вода", "вода", "two words", 2, "rest", "please", "extra"]'), ['вода', 'rest', 'please']);
});

test('production startup requires private credential hashes and a persistent quota store', () => {
  assert.throws(() => readConfig({}), /INSTALLATION_TOKEN_HASHES/);
  assert.throws(() => readConfig({ INSTALLATION_TOKEN_HASHES: tokenHash, ELEVENLABS_API_KEY: 'fixture', ELEVENLABS_VOICE_ID: 'fixture', NODE_ENV: 'production' }), /persistent/);
});
