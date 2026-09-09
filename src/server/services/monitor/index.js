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
  on,
  removeListener
};
