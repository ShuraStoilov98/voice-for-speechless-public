import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const failures = [];
async function check(directory = '.') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', '.expo', 'ios', 'android', 'test-results'].includes(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) { await check(path); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const source = await readFile(path, 'utf8');
    // Validate the simple inline links and HTML image paths used by these docs.
    const targets = [...source.matchAll(/\]\(([^)]+)\)|<img[^>]+src="([^"]+)"/g)].map(match => match[1] || match[2]);
    for (const target of targets) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      try { await access(resolve(dirname(path), target.split('#')[0])); }
      catch { failures.push(`${path}: ${target}`); }
    }
  }
}
await check();
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.info('Local Markdown links and image paths resolve.');
