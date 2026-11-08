import { test, expect, widget } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

async function expectLoadingTheme(page, mode) {
  await expect(page.locator('#loading')).toBeVisible();
  await expect(page.locator('#loading [role="progressbar"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', mode);
  const colors = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    const paint = color => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
    };
    const brightness = () => [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      .reduce((sum, value) => sum + value, 0) / 3;
    paint('white');
    paint(getComputedStyle(document.documentElement).backgroundColor);
    paint(getComputedStyle(document.body).backgroundColor);
    const background = brightness();
    paint(getComputedStyle(document.querySelector('#loading')).color);
    return { background, foreground: brightness() };
  });
  if (mode === 'dark') {
    expect(colors.background, 'Loading viewport has a dark background').toBeLessThan(64);
    expect(colors.foreground, 'Loading text stays legible').toBeGreaterThan(128);
  } else {
    expect(colors.background, 'Loading viewport has a light background').toBeGreaterThan(230);
    expect(colors.foreground, 'Loading text stays legible').toBeLessThan(128);
  }
}

for (const storage of ['saved', 'auto', 'missing', 'invalid', 'unavailable']) {
  test(`bootstrap: ${storage} appearance paints the loading screen correctly before React and after refresh`, async ({ page, context, baseURL, authenticatedSession }, testInfo) => {
    const mode = testInfo.project.name;
    if (storage === 'saved') {
      await page.emulateMedia({ colorScheme: mode === 'dark' ? 'light' : 'dark' });
    }
    await context.addInitScript(({ storage, mode, origin, session }) => {
      if (window.location.origin !== origin) {
        return;
      }
      // This also prevents the shared fixture's seed from overwriting this boundary case.
      localStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('cnc', JSON.stringify({
        version: '2.0.0-dev',
        state: {
          session: session || {},
          settings: { appearance: storage === 'auto' ? 'auto' : mode, language: 'en' },
          widgets: { connection: { autoReconnect: false } },
        },
      }));
      if (storage === 'missing') {
        localStorage.removeItem('cnc');
      }
      if (storage === 'invalid') {
        localStorage.setItem('cnc', '{invalid');
      }
      if (storage === 'unavailable') {
        const getItem = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
          if (key === 'cnc') {
            throw new DOMException('Storage unavailable', 'SecurityError');
          }
          return getItem.call(this, key);
        };
      }
    }, { storage, mode, origin: new URL(baseURL).origin, session: authenticatedSession });
    // Keep the real HTML, CSS and inline bootstrap, but prevent React from masking first-paint errors.
    await page.route('**/*.bundle.js', route => route.abort('blockedbyclient'));
    await page.goto('/#/workspace');
    await expectLoadingTheme(page, mode);
    await page.reload();
    await expectLoadingTheme(page, mode);
    await capture(page, testInfo, `bootstrap-${storage}`);
    if (storage === 'saved') {
      await page.unroute('**/*.bundle.js');
      await page.reload();
      await expect(widget(page, 'connection')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-color-scheme', mode);
      await expect(page.locator('#loading')).toHaveCount(0);
    }
  });
}
