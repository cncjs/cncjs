#!/usr/bin/env node

/*
 * Rasterise the panel's icons.
 *
 *   node scripts/panel-icons.js
 *
 * The SVGs in `src/panel/icons` are the source; the PNGs beside them are
 * derived and committed. Committed because a manifest cannot reference
 * something that is not there and neither Android nor iOS will take an SVG
 * for every slot — iOS ignores the manifest entirely and wants a PNG at
 * `apple-touch-icon`. Derived, and the derivation lives here rather than in
 * somebody's memory of which sizes were exported that afternoon.
 *
 * It rasterises with the Chromium that Playwright already installs. `sharp`
 * would be one line shorter and a native dependency for four files that
 * change about once a year — and the browser is the thing that will actually
 * be rendering these, so it is also the most honest renderer to measure
 * against.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ICONS = path.resolve(__dirname, '..', 'src', 'panel', 'icons');

/**
 * Which PNGs the manifest and `index.html` name.
 *
 * `any` and `maskable` are two different pictures, not two sizes of one. An
 * `any` icon is shown as drawn, so it carries its own rounded tile; a
 * maskable one is cropped to whatever shape the launcher likes, so it is
 * full-bleed with the mark pulled into the safe circle. Shipping one as both
 * gets it either clipped or floating in a white pill, depending on the phone.
 */
const WANTED = [
  { from: 'tile.svg', to: 'icon-192.png', size: 192 },
  { from: 'tile.svg', to: 'icon-512.png', size: 512 },
  { from: 'maskable.svg', to: 'icon-maskable-512.png', size: 512 },
  // iOS ignores the manifest and reads `<link rel="apple-touch-icon">`, which
  // has to be a PNG and is masked by the system. 180 is what a modern iPhone
  // asks for.
  { from: 'tile.svg', to: 'apple-touch-icon.png', size: 180 },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });

  for (const { from, to, size } of WANTED) {
    const svg = fs.readFileSync(path.join(ICONS, from), 'utf8');
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      // Rendered at 1:1 and screenshotted at 1:1. A device scale factor would
      // produce a file twice the size it claims to be, which is exactly the
      // kind of thing nobody notices until a launcher blurs it.
      deviceScaleFactor: 1,
    });

    await page.setContent(
      // No margin and no background: the SVG fills the frame and brings its
      // own. `background: transparent` so a mark drawn without one stays
      // without one rather than picking up the browser's white.
      `<style>html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
      { waitUntil: 'load' }
    );

    const file = path.join(ICONS, to);
    await page.screenshot({ path: file, omitBackground: true });
    await page.close();

    const { size: bytes } = fs.statSync(file);
    console.log(`${to.padEnd(26)} ${size}x${size}  ${(bytes / 1024).toFixed(1)} KB  from ${from}`);
  }

  await browser.close();
})();
