import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import createWebApp from '../create-web-app';

/** Bind the app to an ephemeral port and hand back a fetcher and a closer. */
const serve = (app) => new Promise(resolve => {
  const server = app.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    resolve({
      get: (url) => fetch(`http://127.0.0.1:${port}${url}`),
      close: () => new Promise(done => {
        server.close(done);
      }),
    });
  });
});

describe('createWebApp', () => {
  let directory = null;
  let instance = null;

  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-web-app-'));
    fs.writeFileSync(path.join(directory, 'hello.txt'), 'from disk');
  });

  afterAll(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  afterEach(async () => {
    instance && await instance.close();
    instance = null;
  });

  test('serves a static mount point out of its directory', async () => {
    instance = await serve(createWebApp([
      { type: 'static', route: '/files', directory },
    ]));

    const res = await instance.get('/files/hello.txt');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('from disk');
  });

  // The proxy apps in `server/index.js` build their routes with the mount
  // prefix already in them — `app.all('/widget/*')`, not `app.all('/*')` —
  // because webappengine dispatched to them without stripping it. Mounting
  // them on their own route instead, which is the obvious way to write this,
  // strips the prefix and stops every one of those routes matching.
  test('hands a server mount point the unstripped request path', async () => {
    instance = await serve(createWebApp([
      {
        type: 'server',
        route: '/widget',
        server: () => {
          const app = express();
          app.all('/widget/*', (req, res) => {
            res.send('proxied');
          });
          return app;
        },
      },
    ]));

    const res = await instance.get('/widget/index.html');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('proxied');
  });

  test('passes its own route to the server factory', () => {
    const server = jest.fn(() => express());

    createWebApp([
      { type: 'server', route: '/widget', server },
    ]);

    expect(server).toHaveBeenCalledWith({ route: '/widget' });
  });

  test('consults the mount points before the application itself', async () => {
    instance = await serve(createWebApp([
      { type: 'static', route: '/files', directory },
      {
        type: 'server',
        route: '/',
        server: () => {
          const app = express();
          app.use((req, res) => {
            res.send('from app');
          });
          return app;
        },
      },
    ]));

    expect(await (await instance.get('/files/hello.txt')).text()).toBe('from disk');
    expect(await (await instance.get('/anything/else')).text()).toBe('from app');
  });

  test('does not advertise the server it runs on', async () => {
    instance = await serve(createWebApp([
      { type: 'static', route: '/files', directory },
    ]));

    const res = await instance.get('/files/hello.txt');

    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
