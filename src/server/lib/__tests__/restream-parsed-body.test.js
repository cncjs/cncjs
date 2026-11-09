/* eslint-env jest */
import EventEmitter from 'events';
import restreamParsedBody from '../restream-parsed-body';

// A stand-in for an Express request. The downstream listener is attached inside
// `next()`, which is where a real handler would attach it: connect-restreamer
// removes existing 'data'/'end' listeners before it takes over.
const makeReq = ({ headers = {}, body, parsed = false }) => {
  const req = new EventEmitter();
  req.headers = { ...headers };
  req.body = body;

  if (parsed) {
    req._body = true;
  }

  return req;
};

const flush = () => new Promise((resolve) => {
  setImmediate(resolve);
});

describe('restreamParsedBody', () => {
  // An unread body is still a live stream. Re-emitting it would append `{}` to
  // the bytes already on their way to disk and end the stream early, which
  // truncates an upload and leaves the pipeline reading it unfinished.
  test('leaves a request no parser consumed untouched', async () => {
    const req = makeReq({ headers: { 'content-length': '14' } });
    const chunks = [];
    const ended = jest.fn();
    const next = jest.fn(() => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', ended);
    });

    restreamParsedBody()(req, {}, next);
    await flush();

    expect(next).toHaveBeenCalled();
    expect(chunks).toEqual([]);
    expect(ended).not.toHaveBeenCalled();
    expect(req.headers['content-length']).toEqual('14');
  });

  test('re-emits the body of a request a parser consumed', async () => {
    const req = makeReq({ headers: { 'content-length': '14' }, body: { file: 'a.nc' }, parsed: true });
    const chunks = [];
    let endResolve = null;
    const ended = new Promise((resolve) => {
      endResolve = resolve;
    });
    const next = jest.fn(() => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', endResolve);
    });

    restreamParsedBody()(req, {}, next);
    await ended;

    expect(next).toHaveBeenCalled();
    expect(chunks).toEqual([JSON.stringify({ file: 'a.nc' })]);
  });
});
