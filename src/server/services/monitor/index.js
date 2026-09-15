import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
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

  fs.stat(target, (err, stats) => {
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

// Rename a file within the watch directory.
//
// Unlike writing, this must not overwrite. `fs.rename()` would silently
// replace an existing target, destroying a program the caller never named, so
// the new name is claimed with `fs.link()` first: it fails with EEXIST if the
// name is taken, and does so atomically, which a stat-then-rename check cannot.
// The original is unlinked only once the new name is safely in place.
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

    fs.link(fromPath, toPath, (linkErr) => {
      if (linkErr) {
        callback(linkErr.code === 'EEXIST'
          ? failure('EEXIST', 'Target file already exists')
          : linkErr);
        return;
      }
      fs.unlink(fromPath, (unlinkErr) => {
        if (unlinkErr) {
          // The new name exists but the old one could not be removed; take the
          // new name back so the rename is all-or-nothing.
          fs.unlink(toPath, () => {
            callback(unlinkErr);
          });
          return;
        }
        callback(null);
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
  renameFile,
  deleteFile,
  on,
  removeListener
};
