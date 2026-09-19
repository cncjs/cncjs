import request from 'superagent';
import { getLatestVersion } from '../api.version';

jest.mock('superagent', () => {
  const chain = {
    set: jest.fn(() => chain),
    end: jest.fn(),
  };

  return {
    get: jest.fn(() => chain),
    __chain: chain,
  };
});

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

/** Run the handler and hand back whatever it passed to res.send. */
const fetchVersion = (document) => {
  const res = { send: jest.fn(), status: jest.fn(() => res) };

  getLatestVersion({}, res);

  const [callback] = request.__chain.end.mock.calls[0];
  callback(null, { body: document });

  return res.send.mock.calls[0][0];
};

describe('getLatestVersion', () => {
  it('reports the release date of the latest version', () => {
    expect(fetchVersion(REGISTRY_DOCUMENT)).toEqual({
      time: '2021-02-03T04:05:06.000Z',
      name: 'cncjs',
      version: '1.9.22',
      description: 'A web-based interface for CNC milling controller',
      homepage: 'https://github.com/cncjs/cncjs',
    });
  });

  it('answers with empty fields rather than throwing on an empty document', () => {
    expect(fetchVersion({})).toEqual({
      time: undefined,
      name: undefined,
      version: undefined,
      description: undefined,
      homepage: undefined,
    });
  });
});
