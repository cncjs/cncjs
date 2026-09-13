/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';
import DirectoryWatcherService from '../DirectoryWatcherService';

describe('DirectoryWatcherService', () => {
  let root;
  let service;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-watch-'));
    service = new DirectoryWatcherService();
    service.root = root;
  });

  afterEach(() => {
    service.unwatch();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('reports configuration and reads files from the watch root', async () => {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'nested', 'existing.nc'), 'G0 X1', 'utf8');

    expect(service.getStatus()).toEqual({ configured: true, root });
    await expect(new Promise((resolve, reject) => {
      service.readFile('nested/existing.nc', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    })).resolves.toEqual('G0 X1');
  });

  test('writes only the file basename inside the watch root', async () => {
    await expect(new Promise((resolve, reject) => {
      service.writeFile('../uploaded.nc', 'G1 X2', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    })).resolves.toBeUndefined();

    expect(fs.readFileSync(path.join(root, 'uploaded.nc'), 'utf8')).toEqual('G1 X2');
    expect(fs.existsSync(path.join(path.dirname(root), 'uploaded.nc'))).toEqual(false);
  });

  test('returns an error when the watch root is not configured', () => {
    service.root = '';

    expect(() => service.writeFile('file.nc', 'G0', () => {})).not.toThrow();
    service.writeFile('file.nc', 'G0', (err) => {
      expect(err.message).toEqual('Watch directory is not configured');
    });
  });
});
