const { test, expect } = require('./fixtures');

// The store's own localStorage key (see src/app/store/index.js).
const STORE_KEY = 'cnc';

// Stamped into the seeded blob so `normalizeState` skips its version
// migrations and leaves the seed alone.
const STORE_VERSION = require('../package.json').version;

/**
 * Two widgets that render nothing at all in a default install: the custom
 * widget has no URL and the webcam is switched off. Neither has ever been
 * covered by a tier, and both reach into the DOM through a ref that used to
 * be a `findDOMNode` call, which is why they are worth the seeding.
 *
 * `app/store` reads localStorage once at module evaluation, so the seed goes
 * in through `addInitScript` and before the first navigation — the same
 * reason `visualizer-fixtures.js` does it that way.
 *
 * Both point at the app's own badge image: same-origin, tiny, and — unlike
 * /favicon.ico, which serve-favicon answers only on an exact match — it still
 * answers once the widget has appended its token to the query string.
 */
const seedWidgets = (page, widgets) => page.addInitScript(({ key, version, widgets: seeded }) => {
  window.localStorage.setItem(key, JSON.stringify({
    version,
    state: {
      workspace: {
        container: {
          secondary: {
            show: true,
            widgets: [
              'axes', 'gcode', 'macro', 'autolevel', 'probe', 'tool', 'spindle', 'laser',
              'custom',
            ],
          },
        },
      },
      widgets: seeded,
    },
  }));
}, { key: STORE_KEY, version: STORE_VERSION, widgets });

test.describe('widgets that need configuring first', () => {
  /**
   * The custom widget frames a URL the operator typed, so what matters is not
   * only that the frame appears but what it is allowed to do. Until this
   * change the element came from @trendmicro/react-iframe and these four
   * attributes were that package's defaults; they are now spelled out in the
   * widget, so this is what says they still say the same thing. The sandbox
   * especially: losing it would be silent, and it is the only thing standing
   * between a typed-in URL and the rest of the app.
   */
  test('frames the custom widget URL with the same sandbox it always had', async ({ cncjs }) => {
    await seedWidgets(cncjs.page, {
      custom: {
        disabled: false,
        minimized: false,
        title: 'E2E Custom',
        url: '/images/logo-badge-32x32.png',
      },
    });
    await cncjs.gotoWorkspace();

    const frame = cncjs.page.locator('[data-widget-id="custom"] iframe');

    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('src', /logo-badge-32x32\.png\?token=/);
    await expect(frame).toHaveAttribute('width', '100%');
    await expect(frame).toHaveAttribute('height', '100%');
    await expect(frame).toHaveAttribute(
      'sandbox',
      'allow-forms allow-modals allow-popups allow-same-origin allow-scripts'
    );
    await expect(frame).toHaveCSS('border-top-width', '0px');

    cncjs.expectNoPageErrors();
  });

  /**
   * Refresh on the webcam widget clears the <img> src and puts it back a tick
   * later, which is the whole of its "reload the stream" behaviour. It only
   * works if the widget is holding the image element itself, so recording the
   * src attribute as it changes is the assertion: a ref pointing at the React
   * component instead would leave the attribute untouched and the test would
   * see nothing happen at all.
   */
  test('reloads the webcam image through the element itself', async ({ cncjs }) => {
    await seedWidgets(cncjs.page, {
      webcam: {
        disabled: false,
        minimized: false,
        mediaSource: 'stream',
        url: '/images/logo-badge-32x32.png',
        geometry: { scale: 1, rotation: 0, flipHorizontally: false, flipVertically: false },
        crosshair: false,
        muted: true,
      },
    });
    await cncjs.gotoWorkspace();

    const image = cncjs.page.locator('[data-widget-id="webcam"] img');
    await expect(image).toBeVisible();

    await cncjs.page.evaluate(() => {
      const el = document.querySelector('[data-widget-id="webcam"] img');
      window.__srcChanges = [];
      new MutationObserver(() => {
        window.__srcChanges.push(el.getAttribute('src'));
      }).observe(el, { attributes: true, attributeFilter: ['src'] });
    });

    await cncjs.page
      .locator('[data-widget-id="webcam"]')
      .getByRole('button', { name: 'Refresh' })
      .click();

    // Cleared, then restored. Anything less means the click never reached an
    // element at all.
    await expect
      .poll(() => cncjs.page.evaluate(() => window.__srcChanges))
      .toEqual(['', expect.stringContaining('logo-badge-32x32.png')]);

    cncjs.expectNoPageErrors();
  });
});
