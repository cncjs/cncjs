/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import Hogan from 'hogan.js';
import appMain from '../app';
import config from '../services/configstore';
import { readConnectionRecoveryConfig } from '../../app/lib/server-watch';

jest.mock('../services/configstore', () => ({ get: jest.fn() }));
jest.mock('../api', () => new Proxy({}, {
  get: () => new Proxy({}, { get: () => jest.fn() }),
}));
jest.mock('../lib/logger', () => () => ({ debug: jest.fn(), error: jest.fn() }));
// Skip session creation before it can touch the real home directory.
jest.mock('rimraf', () => ({
  sync: () => {
    throw new Error('sessions disabled in test');
  },
}));
jest.mock('serve-favicon', () => () => (req, res, next) => next());
jest.mock('i18next', () => ({ use: jest.fn().mockReturnThis(), init: jest.fn() }));
jest.mock('i18next-http-middleware', () => ({
  LanguageDetector: {}, handle: () => (req, res, next) => next(),
}));

const template = Hogan.compile(fs.readFileSync(path.resolve(__dirname, '../../../index.hbs'), 'utf8'));

test.each([
  [undefined, false],
  [null, false],
  [{}, false],
  [{ offlineFallback: false }, false],
  [{ offlineFallback: 'true' }, false],
  [{ offlineFallback: 1 }, false],
  [{ offlineFallback: true }, true],
])('serializes connectionRecovery=%j through the page into the client', (recovery, offlineFallback) => {
  config.get.mockImplementation((key) => {
    if (key === 'secret') {
      return 'test-secret';
    }
    if (key === 'connectionRecovery.offlineFallback') {
      return recovery && recovery.offlineFallback;
    }
    return undefined;
  });
  const app = appMain();
  const route = app._router.stack.find((layer) => layer.route && layer.route.path === '/').route;
  let html;
  route.stack[0].handle({ language: 'en', t: (key) => key }, {
    set: jest.fn(),
    render: (view, locals) => {
      html = template.render(locals);
    },
  });
  const textContent = html.match(/<script id="cncjs-config" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  expect(JSON.parse(textContent)).toEqual({ connectionRecovery: { offlineFallback } });
  const page = { getElementById: (id) => (id === 'cncjs-config' ? { textContent } : null) };
  expect(readConnectionRecoveryConfig(page)).toEqual({ offlineFallback });
});
