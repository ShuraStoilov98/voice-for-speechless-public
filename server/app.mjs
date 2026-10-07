import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createUsageStore } from './usage.mjs';
import { createProviders } from './providers.mjs';

export function buildApp(config, options = {}) {
  const app = Fastify({ logger: false, bodyLimit: 8192, requestTimeout: 25000, connectionTimeout: 25000, ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  const usage = options.usage ?? createUsageStore(config.dbPath, config, options.clock);
  const providers = options.providers ?? createProviders(config);
  let active = 0;
  const hashes = config.tokenHashes.map(value => Buffer.from(value, 'hex'));
  app.register(cors, { origin: config.origins, methods: ['POST', 'GET'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
  });
  app.addHook('onClose', async () => usage.close());
  app.setErrorHandler((error, _request, reply) => {
    const status = error.validation ? 400 : error.statusCode === 413 ? 413 : error.statusCode === 415 ? 415 : error.statusCode === 400 ? 400 : 503;
    reply.code(status).send({ error: status === 503 ? 'service_unavailable' : 'invalid_request' });
  });
  app.get('/health', async () => ({ status: 'ok' }));

  const bodySchema = {
    type: 'object', additionalProperties: false, required: ['text', 'language'],
    properties: { text: { type: 'string', minLength: 1, maxLength: 500, pattern: '\\S' }, language: { type: 'string', enum: ['en', 'bg'] } }
  };
  const authenticate = async (request, reply) => {
    const token = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.authorization ?? '')?.[1];
    if (!token) return reply.code(401).send({ error: 'unauthorized' });
    const digest = createHash('sha256').update(token).digest();
    if (!hashes.some(hash => timingSafeEqual(hash, digest))) return reply.code(401).send({ error: 'unauthorized' });
    request.credential = digest.toString('hex');
  };
  for (const route of ['speech', 'predictions']) {
    app.post(`/v1/${route}`, { onRequest: authenticate, schema: { body: bodySchema } }, async (request, reply) => {
      if (active >= config.concurrency) return reply.code(429).send({ error: 'busy' });
      // Reserve before upstream; failures consume allowance too. Database errors fail closed.
      if (!usage.reserve(request.credential, request.body.text.length)) return reply.code(429).send({ error: 'usage_limit' });
      active += 1;
      const controller = new AbortController();
      let timeout;
      const disconnected = () => { if (!reply.raw.writableEnded) controller.abort(); };
      reply.raw.on('close', disconnected);
      try {
        const result = await Promise.race([
          providers[route](request.body, controller.signal),
          new Promise((_, reject) => {
            timeout = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, config.timeout);
          })
        ]);
        if (route === 'speech') return reply.type('audio/mpeg').send(result);
        return { words: result };
      } catch {
        return reply.code(controller.signal.aborted ? 504 : 502).send({ error: 'provider_unavailable' });
      } finally {
        clearTimeout(timeout);
        reply.raw.off('close', disconnected);
        active -= 1;
      }
    });
  }
  return app;
}
