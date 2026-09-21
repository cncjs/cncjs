import settings from '../config/settings';
import monitor from '../services/monitor';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_CONFLICT,
  ERR_PAYLOAD_TOO_LARGE,
  ERR_UNSUPPORTED_MEDIA_TYPE,
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
  // The upload kind is taken from the content type rather than inferred from
  // whether body-parser produced anything: an empty JSON body (`{}`) parses to
  // an empty object, which is indistinguishable from "not parsed" and would
  // otherwise be streamed to disk instead of answering "No file specified".
  const isRawUpload = req.is('application/octet-stream');
  const isJSON = req.is('application/json');

  if (!isRawUpload && !isJSON) {
    res.status(ERR_UNSUPPORTED_MEDIA_TYPE).send({
      msg: 'Unsupported content type'
    });
    return;
  }

  // A raw upload carries only the file's bytes, so its name comes from the
  // query string.
  const file = (isRawUpload ? req.query.file : req.body.file) || '';

  if (!file) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No file specified'
    });
    return;
  }

  const done = (err) => {
    if (err) {
      let status = ERR_INTERNAL_SERVER_ERROR;
      if (err.code === 'ETOOLARGE') {
        status = ERR_PAYLOAD_TOO_LARGE;
      } else if (err.message === 'Watch directory is not configured') {
        status = ERR_BAD_REQUEST;
      }
      res.status(status).send({
        msg: err.message || 'Failed writing file'
      });
      return;
    }

    res.send({ file });
  };

  if (isRawUpload) {
    const { maxFileSize } = settings.middleware.upload;
    monitor.writeStream(file, req, { maxFileSize }, done);
    return;
  }

  monitor.writeFile(file, req.body.data || '', done);
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
