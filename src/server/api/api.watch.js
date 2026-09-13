import path from 'path';
import minimatch from 'minimatch';
import serviceContainer from '../service-container';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const directoryWatcher = serviceContainer.resolve('directoryWatcher');

const searchFiles = (searchPath) => {
  if (!directoryWatcher.root) {
    return [];
  }

  const pattern = path.join(directoryWatcher.root, searchPath, '*');
  if (pattern.indexOf(directoryWatcher.root) !== 0) {
    return [];
  }

  return minimatch
    .match(Object.keys(directoryWatcher.files), pattern, { matchBase: true })
    .map(file => {
      const stat = directoryWatcher.files[file] ?? {};

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

const api = {
  getStatus: (req, res) => {
    res.send({ configured: directoryWatcher.isConfigured() });
  },
  getFiles: (req, res) => {
    const searchPath = (req.body.path ?? req.query.path) ?? '';
    const files = searchFiles(searchPath);

    res.send({ path: searchPath, files: files });
  },
  readFile: (req, res) => {
    const file = (req.body.file ?? req.query.file) ?? '';

    directoryWatcher.readFile(file, (err, data) => {
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
  },
  writeFile: (req, res) => {
    const file = req.body.file || '';
    const data = req.body.data || '';

    if (!file) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'No file specified'
      });
      return;
    }

    directoryWatcher.writeFile(file, data, (err) => {
      if (err) {
        res.status(err.message === 'Watch directory is not configured' ? ERR_BAD_REQUEST : ERR_INTERNAL_SERVER_ERROR).send({
          msg: err.message || 'Failed writing file'
        });
        return;
      }

      res.send({ file: file });
    });
  },
};

export default api;
