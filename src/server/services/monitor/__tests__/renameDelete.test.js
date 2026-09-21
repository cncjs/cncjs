/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';
import monitor from '../index';

describe('monitor.renameFile / monitor.deleteFile', () => {
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

  const write = (name, contents = 'G0 X1\r\n') => {
    fs.writeFileSync(path.join(watchDirectory, name), contents);
  };
  const exists = (name) => fs.existsSync(path.join(watchDirectory, name));
  const read = (name) => fs.readFileSync(path.join(watchDirectory, name), 'utf8');
  const rename = (from, to) => new Promise((resolve) => {
    monitor.renameFile(from, to, resolve);
  });
  const remove = (name) => new Promise((resolve) => {
    monitor.deleteFile(name, resolve);
  });

  test('renames a file, keeping its contents', async () => {
    write('before.nc', 'G0 X1\r\nG0 X2\r\n');
    expect(await rename('before.nc', 'after.nc')).toBeFalsy();
    expect(exists('before.nc')).toBe(false);
    expect(read('after.nc')).toEqual('G0 X1\r\nG0 X2\r\n');
  });

  test('refuses to overwrite an existing target, leaving both files alone', async () => {
    write('source.nc', 'source\r\n');
    write('target.nc', 'target\r\n');
    const err = await rename('source.nc', 'target.nc');
    expect(err).toBeTruthy();
    expect(err.code).toEqual('EEXIST');
    expect(read('source.nc')).toEqual('source\r\n');
    expect(read('target.nc')).toEqual('target\r\n');
  });

  test('reports a missing source as ENOENT', async () => {
    const err = await rename('nothing-here.nc', 'somewhere.nc');
    expect(err).toBeTruthy();
    expect(err.code).toEqual('ENOENT');
  });

  test('deletes a file', async () => {
    write('doomed.nc');
    expect(await remove('doomed.nc')).toBeFalsy();
    expect(exists('doomed.nc')).toBe(false);
  });

  test('reports deleting a missing file as ENOENT', async () => {
    const err = await remove('never-existed.nc');
    expect(err).toBeTruthy();
    expect(err.code).toEqual('ENOENT');
  });

  test('refuses a directory rather than removing it', async () => {
    fs.mkdirSync(path.join(watchDirectory, 'a-directory'), { recursive: true });
    const err = await remove('a-directory');
    expect(err).toBeTruthy();
    expect(err.code).toEqual('ENOTFILE');
    expect(exists('a-directory')).toBe(true);
  });

  // The important one: unlike writeFile(), which strips directory components,
  // these refuse. Silently correcting `../x.nc` to `x.nc` would delete a real
  // file the caller never named.
  test('refuses a name with directory components instead of stripping it', async () => {
    write('victim.nc', 'do not delete me\r\n');

    const deleteErr = await remove(path.join('..', 'victim.nc'));
    expect(deleteErr).toBeTruthy();
    expect(deleteErr.code).toEqual('EINVALIDNAME');
    expect(read('victim.nc')).toEqual('do not delete me\r\n');

    const renameErr = await rename(path.join('..', 'victim.nc'), 'moved.nc');
    expect(renameErr).toBeTruthy();
    expect(renameErr.code).toEqual('EINVALIDNAME');
    expect(exists('moved.nc')).toBe(false);

    const targetErr = await rename('victim.nc', path.join('..', 'escaped.nc'));
    expect(targetErr).toBeTruthy();
    expect(targetErr.code).toEqual('EINVALIDNAME');
    expect(fs.existsSync(path.resolve(watchDirectory, '..', 'escaped.nc'))).toBe(false);
    expect(read('victim.nc')).toEqual('do not delete me\r\n');
  });

  // stat() follows symlinks, so a link to a regular file would satisfy
  // isFile() and be acted on — including a link whose target lives outside the
  // watch directory. lstat() sees the link itself.
  test('refuses a symlink rather than following it', async () => {
    const outside = path.join(watchDirectory, '..', `cncjs-outside-${process.pid}.nc`);
    fs.writeFileSync(outside, 'outside the watch directory\r\n');
    write('real.nc', 'inside\r\n');
    fs.symlinkSync(outside, path.join(watchDirectory, 'link-out.nc'));
    fs.symlinkSync(path.join(watchDirectory, 'real.nc'), path.join(watchDirectory, 'link-in.nc'));

    try {
      const outErr = await remove('link-out.nc');
      expect(outErr).toBeTruthy();
      expect(outErr.code).toEqual('ENOTFILE');
      expect(fs.existsSync(outside)).toBe(true);

      const inErr = await remove('link-in.nc');
      expect(inErr).toBeTruthy();
      expect(inErr.code).toEqual('ENOTFILE');
      expect(read('real.nc')).toEqual('inside\r\n');

      const renameErr = await rename('link-out.nc', 'moved.nc');
      expect(renameErr).toBeTruthy();
      expect(renameErr.code).toEqual('ENOTFILE');
      expect(exists('moved.nc')).toBe(false);
    } finally {
      fs.unlinkSync(path.join(watchDirectory, 'link-out.nc'));
      fs.unlinkSync(path.join(watchDirectory, 'link-in.nc'));
      fs.unlinkSync(outside);
    }
  });

  // FAT32/exFAT media and some network mounts reject link() outright; rename
  // falls back to an exclusive copy there.
  test('renames without hard-link support, still refusing to overwrite', async () => {
    const unsupported = () => {
      const err = new Error('operation not permitted');
      err.code = 'EPERM';
      return err;
    };
    const spy = jest.spyOn(fs, 'link').mockImplementation((from, to, cb) => {
      process.nextTick(() => cb(unsupported()));
    });

    try {
      write('fat-source.nc', 'payload\r\n');
      expect(await rename('fat-source.nc', 'fat-target.nc')).toBeFalsy();
      expect(exists('fat-source.nc')).toBe(false);
      expect(read('fat-target.nc')).toEqual('payload\r\n');

      // the no-clobber guarantee has to survive the fallback
      write('fat-second.nc', 'second\r\n');
      const err = await rename('fat-second.nc', 'fat-target.nc');
      expect(err).toBeTruthy();
      expect(err.code).toEqual('EEXIST');
      expect(read('fat-second.nc')).toEqual('second\r\n');
      expect(read('fat-target.nc')).toEqual('payload\r\n');
    } finally {
      spy.mockRestore();
    }
  });

  test('reports a rename that left both names behind', async () => {
    write('stuck.nc', 'stuck\r\n');
    const spy = jest.spyOn(fs, 'unlink').mockImplementation((target, cb) => {
      const err = new Error('operation not permitted');
      err.code = 'EPERM';
      process.nextTick(() => cb(err));
    });

    let err;
    try {
      err = await rename('stuck.nc', 'stuck-renamed.nc');
    } finally {
      spy.mockRestore();
    }

    expect(err).toBeTruthy();
    expect(err.code).toEqual('EPARTIAL');
    expect(err.message).toMatch(/both names now exist/);
    // and the claim really did leave both on disk, which is what the error says
    expect(exists('stuck.nc')).toBe(true);
    expect(exists('stuck-renamed.nc')).toBe(true);
  });

  test('refuses an empty name', async () => {
    const err = await remove('');
    expect(err).toBeTruthy();
    expect(err.code).toEqual('EINVALIDNAME');
  });
});
