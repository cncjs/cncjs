import fs from 'fs';
import path from 'path';
import minimatch from 'minimatch';
import serviceContainer from '../service-container';
import {
    ERR_NOT_FOUND,
    ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const watcher = serviceContainer.resolve('watcher');

const searchFiles = (searchPath) => {
    if (!watcher.root) {
        return [];
    }

    const pattern = path.join(watcher.root, searchPath, '*');
    if (pattern.indexOf(watcher.root) !== 0) {
        return [];
    }

    return minimatch
        .match(Object.keys(watcher.files), pattern, { matchBase: true })
        .map(file => {
            const stat = watcher.files[file] || {};

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

export const getFiles = (req, res) => {
    const searchPath = req.body.path || req.query.path || '';
    const files = searchFiles(searchPath);

    res.send({ path: path, files: files });
};

export const readFile = (req, res) => {
    const file = req.body.file || req.query.file || '';
    const filepath = path.join(watcher.root, file);

    fs.readFile(filepath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(ERR_NOT_FOUND).send({
                    msg: 'File not found'
                });
            } else {
                res.status(ERR_INTERNAL_SERVER_ERROR).send({
                    msg: 'Failed reading file'
                });
            }
            return;
        }

        res.send({ file: file, data: data });
    });
};
