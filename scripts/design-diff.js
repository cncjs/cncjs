#!/usr/bin/env node

/*
 * The drawing and the running panel, in the same picture.
 *
 * Tokens can be compared by a machine (`check-design-tokens.js`). Layout
 * cannot: spacing, proportion and rhythm are exactly where a hand-transcribed
 * implementation drifts, and describing a drift in words is slow and lossy for
 * whoever has to point it out.
 *
 * So this shoots each screen twice — once from the mockup, once from the live
 * panel, both at 1024x768 — and builds one page that stacks them. The
 * difference view uses `mix-blend-mode: difference`: everything identical
 * turns black, and what is left glowing is the list of things to fix. Nobody
 * has to describe anything.
 *
 * The page also takes pins: click a spot, type a note, and the text box at the
 * bottom collects them in a form that can be pasted straight into a
 * conversation. That is the whole review loop — click, paste, fix.
 *
 * The drawing is not in this repository (see `src/panel/README.md`), so its
 * directory is passed in:
 *
 *   node scripts/design-diff.js --mockup <dir with "CNC Panel.dc.html">
 *
 * It needs the panel to be running (`yarn win-dev`, or whatever serves /panel).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};

const MOCKUP_DIR = arg('mockup', '');
const OUT = path.resolve(arg('out', path.join('output', 'design-diff')));
const URL = arg('url', 'http://localhost:8000/panel/');
const FRAME = { width: 1024, height: 768 };

// Only the screens that exist on both sides. The mockup draws eleven; adding
// one here before it is built produces a difference view that is entirely
// glowing, which says nothing.
const SCREENS = [
  { id: 'pulpit', label: 'Pulpit' },
  { id: 'jog', label: 'Jog' },
];

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const shootMockup = async (browser) => {
  const file = path.join(MOCKUP_DIR, 'CNC Panel.dc.html');
  if (!fs.existsSync(file)) {
    die(
      `No drawing at ${file}.\n\n` +
      'The mockup is not kept in this repository — it lives in the Claude\n' +
      'Design project named in src/panel/README.md. Ask Claude to pull it, then\n' +
      'point --mockup at the directory it landed in.'
    );
  }

  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(`file:///${file.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // The frame is the 1024x768 box inside a 1px border, so the drawing's own
  // chrome is not photographed along with it.
  const clip = await page.evaluate(({ width, height }) => {
    const el = Array.from(document.querySelectorAll('div')).find((d) => {
      const r = d.getBoundingClientRect();
      return Math.abs(r.width - (width + 2)) < 3 && Math.abs(r.height - (height + 2)) < 3;
    });
    if (!el) {
      return null;
    }
    const r = el.getBoundingClientRect();
    return { x: r.x + 1, y: r.y + 1, width, height };
  }, FRAME);

  if (!clip) {
    die('Could not find the mockup frame. Has the drawing changed size?');
  }

  for (const screen of SCREENS) {
    const button = page.getByRole('button', { name: new RegExp(`^${screen.label}$`, 'i') }).first();
    await button.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${screen.id}-mockup.png`), clip });
    console.log(`  drawing  ${screen.id}`);
  }

  await page.close();
};

const shootPanel = async (browser) => {
  const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 2 });
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (err) {
    die(`Could not reach ${URL} — is the panel being served?\n\n${err.message}`);
  }
  await page.waitForTimeout(3000);

  const rail = page.getByRole('navigation', { name: 'Nawigacja' });
  for (const screen of SCREENS) {
    await rail.getByRole('button', { name: screen.label }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${screen.id}-panel.png`) });
    console.log(`  panel    ${screen.id}`);
  }

  await page.close();
};

const reviewPage = () => `<!doctype html>
<meta charset="utf-8">
<title>Rysunek obok panelu</title>
<style>
  :root { color-scheme: light dark; --edge: #8a8f96; }
  body { margin: 0; padding: 24px; background: #20242a; color: #e6ecf3;
         font: 14px/1.5 'IBM Plex Sans', system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.note { margin: 0 0 24px; color: #9aa6b4; max-width: 70ch; }
  section { margin-bottom: 40px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 10px; }
  .modes { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap; }
  button.mode { background: #2c323a; color: #e6ecf3; border: 1px solid #3a424c;
                border-radius: 4px; padding: 6px 12px; cursor: pointer; font: inherit; }
  button.mode[aria-pressed="true"] { background: #1557c0; border-color: #1557c0; }
  .stage { position: relative; width: 1024px; height: 768px; background: var(--edge);
           outline: 1px solid #3a424c; cursor: crosshair; }
  .stage img { position: absolute; inset: 0; width: 1024px; height: 768px; display: block; }
  .stage img.panel { opacity: 1; }
  .stage.side { display: grid; grid-template-columns: 1fr 1fr; width: 1024px; height: 384px; }
  .stage.side img { position: static; width: 512px; height: 384px; }
  .stage.diff img.panel { mix-blend-mode: difference; }
  .stage.diff { background: #000; }
  .pin { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px;
         border-radius: 50%; background: #e04a4a; color: #fff; font-size: 12px;
         display: grid; place-items: center; font-weight: 700; pointer-events: none; }
  textarea { width: 1024px; height: 160px; margin-top: 12px; background: #171d25;
             color: #e6ecf3; border: 1px solid #3a424c; border-radius: 4px; padding: 10px;
             font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
</style>

<h1>Rysunek obok panelu</h1>
<p class="note">
  <b>Różnica</b> nakłada oba obrazy w trybie <code>difference</code>: to, co zgodne, robi się
  czarne, a świeci to, co trzeba poprawić. <b>Suwak</b> przenika jeden w drugi.
  Kliknij w dowolne miejsce, żeby wbić szpilkę z uwagą — lista na dole jest gotowa do wklejenia.
</p>

<div id="screens"></div>

<h2>Uwagi</h2>
<textarea id="out" readonly placeholder="Kliknij na obrazku, żeby dodać uwagę."></textarea>

<script>
const SCREENS = __SCREENS__;
const pins = [];

const render = () => {
  document.getElementById('out').value = pins.length
    ? pins.map((p, i) => \`\${i + 1}. [\${p.screen} \${p.x},\${p.y}] \${p.text}\`).join('\\n')
    : '';
};

SCREENS.forEach((screen) => {
  const section = document.createElement('section');
  section.innerHTML = \`
    <h2>\${screen.label}</h2>
    <div class="modes">
      <button class="mode" data-mode="diff" aria-pressed="true">Różnica</button>
      <button class="mode" data-mode="side" aria-pressed="false">Obok siebie</button>
      <button class="mode" data-mode="fade" aria-pressed="false">Przenikanie</button>
      <input type="range" min="0" max="100" value="100" hidden>
      <span class="reading"></span>
    </div>
    <div class="stage diff">
      <img class="mockup" src="\${screen.id}-mockup.png" alt="rysunek">
      <img class="panel" src="\${screen.id}-panel.png" alt="panel">
    </div>\`;
  document.getElementById('screens').appendChild(section);

  const stage = section.querySelector('.stage');
  const panel = section.querySelector('img.panel');
  const range = section.querySelector('input[type=range]');
  const reading = section.querySelector('.reading');

  section.querySelectorAll('button.mode').forEach((button) => {
    button.addEventListener('click', () => {
      section.querySelectorAll('button.mode')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      const mode = button.dataset.mode;
      stage.className = 'stage ' + (mode === 'side' ? 'side' : mode === 'diff' ? 'diff' : '');
      range.hidden = mode !== 'fade';
      reading.textContent = '';
      panel.style.opacity = mode === 'fade' ? range.value / 100 : 1;
    });
  });

  range.addEventListener('input', () => {
    panel.style.opacity = range.value / 100;
    reading.textContent = range.value + '% panelu';
  });

  stage.addEventListener('click', (event) => {
    const box = stage.getBoundingClientRect();
    const x = Math.round(event.clientX - box.left);
    const y = Math.round(event.clientY - box.top);
    const text = window.prompt(\`Co jest nie tak w tym miejscu? (\${screen.label} \${x},\${y})\`);
    if (!text) { return; }
    pins.push({ screen: screen.label, x, y, text });
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.style.left = x + 'px';
    pin.style.top = y + 'px';
    pin.textContent = String(pins.length);
    stage.appendChild(pin);
    render();
  });
});
</script>
`;

(async () => {
  if (!MOCKUP_DIR) {
    die(
      'Pass --mockup <dir>, the directory holding "CNC Panel.dc.html".\n' +
      'See src/panel/README.md for where the drawing comes from.'
    );
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    await shootMockup(browser);
    await shootPanel(browser);
  } finally {
    await browser.close();
  }

  const html = reviewPage().replace('__SCREENS__', JSON.stringify(SCREENS));
  const page = path.join(OUT, 'review.html');
  fs.writeFileSync(page, html, 'utf8');
  console.log(`\nOtwórz: ${page}\n`);
})().catch((err) => die(err.stack || err.message));
