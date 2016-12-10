import _ from 'lodash';
import { readConfigFileSync, writeConfigFileSync } from './config-file';

const defaultState = { // default state
    checkForUpdates: true
};

class ConfigStore {
    file = '';
    config = null;

    // @param {string} file The path to a filename.
    // @return {object} The config object.
    load(file) {
        this.file = file;
        this.reload();

        return this.config;
    }
    reload() {
        this.config = readConfigFileSync(this.file);
        this.config.state = {
            ...defaultState,
            ...this.config.state
        };
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

        this.reload(); // reload before update

        _.set(this.config, key, value);
        writeConfigFileSync(this.file, this.config);
    }
    unset(key) {
        if (key === undefined) {
            return;
        }

        this.reload(); // reload before update

        _.unset(this.config, key);
        writeConfigFileSync(this.file, this.config);
    }
}

const configstore = new ConfigStore();

export default configstore;
