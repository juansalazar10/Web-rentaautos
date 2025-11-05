#!/usr/bin/env node
// Minimal static file server with no external deps.
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const argv = require('process').argv.slice(2);
let dir = '.';
let port = 8000;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--dir' && argv[i+1]) { dir = argv[i+1]; i++; }
  else if ((a === '-p' || a === '--port') && argv[i+1]) { port = Number(argv[i+1]); i++; }
  else if (a.startsWith('--port=')) { port = Number(a.split('=')[1]); }
  else if (a.startsWith('--dir=')) { dir = a.split('=')[1]; }
}

dir = path.resolve(process.cwd(), dir);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendResponse(res, code, body, contentType) {
  if (contentType) res.setHeader('Content-Type', contentType);
  if (body) res.setHeader('Content-Length', Buffer.byteLength(body));
  res.statusCode = code;
  if (body) res.end(body);
  else res.end();
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendResponse(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');
  }
  const parsed = url.parse(req.url);
  let rel = decodeURIComponent(parsed.pathname);
  if (rel.startsWith('/')) rel = rel.slice(1);
  if (!rel) rel = 'index.html';
  const unsafePath = path.join(dir, rel);
  const fullPath = path.resolve(unsafePath);
  if (!fullPath.startsWith(dir)) {
    return sendResponse(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }
  fs.stat(fullPath, (err, st) => {
    if (err) return sendResponse(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    if (st.isDirectory()) {
      const index = path.join(fullPath, 'index.html');
      fs.stat(index, (ie, ist) => {
        if (ie) return sendResponse(res, 404, 'Not Found', 'text/plain; charset=utf-8');
        fs.createReadStream(index).pipe(res);
      });
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const ctype = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', ctype);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(fullPath);
    stream.on('error', () => sendResponse(res, 500, 'Internal Server Error', 'text/plain; charset=utf-8'));
    stream.pipe(res);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static server running at http://localhost:${port}/ serving '${dir}'`);
});

process.on('SIGINT', () => { server.close(() => process.exit(0)); });
