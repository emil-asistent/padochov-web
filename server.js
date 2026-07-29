// Malý HTTP server jen pro /api/contact — obaluje původní Vercel handler (api/contact.js),
// aby stejný kód běžel i tady na serveru. Statiku obsluhuje nginx, tenhle server posílá jen mail.
const http = require('http');
const contact = require('./api/contact.js');

const PORT = Number(process.env.API_PORT || 3000);

const server = http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];

  if (path === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end('{"ok":true}');
  }

  if (path !== '/api/contact') {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end('{"ok":false,"error":"not_found"}');
  }

  // doplnění Vercel-like helperů (res.status().json())
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.headersSent) res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.setHeader('Cache-Control', 'no-store');

  Promise.resolve()
    .then(() => contact(req, res))
    .catch((e) => {
      console.error('contact handler error:', e && e.message);
      if (!res.writableEnded) res.status(500).json({ ok: false, error: 'server_error' });
    });
});

server.listen(PORT, '0.0.0.0', () => console.log('contact api na portu ' + PORT));
