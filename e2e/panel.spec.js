const { test, expect } = require('./fixtures');

/**
 * The panel, with no machine on the other end.
 *
 * A second application in the same repository, served at `/panel` and built
 * from the design mockup rather than migrated out of `src/app`. It shares one
 * thing with the old application — the socket client — and one server.
 *
 * This is the half a browser can reach on its own. What the panel says once a
 * controller is answering lives in `e2e/hardware/panel.spec.js`.
 */
test.describe('panel, disconnected', () => {
  // English is the panel's source language and Polish is a translation of it,
  // picked from the browser. Playwright's browser is `en-US`, so the cases
  // below ask for Polish outright rather than depending on the machine the
  // suite happens to run on — and the last case in this file is the one that
  // checks the other language is really there.
  const bar = (page) => page.getByRole('banner');
  const rail = (page) => page.getByRole('navigation', { name: 'Nawigacja' });

  const openPanel = async (page, lng = 'pl') => {
    await page.goto(`/panel/?lng=${lng}`, { waitUntil: 'domcontentloaded' });
    await expect(bar(page)).toBeVisible({ timeout: 45000 });
  };

  test('loads, and is not the old application', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // The old workspace is not in here. If a build ever pointed `/panel` at
    // the wrong output this is what would notice.
    await expect(cncjs.page.locator('[data-widget-id]')).toHaveCount(0);
    await expect(rail(cncjs.page)).toBeVisible();

    cncjs.expectNoPageErrors();
  });

  test('says there is no machine rather than showing an idle one', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Not "Idle", not an empty chip. "Rozłączony" is the answer to "why did
    // nothing happen when I pressed that", and it is a state an operator acts
    // on. In Polish because the chip is translated now — it used to say
    // `Disconnected` on an otherwise Polish panel, which is what having no
    // resources at all looks like from the outside.
    await expect(bar(cncjs.page)).toContainText(/rozłączony/i);
  });

  test('no connection is said as a warning, not as another setting', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // The form, not the words. This used to be written as two more muted
    // identity lines beside `sterownik · Grbl`, which is the panel's voice
    // for facts nobody looks at — and it is the reason every control below
    // is dead. Rejected on sight by Mateusz, 2026-09-21.
    // Pinned to the settled state first. Without this the case passes during
    // the window between the page loading and the socket attaching — which is
    // a pass for the wrong reason, and it would go on passing after somebody
    // deleted the badge.
    await expect(bar(cncjs.page)).toContainText(/rozłączony/i);

    const message = bar(cncjs.page).getByText(/Brak połączenia/i);
    await expect(message).toBeVisible();

    const drawn = await message.evaluate((node) => {
      const style = getComputedStyle(node);
      return { color: style.color, border: style.borderTopWidth };
    });

    /*
     * `--mut` is the muted grey the identity lines are written in. Anything
     * but that, and a box around it.
     *
     * Resolved through an element rather than read off the root: the custom
     * property is `#6d7886` and `getComputedStyle().color` is
     * `rgb(109, 120, 134)`, so comparing the two strings is an assertion that
     * can never fail. It did not fail when the badge was deliberately turned
     * back into muted text, which is how that was found.
     */
    const muted = await cncjs.page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--mut)';
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    });

    expect(muted).toMatch(/^rgb/);
    expect(drawn.color).not.toBe(muted);
    expect(drawn.border).not.toBe('0px');
  });

  test('the stop is there and cannot be pressed at nothing', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Always present, because the mockup's whole point is that it is always in
    // the same place. Disabled because it would reach no machine — a control
    // that sometimes silently does nothing is one nobody trusts in the moment
    // they need it.
    const stop = bar(cncjs.page).getByRole('button', { name: /^Stop$/i });
    await expect(stop).toBeVisible();
    await expect(stop).toBeDisabled();
  });

  test('every reading is a dash, and not a zero', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // On an unhomed machine "0.000" and "we have not been told" are very
    // different statements, and only one of them is safe to act on.
    const tile = cncjs.page.locator('section').filter({ hasText: /pozycja robocza/i });
    await expect(tile.first()).toBeVisible();

    // Per axis rather than by counting dashes in the card: the card's own
    // header carries one too, for the coordinate system nobody has told us
    // yet, and a count cannot tell the two kinds of unknown apart.
    //
    // Two dashes a row, because a row carries both readings now: where the
    // tool is in this job, and where it is in the machine. Neither is known
    // and neither may say so with a number.
    for (const axis of ['X', 'Y', 'Z']) {
      await expect(tile.first().getByRole('group', { name: axis }))
        .toHaveText(new RegExp('^' + axis + ' *– *mm *–$'));
    }
    await expect(tile.first().getByText('0.000')).toHaveCount(0);
  });

  test('no jog key can be pressed at a machine that is not there', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Every one of them, not a sample. A jog key that looks pressable and
    // silently does nothing teaches an operator that jog keys sometimes do
    // nothing, which is the last thing to believe about a machine — and it is
    // exactly what this panel did before `connected` came to mean *attached*
    // rather than "a port is open somewhere".
    // The jog card carries no header — the mockup gives it none and the keys
    // say what it is — so it is found by the thing that makes it the jog
    // card rather than by a caption that could be styled away.
    // The jog controls live on the jog screen, so the case goes there. The
    // dashboard has no jog tile — the mockup does not put one there, and a
    // case that asserted against one would be testing a layout nobody drew.
    await cncjs.page.getByRole('navigation', { name: 'Nawigacja' })
      .getByRole('button', { name: 'Jog' }).click();

    // The pad itself, not the card around it. The card also carries the help
    // button, which opens a list of keyboard shortcuts and has no business
    // being disabled by a machine being absent — reading what the keys do is
    // exactly what somebody might be doing while waiting to connect one.
    const pad = cncjs.page.getByRole('group', { name: 'Jog' });
    await expect(pad).toBeVisible();

    const keys = pad.getByRole('button');
    const count = await keys.count();
    expect(count, 'the jog pad should have keys to disable').toBeGreaterThan(6);

    for (let i = 0; i < count; i += 1) {
      await expect(keys.nth(i)).toBeDisabled();
    }
  });

  test('the rail says where you are', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Colour alone leaves anyone not looking at it unable to tell.
    await expect(rail(cncjs.page).getByRole('button', { name: 'Pulpit' }))
      .toHaveAttribute('aria-current', 'page');
  });

  /**
   * The toolpath screen, with no machine and no program.
   *
   * What it *draws* needs a controller and belongs in the hardware tier. What
   * a browser can answer on its own is that the destination is reachable, that
   * the scene mounts at all — a `<canvas>` is the one thing that fails
   * silently here, because a WebGL context that never comes up leaves the card
   * looking merely empty — and that the layers which have nothing behind them
   * say so instead of offering themselves.
   */
  test('the toolpath screen opens and puts up a canvas', async ({ cncjs }) => {
    await openPanel(cncjs.page);
    await rail(cncjs.page).getByRole('button', { name: 'Ścieżka' }).click();

    await expect(rail(cncjs.page).getByRole('button', { name: 'Ścieżka' }))
      .toHaveAttribute('aria-current', 'page');
    await expect(cncjs.page.locator('canvas')).toBeVisible();

    cncjs.expectNoPageErrors();
  });

  test('a layer with nothing behind it cannot be switched on', async ({ cncjs }) => {
    await openPanel(cncjs.page);
    await rail(cncjs.page).getByRole('button', { name: 'Ścieżka' }).click();

    const layers = cncjs.page.getByRole('group', { name: 'Warstwy' });
    await expect(layers).toBeVisible();

    // No program is loaded and no controller has reported a travel or a
    // coordinate system, so there is nothing these could draw. A button that
    // looked pressable here would draw nothing and say nothing about why.
    for (const name of [
      'Program · Tor',
      'Program · Obszar',
      'Układ · Osie',
      'Maszyna · Obszar',
    ]) {
      await expect(layers.getByRole('button', { name, exact: true })).toBeDisabled();
    }

    // Machine zero is the exception: it is zero by definition and needs
    // nothing reported, so it is offered even with no machine attached.
    await expect(
      layers.getByRole('button', { name: 'Maszyna · Osie', exact: true })
    ).toBeEnabled();
  });

  test('has a connection screen of its own, and lists the server\'s ports', async ({ cncjs }) => {
    // The reason this screen exists. Until it did, a port was opened by
    // driving the *old* application's connection widget in a headless browser
    // — `scripts/connect-machine.js` — and a panel that cannot reach a machine
    // without the thing it replaces is not a replacement.
    await openPanel(cncjs.page);
    await rail(cncjs.page).getByRole('button', { name: 'Połączenie' }).click();

    const refresh = cncjs.page.getByRole('button', { name: 'Odśwież' });
    await expect(refresh).toBeVisible();

    /*
     * Either ports or a sentence saying there are none — never both, and
     * never neither.
     *
     * Which one depends on the computer the suite runs on, and that is the
     * point: a case asserting COM3 is a case that only passes on one bench.
     * What must hold everywhere is that the screen answers the question.
     */
    const ports = cncjs.page.getByRole('button', { name: /^(COM\d+|\/dev\/)/ });
    const empty = cncjs.page.getByText(/nie ma portów szeregowych|Szukanie portów/i);
    await expect
      .poll(async () => (await ports.count()) > 0 || (await empty.count()) > 0, { timeout: 20000 })
      .toBe(true);

    cncjs.expectNoPageErrors();
  });

  test('names a port the way the driver does, and everything round it in the language', async ({ cncjs }) => {
    // Rule 8 has an edge, and this is it. `COM3` and `Arduino LLC` come from
    // the operating system; a panel that translated them would be inventing a
    // name for somebody's hardware. Everything the panel says *about* them is
    // a key — so the caption moves between languages and the port name does
    // not.
    await openPanel(cncjs.page, 'en');
    await cncjs.page
      .getByRole('navigation', { name: 'Navigation' })
      .getByRole('button', { name: 'Connection' })
      .click();
    await expect(cncjs.page.getByRole('button', { name: 'Refresh' })).toBeVisible();

    /*
     * Wait for the server's answer before deciding there is nothing to
     * compare.
     *
     * `serialport:list` is an event, not the reply to the `list` call, so the
     * rows arrive some time after the screen does. Counting them the moment
     * the Refresh button appears asks the question too early: written that
     * way this case skipped itself in a full run and passed in a run of this
     * file alone, on the same computer, with the same ports — which is a
     * green tick and a skipped tick both meaning "we did not look".
     *
     * So the wait is for the screen to have *answered*: either rows, or the
     * sentence that says there are none.
     */
    const ports = cncjs.page.getByRole('button', { name: /^(COM\d+|\/dev\/)/ });
    const none = cncjs.page.getByText(/no serial ports/i);
    await expect
      .poll(async () => (await ports.count()) > 0 || (await none.count()) > 0, { timeout: 20000 })
      .toBe(true);

    if (await ports.count() === 0) {
      // Genuinely nothing to compare. Said out loud rather than passed
      // silently: a green case that asserted nothing is the shape this suite
      // has been bitten by before.
      test.skip(true, 'this computer has no serial ports');
    }

    const english = await ports.first().innerText();
    await openPanel(cncjs.page, 'pl');
    await rail(cncjs.page).getByRole('button', { name: 'Połączenie' }).click();
    await expect(cncjs.page.getByRole('button', { name: 'Odśwież' })).toBeVisible();

    const polish = await cncjs.page
      .getByRole('button', { name: /^(COM\d+|\/dev\/)/ }).first().innerText();

    // The port's own name is the same word twice.
    expect(polish.split('\n')[0]).toBe(english.split('\n')[0]);
    // And the button beside it is not.
    await expect(cncjs.page.getByRole('button', { name: 'Refresh' })).toHaveCount(0);
  });

  test('the zeroing screen offers every axis, and not one of them with no machine', async ({ cncjs }) => {
    await openPanel(cncjs.page);
    await rail(cncjs.page).getByRole('button', { name: 'Zerowanie' }).click();

    /*
     * The face is the axis and the name is the sentence, so these are found
     * the way a screen reader would find them rather than by the letter on
     * the button. That is also the assertion: a button whose face says `X`
     * and whose name says nothing is one nobody listening can use.
     */
    for (const name of ['Zeruj X', 'Zeruj Y', 'Zeruj Z', 'Zeruj XY', 'Zeruj XYZ']) {
      const key = cncjs.page.getByRole('button', { name, exact: true });
      await expect(key).toBeVisible();
      // `G10 L20` needs a coordinate system to name and there is no
      // controller to have reported one. Dead, rather than sending a line
      // into nothing.
      await expect(key).toBeDisabled();
    }

    cncjs.expectNoPageErrors();
  });

  test('can be installed as an application, and every icon it names exists', async ({ cncjs }) => {
    /*
     * The pendant is meant to live on a phone's home screen, which means the
     * operating system reads files no part of the panel's code ever touches:
     * a manifest, three PNGs and an `apple-touch-icon`. Webpack emits them
     * only because `src/panel/assets.js` imports them, and the rule that
     * matches them is a regular expression over an absolute path — one that
     * was written with `[/]` instead of `[\/]` first and therefore matched
     * nothing at all on Windows.
     *
     * That particular mistake is loud: with no rule matching, webpack has no
     * loader for a PNG and the build fails. What this case is for is the
     * quieter version of the same thing — a generator filename changed, an
     * icon renamed in the manifest but not on disk, a path that is right in
     * development and wrong under `publicPath`. The panel works perfectly
     * without its icons, right up until somebody tries to install it.
     */
    await openPanel(cncjs.page);

    const manifestHref = await cncjs.page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestRes = await cncjs.page.request.get(new URL(manifestHref, cncjs.page.url()).href);
    expect(manifestRes.status(), 'the manifest is served').toBe(200);

    const manifest = await manifestRes.json();
    // Both, and both ending in a slash: `scope` decides what counts as being
    // "in" the application, and a scope of `/panel` would let a link to
    // `/panelling` open inside it while `/panel/` would not.
    expect(manifest.scope).toBe('/panel/');
    expect(manifest.start_url).toBe('/panel/');

    // Fullscreen, with somewhere to fall back to. A browser that does not
    // support the first takes the next one it knows rather than dropping all
    // the way to a tab with an address bar.
    expect(manifest.display).toBe('fullscreen');
    expect(manifest.display_override[0]).toBe('fullscreen');

    /*
     * The two sizes Android asks for, and a maskable one beside them.
     *
     * `any` and `maskable` are two different pictures rather than two sizes
     * of one: an `any` icon is drawn as it is and carries its own tile, a
     * maskable one is cropped to the launcher's shape and is full-bleed.
     * Shipping one as both gets it clipped on some phones and floating in a
     * white pill on others.
     */
    const purposes = manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`);
    expect(purposes).toEqual(expect.arrayContaining([
      '192x192 any', '512x512 any', '512x512 maskable',
    ]));

    // Every one of them actually there, at the URL the manifest gives.
    for (const icon of manifest.icons) {
      const href = new URL(icon.src, new URL(manifestHref, cncjs.page.url())).href;
      const res = await cncjs.page.request.get(href);
      expect(res.status(), `${icon.sizes} ${icon.purpose} is served`).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }

    // iOS reads none of the manifest and wants this instead.
    const apple = await cncjs.page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await cncjs.page.request.get(new URL(apple, cncjs.page.url()).href)).status()).toBe(200);

    cncjs.expectNoPageErrors();
  });

  test('is a control surface rather than a page: no zoom, and a colour for each theme', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Pinch-zoom leaves the jog keys half off a screen being held in one hand
    // beside a spindle. The panel answers the same need with a density
    // setting and a type scale that follows the format.
    const viewport = await cncjs.page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('user-scalable=no');
    // Under the notch rather than letterboxed beside it.
    expect(viewport).toContain('viewport-fit=cover');

    /*
     * Two `theme-color`s, one per scheme, because the manifest has room for
     * one and the panel has two themes. A single value paints a light strip
     * above a dark panel on half the phones that install it.
     *
     * Compared against the token sheet rather than against a literal: these
     * are `--panel` for each theme, and a case that hard-coded the hex would
     * go on passing after somebody changed the panel's own colour.
     */
    const themes = await cncjs.page.locator('meta[name="theme-color"]').evaluateAll(
      (nodes) => nodes.map((node) => ({ media: node.media, content: node.content.toLowerCase() }))
    );
    expect(themes).toHaveLength(2);

    const panelColour = (scheme) => cncjs.page.evaluate((want) => {
      const probe = document.createElement('div');
      probe.style.background = 'var(--panel)';
      document.body.appendChild(probe);
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      root.setAttribute('data-theme', want);
      const resolved = getComputedStyle(probe).backgroundColor;
      if (had === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', had);
      }
      probe.remove();
      return resolved;
    }, scheme);

    const asRgb = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      /* eslint-disable no-bitwise */
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
      /* eslint-enable no-bitwise */
    };

    for (const { media, content } of themes) {
      const scheme = /dark/.test(media) ? 'dark' : 'light';
      // Resolved through an element, because `--panel` is `#141a21` and
      // `getComputedStyle` answers `rgb(20, 26, 33)` — comparing the two
      // strings is an assertion that can never fail.
      expect(asRgb(content), `theme-color for ${scheme} is the panel's own colour`)
        .toBe(await panelColour(scheme));
    }

    cncjs.expectNoPageErrors();
  });

  test('is translated, rather than written in one language', async ({ cncjs }) => {
    // The whole of what a second language buys, in one case: the same panel,
    // asked for in English, says the same things in English. Without this the
    // resources would be a file of constants that nobody would notice had
    // stopped being reachable.
    await openPanel(cncjs.page, 'en');

    await expect(cncjs.page.getByRole('navigation', { name: 'Navigation' })).toBeVisible();
    await expect(bar(cncjs.page).getByText(/No connection to the controller/i)).toBeVisible();

    // And the language is a choice, not the only one there is.
    await openPanel(cncjs.page, 'pl');
    await expect(rail(cncjs.page)).toBeVisible();

    cncjs.expectNoPageErrors();
  });
});
