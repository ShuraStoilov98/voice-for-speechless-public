import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/web');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ico': 'image/x-icon', '.png': 'image/png', '.css': 'text/css', '.json': 'application/json' };
createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403).end(); return; }
    const file = path === root ? resolve(root, 'index.html') : path;
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404).end(); }
}).listen(8083, '127.0.0.1', () => console.info('Production web preview: http://localhost:8083'));
