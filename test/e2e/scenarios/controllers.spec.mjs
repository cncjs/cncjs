/* Controller panels must settle sequentially before the next panel is inspected. */
/* eslint-disable no-await-in-loop */
import { test, expect, widget } from '../support/controller-snapshot.mjs';
import { capture } from '../support/screenshots.mjs';

const snapshots = [
  {
    id: 'tinyg',
    type: 'TinyG',
    settings: { fv: 0.99, mfo: 1, sso: 1, mto: 1 },
    state: {
      feedrate: 1200,
      velocity: 500,
      line: 4,
      machineState: 1,
      modal: { units: 'G21', distance: 'G90' },
      pwr: { 1: 0.5 },
      qr: 28,
    },
    titles: ['Power Management', 'Queue Reports', 'Status Reports', 'Modal Groups'],
  },
  {
    id: 'smoothie',
    type: 'Smoothie',
    settings: { version: 'edge' },
    state: {
      parserstate: { feedrate: 1200, spindle: 8000, tool: 1, modal: { units: 'G21' } },
      status: { machineState: 'Idle', ovF: 100, ovS: 100, mpos: { x: 0, y: 0, z: 0 }, wpos: { x: 0, y: 0, z: 0 } },
    },
    titles: ['Status Reports', 'Modal Groups'],
  },
  {
    id: 'marlin',
    type: 'Marlin',
    settings: { baudrate: 115200 },
    state: {
      extruder: { deg: 20, degTarget: 200, power: 64 },
      heatedBed: { deg: 25, degTarget: 60, power: 32 },
      feedrate: 1200,
      spindle: 8000,
      ovF: 100,
      ovS: 100,
      modal: { units: 'G21' },
      pos: { x: 0, y: 0, z: 0 },
    },
    titles: ['Heater Control', 'Status Reports', 'Modal Groups'],
  },
];

for (const snapshot of snapshots) {
  test(`controller snapshot: ${snapshot.type} has joined report borders and usable controls`, async ({ page, controllerSnapshot }, testInfo) => {
    controllerSnapshot(snapshot);
    const card = widget(page, snapshot.id);
    for (const title of snapshot.titles) {
      await expect(card.getByRole('button', { name: title, exact: true })).toBeVisible();
    }
    const panels = card.locator('[data-tonic="Accordion"]');
    await expect(panels).toHaveCount(snapshot.titles.length);
    const borders = await panels.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return ['top', 'right', 'bottom', 'left'].map(side => parseFloat(style.getPropertyValue(`border-${side}-width`)));
    }));
    borders.forEach((border, index) => expect(border).toEqual([index === 0 ? 1 : 0, 1, 1, 1]));
    const bounds = await card.evaluate(element => ({ width: element.clientWidth, content: element.scrollWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);

    const firstPanel = card.getByRole('button', { name: snapshot.titles[0], exact: true });
    const body = page.locator(`[id="${await firstPanel.getAttribute('aria-controls')}"]`);
    const wasExpanded = await body.isVisible();
    await firstPanel.click();
    if (wasExpanded) {
      await expect(body).toBeHidden();
    } else {
      await expect(body).toBeVisible();
    }
    await expect(panels.first()).toHaveCSS('border-left-width', '1px');
    await firstPanel.click();
    if (wasExpanded) {
      await expect(body).toBeVisible();
    } else {
      await expect(body).toBeHidden();
    }

    if (snapshot.id === 'marlin') {
      const heaterPanel = card.getByRole('button', { name: 'Heater Control', exact: true });
      if (await heaterPanel.getAttribute('aria-expanded') !== 'true') {
        await heaterPanel.click();
      }
      const extruder = card.getByRole('spinbutton', { name: 'Extruder', exact: true });
      await extruder.fill('215');
      await expect(extruder).toHaveValue('215');
      const group = extruder.locator('xpath=ancestor::*[@data-tonic="InputGroup"][1]');
      await expect(group.getByText('°C', { exact: true })).toBeVisible();
      await extruder.clear();
      await expect(card.getByTitle('Set the target temperature for the extruder', { exact: true })).toBeDisabled();
      await extruder.fill('200');
      for (const value of ['64', '32']) {
        const progress = card.getByRole('progressbar', { name: value, exact: true });
        const readout = progress.locator('..').getByText(value, { exact: true });
        const barBounds = await progress.boundingBox();
        const textBounds = await readout.boundingBox();
        expect(textBounds.y, 'Heater power value does not overlap its bar').toBeGreaterThanOrEqual(barBounds.y + barBounds.height);
      }
    }
    await card.getByRole('button', { name: `${snapshot.type} controller info`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    const assertPanelSpacing = async () => {
      const tabs = await dialog.getByRole('tablist').boundingBox();
      const panel = await dialog.getByRole('tabpanel').boundingBox();
      expect(panel.y - tabs.y - tabs.height).toBe(8);
      expect(panel.x - tabs.x).toBe(12);
      expect(tabs.x + tabs.width - panel.x - panel.width).toBe(12);
    };
    await assertPanelSpacing();
    await expect(dialog.getByRole('tabpanel')).toContainText('1200');
    await dialog.getByRole('tab', { name: 'Controller Settings', exact: true }).click();
    await assertPanelSpacing();
    await expect(dialog.getByRole('tabpanel')).toContainText(Object.keys(snapshot.settings)[0]);
    await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
    await capture(card, testInfo, snapshot.id);
  });
}
