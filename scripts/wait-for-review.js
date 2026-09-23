#!/usr/bin/env node

/*
 * Block until a new note appears, then exit.
 *
 * This is what makes the loop automatic rather than announced: Claude runs it
 * in the background, it sits there, and the moment `output/review-notes.json` grows
 * it returns the new notes. Nobody has to say "mam uwagi".
 *
 * Polling a file's size and mtime rather than watching it, because editors and
 * this repository's own writes both touch the file in ways `fs.watch` reports
 * inconsistently across platforms, and a second of latency costs nothing here.
 */
const fs = require('fs');
const path = require('path');

const NOTES = path.join(__dirname, '..', 'output', 'review-notes.json');
const HOLD = path.join(__dirname, '..', 'output', 'review-hold.json');

const read = () => {
  try {
    return JSON.parse(fs.readFileSync(NOTES, 'utf8'));
  } catch (err) {
    return [];
  }
};

/**
 * Whether the board is still being filled.
 *
 * **A missing file reads as held**, the same way the server reads it. The
 * resting state of a review is "collecting", and defaulting the other way
 * would bring back exactly the behaviour the hold exists to stop: a note
 * picked up and being fixed while the next one is still being typed.
 *
 * This waits for the *release*, not for the first note. Notes arriving during
 * a hold are the normal case, and returning on one of them would make the
 * button decorative.
 */
const isHeld = () => {
  try {
    return JSON.parse(fs.readFileSync(HOLD, 'utf8')).held !== false;
  } catch (err) {
    return true;
  }
};

/*
 * Anything in the file is unhandled, by definition: a note is deleted when it
 * is fixed. So this returns straight away if the board is not empty, rather
 * than waiting for the *next* one and leaving whatever is already there
 * sitting unread — which is exactly how a note came to be ignored.
 */
// An hour by default. Passing this as an environment-variable prefix on the
// command line does not survive in this project's shell — it exits 127 — so
// the default lives here and the variable is only an override.
const deadline = Date.now() + Number(process.env.REVIEW_WAIT_MS || 60 * 60 * 1000);

let said = null;

const tick = () => {
  const fresh = read();

  if (isHeld()) {
    // Said once per change rather than every second, so a long review does not
    // bury its own output — but said at all, because "nothing is happening"
    // and "I am holding four notes for you" look identical otherwise.
    const now = `${fresh.length}`;
    if (now !== said) {
      said = now;
      console.log(fresh.length
        ? `⏸ wstrzymane — ${fresh.length} uwag czeka, nie ruszam ich`
        : '⏸ wstrzymane — brak uwag');
    }
    if (Date.now() > deadline) {
      console.log('Koniec okna oczekiwania, wciąż wstrzymane.');
      process.exit(0);
    }
    return setTimeout(tick, 1000);
  }

  if (fresh.length) {
    console.log(`▶ wypuszczone — ${fresh.length} otwartych uwag:\n`);
    fresh.forEach((note) => {
      console.log(`  #${note.id} [${note.screen}] <${note.tag}> ${note.label}`);
      console.log(`     ${note.text}`);
      console.log(`     ${note.className.slice(0, 120)}\n`);
    });
    process.exit(0);
  }
  if (Date.now() > deadline) {
    console.log('Brak otwartych uwag w oknie oczekiwania.');
    process.exit(0);
  }
  setTimeout(tick, 1000);
};

tick();
