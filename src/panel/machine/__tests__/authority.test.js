import { readAuthority } from '../authority';

describe('readAuthority', () => {
  const payload = {
    subject: 'CN=cncjs local authority',
    validTo: 'Sep 23 12:23:53 2027 GMT',
    fingerprint: 'C6:D1:00:56:D7:62:C7:45',
  };

  it('reads the name the phone will list it under', () => {
    // Without dropping `CN=` the panel and the phone would disagree about
    // what the same certificate is called.
    expect(readAuthority(payload).name).toBe('cncjs local authority');
  });

  it('keeps the fingerprint as the server spelled it', () => {
    expect(readAuthority(payload).fingerprint).toBe('C6:D1:00:56:D7:62:C7:45');
  });

  it('reads the expiry as a date', () => {
    expect(readAuthority(payload).validTo.getUTCFullYear()).toBe(2027);
  });

  it('survives a server that is not offering one', () => {
    // A panel served over plain HTTP gets a 404 here, and that is ordinary
    // rather than broken -- it must not take the settings screen down.
    expect(readAuthority(undefined)).toEqual({
      name: null,
      fingerprint: null,
      validTo: null,
    });
  });

  it('refuses a date it cannot read rather than showing "Invalid Date"', () => {
    expect(readAuthority({ ...payload, validTo: 'whenever' }).validTo).toBeNull();
  });
});
