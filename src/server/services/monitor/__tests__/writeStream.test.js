/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import monitor from '../index';

describe('monitor.writeStream', () => {
  let watchDirectory;

  // FSMonitor.watch() assigns its root asynchronously, from the callback
  // watch.createMonitor() invokes, so wait until the monitor reports itself
  // configured before exercising it.
  beforeAll(() => {
    watchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-watch-'));
    monitor.start({ watchDirectory });

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 2000;
      const poll = () => {
        if (monitor.isConfigured()) {
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('monitor did not become configured'));
          return;
        }
        setTimeout(poll, 20);
      };
      poll();
    });
  });

  afterAll(() => {
    monitor.stop();
    fs.rmSync(watchDirectory, { recursive: true, force: true });
  });

  const tempFiles = () => fs.readdirSync(watchDirectory).filter(name => name.endsWith('.tmp'));

  test('streams a readable into the watch directory', () => {
    return new Promise((resolve, reject) => {
      const contents = 'G0 X1\r\nG0 X2\r\n';
      monitor.writeStream('program.nc', Readable.from([contents]), (err) => {
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
      monitor.writeStream('verbatim.nc', Readable.from([contents]), (err) => {
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
      monitor.writeStream('../../escaped.nc', Readable.from(['G0\r\n']), (err) => {
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

  test('leaves no file behind when the source errors mid-stream', () => {
    return new Promise((resolve) => {
      const readable = new Readable({
        read() {
          this.push('G0 X1\r\n');
          this.destroy(new Error('boom'));
        }
      });
      monitor.writeStream('aborted.nc', readable, (err) => {
        expect(err).toBeTruthy();
        expect(fs.existsSync(path.join(watchDirectory, 'aborted.nc'))).toBe(false);
        expect(tempFiles()).toEqual([]);
        resolve();
      });
    });
  });
});
