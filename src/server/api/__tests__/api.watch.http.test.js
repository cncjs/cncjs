/**
 * @jest-environment node
 */
/* eslint-env jest */
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import serviceContainer from '../../service-container';
import settings from '../../config/settings';
import restreamParsedBody from '../../lib/restream-parsed-body';
import apiWatch from '../api.watch';

// HTTP integration coverage of the three write routes: a real Express app with
// the server's body handling, the real api.watch handlers, and a real
// DirectoryWatcherService, driven over a loopback socket. Only the service
// container is stubbed, so the suite does not need the controller graph; route
// registration and session authentication are outside this fixture.
jest.mock('../../service-container', () => {
  const DirectoryWatcherService = jest.requireActual('../../services/DirectoryWatcherService').default;
  const directoryWatcher = new DirectoryWatcherService();

  return {
    __esModule: true,
    default: {
      resolve: (key) => (key === 'directoryWatcher' ? directoryWatcher : {})
    }
  };
});

// The cap is the real setting, lowered so an oversized upload is cheap to send.
jest.mock('../../config/settings', () => {
  const actual = jest.requireActual('../../config/settings').default;

  return {
    __esModule: true,
    default: {
      ...actual,
      middleware: {
        ...actual.middleware,
        upload: { ...actual.middleware.upload, maxFileSize: 128 * 1024 }
      }
    }
  };
});

const MAX_FILE_SIZE = settings.middleware.upload.maxFileSize;
const REQUEST_TIMEOUT_MS = 5000;
const GCODE = 'G21\nG90\nG1 X10 Y10 F500\r\nM30\r\n';
const OUTSIDE_CONTENT = 'sentinel content\n';

const bytes = (value) => Buffer.from(value, 'utf8');

