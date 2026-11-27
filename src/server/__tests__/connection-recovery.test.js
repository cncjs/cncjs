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

test.each([undefined, null, {}, { action: 'invalid' }, { action: 'reconnect' }, { action: 'offline' }])(
  'serializes connectionRecovery=%j through the page into the client',
  (recovery) => {
    config.get.mockImplementation((key) => {
      if (key === 'secret') {
        return 'test-secret';
      }
      if (key === 'connectionRecovery.action') {
        return recovery && recovery.action;
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
    const root = { getAttribute: () => html.match(/data-connection-recovery-action="([^"]*)"/)[1] };
    expect(readConnectionRecoveryConfig(root)).toEqual({
      action: recovery && recovery.action === 'offline' ? 'offline' : 'reconnect',
    });
  }
);
