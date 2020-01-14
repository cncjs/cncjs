import * as chalk from 'chalk';
import watch from 'watch';
import logger from '../lib/logger';

const log = logger('directory-watcher-service');

class DirectoryWatcherService {
    root = '';

    monitor = null;

    files = {};

    watch(root) {
        watch.createMonitor(root, (monitor) => {
            this.unwatch();
            this.root = root;
            this.monitor = monitor;
            this.files = { ...monitor.files };

            monitor.on('created', (f, stat) => {
                log.trace(`New file has been created (${chalk.yellow(JSON.stringify(f))}).`);
                this.files[f] = stat;
            });

            monitor.on('removed', (f, stat) => {
                log.trace(`A file has been moved or deleted (${chalk.yellow(JSON.stringify(f))}).`);
                delete this.files[f];
            });

            monitor.on('changed', (f, curr, prev) => {
                log.trace(`A file has been changed (${chalk.yellow(JSON.stringify(f))}).`);
                this.files[f] = curr;
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
}

export default DirectoryWatcherService;
