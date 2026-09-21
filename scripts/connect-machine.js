#!/usr/bin/env node

/*
 * Open the machine's port and leave it open, so the panel has something real
 * to be reviewed against.
 *
 * Disconnected, most of the panel is greyed out and says `–`. That is a
 * legitimate state and it has its own cases, but it is a poor thing to review
 * a design in: half the controls cannot be pressed, every reading is a dash,
 * and the selected step is a colour nobody can judge at 45% opacity.
 *
 * The panel has no connection screen yet — `design/README.md` lists it as the
 * gap the drawing does not cover — so this opens the port the way the hardware
 * tier does, by driving the old application's connection widget. The port then
 * stays open after the browser goes, which is a defect in the old application
 * and for once a useful one.
 *
 *   node scripts/connect-machine.js --port COM3
 *   node scripts/connect-machine.js --close
 *
 * Only ever opens a port. It sends no motion, no homing and no unlock: what is
 * on the other end is the operator's business, not this script's.
 */
const { chromium } = require('playwright-core');

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] && !process.argv[at + 1].startsWith('--')
    ? process.argv[at + 1]
    : fallback;
};

const PORT = arg('port', process.env.CNCJS_TEST_PORT || 'COM3');
const BAUD = arg('baud', '115200');
const APP = arg('app', 'http://localhost:8000/');
const CLOSING = process.argv.includes('--close');

const controllers = async (page) => page.evaluate(async () => {
  const raw = window.localStorage.getItem('cnc') || '{}';
  let token = '';
  try {
    token = JSON.parse(raw)?.state?.session?.token || '';
  } catch (err) {
    token = '';
  }
  const res = await fetch('/api/controllers', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
});

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  const widget = page.locator('[data-widget-id="connection"]');
  await widget.waitFor({ timeout: 45000 });

  const close = widget.getByRole('button', { name: /^Close$/ });
  const open = widget.getByRole('button', { name: /^Open$/ });

  if (CLOSING) {
    /*
     * The order matters. "Connect automatically" reopens the port about a
     * tenth of a second after it is closed, so closing first and unticking
     * afterwards leaves the port open and the log full of reconnects.
     */
    const auto = widget.getByLabel(/connect automatically/i);
    if (await auto.isChecked().catch(() => false)) {
      await auto.uncheck();
    }
    if (await close.isVisible().catch(() => false)) {
      await close.click();
      await open.waitFor({ timeout: 20000 });
    }
    console.log(`Port zamknięty. /api/controllers: ${JSON.stringify(await controllers(page))}`);
    await browser.close();
    return;
  }

  if (await close.isVisible().catch(() => false)) {
    console.log('Port był już otwarty.');
  } else {
    await widget.getByText(/choose a port/i).click();
    await page.getByRole('option', { name: new RegExp(PORT, 'i') }).first().click();
    await open.click();
    await close.waitFor({ timeout: 30000 });
    console.log(`Otwarty ${PORT} @ ${BAUD}.`);
  }

  const state = await controllers(page);
  console.log(`/api/controllers: ${JSON.stringify(state)}`);
  await browser.close();

  if (!Array.isArray(state) || !state.length || !state[0].port) {
    console.error('\nSerwer nie zgłasza otwartego portu — panel nie zobaczy maszyny.\n');
    process.exit(1);
  }
  console.log('\nPanel podłączy się sam. Odśwież /panel/.\n');
})().catch((err) => {
  console.error(`\n${err.stack || err.message}\n`);
  process.exit(1);
});
