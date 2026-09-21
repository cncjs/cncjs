/* eslint-env jest */
import serviceContainer from '../../service-container';
import api from '../api.watch';

// api.watch resolves the watcher through the service container on import, so
// the container itself is mocked: this exercises the handler, not the DI graph.
// babel-jest hoists this above the imports above.
jest.mock('../../service-container', () => {
  const watcher = {
    writeFile: jest.fn((file, data, callback) => callback(null)),
    writeStream: jest.fn((file, readable, options, callback) => callback(null))
  };

  return {
    __esModule: true,
    default: {
      resolve: () => watcher
    }
  };
});

const directoryWatcher = serviceContainer.resolve('directoryWatcher');

// Minimal stand-ins for the two Express objects writeFile() touches. req.is()
// answers the way Express does: the matched type, or false.
const makeReq = ({ contentType, body = {}, query = {} }) => ({
  body,
  query,
  is: (type) => (contentType === type ? type : false)
});

const makeRes = () => {
  const res = { statusCode: 200, payload: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (payload) => {
    res.payload = payload;
    return res;
  };
  return res;
};

describe('api.watch writeFile', () => {
  beforeEach(() => {
    directoryWatcher.writeFile.mockClear();
    directoryWatcher.writeStream.mockClear();
  });

  test('streams a body sent as application/octet-stream, naming it from the query', () => {
    const req = makeReq({ contentType: 'application/octet-stream', query: { file: 'program.nc' } });
    const res = makeRes();
    api.writeFile(req, res);

    expect(res.statusCode).toEqual(200);
    expect(res.payload).toEqual({ file: 'program.nc' });
    expect(directoryWatcher.writeStream).toHaveBeenCalledWith(
      'program.nc',
      req,
      { maxFileSize: expect.any(Number) },
      expect.any(Function)
    );
    expect(directoryWatcher.writeFile).not.toHaveBeenCalled();
  });

  test('writes a JSON body through writeFile, unchanged', () => {
    const req = makeReq({ contentType: 'application/json', body: { file: 'program.nc', data: 'G0 X1\r\n' } });
    const res = makeRes();
    api.writeFile(req, res);

    expect(res.statusCode).toEqual(200);
    expect(res.payload).toEqual({ file: 'program.nc' });
    expect(directoryWatcher.writeFile).toHaveBeenCalledWith('program.nc', 'G0 X1\r\n', expect.any(Function));
    expect(directoryWatcher.writeStream).not.toHaveBeenCalled();
  });

  // An empty JSON body parses to an empty object, which is indistinguishable
  // from "body-parser produced nothing". Selecting on the content type keeps it
  // on the JSON path, so it still answers "No file specified" rather than
  // streaming an empty request to disk under the query string's name.
  test('an empty JSON body is not mistaken for a raw upload', () => {
    const req = makeReq({ contentType: 'application/json', body: {}, query: { file: 'program.nc' } });
    const res = makeRes();
    api.writeFile(req, res);

    expect(res.statusCode).toEqual(400);
    expect(res.payload).toEqual({ msg: 'No file specified' });
    expect(directoryWatcher.writeStream).not.toHaveBeenCalled();
    expect(directoryWatcher.writeFile).not.toHaveBeenCalled();
  });

  test('rejects an unsupported content type with 415', () => {
    const req = makeReq({ contentType: 'text/plain', query: { file: 'program.nc' } });
    const res = makeRes();
    api.writeFile(req, res);

    expect(res.statusCode).toEqual(415);
    expect(res.payload).toEqual({ msg: 'Unsupported content type' });
    expect(directoryWatcher.writeStream).not.toHaveBeenCalled();
    expect(directoryWatcher.writeFile).not.toHaveBeenCalled();
  });

  test('rejects a request with no content type at all', () => {
    const req = makeReq({ contentType: undefined, query: { file: 'program.nc' } });
    const res = makeRes();
    api.writeFile(req, res);

    expect(res.statusCode).toEqual(415);
  });

  test('requires a file name on each path', () => {
    const raw = makeRes();
    api.writeFile(makeReq({ contentType: 'application/octet-stream' }), raw);
    expect(raw.statusCode).toEqual(400);

    const json = makeRes();
    api.writeFile(makeReq({ contentType: 'application/json', body: { data: 'G0 X1' } }), json);
    expect(json.statusCode).toEqual(400);
  });
});
