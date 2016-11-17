import fs from 'fs';
import chalk from 'chalk';
import isPlainObject from 'lodash/isPlainObject';

export const readConfigFileSync = (file) => {
    let config = {};
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            config = JSON.parse(content);
        }
    } catch (err) {
        const msg = chalk.bold.red(`Unable to read configuration settings from ${JSON.stringify(file)}:`);
        console.error(msg);
        console.error(err);
    }

    if (!isPlainObject(config)) {
        console.error(chalk.bold.red(`${JSON.stringify(file)} does not contain valid JSON`));
        config = {};
    }

    return config;
};

export const writeConfigFileSync = (file, config = {}) => {
    try {
        const content = (typeof config !== 'string') ? JSON.stringify(config, null, 4) : config;
        fs.writeFileSync(file, content);
    } catch (err) {
        const msg = chalk.bold.red(`Unable to write configuration settings to ${JSON.stringify(file)}:`);
        console.error(msg);
        console.error(err);
    }
};
