/**
 * Minimal zero-dependency static server.
 *
 * ES modules can't load over file:// (the module fetch is treated as a
 * cross-origin request), so the game needs *some* HTTP server. Rather than pull
 * in a dev-server dependency, this is ~50 lines of node:http.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';

    // Path traversal guard: resolve, then confirm the result is still inside ROOT.
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(file);
    if (info.isDirectory()) {
      res.writeHead(302, { Location: rel + '/' }).end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  🐦  Flappy 3D  →  http://localhost:${PORT}\n`);
});
