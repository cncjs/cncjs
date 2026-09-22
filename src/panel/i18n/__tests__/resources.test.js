const fs = require('fs');
const path = require('path');

const en = require('../en/panel.json');
const pl = require('../pl/panel.json');

/**
 * What the ESLint rule cannot see.
 *
 * `panel/no-untranslated-text` proves that no displayed string was written
 * into a component. It says nothing about whether the key that replaced it
 * exists: `t('shortcuts.noote')` passes lint and renders the key name to an
 * operator, and it renders it in the one language nobody is reading the tests
 * in. These three cases are the ones that turn a translated panel back into
 * an untranslated one without anything going red.
 */

const PANEL = path.resolve(__dirname, '../..');

/** Every leaf key, dotted, in the order they appear. */
const leaves = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => (
  typeof value === 'object' && value !== null
    ? leaves(value, `${prefix}${key}.`)
    : [`${prefix}${key}`]
));

const read = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    return entry.name === '__tests__' || entry.name === 'i18n' ? [] : read(full);
  }
  return /\.jsx?$/.test(entry.name) ? [full] : [];
});

const source = read(PANEL).map((file) => fs.readFileSync(file, 'utf8')).join('\n');

/**
 * Keys named in the source, however they get to `t`.
 *
 * Any dotted lower-case string literal, not only the argument of a `t(...)`
 * call: the data modules the scene and the rail are built from hold their key
 * and are translated where they are rendered, so `labelKey: 'nav.jog'` has to
 * count as a use.
 */
const used = new Set(
  [...source.matchAll(/'([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)'/g)].map((match) => match[1])
);

/** `{{name}}` and `{{name, number(…)}}` alike, by the name only. */
const placeholders = (text) => new Set(
  [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)/g)].map((match) => match[1])
);

const value = (resource, key) => key.split('.').reduce((node, part) => node?.[part], resource);

describe('panel translations', () => {
  it('has the same keys in both languages', () => {
    expect(leaves(pl).sort()).toEqual(leaves(en).sort());
  });

  it('interpolates the same values in both languages', () => {
    // A translator who drops `{{total}}` leaves a sentence that reads as if
    // it were finished and is missing the number it was written to carry.
    for (const key of leaves(en)) {
      expect([key, [...placeholders(value(pl, key))].sort()])
        .toEqual([key, [...placeholders(value(en, key))].sort()]);
    }
  });

  it('defines every key the panel asks for', () => {
    const asked = [...used].filter((key) => key.split('.')[0] in en);
    const missing = asked.filter((key) => typeof value(en, key) !== 'string');

    expect(missing).toEqual([]);
    // A guard on the guard: if the scan above ever stops finding anything,
    // the assertion before it passes by knowing nothing.
    expect(asked.length).toBeGreaterThan(0);
  });

  it('defines nothing the panel does not ask for', () => {
    // Rule 9. A resource nobody reads is a string somebody will translate,
    // and the next person will keep it because it looks load-bearing.
    expect(leaves(en).filter((key) => !used.has(key))).toEqual([]);
  });
});
