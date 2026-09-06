import monitor from '../services/monitor';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

export const getStatus = (req, res) => {
  res.send({ configured: monitor.isConfigured() });
};

export const getFiles = (req, res) => {
  const path = req.body.path || req.query.path || '';
  const files = monitor.getFiles(path);

  res.send({ path: path, files: files });
};

export const readFile = (req, res) => {
  const file = req.body.file || req.query.file || '';

  monitor.readFile(file, (err, data) => {
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

export const writeFile = (req, res) => {
  const file = req.body.file || '';
  const data = req.body.data || '';

  if (!file) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No file specified'
    });
    return;
  }

  monitor.writeFile(file, data, (err) => {
    if (err) {
      res.status(err.message === 'Watch directory is not configured' ? ERR_BAD_REQUEST : ERR_INTERNAL_SERVER_ERROR).send({
        msg: err.message || 'Failed writing file'
      });
      return;
    }

    res.send({ file: file });
  });
};
