import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { parseEnv } from 'node:util';

const ignored = new Set(['.git', 'node_modules', '.expo', 'test-results', 'playwright-report', 'coverage', 'ios', 'android']);
const forbidden = /EXPO_PUBLIC_(ELEVENLABS|ANTHROPIC)_API_KEY/;
const privateEnv = process.argv.find(value => value.startsWith('--private-env='))?.slice('--private-env='.length);
const known = privateEnv ? Object.values(parseEnv(await readFile(privateEnv, 'utf8'))).filter(value => value.length >= 12).map(value => Buffer.from(value)) : [];
const failures = [];
let count = 0;
async function scan(directory = '.') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) { failures.push(`${path}: unexpected symlink`); continue; }
    if (entry.isDirectory()) { await scan(path); continue; }
    count++;
    const data = await readFile(path);
    if ((entry.name.startsWith('.env') && entry.name !== '.env.example') || ['.mp4', '.docx', '.wav', '.m4a', '.pem', '.p8', '.p12', '.sqlite', '.ipa'].includes(extname(path))) failures.push(`${path}: private/local artifact`);
    if (path.startsWith('data/audio/') && path !== 'data/audio/README.md') failures.push(`${path}: recording directory`);
    if (known.some(value => data.includes(value))) failures.push(`${path}: matches a private environment value (redacted)`);
    // This script necessarily contains the forbidden-pattern rule itself.
    if (path !== 'scripts/check-public.mjs' && forbidden.test(data.toString('utf8'))) failures.push(`${path}: legacy personal configuration`);
  }
}
await scan();
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.info(`Public file checks passed (${count} files; ${known.length ? 'known private values checked' : 'no private comparison requested'}). Run a full history secret scanner separately.`);
