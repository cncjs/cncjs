const mockSignin = jest.fn();
const mockLegacySignin = jest.fn();
const mockConfigGet = jest.fn(() => 'session-token');

jest.mock('@app/queries/session', () => ({
  __esModule: true,
  signin: mockSignin,
}));

jest.mock('@app/lib/user', () => ({
  __esModule: true,
  signin: mockLegacySignin,
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: mockConfigGet,
  },
}));

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({
      data: { allowAnonymousUsageDataCollection: false },
    })),
  },
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    connect: jest.fn((host, options, callback) => callback()),
  },
}));

jest.mock('@app/lib/analytics', () => ({
  initialize: jest.fn(),
}));

jest.mock('@app/lib/log', () => ({
  debug: jest.fn(),
  setLevel: jest.fn(),
}));

const { authenticateSessionToken } = require('../bootstrap');

describe('bootstrap session boundary', () => {
  beforeEach(() => {
    mockSignin.mockReset();
    mockLegacySignin.mockReset();
    mockConfigGet.mockClear();
  });

  test('uses the shared pure session transport exactly once', async () => {
    mockSignin.mockResolvedValue({ authenticated: false, token: null });

    await authenticateSessionToken();

    expect(mockSignin).toHaveBeenCalledTimes(1);
    expect(mockSignin).toHaveBeenCalledWith({ token: 'session-token' });
    expect(mockLegacySignin).not.toHaveBeenCalled();
  });
});
