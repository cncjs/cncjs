#!/usr/bin/env node

/*
 * Somewhere for the pins to land.
 *
 * `design-review-overlay.js` lets you click a place in the running panel and
 * leave a note on it. This is the other half: a small server that hands the
 * overlay to the page and writes the notes into `output/review-notes.json`, where
 * Claude reads them.
 *
 * It is deliberately not part of the application server. A review tool that
 * needed a route in `src/server` would be a review tool that shipped, and this
 * one should leave no trace in the product — nothing in the bundle, nothing in
 * the app's routes, nothing to remember to turn off.
 *
 *   yarn design-review
 *
 * Then, on http://localhost:8000/panel/, click the bookmarklet it prints.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.REVIEW_PORT || 8765);
const NOTES = path.join(__dirname, '..', 'output', 'review-notes.json');
const OVERLAY = path.join(__dirname, 'design-review-overlay.js');

const read = () => {
  try {
    return JSON.parse(fs.readFileSync(NOTES, 'utf8'));
  } catch (err) {
    return [];
  }
};

const write = (notes) => {
  fs.mkdirSync(path.dirname(NOTES), { recursive: true });
  fs.writeFileSync(NOTES, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    // The overlay runs inside whatever page is being reviewed, so it is always
    // a cross-origin caller. This server only ever touches one file in this
    // repository and only runs when somebody starts it by hand.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    return send(res, 204, '');
  }

  if (url.pathname === '/overlay.js') {
    return send(res, 200, fs.readFileSync(OVERLAY, 'utf8'), 'application/javascript');
  }

  if (url.pathname === '/notes' && req.method === 'GET') {
    return send(res, 200, JSON.stringify(read()));
  }

  if (url.pathname === '/notes' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    return req.on('end', () => {
      let note = null;
      try {
        note = JSON.parse(body);
      } catch (err) {
        return send(res, 400, JSON.stringify({ error: 'bad json' }));
      }
      const notes = read();
      // A counter, not a clock: the order they were left in is the only thing
      // anyone needs, and it reads the same tomorrow.
      const id = notes.reduce((top, n) => Math.max(top, n.id || 0), 0) + 1;
      notes.push({ id, ...note });
      write(notes);
      console.log(`  ${id}. [${note.screen}] ${note.text}`);
      return send(res, 200, JSON.stringify({ id }));
    });
  }

  if (url.pathname === '/notes' && req.method === 'DELETE') {
    write([]);
    console.log('  (wyczyszczono)');
    return send(res, 200, '[]');
  }

  const single = url.pathname.match(/^\/notes\/(\d+)$/);
  if (single && req.method === 'DELETE') {
    const id = Number(single[1]);
    write(read().filter((note) => note.id !== id));
    console.log(`  (usunięto ${id})`);
    return send(res, 200, JSON.stringify({ id }));
  }

  return send(res, 404, JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  const bookmarklet = `javascript:(function(){var s=document.createElement('script');` +
    `s.src='http://localhost:${PORT}/overlay.js?'+Date.now();` +
    'document.body.appendChild(s);})()';

  console.log(`
Uwagi do rysunku — serwer na :${PORT}
Zapisuje do: ${path.relative(process.cwd(), NOTES)}

Raz, na początku: przeciągnij ten adres na pasek zakładek jako "Uwagi",
albo wklej go w pasek adresu na stronie panelu.

${bookmarklet}

Potem: otwórz http://localhost:8000/panel/, kliknij zakładkę, kliknij
"Komentarz" i wskaż miejsce. Uwagi lecą prosto do pliku — powiedz Claude'owi
"mam uwagi", a je przeczyta.
`);
});
