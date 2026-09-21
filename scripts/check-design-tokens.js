#!/usr/bin/env node

/*
 * Does the panel still use the values the drawing says?
 *
 * The panel is built from a Claude Design mockup that lives outside this
 * repository and can be edited without touching it. Most of "is this still the
 * design" is a judgement about layout and needs eyes. The part a machine can
 * answer is the tokens — every colour, size and spacing the drawing declares as
 * a custom property — and that is the part that goes wrong silently, because a
 * changed hex in the drawing looks like nothing at all in a pull request.
 *
 * So: `src/panel/styles/tokens.expected.css` is the drawing's own `:root` and switch
 * blocks, copied verbatim when the drawing was last pulled.
 * `src/panel/styles/tokens.css` is what the panel actually uses. This compares
 * them and fails on anything the drawing declares that the panel has lost or
 * changed.
 *
 * Values the panel declares and the drawing does not are reported but allowed.
 * Some are derived from the drawing's own numbers rather than typed (`--jpad`
 * is four keys and the gaps between them), and the drawing has no way to say
 * that.
 */
const fs = require('fs');
const path = require('path');

const EXPECTED = path.join(__dirname, '..', 'src', 'panel', 'styles', 'tokens.expected.css');
const ACTUAL = path.join(__dirname, '..', 'src', 'panel', 'styles', 'tokens.css');

// Comments first: a `--foo: bar` inside one is not a declaration, and the token
// sheet is heavily commented on purpose.
const parse = (file) => {
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = {};

  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match = rule.exec(css);
  while (match) {
    // Quote style is the author's business, not a difference.
    const selector = match[1].trim().replace(/"/g, "'");
    const declarations = blocks[selector] || {};
    match[2].split(';').forEach((line) => {
      const at = line.indexOf(':');
      const name = at < 0 ? '' : line.slice(0, at).trim();
      if (name.startsWith('--')) {
        // Whitespace is not a decision. A font stack written `a,b` and one
        // written `a, b` are the same stack, and reporting that as drift
        // trains everyone to ignore the report.
        declarations[name] = line
          .slice(at + 1)
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\s*,\s*/g, ',');
      }
    });
    blocks[selector] = declarations;
    match = rule.exec(css);
  }

  return blocks;
};

const expected = parse(EXPECTED);
const actual = parse(ACTUAL);

const missing = [];
const changed = [];
const extra = [];

Object.keys(expected).forEach((selector) => {
  const theirs = expected[selector];
  const ours = actual[selector] || {};
  Object.keys(theirs).forEach((name) => {
    if (!(name in ours)) {
      missing.push(`${selector} ${name}: ${theirs[name]}`);
    } else if (ours[name] !== theirs[name]) {
      changed.push(`${selector} ${name}: drawing says ${theirs[name]}, panel says ${ours[name]}`);
    }
  });
});

Object.keys(actual).forEach((selector) => {
  Object.keys(actual[selector]).forEach((name) => {
    if (!expected[selector] || !(name in expected[selector])) {
      extra.push(`${selector} ${name}: ${actual[selector][name]}`);
    }
  });
});

const report = (title, lines) => {
  if (!lines.length) {
    return;
  }
  console.log(`\n${title}`);
  lines.forEach((line) => console.log(`  ${line}`));
};

report('Only in the panel — allowed, but check it is derived and not invented:', extra);
report('The drawing declares these and the panel does not:', missing);
report('These have drifted apart:', changed);

if (missing.length || changed.length) {
  console.log(
    `\nFAIL: ${missing.length + changed.length} token(s) differ from the drawing.` +
    '\nEither the drawing moved and the panel has to follow, or the panel was' +
    '\nchanged by hand. Pull the drawing again before deciding which.\n'
  );
  process.exit(1);
}

const count = Object.keys(expected)
  .reduce((total, selector) => total + Object.keys(expected[selector]).length, 0);
console.log(`\nOK: all ${count} tokens the drawing declares match the panel.\n`);
