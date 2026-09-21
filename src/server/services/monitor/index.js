import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { pipeline, Transform } from 'stream';
import minimatch from 'minimatch';
import FSMonitor from './FSMonitor';

const monitor = new FSMonitor();

const emitter = new EventEmitter();

const start = ({ watchDirectory }) => {
  monitor.watch(watchDirectory);

  monitor.on('created', (file) => {
    emitter.emit('change', { file });
  });
  monitor.on('changed', (file) => {
    emitter.emit('change', { file });
  });
  monitor.on('removed', (file) => {
    emitter.emit('change', { file });
  });
};

const stop = () => {
  monitor.unwatch();
};

const isConfigured = () => Boolean(monitor.root);

const getFiles = (searchPath) => {
  const root = path.normalize(monitor.root);
  const files = Object.keys(monitor.files);
  const pattern = path.join(root, searchPath, '*');

  if (!root || pattern.indexOf(root) !== 0) {
    return [];
  }

  return minimatch
    .match(files, pattern, { matchBase: true })
    .map(file => {
      const stat = monitor.files[file] || {};

      return {
        name: path.basename(file),
        type: (function() {
          if (stat.isFile()) {
            return 'f';
          }
          if (stat.isDirectory()) {
            return 'd';
          }
          if (stat.isBlockDevice()) {
            return 'b';
          }
          if (stat.isCharacterDevice()) {
            return 'c';
          }
          if (stat.isSymbolicLink()) {
            return 'l';
          }
          if (stat.isFIFO()) {
            return 'p';
          }
          if (stat.isSocket()) {
            return 's';
          }
          return '';
        }()),
        size: stat.size,
        atime: stat.atime,
        mtime: stat.mtime,
        ctime: stat.ctime
      };
    });
};

const readFile = (file, callback) => {
  const root = monitor.root;
  file = path.join(root, file);

  fs.readFile(file, 'utf8', callback);
};

const writeFile = (file, data, callback) => {
  const root = monitor.root;

  if (!root) {
    callback(new Error('Watch directory is not configured'));
    return;
  }

  // Strip any directory components to prevent writing outside of the watched directory
  const filename = path.basename(file);
  const target = path.join(root, filename);

  fs.writeFile(target, data, 'utf8', callback);
};

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

// Stat a name inside the watch directory, rejecting anything that is not a
// plain file. Shared by rename and delete so both refuse directories the same
// way.
//
// `lstat()` rather than `stat()`: `stat()` follows symbolic links, so a symlink
// pointing at a regular file would satisfy `isFile()` and be accepted — which
// is the wrong answer for an operation meant to act on plain files in this
// directory, and lets a link stand in for a file somewhere else entirely.
const statFileInRoot = (name, callback) => {
  const root = monitor.root;

  if (!root) {
    callback(failure('ENOTCONFIGURED', 'Watch directory is not configured'));
    return;
  }

  const target = resolveInRoot(root, name);
  if (!target) {
    callback(failure('EINVALIDNAME', 'Invalid file name'));
    return;
  }

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
};

// Filesystems that support ordinary reads, writes and deletes but no hard
// links — FAT32 and exFAT removable media, some network mounts — reject
// `link()` outright. A watch directory on a USB stick is an ordinary setup, so
// rename falls back rather than failing on those.
const NO_HARDLINK_SUPPORT = ['EPERM', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EXDEV'];

// Claim `toPath` for `fromPath`'s contents without overwriting anything.
//
// `fs.link()` is preferred because it fails with EEXIST *atomically*: a
// stat-then-rename check cannot, since the target may appear in between.
// Where hard links are unsupported, `copyFile()` with COPYFILE_EXCL still
// refuses to overwrite, though the check and the write are no longer one
// operation.
const claimName = (fromPath, toPath, callback) => {
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
};

// Rename a file within the watch directory.
//
// Unlike writing, this must not overwrite: `fs.rename()` would silently
// replace an existing target, destroying a program the caller never named. The
// new name is claimed first (see `claimName`), and the original removed only
// once that has succeeded.
const renameFile = (file, to, callback) => {
  statFileInRoot(file, (err, fromPath) => {
    if (err) {
      callback(err);
      return;
    }

    const toPath = resolveInRoot(monitor.root, to);
    if (!toPath) {
      callback(failure('EINVALIDNAME', 'Invalid file name'));
      return;
    }
    if (toPath === fromPath) {
      callback(null);
      return;
    }

    claimName(fromPath, toPath, (claimErr) => {
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
};

// Delete a file within the watch directory. Files only — a directory is
// refused rather than removed.
const deleteFile = (file, callback) => {
  statFileInRoot(file, (err, target) => {
    if (err) {
      callback(err);
      return;
    }
    fs.unlink(target, (unlinkErr) => {
      callback(unlinkErr || null);
    });
  });
};

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
const writeStream = (file, readable, { maxFileSize = Infinity } = {}, callback) => {
  const root = monitor.root;

  if (!root) {
    callback(new Error('Watch directory is not configured'));
    return;
  }

  // Strip any directory components to prevent writing outside of the watched directory
  const filename = path.basename(file);
  const target = path.join(root, filename);
  const temp = path.join(root, `.${filename}.${process.pid}.${Date.now()}.tmp`);

  pipeline(
    readable,
    createLimitStream(maxFileSize),
    fs.createWriteStream(temp),
    (err) => {
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
};

const on = (...args) => {
  emitter.on(...args);
};

const removeListener = (...args) => {
  emitter.removeListener(...args);
};

export default {
  start,
  stop,
  isConfigured,
  getFiles,
  readFile,
  writeFile,
  writeStream,
  renameFile,
  deleteFile,
  on,
  removeListener
};
