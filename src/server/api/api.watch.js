import monitor from '../services/monitor';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_CONFLICT,
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
  // A JSON body (already parsed by body-parser) keeps the original behaviour.
  // Anything else is treated as a raw upload and streamed to disk, so large
  // G-code programs do not have to be held in memory as a string; the file
  // name then comes from the query string.
  const hasParsedBody = !!req.body && Object.keys(req.body).length > 0;
  const file = hasParsedBody ? (req.body.file || '') : (req.query.file || '');

  if (!file) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No file specified'
    });
    return;
  }

  const done = (err) => {
    if (err) {
      res.status(err.message === 'Watch directory is not configured' ? ERR_BAD_REQUEST : ERR_INTERNAL_SERVER_ERROR).send({
        msg: err.message || 'Failed writing file'
      });
      return;
    }

    res.send({ file: file });
  };

  if (hasParsedBody) {
    monitor.writeFile(file, req.body.data || '', done);
    return;
  }

  monitor.writeStream(file, req, done);
};

// The monitor tags its errors with a `code`; anything else is unexpected and
// becomes a 500.
const statusForError = (err) => {
  switch (err && err.code) {
  case 'ENOTCONFIGURED':
  case 'EINVALIDNAME':
  case 'ENOTFILE':
    return ERR_BAD_REQUEST;
  case 'ENOENT':
    return ERR_NOT_FOUND;
  case 'EEXIST':
    return ERR_CONFLICT;
  case 'EPARTIAL':
  default:
    return ERR_INTERNAL_SERVER_ERROR;
  }
};

export const renameFile = (req, res) => {
  const file = req.body.file || req.query.file || '';
  const to = req.body.to || req.query.to || '';

  if (!file || !to) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No file specified'
    });
    return;
  }

  monitor.renameFile(file, to, (err) => {
    if (err) {
      res.status(statusForError(err)).send({
        msg: err.message || 'Failed renaming file'
      });
      return;
    }

    res.send({ file: to });
  });
};

export const deleteFile = (req, res) => {
  const file = req.body.file || req.query.file || '';

  if (!file) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No file specified'
    });
    return;
  }

  monitor.deleteFile(file, (err) => {
    if (err) {
      res.status(statusForError(err)).send({
        msg: err.message || 'Failed deleting file'
      });
      return;
    }

    res.send({ file: file });
  });
};
