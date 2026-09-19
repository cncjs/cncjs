import { getLatestVersion } from '../api.version';

/** The shape of a registry document, cut down to what the handler reads. */
const REGISTRY_DOCUMENT = {
  'dist-tags': { latest: '1.9.22' },
  time: {
    '1.9.21': '2020-01-01T00:00:00.000Z',
    '1.9.22': '2021-02-03T04:05:06.000Z',
  },
  versions: {
    '1.9.22': {
      name: 'cncjs',
      version: '1.9.22',
      description: 'A web-based interface for CNC milling controller',
      homepage: 'https://github.com/cncjs/cncjs',
    },
  },
};

/** Run the handler against a stubbed fetch and hand back the res calls. */
const run = async (fetchImpl) => {
  global.fetch = fetchImpl;

  const res = { send: jest.fn(), status: jest.fn(() => res) };

  await getLatestVersion({}, res);

  return res;
};

/** Answer as the registry would for a document it holds. */
const respondWith = (document) => jest.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve(document),
}));

describe('getLatestVersion', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports the release date of the latest version', async () => {
    const res = await run(respondWith(REGISTRY_DOCUMENT));

    expect(res.send).toHaveBeenCalledWith({
      time: '2021-02-03T04:05:06.000Z',
      name: 'cncjs',
      version: '1.9.22',
      description: 'A web-based interface for CNC milling controller',
      homepage: 'https://github.com/cncjs/cncjs',
    });
  });

  it('answers with empty fields rather than throwing on an empty document', async () => {
    const res = await run(respondWith({}));

    expect(res.send).toHaveBeenCalledWith({
      time: undefined,
      name: undefined,
      version: undefined,
      description: undefined,
      homepage: undefined,
    });
  });

  it('requests the package document from the registry once', async () => {
    const fetchImpl = respondWith(REGISTRY_DOCUMENT);

    await run(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [requestedUrl, options] = fetchImpl.mock.calls[0];

    expect(requestedUrl).toMatch(/cncjs$/);
    expect(options.headers).toBeDefined();
  });

  it('answers 500 when the registry refuses the request', async () => {
    const res = await run(jest.fn(() => Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    })));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      msg: expect.stringContaining('code=404'),
    });
  });

  it('answers 500 with the errno when the connection fails', async () => {
    // Undici reports a transport failure as a TypeError carrying the real
    // reason on `cause`, which is where the errno has to be read from.
    const failure = new TypeError('fetch failed');
    failure.cause = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });

    const res = await run(jest.fn(() => Promise.reject(failure)));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      msg: expect.stringContaining('code=ENOTFOUND'),
    });
  });
});
