import path from 'path';
import minimatch from 'minimatch';
import FSMonitor from './FSMonitor';

const monitor = new FSMonitor();

const start = ({ watchDirectory }) => {
    monitor.watch(watchDirectory);
};

const stop = () => {
    monitor.unwatch();
};

const find = (searchPath) => {
    const root = monitor.root;
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
                file: path.basename(file),
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

export default {
    start,
    stop,
    find
};
