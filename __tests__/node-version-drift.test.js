const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkNodeVersions } = require('../scripts/check-node-version-drift');

const ENGINE = '^24.22.1 || >=26.12.1';
const SUPPORTED_TABLE = ` < 24    | Not supported
 24.22.1 or higher (24.x) | Recommended
 25.x, 26.0.0 – 26.11.x | Not supported
 26.12.1 or higher | Supported`;

const readme = ({ table = SUPPORTED_TABLE, body = '' } = {}) => `# CNCjs

## Supported Node.js Versions

 Version | Supported Level
:------- |:---------------
${table}

${body}
`;

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-node-drift-'));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const writeFiles = files => Object.entries(files).forEach(([file, source]) => {
  const filename = path.join(root, file);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, source);
});

const project = (files = {}) => {
  writeFiles({
    'package.json': JSON.stringify({ engines: { node: ENGINE } }),
    'AGENTS.md': '# Agents\n',
    'README.md': readme(),
    ...files,
  });
  return checkNodeVersions({ root });
};

test('the repository documentation agrees with engines.node', () => {
  const result = checkNodeVersions({ root: path.resolve(__dirname, '..') });
  expect(result.violations).toEqual([]);
});

test('accepts supported lines, major-only examples, nvm commands, and the bundled runtime', () => {
  const result = project({
    'README.md': readme({
      body: `Node.js 24 and 26 publish no armv7l binaries.
Node.js 26.12.1 and every later version are supported.
The desktop app bundles its own Node.js 18 runtime.
\`\`\`
nvm install 24
nvm use 26
\`\`\``,
    }),
    'AGENTS.md': 'Use Node.js 24 or 26.\n',
    'skills/cncjs-patterns/SKILL.md': 'Use Node.js 24.x.\n',
    '.agents/skills/cncjs-pr/SKILL.md': 'Use Node.js 26.12.1.\n',
  });
  expect(result.violations).toEqual([]);
});

test('flags a stale Node.js requirement in AGENTS.md', () => {
  const result = project({ 'AGENTS.md': 'Backend: Node.js ≥18\n' });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'AGENTS.md', line: 1, rule: 'node-version-drift' }),
  ]);
});

test('discovers nested canonical skills dynamically', () => {
  const result = project({ 'skills/deep/nested/SKILL.md': 'Minimum Node.js version: 18+\n' });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'skills/deep/nested/SKILL.md', line: 1, rule: 'node-version-drift' }),
  ]);
});

test('checks .agents discovery files', () => {
  const result = project({ '.agents/skills/cncjs-pr/SKILL.md': 'Node.js 18 is required.\n' });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: '.agents/skills/cncjs-pr/SKILL.md', rule: 'node-version-drift' }),
  ]);
});

test('checks .claude/skills discovery files', () => {
  const result = project({ '.claude/skills/cncjs-version/SKILL.md': 'Node.js 18 is required.\n' });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: '.claude/skills/cncjs-version/SKILL.md', rule: 'node-version-drift' }),
  ]);
});

test('follows relative skill symlinks without double-reporting', () => {
  writeFiles({
    'package.json': JSON.stringify({ engines: { node: ENGINE } }),
    'AGENTS.md': '# Agents\n',
    'README.md': readme(),
    'skills/cncjs-patterns/SKILL.md': 'Node.js 18 is required.\n',
  });
  fs.mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
  try {
    fs.symlinkSync(path.join('..', '..', 'skills', 'cncjs-patterns'), path.join(root, '.agents/skills/cncjs-patterns'), 'dir');
  } catch (error) {
    return;
  }
  const result = checkNodeVersions({ root });
  expect(result.violations).toHaveLength(1);
  expect(result.violations[0].file).toBe('skills/cncjs-patterns/SKILL.md');
});

