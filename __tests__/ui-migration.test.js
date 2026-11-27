const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkProject } = require('../scripts/check-ui-migration');
const fixtures = require('../scripts/fixtures/ui-migration.json');

let root;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-ui-gate-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
const writeFiles = files => Object.entries(files).forEach(([file, source]) => {
  const filename = path.join(root, file);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, source);
});

test.each(fixtures)('$name', fixture => {
  writeFiles(fixture.files);
  const { violations } = checkProject({ root, policy: fixture.policy });
  const rules = [...new Set(violations.map(item => item.rule))].sort();
  expect(rules).toEqual([...fixture.rules].sort());
});

test('reports each forbidden form at the relevant file and line', () => {
  writeFiles({
    'src/app/pages/View.jsx': 'export const View = () => (\n  <>\n    <form />\n    <Box as="form" />\n    <Layout.Content as={\'form\'} />\n  </>\n);',
  });
  const { violations } = checkProject({ root, policy: {} });
  expect(violations.map(({ file, line, rule }) => ({ file, line, rule }))).toEqual([
    { file: 'src/app/pages/View.jsx', line: 3, rule: 'native-form' },
    { file: 'src/app/pages/View.jsx', line: 4, rule: 'native-form' },
    { file: 'src/app/pages/View.jsx', line: 5, rule: 'native-form' },
  ]);
});

test('reports both legacy form imports and both dependency declarations', () => {
  writeFiles({
    'src/app/pages/View.jsx': 'import { Form } from \'react-final-form\';\nimport { createForm } from \'final-form\';',
    'package.json': '{"dependencies":{"react-final-form":"1.0.0"},"devDependencies":{"final-form":"1.0.0"}}',
  });
  const { violations } = checkProject({ root, policy: {} });
  expect(violations.map(({ file, line, rule, message }) => ({ file, line, rule, message }))).toEqual(expect.arrayContaining([
    { file: 'package.json', line: 1, rule: 'legacy-ui', message: 'Legacy UI dependency react-final-form' },
    { file: 'package.json', line: 1, rule: 'legacy-ui', message: 'Legacy UI dependency final-form' },
    { file: 'src/app/pages/View.jsx', line: 1, rule: 'legacy-ui', message: 'Legacy UI module react-final-form' },
    { file: 'src/app/pages/View.jsx', line: 2, rule: 'legacy-ui', message: 'Legacy UI module final-form' },
  ]));
  expect(violations).toHaveLength(4);
});

test('CLI reports file/line/rule and fails on component mutation', () => {
  writeFiles({ 'src/app/pages/View.jsx': 'import api from \'@app/api\'; api.loadGCode({});' });
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/check-ui-migration.js'), '--root', root], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('src/app/pages/View.jsx:1 [http-boundary]');
});

test('CLI succeeds for a legal realtime fixture project', () => {
  writeFiles({ 'src/app/pages/View.jsx': 'import controller from \'@app/lib/controller\'; controller.command(\'gcode\', \'G0 X1\');' });
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/check-ui-migration.js'), '--root', root], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('0 violations');
});

test('CLI fails instead of passing an empty or wrong project root', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/check-ui-migration.js'), '--root', root], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('[missing-source]');
});
