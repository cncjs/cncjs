import chalk from 'chalk';
import events from 'events';
import fs from 'fs';
import path from 'path';
import watch from 'watch';
import logger from '../lib/logger';

const log = logger('directory-watcher-service');

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
}

export default DirectoryWatcherService;
