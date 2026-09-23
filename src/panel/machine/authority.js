/**
 * The certificate authority this server is offering, described.
 *
 * The panel has to be able to answer three questions about it without anybody
 * opening a terminal: what it is called, which one it is, and how long it
 * lasts. All three live inside a DER blob the browser will not unpack, so the
 * server parses it and hands over the three fields — see `cnc-ca.json` in
 * `src/server/app.js`.
 *
 * Why the name matters: it is the text the phone shows in its own list of
 * user certificates, and deleting the right one later means knowing it.
 *
 * Why the fingerprint matters: reissuing is ordinary here, so "is the one on
 * my phone still the current one" is a real question and this is the only
 * thing that answers it. It is not evidence about *who* wrote the
 * certificate — anybody who could tamper with the download could tamper with
 * this too — only about which file is which.
 */
export const AUTHORITY_URL = '/panel/cnc-ca.crt';

const AUTHORITY_INFO_URL = '/panel/cnc-ca.json';

/**
 * The server's answer, in the shape a screen wants.
 *
 * Every field is allowed to be missing. The server serves this only when it
 * was started with `--tls-ca`, and a panel opened over plain HTTP during
 * development gets a 404 — which is not an error worth showing anybody, just
 * a section with nothing in it.
 */
export const readAuthority = (payload) => {
  const validTo = payload?.validTo ? new Date(payload.validTo) : null;
  const usable = validTo && !Number.isNaN(validTo.getTime()) ? validTo : null;

  return {
    // `CN=cncjs local authority` is what the certificate carries; the phone
    // lists it without the prefix, so the panel should read the same way.
    name: payload?.subject?.replace(/^CN=/, '') ?? null,
    fingerprint: payload?.fingerprint ?? null,
    validTo: usable,
  };
};

/** Null when this server is not offering one. */
export const fetchAuthority = async () => {
  try {
    const response = await fetch(AUTHORITY_INFO_URL);
    if (!response.ok) {
      return null;
    }
    return readAuthority(await response.json());
  } catch (err) {
    return null;
  }
};

export default fetchAuthority;