describe('watch directory write routes over HTTP', () => {
  const directoryWatcher = serviceContainer.resolve('directoryWatcher');

  let sandbox = '';
  let watchDir = '';
  let outsideDir = '';
  let server = null;

  beforeEach((done) => {
    // `watch/` and `outside/` are siblings, so a name that carries a directory
    // component points at a real file outside the watch root.
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-watch-http-'));
    watchDir = path.join(sandbox, 'watch');
    outsideDir = path.join(sandbox, 'outside');
    fs.mkdirSync(watchDir);
    fs.mkdirSync(outsideDir);

    directoryWatcher.root = watchDir;

    const app = express();
    // The server's own body handling (src/server/app.js), including the same
    // restreamer guard: a parsed body is re-streamed, an unread octet-stream
    // request stays the live stream it already is.
    app.use(bodyParser.json(settings.middleware['body-parser'].json));
    app.use(bodyParser.urlencoded(settings.middleware['body-parser'].urlencoded));
    app.use(restreamParsedBody());

    // The three write routes, matching their registration in
    // src/server/routes/api.js. Nothing else is mounted.
    app.put('/api/watch/file', apiWatch.writeFile);
    app.post('/api/watch/file/rename', apiWatch.renameFile);
    app.delete('/api/watch/file', apiWatch.deleteFile);

    server = app.listen(0, '127.0.0.1', () => {
      done();
    });
  });

  afterEach(async () => {
    const closed = new Promise((resolve) => {
      server.close(resolve);
    });
    // Responses are complete by the time a test finishes; drop any socket the
    // client or server is still holding so the close cannot hang.
    server.closeAllConnections();
    await closed;

    directoryWatcher.unwatch();
    directoryWatcher.root = '';
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  const request = ({ method, pathname, query, contentType, body, chunked = false }) => {
    const search = query ? `?${new URLSearchParams(query).toString()}` : '';
    const payload = body === undefined ? undefined : bytes(body);
    const headers = {};

    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    // Byte-accurate Content-Length, except where the test is deliberately
    // sending a body whose size nothing declares.
    if (payload !== undefined && !chunked) {
      headers['Content-Length'] = String(payload.length);
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, value) => {
        if (settled) {
          return;
        }
        settled = true;
        fn(value);
      };

      const req = http.request({
        hostname: '127.0.0.1',
        port: server.address().port,
        path: `/api${pathname}${search}`,
        method,
        // A fresh socket per request: a reset in one case must not poison the next.
        agent: false,
        headers
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('aborted', () => settle(reject, new Error('Response was aborted before completion')));
        res.on('error', (err) => settle(reject, err));
        res.on('end', () => {
          settle(resolve, {
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      });

      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
      });
      req.on('error', (err) => settle(reject, err));
      req.on('close', () => settle(reject, new Error('Request closed without a complete response')));

      if (payload !== undefined) {
        req.write(payload);
      }
      req.end();
    });
  };

  // Uploads name the file either in the query string (raw bytes) or in the JSON
  // body; both are the documented shapes of PUT /api/watch/file.
  const upload = ({ file, data, nameSource = 'query' }) => (
    nameSource === 'body'
      ? request({
        method: 'PUT',
        pathname: '/watch/file',
        contentType: 'application/json',
        body: JSON.stringify({ file, data })
      })
      : request({
        method: 'PUT',
        pathname: '/watch/file',
        query: { file },
        contentType: 'application/octet-stream',
        body: data
      })
  );

  const json = (res) => JSON.parse(res.body);
  const seedOutsideVictim = () => {
    const target = path.join(outsideDir, 'victim.nc');
    fs.writeFileSync(target, OUTSIDE_CONTENT);
    return target;
  };

  describe('file lifecycle', () => {
    test.each([
      ['raw octet-stream', 'query'],
      ['JSON', 'body']
    ])('a %s upload renames and then deletes one file', async (label, nameSource) => {
      const uploaded = await upload({ file: 'program.nc', data: GCODE, nameSource });

      expect(uploaded.status).toEqual(200);
      expect(json(uploaded)).toEqual({ file: 'program.nc' });
      expect(fs.readFileSync(path.join(watchDir, 'program.nc'))).toEqual(bytes(GCODE));

      const renamed = await request({
        method: 'POST',
        pathname: '/watch/file/rename',
        contentType: 'application/json',
        body: JSON.stringify({ file: 'program.nc', to: 'renamed.nc' })
      });
      expect(renamed.status).toEqual(200);
      expect(fs.existsSync(path.join(watchDir, 'program.nc'))).toBe(false);
      expect(fs.readFileSync(path.join(watchDir, 'renamed.nc'))).toEqual(bytes(GCODE));

      const deleted = await request({
        method: 'DELETE',
        pathname: '/watch/file',
        query: { file: 'renamed.nc' }
      });
      expect(deleted.status).toEqual(200);
      expect(fs.readdirSync(watchDir)).toEqual([]);
    });
  });

  describe('rename never overwrites', () => {
    test('renaming onto an existing name answers 409 and keeps both files byte-identical', async () => {
      fs.writeFileSync(path.join(watchDir, 'source.nc'), 'source\n');
      fs.writeFileSync(path.join(watchDir, 'taken.nc'), 'taken\n');

      const res = await request({
        method: 'POST',
        pathname: '/watch/file/rename',
        contentType: 'application/json',
        body: JSON.stringify({ file: 'source.nc', to: 'taken.nc' })
      });

      expect(res.status).toEqual(409);
      expect(fs.readFileSync(path.join(watchDir, 'source.nc'), 'utf8')).toEqual('source\n');
      expect(fs.readFileSync(path.join(watchDir, 'taken.nc'), 'utf8')).toEqual('taken\n');
    });
  });

  describe('a failed upload is bounded', () => {
    // No Content-Length is sent, so only the watcher's own size limit stands
    // between this body and the disk. The pre-existing target must survive
    // untouched, and the staging file must not be left behind. This also covers
    // delivery: the server aborts the request stream when the limit trips, and
    // the complete 413 still has to reach the client.
    test('an oversized chunked upload answers 413 and leaves the directory listing unchanged', async () => {
      const target = path.join(watchDir, 'program.nc');
      fs.writeFileSync(target, 'original program\n');
      const listingBefore = fs.readdirSync(watchDir);

      const res = await request({
        method: 'PUT',
        pathname: '/watch/file',
        query: { file: 'program.nc' },
        contentType: 'application/octet-stream',
        body: Buffer.concat([Buffer.alloc(MAX_FILE_SIZE, 0x41), Buffer.from('x')]),
        chunked: true
      });

      expect(res.status).toEqual(413);
      expect(fs.readFileSync(target, 'utf8')).toEqual('original program\n');
      expect(fs.readdirSync(watchDir)).toEqual(listingBefore);
    });
  });

  describe('writes stay inside the watch directory', () => {
    test.each([
      { label: 'raw upload', nameSource: 'query', shape: 'relative' },
      { label: 'raw upload', nameSource: 'query', shape: 'absolute' },
      { label: 'JSON upload', nameSource: 'body', shape: 'relative' },
      { label: 'JSON upload', nameSource: 'body', shape: 'absolute' }
    ])('a $label naming a $shape path outside the root writes only the basename inside it', async ({ label, nameSource, shape }) => {
      const name = shape === 'relative' ? '../outside/victim.nc' : path.join(outsideDir, 'victim.nc');
      fs.writeFileSync(path.join(outsideDir, 'victim.nc'), OUTSIDE_CONTENT);

      const res = await upload({ file: name, data: 'uploaded\n', nameSource });

      // Uploads normalize the name: the caller gets `victim.nc`, inside the only
      // directory this API writes to, and nothing outside is touched.
      expect(res.status).toEqual(200);
      expect(json(res)).toEqual({ file: name });
      expect(fs.readFileSync(path.join(watchDir, 'victim.nc'), 'utf8')).toEqual('uploaded\n');
      expect(fs.readFileSync(path.join(outsideDir, 'victim.nc'), 'utf8')).toEqual(OUTSIDE_CONTENT);
      expect(fs.readdirSync(outsideDir)).toEqual(['victim.nc']);
    });

    test.each([
      { action: 'rename source', shape: 'relative' },
      { action: 'rename source', shape: 'absolute' },
      { action: 'rename target', shape: 'relative' },
      { action: 'rename target', shape: 'absolute' },
      { action: 'delete', shape: 'relative' },
      { action: 'delete', shape: 'absolute' }
    ])('a $action naming a $shape path outside the root is refused instead of corrected', async ({ action, shape }) => {
      const name = shape === 'relative' ? '../outside/victim.nc' : path.join(outsideDir, 'victim.nc');
      fs.writeFileSync(path.join(outsideDir, 'victim.nc'), OUTSIDE_CONTENT);
      fs.writeFileSync(path.join(watchDir, 'intact.nc'), 'intact\n');
      const watchBefore = fs.readdirSync(watchDir);
      const outsideBefore = fs.readdirSync(outsideDir);

      const requests = {
        'rename source': {
          method: 'POST',
          pathname: '/watch/file/rename',
          contentType: 'application/json',
          body: JSON.stringify({ file: name, to: 'safe.nc' })
        },
        'rename target': {
          method: 'POST',
          pathname: '/watch/file/rename',
          contentType: 'application/json',
          body: JSON.stringify({ file: 'intact.nc', to: name })
        },
        delete: {
          method: 'DELETE',
          pathname: '/watch/file',
          query: { file: name }
        }
      };

      const res = await request(requests[action]);
      expect(res.status).toEqual(400);

      expect(fs.readFileSync(path.join(watchDir, 'intact.nc'), 'utf8')).toEqual('intact\n');
      expect(fs.readdirSync(watchDir)).toEqual(watchBefore);
      expect(fs.readFileSync(path.join(outsideDir, 'victim.nc'), 'utf8')).toEqual(OUTSIDE_CONTENT);
      expect(fs.readdirSync(outsideDir)).toEqual(outsideBefore);
    });
  });

  describe('writes do not follow links out of the watch directory', () => {
    test.each([
      { label: 'raw upload', nameSource: 'query', linkKind: 'symbolic link' },
      { label: 'raw upload', nameSource: 'query', linkKind: 'hard link' },
      { label: 'JSON upload', nameSource: 'body', linkKind: 'symbolic link' },
      { label: 'JSON upload', nameSource: 'body', linkKind: 'hard link' }
    ])('a $label replacing a $linkKind destination replaces the entry, not the link target', async ({ label, nameSource, linkKind }) => {
      const victim = seedOutsideVictim();
      const destination = path.join(watchDir, 'victim.nc');

      if (linkKind === 'symbolic link') {
        fs.symlinkSync(victim, destination);
      } else {
        fs.linkSync(victim, destination);
      }
      const inodeBefore = fs.statSync(victim).ino;

      const res = await upload({ file: 'victim.nc', data: 'uploaded\n', nameSource });

      expect(res.status).toEqual(200);
      // The name inside the root is now a plain file of its own; the file
      // outside keeps its bytes, its inode, and its single name.
      expect(fs.readFileSync(destination, 'utf8')).toEqual('uploaded\n');
      expect(fs.lstatSync(destination).isSymbolicLink()).toBe(false);
      expect(fs.lstatSync(destination).ino).not.toEqual(inodeBefore);
      expect(fs.readFileSync(victim, 'utf8')).toEqual(OUTSIDE_CONTENT);
      expect(fs.statSync(victim).ino).toEqual(inodeBefore);
      expect(fs.statSync(victim).nlink).toEqual(1);
      expect(fs.readdirSync(outsideDir)).toEqual(['victim.nc']);
    });

    test('renaming or deleting a symbolic link answers 400 and leaves the link and its target alone', async () => {
      const victim = seedOutsideVictim();
      const link = path.join(watchDir, 'link.nc');
      fs.symlinkSync(victim, link);

      const renamed = await request({
        method: 'POST',
        pathname: '/watch/file/rename',
        contentType: 'application/json',
        body: JSON.stringify({ file: 'link.nc', to: 'moved.nc' })
      });
      expect(renamed.status).toEqual(400);

      const deleted = await request({ method: 'DELETE', pathname: '/watch/file', query: { file: 'link.nc' } });
      expect(deleted.status).toEqual(400);

      expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(victim, 'utf8')).toEqual(OUTSIDE_CONTENT);
      expect(fs.readdirSync(watchDir)).toEqual(['link.nc']);
      expect(fs.readdirSync(outsideDir)).toEqual(['victim.nc']);
    });

    test('renaming onto an existing symbolic link answers 409 and keeps both names and the target', async () => {
      const victim = seedOutsideVictim();
      fs.writeFileSync(path.join(watchDir, 'plain.nc'), 'plain\n');
      fs.symlinkSync(victim, path.join(watchDir, 'victim.nc'));

      const res = await request({
        method: 'POST',
        pathname: '/watch/file/rename',
        contentType: 'application/json',
        body: JSON.stringify({ file: 'plain.nc', to: 'victim.nc' })
      });

      expect(res.status).toEqual(409);
      expect(fs.readFileSync(path.join(watchDir, 'plain.nc'), 'utf8')).toEqual('plain\n');
      expect(fs.lstatSync(path.join(watchDir, 'victim.nc')).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(victim, 'utf8')).toEqual(OUTSIDE_CONTENT);
    });
  });
});
