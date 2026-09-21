#!/usr/bin/env node

/*
 * Block until a new note appears, then exit.
 *
 * This is what makes the loop automatic rather than announced: Claude runs it
 * in the background, it sits there, and the moment `design/review.json` grows
 * it returns the new notes. Nobody has to say "mam uwagi".
 *
 * Polling a file's size and mtime rather than watching it, because editors and
 * this repository's own writes both touch the file in ways `fs.watch` reports
 * inconsistently across platforms, and a second of latency costs nothing here.
 */
const fs = require('fs');
const path = require('path');

const NOTES = path.join(__dirname, '..', 'design', 'review.json');

const read = () => {
  try {
    return JSON.parse(fs.readFileSync(NOTES, 'utf8'));
  } catch (err) {
    return [];
  }
};

const startedWith = read().map((note) => note.id);
const deadline = Date.now() + Number(process.env.REVIEW_WAIT_MS || 30 * 60 * 1000);

const tick = () => {
  const fresh = read().filter((note) => !startedWith.includes(note.id));
  if (fresh.length) {
    console.log(`${fresh.length} nowych uwag:\n`);
    fresh.forEach((note) => {
      console.log(`  #${note.id} [${note.screen}] <${note.tag}> ${note.label}`);
      console.log(`     ${note.text}`);
      console.log(`     ${note.className.slice(0, 120)}\n`);
    });
    process.exit(0);
  }
  if (Date.now() > deadline) {
    console.log('Brak nowych uwag w oknie oczekiwania.');
    process.exit(0);
  }
  setTimeout(tick, 1000);
};

tick();
