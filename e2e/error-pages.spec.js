const { test, expect } = require('./fixtures');

/**
 * The 404 view, rendered by the server's own template engine.
 *
 * No tier reached this view before: the smoke tier only ever requested routes
 * that exist, and `yarn jest` never builds the Express app. That mattered when
 * `consolidate` was replaced with a direct `hogan.js` engine — the index page
 * would have kept working through `renderPage` even if the error views had
 * stopped rendering entirely, because `errnotfound` is the only caller of
 * `res.render` for them.
 *
 * The assertions are deliberately about the *rendered page*, not the status
 * code alone. A broken view engine still yields 404 — Express catches the
 * render error and falls through to its own handler — so a status check on its
 * own would pass while serving a stack trace.
 */
test.describe('error pages', () => {
  test('renders the 404 view for a route that does not exist', async ({ request }) => {
    const res = await request.get('no/such/route/at/all');

    expect(res.status()).toBe(404);

    const body = await res.text();

    // Text from 404.hogan. If the engine failed, Express serves its own error
    // page instead and this string is absent.
    expect(body).toContain('Sorry, but the page you were trying to view does not exist.');

    // The template interpolates {{dir}} and {{lang}} into the <html> tag. Both
    // are absent from the locals `errnotfound` passes, so hogan must render
    // them as empty rather than leaving the braces in the markup.
    expect(body).toContain('<html dir="" lang=""');
    expect(body).not.toContain('{{');
  });

  test('answers a stack-free page, not an exception, for an unknown route', async ({ request }) => {
    const res = await request.get('no/such/route/at/all');

    const body = await res.text();

    // A render failure surfaces as Express's default error page, which carries
    // the exception and a stack. Neither belongs in a response to a stranger.
    expect(body).not.toContain('Error:');
    expect(body).not.toContain('at Object.');
    expect(body).not.toMatch(/\bat [A-Za-z_$][\w$]*\s+\(/);
  });

  test('answers JSON rather than the page when JSON is what was asked for', async ({ request }) => {
    const res = await request.get('no/such/route/at/all', {
      headers: { Accept: 'application/json' },
    });

    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
