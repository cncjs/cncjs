/* eslint-env jest */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import config from '..';

const originalFile = config.file;
const originalConfig = config.config;
let directory;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-color-mode-'));
  config.file = path.join(directory, 'cncrc.json');
});

afterEach(() => {
  config.file = originalFile;
  config.config = originalConfig;
  fs.rmSync(directory, { recursive: true });
});

test.each([
  [{ theme: 'dark' }, 'dark'],
  [{ theme: 'dark', colorMode: 'light' }, 'light']
])('migrates the saved color mode from %j', (state, expected) => {
  const original = JSON.stringify({ state: { ...state, checkForUpdates: false } });
  fs.writeFileSync(config.file, original);
  expect(config.reload()).toBe(true);
  expect(config.get('state.colorMode')).toBe(expected);
  expect(config.has('state.theme')).toBe(false);
  expect(fs.readFileSync(config.file, 'utf8')).toBe(original);

  config.set('state.checkForUpdates', true);
  const saved = JSON.parse(fs.readFileSync(config.file, 'utf8')).state;
  expect(saved).toEqual(expect.objectContaining({ colorMode: expected, checkForUpdates: true }));
  expect(saved).not.toHaveProperty('theme');
});
