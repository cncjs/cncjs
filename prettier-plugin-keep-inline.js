// prettier-plugin-keep-inline
//
// Keeps configured AST nodes on a single line. Prettier otherwise re-wraps any
// expression that exceeds `printWidth`:
//
//   someFunction(
//     'a long argument that no longer fits on one line',
//   );
//
// A general-purpose escape hatch, not tied to any library or framework. List
// the calls and JSX elements to keep inline in .prettierrc.json:
//
//   "plugins": ["./prettier-plugin-keep-inline.js"],
//   "keepInlineCalls": ["log.debug", "someObject.**", "t"],
//   "keepInlineJSXElements": ["SomeElement", "*Badge"]
//
// Both default to an empty list — with no configuration the plugin is inert.
//
// Why a plugin: Prettier exposes no option to exempt selected nodes from
// wrapping. `// prettier-ignore` does it per site, but each occurrence must be
// annotated by hand, and it freezes the entire following node. This plugin
// routes the same mechanism through configuration, so call sites stay
// untouched and the rule lives in one place.
//
// Option surface: the `keepInline` prefix keeps these keys collision-proof
// against Prettier's own options and those of other plugins. Both options group
// under a "Keep Inline" category in `prettier --help` and expose the
// --keep-inline-calls and --keep-inline-jsx-elements flags.
//
// Mechanism: Prettier treats any node flagged with `prettierIgnore` as "print
// verbatim from source" — the same code path used by `// prettier-ignore`
// comments. This plugin flags matching nodes while parsing, so Prettier emits
// their original text and can never re-wrap them.
//
// Freezing rule — a node is frozen only when it is written on a SINGLE source
// line:
//   * Nothing that is not already inline is frozen. A call or element spanning
//     several lines is left to Prettier, so it collapses back onto one line
//     once it fits. The result is stable and idempotent.
//   * Verbatim printing re-emits the slice with its original absolute
//     indentation. For a single-line slice that is a no-op; for a multi-line
//     slice the inner lines would no longer line up once the surrounding code
//     is re-indented. Hence the single-line restriction — it is a correctness
//     guard, not a stylistic preference.
//
// Matching is by name only, so a local binding that shares a configured name is
// matched too. Rename the binding or drop the entry if that collides.
//
// Only the `babel` parser is wrapped (the parser for .js/.jsx in this repo).

'use strict';

const babel = require('prettier/parser-babel');
const minimatch = require('minimatch');

function toArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => String(entry).trim())
    .filter(Boolean);
}

// `*` and `**` follow glob semantics, with `.` treated as the path separator:
//
//   'foo.bar'    exact match (no wildcard -> compared as a plain string)
//   'foo.*'      one name part -> foo.bar, foo.baz
//   'foo.**'     across parts   -> foo.bar, foo.bar.baz
//   '*Thing*'    substring      -> Thing, MyThingText
//   '**'         everything
//
// Patterns are compiled once per file, not per node.
function compileTargets(value) {
  const exact = new Set();
  const globs = [];
  for (const entry of toArray(value)) {
    if (entry.indexOf('*') === -1) {
      exact.add(entry);
      continue;
    }
    globs.push(new minimatch.Minimatch(entry.split('.').join('/'), { dot: true }));
  }
  return { exact: exact, globs: globs };
}

function hasTargets(targets) {
  return targets.exact.size > 0 || targets.globs.length > 0;
}

// `name` is the full dotted name: 'foo.bar', 'Thing', 'Thing.Item'.
function matchesTarget(targets, name) {
  if (!name) {
    return false;
  }
  if (targets.exact.has(name)) {
    return true;
  }
  if (targets.globs.length === 0) {
    return false;
  }
  const path = name.split('.').join('/');
  return targets.globs.some((glob) => glob.match(path));
}

// Dotted name of a callee that is a plain identifier or a non-computed member
// chain: `foo.bar` -> ['foo', 'bar']. Returns null for anything else (nested
// calls, optional chaining, computed access), which is never a configured
// target.
function calleeSegments(node) {
  const segments = [];
  let cursor = node && node.callee;
  while (
    cursor &&
    cursor.type === 'MemberExpression' &&
    !cursor.computed &&
    cursor.property &&
    cursor.property.type === 'Identifier'
  ) {
    segments.unshift(cursor.property.name);
    cursor = cursor.object;
  }
  if (!cursor || cursor.type !== 'Identifier') {
    return null;
  }
  segments.unshift(cursor.name);
  return segments;
}

// Dotted name of a JSX element: <Thing> -> 'Thing', <Thing.Item> -> 'Thing.Item'.
function jsxElementName(node) {
  const name = node && node.openingElement && node.openingElement.name;
  if (!name) {
    return null;
  }
  if (name.type === 'JSXIdentifier') {
    return name.name;
  }
  if (name.type === 'JSXMemberExpression') {
    const parts = [];
    let cursor = name;
    while (cursor && cursor.type === 'JSXMemberExpression') {
      parts.unshift(cursor.property.name);
      cursor = cursor.object;
    }
    if (!cursor || cursor.type !== 'JSXIdentifier') {
      return null;
    }
    parts.unshift(cursor.name);
    return parts.join('.');
  }
  return null;
}

function isSingleLineNode(node, originalText) {
  return originalText.slice(node.start, node.end).indexOf('\n') === -1;
}

// Traversal must not descend into comments or metadata.
const SKIP_KEYS = new Set([
  'comments',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'loc',
  'range',
  'tokens',
]);

function mark(node, originalText, callTargets, elementTargets) {
  if (!node || typeof node.type !== 'string') {
    return;
  }

  let matched = false;

  if (node.type === 'CallExpression') {
    const segments = calleeSegments(node);
    matched = !!segments && matchesTarget(callTargets, segments.join('.'));
  } else if (node.type === 'JSXElement') {
    matched = matchesTarget(elementTargets, jsxElementName(node));
  }

  if (matched) {
    if (isSingleLineNode(node, originalText)) {
      node.prettierIgnore = true;
    }
    // Either frozen (prints verbatim, children never printed) or spanning
    // several lines (left to Prettier as a unit) — do not descend further.
    return;
  }

  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        mark(child, originalText, callTargets, elementTargets);
      }
    } else if (value && typeof value === 'object' && typeof value.type === 'string') {
      mark(value, originalText, callTargets, elementTargets);
    }
  }
}

module.exports = {
  options: {
    keepInlineCalls: {
      type: 'path',
      array: true,
      category: 'Keep Inline',
      since: '1.0.0',
      cliName: 'keep-inline-calls',
      default: [{ value: [] }],
      description:
        'Call paths to keep on a single line. Supports glob patterns: * (one name part), ** (across parts). E.g. ["log.debug", "someObject.**"].',
    },
    keepInlineJSXElements: {
      type: 'path',
      array: true,
      category: 'Keep Inline',
      since: '1.0.0',
      cliName: 'keep-inline-jsx-elements',
      default: [{ value: [] }],
      description:
        'JSX element names to keep on a single line. Supports glob patterns: * and **. E.g. ["SomeElement", "*Badge"].',
    },
  },
  parsers: {
    babel: {
      ...babel.parsers.babel,
      parse(text, parsers, options) {
        const callTargets = compileTargets(options.keepInlineCalls);
        const elementTargets = compileTargets(options.keepInlineJSXElements);
        const ast = babel.parsers.babel.parse(text, parsers, options);
        if (hasTargets(callTargets) || hasTargets(elementTargets)) {
          mark(ast, text, callTargets, elementTargets);
        }
        return ast;
      },
    },
  },
};