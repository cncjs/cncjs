/* eslint-env jest */
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import express from 'express';
import webappengine from '../webappengine';

const listen = (server, ...args) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(...args, () => resolve(server.address().port));
});

const close = (server) => new Promise((resolve, reject) => {
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

const request = (port, requestPath) => new Promise((resolve, reject) => {
  const req = http.get({
    host: '127.0.0.1',
    path: requestPath,
    port,
  }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      resolve({
        body: Buffer.concat(chunks).toString(),
        headers: response.headers,
        statusCode: response.statusCode,
      });
    });
  });
  req.on('error', reject);
});

describe('webappengine host', () => {
  test('mounts static and server routes without creating file sessions', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-webappengine-'));
    const staticDirectory = path.join(tempDirectory, 'static');
    const workingDirectory = path.join(tempDirectory, 'working');
    const originalCwd = process.cwd();
    let server;

    fs.mkdirSync(staticDirectory);
    fs.mkdirSync(workingDirectory);
    fs.writeFileSync(path.join(staticDirectory, 'index.html'), 'static response');
    process.chdir(workingDirectory);

    try {
      const host = webappengine({
        host: '127.0.0.1',
        port: 0,
        routes: [
          {
            type: 'static',
            route: '/assets',
            directory: staticDirectory,
          },
          {
            type: 'server',
            route: '/api',
            server: ({ route }) => {
              const app = express();
              app.get(`${route}/hello`, (req, res) => res.send('server response'));
              return app;
            },
          },
        ],
      });

      server = await new Promise((resolve, reject) => {
        host.once('ready', resolve);
        host.once('error', reject);
      });

      expect(server).toBeInstanceOf(http.Server);

      const staticResponse = await request(server.address().port, '/assets/index.html');
      expect(staticResponse.statusCode).toBe(200);
      expect(staticResponse.body).toBe('static response');
      expect(staticResponse.headers['set-cookie']).toBeUndefined();

      const serverResponse = await request(server.address().port, '/api/hello');
      expect(serverResponse.statusCode).toBe(200);
      expect(serverResponse.body).toBe('server response');
      expect(serverResponse.headers['set-cookie']).toBeUndefined();

      expect(fs.existsSync(path.join(workingDirectory, 'sessions'))).toBe(false);
    } finally {
      await close(server);
      process.chdir(originalCwd);
      fs.rmSync(tempDirectory, { force: true, recursive: true });
    }
  });

  test('forwards HTTP server errors through the host emitter', async () => {
    const blocker = http.createServer();
    await listen(blocker, 0, '127.0.0.1');

    try {
      const host = webappengine({
        host: '127.0.0.1',
        port: blocker.address().port,
        routes: [],
      });
      const error = await new Promise((resolve) => {
        host.once('error', resolve);
      });

      expect(error).toEqual(expect.objectContaining({ code: 'EADDRINUSE' }));
    } finally {
      await close(blocker);
    }
  });
});
