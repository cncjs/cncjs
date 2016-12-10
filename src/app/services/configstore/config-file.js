import fs from 'fs';
import isPlainObject from 'lodash/isPlainObject';
import log from '../../lib/log';

export const readConfigFileSync = (file) => {
    let config = {};
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            config = JSON.parse(content);
        }
    } catch (err) {
        log.error(`Unable to read configuration settings from ${JSON.stringify(file)}.`);
    }

    if (!isPlainObject(config)) {
        log.error(`${JSON.stringify(file)} does not contain valid JSON.`);
        config = {};
    }

    return config;
};

export const writeConfigFileSync = (file, config = {}) => {
    try {
        const content = (typeof config !== 'string') ? JSON.stringify(config, null, 4) : config;
        fs.writeFileSync(file, content);
    } catch (err) {
        log.error(`Unable to write configuration settings to ${JSON.stringify(file)}.`);
    }
};
