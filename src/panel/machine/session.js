/**
 * Getting a token out of the server.
 *
 * The panel is its own application and does not read the old one's storage,
 * so it asks for its own. `POST /api/signin` with no body is how cncjs
 * authenticates on a server with no accounts configured — it hands a token to
 * anyone — and it is also the endpoint a real sign-in would use once there is
 * a screen for it. There is no such screen yet because the mockup does not
 * draw one.
 *
 * The token is not cached anywhere. It costs one request per page load, and
 * caching it would mean deciding where to put it and when it goes stale,
 * neither of which has been asked for.
 */
import { t } from '../i18n';

/**
 * A fetch whose failure is a sentence the panel wrote.
 *
 * `fetch` rejects with `TypeError: Failed to fetch` when there is nothing
 * listening, and that string went straight into the status bar — the
 * browser's words, in the browser's language, on a panel where every other
 * displayed string comes from a key. It is also the single most likely thing
 * an operator ever reads here: it is what a pendant says when the garage PC
 * is off.
 */
const reach = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (e) {
    // The cause is carried even though nothing reads it: what reaches the
    // operator is the sentence, and what reaches the console is still the
    // browser's own reason for it.
    throw new Error(t('error.unreachable'), { cause: e });
  }
};

export const signIn = async ({ name = '', password = '' } = {}) => {
  const res = await reach('/api/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });

  if (!res.ok) {
    // 401 on a server that has accounts and was given no credentials. Said
    // plainly rather than swallowed: a panel that silently fails to connect
    // looks identical to a machine that is switched off.
    throw new Error(t('error.signInFailed', { status: res.status }));
  }

  const { token, enabled } = await res.json();
  if (!token) {
    throw new Error(t('error.noToken'));
  }

  return { token, accountsEnabled: Boolean(enabled) };
};

export default signIn;
