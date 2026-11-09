/* eslint-env jest */
import http from 'http';
import appMain from '../app';
import settings from '../config/settings';
import serviceContainer from '../service-container';

const userStore = serviceContainer.resolve('userStore');

const listenEphemeral = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const postSignin = (port) => new Promise((resolve, reject) => {
  const request = http.request({
    host: '127.0.0.1',
    port,
    path: '/api/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 2,
    },
  }, (response) => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      resolve({
        body: JSON.parse(Buffer.concat(chunks).toString()),
        headers: response.headers,
        statusCode: response.statusCode,
      });
    });
  });
  request.on('error', reject);
  request.end('{}');
});

const closeServer = (server) => new Promise((resolve, reject) => {
  if (!server || !server.listening) {
    resolve();
    return;
  }

  server.close(err => {
    if (err) {
      reject(err);
      return;
    }

    resolve();
  });
});

describe('app', () => {
  test('sign-in returns a token without a session cookie when users are empty', async () => {
    const originalDetectionCaches = settings.i18next.detection.caches;
    const originalUserConfig = userStore.config;
    let server;

    settings.i18next.detection.caches = [];
    userStore.config = { ...originalUserConfig, secret: settings.secret, users: [] };

    try {
      server = http.createServer(appMain());
      const port = await listenEphemeral(server);
      const response = await postSignin(port);

      expect(response.statusCode).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.token).not.toBe('');
      expect(response.headers['set-cookie']).toBeUndefined();
    } finally {
      settings.i18next.detection.caches = originalDetectionCaches;
      userStore.config = originalUserConfig;
      await closeServer(server);
    }
  });
});