test('flags an unsupported version in a supported table row', () => {
  const result = project({
    'README.md': readme({
      table: ` < 24    | Not supported
 22.0.0 or higher | Recommended
 26.12.1 or higher | Supported`,
    }),
  });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'README.md', rule: 'node-version-drift', message: expect.stringContaining('22.0.0') }),
  ]);
});

test('flags an unscoped "or higher" recommendation', () => {
  const result = project({
    'README.md': readme({ body: 'Node.js 24.22.1 or higher is recommended.\n' }),
  });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'README.md', rule: 'ambiguous-version-claim', message: expect.stringContaining('24.22.1') }),
  ]);
});

test('accepts an "or higher" claim scoped to a supported line', () => {
  const result = project({
    'README.md': readme({ body: 'Node.js 24.22.1 or higher in the 24.x line is recommended.\n' }),
  });
  expect(result.violations).toEqual([]);
});

test('accepts an open-ended "or higher" claim', () => {
  const result = project({
    'README.md': readme({ body: 'Node.js 26.12.1 or higher is supported.\n' }),
  });
  expect(result.violations).toEqual([]);
});

test('fails closed on a supported row that only names a lower bound', () => {
  const result = project({
    'README.md': readme({
      table: ` < 24 | Not supported
 < 26 | Supported`,
    }),
  });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'README.md', rule: 'ambiguous-support-row' }),
  ]);
});

test('allows explicitly unsupported and historical versions', () => {
  const result = project({
    'README.md': readme({
      body: `Node.js 20 reached end-of-life on 2026-04-30 and does not receive that fix.
Node.js 18 is not supported.`,
    }),
    'AGENTS.md': 'Node.js 18 is no longer supported.\n',
  });
  expect(result.violations).toEqual([]);
});

test('does not excuse a stale requirement because another sentence mentions removal', () => {
  const result = project({ 'AGENTS.md': 'The legacy API was removed. Node.js 18 is required.\n' });
  expect(result.violations).toHaveLength(1);
  expect(result.violations[0]).toMatchObject({ file: 'AGENTS.md', rule: 'node-version-drift' });
});

test('allows a version that belongs to the bundled desktop runtime', () => {
  const result = project({
    'README.md': readme({ body: 'The desktop app bundles its own Node.js 18 runtime.\n' }),
  });
  expect(result.violations).toEqual([]);
});

test('does not excuse a server requirement because the desktop app bundles a runtime', () => {
  const result = project({
    'README.md': readme({
      body: 'The desktop app bundles its own Node.js runtime. Node.js 18 is required for the server.\n',
    }),
  });
  expect(result.violations).toHaveLength(1);
  expect(result.violations[0]).toMatchObject({ file: 'README.md', rule: 'node-version-drift' });
});

test('flags stale nvm commands', () => {
  const result = project({
    'README.md': readme({ body: '```\nnvm install 20\nnvm use 20\n```\n' }),
  });
  expect(result.violations).toHaveLength(2);
  expect(result.violations.every(item => item.rule === 'node-version-drift')).toBe(true);
});

test('fails closed when engines.node is invalid', () => {
  writeFiles({
    'package.json': JSON.stringify({ engines: { node: 'banana' } }),
    'README.md': readme(),
    'AGENTS.md': '# Agents\n',
  });
  const result = checkNodeVersions({ root });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'package.json', rule: 'invalid-engine' }),
  ]);
});

test('requires the supported versions table', () => {
  const result = project({ 'README.md': '# CNCjs\n\nNo table here.\n' });
  expect(result.violations).toEqual([
    expect.objectContaining({ file: 'README.md', rule: 'missing-support-table' }),
  ]);
});

test('CLI reports file/line/rule and exits 1 on drift', () => {
  project({ 'AGENTS.md': 'Node.js 18 is required.\n' });
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/check-node-version-drift.js'), '--root', root], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('AGENTS.md:1 [node-version-drift]');
});

test('CLI succeeds for the repository', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/check-node-version-drift.js')], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('0 violations');
});
