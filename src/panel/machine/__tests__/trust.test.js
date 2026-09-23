import { trustState } from '../trust';

describe('trustState', () => {
  test('says nothing when the browser is happy', () => {
    // `http://localhost` counts as secure, which is why development never
    // ran into any of this.
    expect(trustState({ protocol: 'http:', secure: true })).toBeNull();
    expect(trustState({ protocol: 'https:', secure: true })).toBeNull();
  });

  test('offers the authority when the certificate is the problem', () => {
    /*
     * The case that cost an afternoon: the page is on HTTPS and loads, and
     * the browser still refuses to install it because the certificate was
     * signed by an authority this device has never heard of. Clicking through
     * the warning does not change that — the page works and the origin stays
     * insecure.
     */
    expect(trustState({ protocol: 'https:', secure: false }))
      .toEqual({ key: 'connect.trust.untrusted' });
  });

  test('does not offer it when no certificate would help', () => {
    // Over plain HTTP there is nothing to trust. The fix is the server, and
    // handing somebody a certificate here would send them down a dead end.
    expect(trustState({ protocol: 'http:', secure: false }))
      .toEqual({ key: 'connect.trust.insecure' });
  });

  test('survives being asked about nothing', () => {
    expect(trustState()).toEqual({ key: 'connect.trust.insecure' });
  });
});
