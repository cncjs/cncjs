import chalk from 'chalk';
import crypto from 'crypto';
import events from 'events';
import fs from 'fs';
import path from 'path';
import { pipeline, Readable, Transform } from 'stream';
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

// Fail the stream once more than `maxFileSize` bytes have passed through.
// Counting here rather than trusting Content-Length means a body that lies
// about its length, or sends none at all, is still bounded.
const createLimitStream = (maxFileSize) => {
  let size = 0;

  return new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;

      if (size > maxFileSize) {
        const err = new Error('Payload too large');
        err.code = 'ETOOLARGE';
        callback(err);
        return;
      }

      callback(null, chunk);
    }
  });
};

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

  // Written through the same staging mechanism as an upload, not written
  // straight to the destination name.
  //
  // `fs.writeFile()` opens the destination, so a destination that is a symbolic
  // link is followed, and a destination that is a hard link shares its inode
  // with a file outside the watch directory — either way the bytes land in a
  // file the caller never named. Staging inside the root and renaming into
  // place replaces only the directory entry inside the root.
  writeFile(file, data, callback) {
    if (!this.root) {
      callback(new Error('Watch directory is not configured'));
      return;
    }

    this.writeStream(file, Readable.from([data]), {}, callback);
  }

  // Stream a readable (e.g. a request body) into the watch directory without
  // holding the whole file in memory. Writes to a temporary name first and
  // renames into place on completion, so a partially written file never appears
  // under its final name inside the watched directory.
  //
  // `pipeline()` owns the lifecycle: it propagates errors in either direction,
  // applies backpressure, destroys every participating stream when one fails,
  // and reports a client that disconnects mid-upload as a premature close. The
  // temporary file is removed on any of those, so a failed or abandoned upload
  // leaves nothing behind.
  writeStream(file, readable, options, callback) {
    const { maxFileSize = Infinity } = options ?? {};

    if (!this.root) {
      callback(new Error('Watch directory is not configured'));
      return;
    }

    // Strip any directory components to prevent writing outside of the watched directory
    const filename = path.basename(file);
    const target = path.join(this.root, filename);
    // The staging name is unguessable, and it is claimed exclusively. A name
    // built from the pid and the clock can be prepared in advance by anything
    // that can write into the watch directory — a symbolic link at that path
    // would send this upload outside the root. `open(..., 'wx')` refuses to
    // claim a path that already exists, so a pre-planted path is left alone and
    // the upload fails instead.
    const temp = path.join(this.root, `.${filename}.${crypto.randomBytes(16).toString('hex')}.tmp`);

    fs.open(temp, 'wx', 0o666, (openErr, fd) => {
      if (openErr) {
        callback(openErr);
        return;
      }

      pipeline(
        readable,
        createLimitStream(maxFileSize),
        fs.createWriteStream(temp, { fd, autoClose: true }),
        (err) => {
          // `pipeline()` closes every stream it opened before reporting a
          // failure, so the staging file below is no longer being written to,
          // and it is the only file this call created. The target keeps the
          // contents it already had.
          if (err) {
            fs.unlink(temp, () => {
              callback(err);
            });
            return;
          }

          fs.rename(temp, target, (renameErr) => {
            if (renameErr) {
              fs.unlink(temp, () => {
                callback(renameErr);
              });
              return;
            }

            callback(null);
          });
        }
      );
    });
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
