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

// Stream a readable (e.g. a request body) into the watch directory without
// holding the whole file in memory. Writes to a temporary name first and
// renames into place on completion, so a partially written file never appears
// under its final name inside the watched directory.
const writeStream = (file, readable, callback) => {
  const root = monitor.root;

  if (!root) {
    callback(new Error('Watch directory is not configured'));
    return;
  }

  // Strip any directory components to prevent writing outside of the watched directory
  const filename = path.basename(file);
  const target = path.join(root, filename);
  const temp = path.join(root, `.${filename}.${process.pid}.${Date.now()}.tmp`);
  const ws = fs.createWriteStream(temp);

  let settled = false;
  const fail = (err) => {
    if (settled) {
      return;
    }
    settled = true;
    readable.unpipe(ws);
    ws.destroy();
    fs.unlink(temp, () => {
      callback(err);
    });
  };

  ws.on('error', fail);
  readable.on('error', fail);
  readable.on('aborted', () => {
    fail(new Error('Upload aborted'));
  });
  readable.on('close', () => {
    if (!settled && !readable.readableEnded) {
      fail(new Error('Upload aborted'));
    }
  });

  ws.on('finish', () => {
    if (settled) {
      fs.unlink(temp, () => {});
      return;
    }
    fs.rename(temp, target, (err) => {
      if (err) {
        fail(err);
        return;
      }
      settled = true;
      callback(null);
    });
  });

  readable.pipe(ws);
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
  on,
  removeListener
};
