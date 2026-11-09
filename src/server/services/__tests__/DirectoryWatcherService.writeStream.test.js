/* eslint-env jest */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import DirectoryWatcherService from '../DirectoryWatcherService';

// The staging name is `.<file>.<32 random hex>.tmp`. Pinning that randomness is
// what lets a test plant a staging path in advance.
const STAGING_HEX = 'ab'.repeat(16);

describe('DirectoryWatcherService.writeStream', () => {
  let watchDirectory;
  let service;

  beforeEach(() => {
    watchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-watch-'));
    service = new DirectoryWatcherService();
    service.root = watchDirectory;
  });

  afterEach(() => {
    service.unwatch();
    fs.rmSync(watchDirectory, { recursive: true, force: true });
  });

  const tempFiles = () => fs.readdirSync(watchDirectory).filter(name => name.endsWith('.tmp'));

  test('streams a readable into the watch directory', () => {
    return new Promise((resolve, reject) => {
      const contents = 'G0 X1\r\nG0 X2\r\n';
      service.writeStream('program.nc', Readable.from([contents]), {}, (err) => {
        if (err) {
          reject(err);
          return;
        }
        expect(fs.readFileSync(path.join(watchDirectory, 'program.nc'), 'utf8')).toEqual(contents);
        expect(tempFiles()).toEqual([]);
        resolve();
      });
    });
  });

  test('writes the file verbatim, without re-encoding line endings', () => {
    return new Promise((resolve, reject) => {
      const contents = Buffer.from('G0 X1\r\nG0 X2\r\n', 'utf8');
      service.writeStream('verbatim.nc', Readable.from([contents]), {}, (err) => {
        if (err) {
          reject(err);
          return;
        }
        expect(fs.readFileSync(path.join(watchDirectory, 'verbatim.nc'))).toEqual(contents);
        resolve();
      });
    });
  });

  test('strips directory components from the file name', () => {
    return new Promise((resolve, reject) => {
      service.writeStream('../../escaped.nc', Readable.from(['G0\r\n']), {}, (err) => {
        if (err) {
          reject(err);
          return;
        }
        expect(fs.existsSync(path.join(watchDirectory, 'escaped.nc'))).toBe(true);
        expect(fs.existsSync(path.resolve(watchDirectory, '..', '..', 'escaped.nc'))).toBe(false);
        resolve();
      });
    });
  });

  // A streamed body is not bounded by body-parser, so the limit is the only
  // thing standing between an authenticated caller and the disk filling up.
  test('refuses a body larger than maxFileSize, leaving nothing behind', () => {
    return new Promise((resolve) => {
      const chunk = Buffer.alloc(64 * 1024, 0x41);
      let sent = 0;
      const readable = new Readable({
        read() {
          sent += chunk.length;
          this.push(sent > 1024 * 1024 ? null : chunk);
        }
      });

      service.writeStream('too-big.nc', readable, { maxFileSize: 128 * 1024 }, (err) => {
        expect(err).toBeTruthy();
        expect(err.code).toEqual('ETOOLARGE');
        expect(fs.existsSync(path.join(watchDirectory, 'too-big.nc'))).toBe(false);
        expect(tempFiles()).toEqual([]);
        resolve();
      });
    });
  });

  test('accepts a body exactly at maxFileSize', () => {
    return new Promise((resolve, reject) => {
      const contents = Buffer.alloc(4096, 0x42);
      service.writeStream('exact.nc', Readable.from([contents]), { maxFileSize: contents.length }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        expect(fs.readFileSync(path.join(watchDirectory, 'exact.nc'))).toEqual(contents);
        resolve();
      });
    });
  });

  test('leaves no file behind when the source errors mid-stream', () => {
    return new Promise((resolve) => {
      const readable = new Readable({
        read() {
          this.push('G0 X1\r\n');
          this.destroy(new Error('boom'));
        }
      });
      service.writeStream('aborted.nc', readable, {}, (err) => {
        expect(err).toBeTruthy();
        expect(fs.existsSync(path.join(watchDirectory, 'aborted.nc'))).toBe(false);
        expect(tempFiles()).toEqual([]);
        resolve();
      });
    });
  });

  // A staging file is only safe while it belongs to this call. A name anyone
  // could predict (a pid and a timestamp, say) can be prepared in advance by
  // anything that can write inside the watch directory, and the prepared path
  // is the attack: a symbolic link there points outside it. Creating the staging
  // file exclusively is what turns that into a refusal instead of a write
  // outside the root.
  test('refuses a staging path that already exists, leaving it and what it points at alone', async () => {
    const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-outside-'));
    const sentinel = path.join(outsideDirectory, 'victim.txt');
    const stagingPath = path.join(watchDirectory, `.victim.nc.${STAGING_HEX}.tmp`);
    const randomBytes = jest.spyOn(crypto, 'randomBytes')
      .mockImplementation(() => Buffer.from(STAGING_HEX, 'hex'));

    fs.writeFileSync(sentinel, 'original contents\n');
    fs.symlinkSync(sentinel, stagingPath);

    try {
      const err = await new Promise((resolve) => {
        service.writeStream('victim.nc', Readable.from(['G0 X1\r\n']), {}, resolve);
      });

      expect(err).toBeTruthy();
      expect(err.code).toEqual('EEXIST');
      expect(fs.lstatSync(stagingPath).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(sentinel, 'utf8')).toEqual('original contents\n');
      expect(fs.readdirSync(outsideDirectory)).toEqual(['victim.txt']);
      // No target under the requested name, and the planted link is the only
      // thing left in the watch directory.
      expect(fs.readdirSync(watchDirectory)).toEqual([path.basename(stagingPath)]);
    } finally {
      randomBytes.mockRestore();
      fs.rmSync(outsideDirectory, { recursive: true, force: true });
    }
  });
});
