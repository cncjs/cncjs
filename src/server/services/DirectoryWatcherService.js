import chalk from 'chalk';
import events from 'events';
import fs from 'fs';
import path from 'path';
import watch from 'watch';
import logger from '../lib/logger';

const log = logger('directory-watcher-service');

// Errors carry a `code` so the API layer can map them to a status without
// matching on message text.
const failure = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

// Resolve a name to a path inside the watch directory, or null if it does not
// name a file directly inside it.
//
// `writeFile()` strips directory components with `path.basename()`, which is
// right when creating a file: the caller gets the file they asked for, in the
// only directory this service writes to. Renaming and deleting must refuse
// instead, because the same silent correction would act on a *different*
// existing file than the caller named — `../../program.nc` becoming
// `program.nc` deletes the wrong file rather than failing.
const resolveInRoot = (root, name) => {
  if (!name || typeof name !== 'string' || name !== path.basename(name)) {
    return null;
  }

  const base = path.resolve(root);
  const resolved = path.resolve(base, name);
  if (path.dirname(resolved) !== base) {
    return null;
  }

  return resolved;
};

// Filesystems that support ordinary reads, writes and deletes but no hard
// links — FAT32 and exFAT removable media, some network mounts — reject
// `link()` outright. A watch directory on a USB stick is an ordinary setup, so
// rename falls back rather than failing on those.
const NO_HARDLINK_SUPPORT = ['EPERM', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EXDEV'];

class DirectoryWatcherService extends events.EventEmitter {
  constructor() {
    super();
    this.root = '';
    this.monitor = null;
    this.files = {};
  }

  watch(root) {
    watch.createMonitor(root, (monitor) => {
      this.unwatch();
      this.root = root;
      this.monitor = monitor;
      this.files = { ...monitor.files };

      monitor.on('created', (f, stat) => {
        log.trace(`New file has been created (${chalk.yellow(JSON.stringify(f))}).`);
        this.files[f] = stat;
        this.emit('change', { file: f });
      });

      monitor.on('removed', (f, stat) => {
        log.trace(`A file has been moved or deleted (${chalk.yellow(JSON.stringify(f))}).`);
        delete this.files[f];
        this.emit('change', { file: f });
      });

      monitor.on('changed', (f, curr, prev) => {
        log.trace(`A file has been changed (${chalk.yellow(JSON.stringify(f))}).`);
        this.files[f] = curr;
        this.emit('change', { file: f });
      });
    });
  }

  unwatch() {
    if (this.monitor) {
      this.monitor.stop(); // Stop watching
      this.monitor = null;
    }
    this.files = {};
  }

  isConfigured() {
    return !!this.root;
  }

  readFile(file, callback) {
    if (!this.root) {
      callback(new Error('Watch directory is not configured'));
      return;
    }

    const root = path.resolve(this.root);
    const filepath = path.resolve(root, file);
    if (filepath !== root && !filepath.startsWith(root + path.sep)) {
      callback(new Error('Invalid file path'));
      return;
    }

    fs.readFile(filepath, 'utf8', callback);
  }

  writeFile(file, data, callback) {
    if (!this.root) {
      callback(new Error('Watch directory is not configured'));
      return;
    }

    const filepath = path.join(this.root, path.basename(file));
    fs.writeFile(filepath, data, 'utf8', callback);
  }

  // Claim `toPath` for `fromPath`'s contents without overwriting anything.
  //
  // `fs.link()` is preferred because it fails with EEXIST *atomically*: a
  // stat-then-rename check cannot, since the target may appear in between.
  // Where hard links are unsupported, `copyFile()` with COPYFILE_EXCL still
  // refuses to overwrite, though the check and the write are no longer one
  // operation.
  claimName(fromPath, toPath, callback) {
    fs.link(fromPath, toPath, (linkErr) => {
      if (!linkErr) {
        callback(null);
        return;
      }
      if (linkErr.code === 'EEXIST') {
        callback(failure('EEXIST', 'Target file already exists'));
        return;
      }
      if (NO_HARDLINK_SUPPORT.indexOf(linkErr.code) < 0) {
        callback(linkErr);
        return;
      }
      fs.copyFile(fromPath, toPath, fs.constants.COPYFILE_EXCL, (copyErr) => {
        if (copyErr) {
          callback(copyErr.code === 'EEXIST'
            ? failure('EEXIST', 'Target file already exists')
            : copyErr);
          return;
        }
        callback(null);
      });
    });
  }

  renameFile(file, to, callback) {
    this.statFileInRoot(file, (err, fromPath) => {
      if (err) {
        callback(err);
        return;
      }

      const toPath = resolveInRoot(this.root, to);
      if (!toPath) {
        callback(failure('EINVALIDNAME', 'Invalid file name'));
        return;
      }
      if (toPath === fromPath) {
        callback(null);
        return;
      }

      // Unlike writing, this must not overwrite: `fs.rename()` would silently
      // replace an existing target, destroying a program the caller never
      // named. The new name is claimed first, and the original removed only
      // once that has succeeded.
      this.claimName(fromPath, toPath, (claimErr) => {
        if (claimErr) {
          callback(claimErr);
          return;
        }
        fs.unlink(fromPath, (unlinkErr) => {
          if (!unlinkErr) {
            callback(null);
            return;
          }
          // The new name exists but the old one could not be removed. Give the
          // new name back so the directory is left as it was found.
          fs.unlink(toPath, (rollbackErr) => {
            if (rollbackErr) {
              // Both removals failed, so both names now refer to the file and
              // the caller must be told rather than shown the original error.
              callback(failure('EPARTIAL',
                `Renamed to ${path.basename(toPath)} but ${path.basename(fromPath)} could not be removed; both names now exist`));
              return;
            }
            callback(unlinkErr);
          });
        });
      });
    });
  }

  deleteFile(file, callback) {
    this.statFileInRoot(file, (err, target) => {
      if (err) {
        callback(err);
        return;
      }
      fs.unlink(target, (unlinkErr) => {
        callback(unlinkErr || null);
      });
    });
  }

  statFileInRoot(name, callback) {
    if (!this.root) {
      callback(failure('ENOTCONFIGURED', 'Watch directory is not configured'));
      return;
    }

    const target = resolveInRoot(this.root, name);
    if (!target) {
      callback(failure('EINVALIDNAME', 'Invalid file name'));
      return;
    }

    // `lstat()` rather than `stat()`: `stat()` follows symbolic links, so a
    // symlink pointing at a regular file would satisfy `isFile()` and be
    // accepted — which is the wrong answer for an operation meant to act on
    // plain files in this directory, and lets a link stand in for a file
    // somewhere else entirely.
    fs.lstat(target, (err, stats) => {
      if (err) {
        callback(err.code === 'ENOENT' ? failure('ENOENT', 'File not found') : err);
        return;
      }
      if (!stats.isFile()) {
        callback(failure('ENOTFILE', 'Not a file'));
        return;
      }
      callback(null, target);
    });
  }
}

export default DirectoryWatcherService;
