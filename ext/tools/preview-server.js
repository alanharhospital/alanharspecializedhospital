#!/usr/bin/env node
/**
 * preview-server.js — خادم معاينة محلي يدعم الروابط بلا امتداد (.html)
 * التشغيل: node ext/tools/preview-server.js [port]
 * ملاحظة: هذا للمعاينة المحلية فقط، وليس جزءًا من الموقع المنشور.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.argv[2] || 8090);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** يحوّل /services/dental → services/dental.html أو services/dental/index.html */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.join(ROOT, path.normalize(clean).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(ROOT)) return null;
  const candidates = [target, target + '.html', path.join(target, 'index.html')];
  for (const c of candidates) {
    try {
      const st = fs.statSync(c);
      if (st.isFile()) return c;
    } catch (e) {
      /* تابع */
    }
  }
  return null;
}

http
  .createServer((req, res) => {
    const file = resolve(req.url === '/' ? '/index.html' : req.url);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<meta charset="utf-8"><p style="font-family:sans-serif">404 — ' + req.url + '</p>');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log('preview: http://0.0.0.0:' + PORT + '/  (يدعم /services/dental بلا .html)');
  });
