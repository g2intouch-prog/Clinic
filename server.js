// Local development server — mirrors Vercel production behaviour
// Serves static files AND runs api/index.js as a real function handler

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env.local if it exists (from `vercel env pull`)
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length && !process.env[key.trim()]) {
      process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    }
  });
  console.log('✅ Loaded .env.local');
} else {
  console.warn('⚠️  No .env.local found. Run: vercel env pull .env.local');
}

const apiHandler = require('./api/index');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  console.log(`[${req.method}] ${req.url}`);

  // ── API routes → hand off to api/index.js ──────────────────────────────
  if (urlPath.startsWith('/api')) {
    console.log(`  → Routing to API handler`);
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (body) {
        try { req.body = JSON.parse(body); } catch { req.body = {}; }
      } else {
        req.body = {};
      }
      // Parse query string into req.query
      req.query = Object.fromEntries(new URL(req.url, `http://localhost:${PORT}`).searchParams);
      
      // Decorate res for Vercel Serverless compatibility
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };

      apiHandler(req, res);
    });
    return;
  }

  // ── Static files ────────────────────────────────────────────────────────
  let filePath = path.join(__dirname, urlPath);

  // SPA fallback: any non-file request → index.html
  if (!path.extname(filePath)) filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Final fallback to index.html
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Kill the other process first, then run: npm run dev\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n🚀 MediFlow running at http://localhost:${PORT}\n`);
});
