const base = require('@playwright/test');
const { hasBuild, startServer } = require('./fixtures');

const test = base.test;
const expect = base.expect;

test.skip(!hasBuild(), 'Run `yarn build-prod` first: this tier drives the built server.');

/**
 * The sign-in screen as a browser meets it.
 *
 * Nothing else in this suite opens it. The API specs next door look like they
 * do, but they talk to `POST /api/signin` with `fetch` and never render a page
 * — so until this file existed, the whole screen could have been deleted
 * without a single spec going red.
 *
 * It has to live in this tier rather than in smoke, and not only because the
 * dev server bypasses verification. With no account configured the bootstrap
 * sign-in succeeds for everyone, so `ProtectedRoute` mounts the workspace,
 * `App` finds `/login` outside its accepted paths and redirects to
 * `/workspace` — the screen never renders at all. A server holding an enabled
 * account is the only place it exists.
 *
 * Everything below is located by accessible role or name rather than by class,
 * placeholder or DOM shape, because the screen is about to be rebuilt on a
 * different component library. A locator that survives that rewrite asserts on
 * what the screen is *for*; one that does not asserts on how this particular
 * version happened to be built.
 */
test.describe('the sign-in screen', () => {
  const OPERATOR = { id: 'user-a', name: 'operator', password: 'operator-secret', enabled: true };
  const FORGOT_PASSWORD_URL = 'https://cnc.js.org/docs/faq/#forgot-your-password';

  let server = null;

  test.beforeAll(async () => {
    server = await startServer([OPERATOR]);
  });

  test.afterAll(() => {
    server && server.stop();
  });

  // A password input carries no implicit ARIA role, so `getByRole('textbox')`
  // cannot see it and `getByLabel` only works once the field is labelled.
  // Accept either spelling: this version names its fields with a placeholder,
  // and a rewrite should be free to promote that to a real label without the
  // suite calling the improvement a regression.
  const field = (page, name) => page.getByLabel(name).or(page.getByPlaceholder(name)).first();

  const signInButton = (page) => page.getByRole('button', { name: /sign in/i });

  const gotoLogin = async (page) => {
    await page.goto(`${server.baseUrl}/#/login`, { waitUntil: 'domcontentloaded' });
    await signInButton(page).waitFor({ state: 'visible', timeout: 45 * 1000 });
  };

  test('is where an unauthenticated visitor lands', async ({ page }) => {
    await page.goto(server.baseUrl, { waitUntil: 'domcontentloaded' });

    await expect(signInButton(page)).toBeVisible({ timeout: 45 * 1000 });
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('renders the controls needed to sign in', async ({ page }) => {
    await gotoLogin(page);

    await expect(field(page, /username/i)).toBeVisible();
    await expect(field(page, /password/i)).toBeVisible();
    await expect(signInButton(page)).toBeVisible();
  });

  test('names the product it is signing in to', async ({ page }) => {
    await gotoLogin(page);

    // The heading interpolates `settings.productName`, so this also proves the
    // i18n substitution ran rather than leaving the placeholder on screen.
    await expect(page.getByText(/sign in to cncjs/i)).toBeVisible();
    await expect(page.getByText('{{name}}')).toHaveCount(0);
  });

  test('keeps the password field masked', async ({ page }) => {
    await gotoLogin(page);

    await expect(field(page, /password/i)).toHaveAttribute('type', 'password');
  });

  test('links to the password recovery documentation', async ({ page }) => {
    await gotoLogin(page);

    // The only way out of this screen for someone who cannot get in.
    const link = page.getByRole('link', { name: /forgot your password/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', FORGOT_PASSWORD_URL);
  });

  test('shows no error before anything has been submitted', async ({ page }) => {
    await gotoLogin(page);

    // The alert is rendered conditionally. A rewrite that renders it always
    // and hides it with CSS would look right and still be wrong: it announces
    // a failure to a screen reader the moment the page loads.
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

test('names the missing field instead of asking the server', async ({ page }) => {
    await gotoLogin(page);

    // The page posts to /api/signin once while bootstrapping, so the listener
    // goes on after the screen has settled or it would count that one.
    const posted = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/signin') && req.method() === 'POST') {
        posted.push(req.url());
      }
    });

    await signInButton(page).click();

    // The server's answer to a blank field is "Authentication failed", which
    // is true and useless — it cannot say which field is missing, and that is
    // the only thing wrong. So the screen answers instead, and says which.
    await expect(page.getByText(/username is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
    await expect(field(page, /username/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(field(page, /password/i)).toHaveAttribute('aria-invalid', 'true');

    await page.waitForTimeout(500);
    expect(posted, 'an empty form should never reach the server').toEqual([]);
  });

  test('ties each message to the field it is about', async ({ page }) => {
    await gotoLogin(page);
    await signInButton(page).click();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // The message is only useful to a screen reader if the field points at it.
    const describedBy = await field(page, /password/i).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText(/password is required/i);
  });

  test('drops a field message as soon as that field is typed into', async ({ page }) => {
    await gotoLogin(page);
    await signInButton(page).click();
    await expect(page.getByText(/username is required/i)).toBeVisible();

    await field(page, /username/i).fill('operator');

    // Only the field being corrected clears. Telling someone their password is
    // still missing while they fix the username is the accurate thing to say.
    await expect(page.getByText(/username is required/i)).toHaveCount(0);
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('refuses the wrong password and says so on screen', async ({ page }) => {
    await gotoLogin(page);

    await field(page, /username/i).fill(OPERATOR.name);
    await field(page, /password/i).fill('not-it');
    await signInButton(page).click();

    // The message has to reach the operator, not just the console: a rejected
    // sign-in that leaves the screen looking untouched reads as a dead button.
    await expect(page.getByRole('alert')).toContainText(/authentication failed/i);
    await expect(page).toHaveURL(/#\/login$/);
  });

test('marks both fields as rejected, and not only in colour', async ({ page }) => {
    await gotoLogin(page);

    await expect(field(page, /username/i)).not.toHaveAttribute('aria-invalid', 'true');
    await expect(field(page, /password/i)).not.toHaveAttribute('aria-invalid', 'true');

    await field(page, /username/i).fill(OPERATOR.name);
    await field(page, /password/i).fill('not-it');
    await signInButton(page).click();
    await expect(page.getByRole('alert')).toBeVisible();

    // A red border says nothing to a screen reader, and nothing at all to
    // someone who cannot separate red from grey. `aria-invalid` is the part of
    // the error state that has to be true for the colour to be decoration
    // rather than the whole message.
    await expect(field(page, /username/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(field(page, /password/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('carries what was typed through to the server', async ({ page }) => {
    await gotoLogin(page);

    const posted = page.waitForRequest((req) => req.url().endsWith('/api/signin') && req.method() === 'POST');

    await field(page, /username/i).fill(OPERATOR.name);
    await field(page, /password/i).fill('not-it');
    await signInButton(page).click();

    // Both fields are uncontrolled and read through a ref at submit time. If a
    // rewrite makes one controlled but forgets to wire its onChange, the field
    // still accepts typing and submits an empty string — which the server
    // rejects, so the failure case above would stay green while sign-in was
    // broken for everyone.
    const body = (await posted).postDataJSON();
    expect(body.name).toBe(OPERATOR.name);
    expect(body.password).toBe('not-it');
  });

  test('lets the right password through to the workspace', async ({ page }) => {
    await gotoLogin(page);

    await field(page, /username/i).fill(OPERATOR.name);
    await field(page, /password/i).fill(OPERATOR.password);
    await signInButton(page).click();

    // Reaching the workspace proves the whole chain ran, not just the POST:
    // the token was stored, the socket connected and the redirect fired.
    await expect(page.locator('[data-widget-id="connection"]')).toBeVisible({ timeout: 45 * 1000 });
    await expect(page).not.toHaveURL(/#\/login$/);
  });
});
