import fs from 'fs';
import os from 'os';
import path from 'path';
import expressJwt from 'express-jwt';
import jwt from 'jsonwebtoken';
import app from '../../app';
import settings from '../../config/settings';
import * as usersApi from '../api.users';
import config from '../../services/configstore';

describe('authDisabled signin flow', () => {
  let configFile = '';
  let originalAuthDisabled = false;
  let originalSecret = '';

  beforeAll(() => {
    originalAuthDisabled = settings.authDisabled;
    originalSecret = settings.secret;

    configFile = path.join(os.tmpdir(), `cncjs-auth-disabled-${Date.now()}.json`);
    fs.writeFileSync(configFile, JSON.stringify({}), 'utf8');

    config.load(configFile);
    config.set('secret', 'test-secret');
    config.set('authDisabled', true);

    settings.secret = 'test-secret';
    settings.authDisabled = true;
  });

  afterAll(() => {
    settings.authDisabled = originalAuthDisabled;
    settings.secret = originalSecret;

    fs.unwatchFile(configFile);
    config.watcher = null;
    fs.unlinkSync(configFile);
  });

  test('allows /api/signin to return an anonymous token when authDisabled=true', async () => {
    const req = {
      body: {}
    };
    const res = {
      send: jest.fn(),
      status: jest.fn()
    };

    usersApi.signin(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledTimes(1);

    const body = res.send.mock.calls[0][0];
    expect(body.enabled).toBe(false);
    expect(body.name).toBe('anonymous');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);

    const payload = jwt.verify(body.token, settings.secret);
    expect(payload.id).toBe('anonymous');
    expect(payload.name).toBe('anonymous');
  });
});

describe('authDisabled signin flow', () => {
  let configFile = '';
  let originalAuthDisabled = false;
  let originalSecret = '';
  let originalSessionPath = '';
  let sessionPath = '';

  beforeAll(() => {
    originalAuthDisabled = settings.authDisabled;
    originalSecret = settings.secret;
    originalSessionPath = settings.middleware.session.path;

    config.watcher = null;
    configFile = path.join(os.tmpdir(), `cncjs-auth-middleware-${Date.now()}.json`);
    sessionPath = path.join(os.tmpdir(), `cncjs-sessions-${Date.now()}`);
    fs.writeFileSync(configFile, JSON.stringify({}), 'utf8');

    config.load(configFile);
    config.set('secret', 'test-secret');

    settings.secret = 'test-secret';
    settings.authDisabled = false;
    settings.middleware.session.path = sessionPath;
  });

  afterAll(() => {
    settings.authDisabled = originalAuthDisabled;
    settings.secret = originalSecret;
    settings.middleware.session.path = originalSessionPath;

    fs.unwatchFile(configFile);
    config.watcher = null;
    fs.unlinkSync(configFile);
    fs.rmSync(sessionPath, { force: true, recursive: true });
  });

  test('rejects tokenless protected routes when authDisabled=false', async () => {
    const instance = app();
    const middlewareLayer = instance._router.stack.find((layer) => {
      return typeof layer.handle === 'function' &&
        layer.handle.length === 4 &&
        layer.handle.toString().includes('UnauthorizedError');
    });

    expect(middlewareLayer).toBeTruthy();

    const err = new expressJwt.UnauthorizedError('credentials_required', {
      message: 'No authorization token was found'
    });
    const req = {
      body: {},
      connection: {
        remoteAddress: '127.0.0.1'
      },
      ip: '127.0.0.1',
      path: '/api/state'
    };
    const res = {
      end: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    await middlewareLayer.handle(err, req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.end).toHaveBeenCalledWith('Forbidden Access');
  });
});
