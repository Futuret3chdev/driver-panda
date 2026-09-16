import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import health from '../api/health.js';
import platforms from '../api/v1/platforms.js';
import preview from '../api/v1/preview.js';
import summary from '../api/v1/summary.js';
import openapi from '../api/v1/openapi.js';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 4173);
const handlers = {
  '/api/health': health,
  '/api/v1/platforms': platforms,
  '/api/v1/preview': preview,
  '/api/v1/summary': summary,
  '/api/v1/openapi': openapi
};

function wrap(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  return res;
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname || '/');
  const api = handlers[pathname];
  if (api) {
    try {
      await api(req, wrap(res));
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
    return;
  }

  let file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root)) {
    res.statusCode = 403;
    return res.end('forbidden');
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  const ext = path.extname(file);
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Driver Panda http://127.0.0.1:${port}`);
});
