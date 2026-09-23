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
const https = require('https');
const path = require('path');

const PORT = Number(process.env.REVIEW_PORT || 8765);
const NOTES = path.join(__dirname, '..', 'output', 'review-notes.json');
const OVERLAY = path.join(__dirname, 'design-review-overlay.js');

/**
 * Whether the board is held, in a file of its own.
 *
 * Held means: notes are being collected and **nothing is to act on them yet**.
 * It exists because the loop was too eager — a note was picked up and being
 * fixed while the next one was still being typed, which is a bad way to review
 * anything. Mateusz asked for the pause on 2026-09-23.
 *
 * On the server rather than in the overlay, and in a file rather than in
 * memory, because both of the other places lose it exactly when it matters:
 * the overlay is re-injected on every page reload, and this process gets
 * killed along with the dev tree often enough. A hold that quietly evaporates
 * mid-review is worse than no hold at all.
 *
 * Its own file rather than a field in the notes file, because the notes file
 * is an array that `wait-for-review.js` and Claude both read directly, and
 * wrapping it in an object to carry one boolean would be a change to
 * everything that touches it.
 */
const HOLD = path.join(__dirname, '..', 'output', 'review-hold.json');

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

/**
 * Held by default, and it re-arms itself.
 *
 * A missing file reads as held. That is deliberate: the resting state of a
 * review is "collecting", and releasing is the deliberate act. A default of
 * "act immediately" is the behaviour being fixed, and it would come back the
 * first time somebody started the server without thinking about it.
 */
const isHeld = () => {
  try {
    return JSON.parse(fs.readFileSync(HOLD, 'utf8')).held !== false;
  } catch (err) {
    return true;
  }
};

const setHeld = (held) => {
  fs.mkdirSync(path.dirname(HOLD), { recursive: true });
  fs.writeFileSync(HOLD, `${JSON.stringify({ held }, null, 2)}
`, 'utf8');
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    // The overlay runs inside whatever page is being reviewed, so it is always
    // a cross-origin caller. This server only ever touches one file in this
    // repository and only runs when somebody starts it by hand.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-From-Overlay',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

/*
 * The same scheme as the panel, when the panel has one.
 *
 * The overlay is a subresource of the page being reviewed, so if that page is
 * HTTPS and this is not, the browser refuses it as mixed content -- and says
 * so as "this page contains insecure resources", which reads like a broken
 * certificate rather than a broken review tool. Since the panel is served
 * over TLS to reach a phone at all, this follows it.
 *
 * The same certificate, because it already names every address this machine
 * answers to; a second one would be a second thing to trust.
 */
const CERT = path.join(__dirname, '..', 'certs', 'cnc.crt');
const KEY = path.join(__dirname, '..', 'certs', 'cnc.key');
const secure = fs.existsSync(CERT) && fs.existsSync(KEY);

const handler = (req, res) => {
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

  /*
   * The hold, read and written on its own route.
   *
   * `/notes` stays a bare array. Everything that reads it — the overlay,
   * `wait-for-review.js`, and Claude reading the file directly — would have
   * to change to carry one boolean, and this is the cheaper seam.
   */
  if (url.pathname === '/hold' && req.method === 'GET') {
    return send(res, 200, JSON.stringify({ held: isHeld(), notes: read().length }));
  }

  if (url.pathname === '/hold' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    return req.on('end', () => {
      let held = true;
      try {
        held = JSON.parse(body).held !== false;
      } catch (err) {
        held = true;
      }
      setHeld(held);
      console.log(held
        ? '  ⏸  wstrzymane — uwagi się zbierają, nikt ich nie rusza'
        : `  ▶  wypuszczone — ${read().length} uwag idzie do roboty`);
      return send(res, 200, JSON.stringify({ held }));
    });
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

  /*
   * Clearing the whole board is the overlay's button and nobody else's.
   *
   * Claude emptied it after working two notes, and two more had arrived in
   * the meantime -- read, never seen, deleted. They survived only because
   * this file prints every note it accepts. *"zakaz czyszczenia tablicy w
   * calosci, tylko po id i tylko jak zweryfikujesz czy zrobiles"*
   * (2026-09-23).
   *
   * A header rather than a promise to be careful. The overlay sends it
   * because a person clicked something; anything reaching this port with
   * curl gets told no.
   */
  if (url.pathname === '/notes' && req.method === 'DELETE') {
    if (req.headers['x-from-overlay'] !== '1') {
      console.log('  (odmowa: czyszczenie calej tablicy tylko z nakladki)');
      return send(res, 403, JSON.stringify({
        error: 'Clearing the whole board is the overlay button. Delete notes one at a time, by id, once each is done.',
      }));
    }
    write([]);
    setHeld(true);
    console.log('  (wyczyszczono z nakladki, wstrzymane z powrotem)');
    return send(res, 200, '[]');
  }

  const single = url.pathname.match(/^\/notes\/(\d+)$/);
  if (single && req.method === 'DELETE') {
    const id = Number(single[1]);
    const left = read().filter((note) => note.id !== id);
    write(left);
    console.log(`  (usunięto ${id})`);
    /*
     * The last note handled re-arms the hold.
     *
     * Without this the pause is a thing to remember, and the point of it is
     * that it is the resting state. A batch is released, worked through, and
     * the board goes quiet — and the next batch collects behind a hold again
     * without anybody deciding to put one there.
     */
    if (!left.length && !isHeld()) {
      setHeld(true);
      console.log('  ⏸  tablica pusta — wstrzymane z powrotem');
    }
    return send(res, 200, JSON.stringify({ id }));
  }

  return send(res, 404, JSON.stringify({ error: 'not found' }));

};

const server = secure
  ? https.createServer({ cert: fs.readFileSync(CERT), key: fs.readFileSync(KEY) }, handler)
  : http.createServer(handler);

server.listen(PORT, () => {
  const bookmarklet = `javascript:(function(){var s=document.createElement('script');` +
    `s.src=location.protocol+'//'+location.hostname+':${PORT}/overlay.js?'+Date.now();` +
    'document.body.appendChild(s);})()';

  console.log(`
Uwagi do rysunku — serwer na :${PORT}
Zapisuje do: ${path.relative(process.cwd(), NOTES)}

Raz, na początku: przeciągnij ten adres na pasek zakładek jako "Uwagi",
albo wklej go w pasek adresu na stronie panelu.

${bookmarklet}

Potem: otwórz panel (ten sam adres, z którego go oglądasz), kliknij zakładkę, kliknij
"Komentarz" i wskaż miejsce.

Tablica startuje WSTRZYMANA. Uwagi się zbierają i nikt ich nie rusza,
dopóki nie klikniesz "Wypuszczone" — wtedy idą do roboty wszystkie naraz.
Gdy ostatnia zostanie obsłużona, wstrzymanie wraca samo.
`);
});
