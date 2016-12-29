import events from 'events';
import fs from 'fs';
import chokidar from 'chokidar';
import _ from 'lodash';
import chalk from 'chalk';
import parseJSON from 'parse-json';
import log from '../../lib/log';

const PREFIX = '[configstore]';

const defaultState = { // default state
    checkForUpdates: true
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

        if (this.watcher) {
            // Stop watching for changes
            this.watcher.close();
            this.watcher = null;
        }

        this.watcher = chokidar.watch(this.file);
        this.watcher
            .on('add', (path) => {
                log.debug(`${PREFIX} "${path}" has been added`);
                const ok = this.reload();
                ok && this.emit('change'); // it is ok to emit change event
            })
            .on('change', (path) => {
                log.debug(`${PREFIX} "${path}" has been changed`);
                const ok = this.reload();
                ok && this.emit('change'); // it is ok to emit change event
            })
            .on('unlink', (path) => {
                log.debug(`${PREFIX} "${path}" has been removed`);
            })
            .on('error', (error) => {
                log.error(`${PREFIX} Watcher error: ${error}`);
            });

        return this.config;
    }
    reload() {
        try {
            if (fs.existsSync(this.file)) {
                const content = fs.readFileSync(this.file, 'utf8');
                this.config = parseJSON(content);
            }
        } catch (err) {
            err.fileName = this.file;
            log.error(`${PREFIX} Unable to load data from "${this.file}"`);
            console.error(chalk.red(err));
            return false;
        }

        if (!_.isPlainObject(this.config)) {
            log.error(`${PREFIX} "${this.file}" does not contain valid JSON`);
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
            log.error(`${PREFIX} Unable to write data to "${this.file}"`);
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
    set(key, value) {
        if (key === undefined) {
            return;
        }

        const ok = this.reload(); // reload before making changes
        _.set(this.config, key, value);
        ok && this.sync(); // it is ok to write
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
