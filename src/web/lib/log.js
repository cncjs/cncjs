import browser from 'detect-browser';
import includes from 'lodash/includes';
import logger from 'universal-logger';
import { styleable } from 'universal-logger-browser';

const log = logger()
    .use(styleable({
        colorized: browser && !includes(['ie', 'edge'], browser.name),
        showSource: true,
        showTimestamp: true
    }));

log.enableStackTrace();

export default log;
