import { buildApp } from './app.mjs';
import { readConfig } from './config.mjs';

try {
  const config = readConfig();
  const app = buildApp(config);
  await app.listen({ port: config.port, host: config.host });
  console.info(`Speech backend listening on port ${config.port}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
} catch {
  console.error('Backend startup failed. Check server configuration and persistent database access.');
  process.exitCode = 1;
}
