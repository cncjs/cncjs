const base = require('@playwright/test');
const { hasBuild, startServer, signin, getControllers } = require('./fixtures');

const test = base.test;
const expect = base.expect;

test.skip(!hasBuild(), 'Run `yarn build-prod` first: this tier drives the built server.');

/**
 * The API gate as a deployment meets it.
 *
 * No other tier can see this. `yarn jest` never builds the Express app, and the
 * smoke tier runs against the dev server, where `NODE_ENV=development` bypasses
 * verification outright — so every assertion below would pass vacuously there.
 */
test.describe('API access control', () => {
  test.describe('with accounts configured', () => {
    const ALICE = { id: 'user-a', name: 'alice', password: 'alice-secret', enabled: true };
    const BOB = { id: 'user-b', name: 'bob', password: 'bob-secret', enabled: true };

    let server = null;

    test.beforeAll(async () => {
      server = await startServer([ALICE, BOB]);
    });

    test.afterAll(() => {
      server && server.stop();
    });

    test('refuses a request carrying no token', async () => {
      const res = await getControllers(server.baseUrl);

      expect(res.status).toBe(403);
    });

    test('refuses the wrong password', async () => {
      const res = await signin(server.baseUrl, { name: BOB.name, password: 'not-it' });

      expect(res.status).toBe(401);
    });

    test('issues a working token for the right password', async () => {
      const session = await signin(server.baseUrl, { name: BOB.name, password: BOB.password });
      expect(session.status).toBe(200);
      expect(session.enabled).toBe(true);

      const res = await getControllers(server.baseUrl, session.token);
      expect(res.status).toBe(200);
    });

    test('stops honouring a token once its account is deleted', async () => {
      const session = await signin(server.baseUrl, { name: BOB.name, password: BOB.password });
      expect((await getControllers(server.baseUrl, session.token)).status).toBe(200);

      const deleted = await fetch(`${server.baseUrl}/api/users/${BOB.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      expect(deleted.status).toBe(200);

      // Alice is still enabled, so this is a revocation rather than a fall back
      // to the open first-run mode. The token still verifies — it is signed by
      // this server and has not expired — which is exactly why the account has
      // to be checked separately.
      expect((await getControllers(server.baseUrl, session.token)).status).toBe(403);

      // ...and the account that remains is unaffected.
      const alice = await signin(server.baseUrl, { name: ALICE.name, password: ALICE.password });
      expect((await getControllers(server.baseUrl, alice.token)).status).toBe(200);
    });
  });

  test.describe('before any account exists', () => {
    let server = null;

    test.beforeAll(async () => {
      server = await startServer([]);
    });

    test.afterAll(() => {
      server && server.stop();
    });

    test('hands a token to anyone and honours it', async () => {
      const session = await signin(server.baseUrl, {});

      expect(session.status).toBe(200);
      expect(session.enabled).toBe(false);
      expect(session.token).toBeTruthy();

      const res = await getControllers(server.baseUrl, session.token);
      expect(res.status).toBe(200);
    });
  });
});
