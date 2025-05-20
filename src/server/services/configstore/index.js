import events from 'events';
import fs from 'fs';
import _ from 'lodash';
import chalk from 'chalk';
import logger from '../../lib/logger';
import x from '../../lib/json-stringify';

const log = logger('service:configstore');

const defaultState = { // default state
  allowAnonymousUsageDataCollection: false,
  checkForUpdates: true,
  controller: {
    exception: {
      ignoreErrors: false
    }
  }
};

class ConfigStore extends events.EventEmitter {
    file = '';

    config = {};

    watcher = null;

    // @param {string} file The path to a filename.
    // @return {object} The config object.
    load(file) {
      this.file = file;
      this.reload();
      this.emit('load', this.config); // emit load event

      if (this.watcher) {
        // Stop watching for changes
        this.watcher.close();
        this.watcher = null;
      }

      try {
        if (!fs.existsSync(this.file)) {
          const content = JSON.stringify({});
          fs.writeFileSync(this.file, content, 'utf8');
        }

        this.watcher = fs.watchFile(this.file, (curr, prev) => {
          log.debug(`fs.watchFile(curr=${x(curr)}, prev=${x(prev)})`);

          if (curr?.mtimeMs !== prev?.mtimeMs) {
            log.info(`"${this.file}" has been changed`);
            const ok = this.reload();
            ok && this.emit('change', this.config); // it is ok to emit change event
          }
        });
      } catch (err) {
        log.error(err);
        this.emit('error', err); // emit error event
      }

      return this.config;
    }

    reload() {
      try {
        if (fs.existsSync(this.file)) {
          this.config = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        }
      } catch (err) {
        err.fileName = this.file;
        log.error(`Unable to load data from ${chalk.yellow(JSON.stringify(this.file))}: err=${err}`);
        this.emit('error', err); // emit error event
        return false;
      }

      if (!_.isPlainObject(this.config)) {
        log.error(`"${this.file}" does not contain valid JSON`);
        this.config = {};
      }

      this.config.state = {
        ...defaultState,
        ...this.config.state
      };

      return true;
    }

    sync() {
      try {
        const content = JSON.stringify(this.config, null, 4);
        fs.writeFileSync(this.file, content, 'utf8');
      } catch (err) {
        log.error(`Unable to write data to "${this.file}"`);
        this.emit('error', err); // emit error event
        return false;
      }

      return true;
    }

    has(key) {
      return _.has(this.config, key);
    }

    get(key, defaultValue) {
      if (!this.config) {
        this.reload();
      }

      return (key !== undefined)
        ? _.get(this.config, key, defaultValue)
        : this.config;
    }

    set(key, value, options) {
      const { silent = false } = { ...options };

      if (key === undefined) {
        return;
      }

      const ok = this.reload(); // reload before making changes
      _.set(this.config, key, value);
      ok && !silent && this.sync(); // it is ok to write
    }

    unset(key) {
      if (key === undefined) {
        return;
      }

      const ok = this.reload(); // reload before making changes
      _.unset(this.config, key);
      ok && this.sync(); // it is ok to write
    }
}

const configstore = new ConfigStore();

export default configstore;
