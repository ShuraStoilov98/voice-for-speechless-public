function integer(env, name, fallback, maximum) {
  const value = Number(env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid ${name}`);
  return value;
}
export function readConfig(env = process.env) {
  const tokenHashes = (env.INSTALLATION_TOKEN_HASHES ?? '').split(',').filter(Boolean).map(value => value.trim().toLowerCase());
  if (!tokenHashes.length || tokenHashes.some(value => !/^[a-f0-9]{64}$/.test(value))) throw new Error('Configure INSTALLATION_TOKEN_HASHES');
  if (!env.ELEVENLABS_API_KEY || !/^[a-zA-Z0-9_-]{1,128}$/.test(env.ELEVENLABS_VOICE_ID ?? '')) throw new Error('Configure server voice and provider key');
  if (env.NODE_ENV === 'production' && (!env.USAGE_DB_PATH || env.USAGE_DB_PATH === ':memory:')) throw new Error('Production requires a persistent USAGE_DB_PATH');
  return {
    tokenHashes,
    elevenLabsKey: env.ELEVENLABS_API_KEY,
    voiceId: env.ELEVENLABS_VOICE_ID,
    speechModel: env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    predictionModel: env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    dbPath: env.USAGE_DB_PATH || '.data/usage.sqlite',
    dailyRequests: integer(env, 'DAILY_REQUEST_LIMIT', 300, 10000),
    dailyCharacters: integer(env, 'DAILY_CHARACTER_LIMIT', 20000, 1000000),
    perMinute: integer(env, 'REQUESTS_PER_MINUTE', 12, 120),
    concurrency: integer(env, 'MAX_CONCURRENT_REQUESTS', 2, 8),
    timeout: integer(env, 'PROVIDER_TIMEOUT_MS', 15000, 30000),
    port: integer(env, 'PORT', 3001, 65535),
    host: env.HOST || '127.0.0.1',
    origins: (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
  };
}
