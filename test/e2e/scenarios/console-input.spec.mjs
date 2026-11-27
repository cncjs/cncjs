import { test, expect, widget } from '../support/simulator.mjs';
import { capture } from '../support/screenshots.mjs';

async function selectMenuItem(page, root, name) {
  await root.getByRole('button', { name: 'More options' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeFocused();
  await expect(menu.locator('[data-tonic="Collapse"]').first()).toHaveCSS('overflow', 'visible');
  await page.getByRole('menuitem', { name, exact: true }).click();
}

async function readConsole(page, root) {
  await selectMenuItem(page, root, 'Select All');
  const text = await root.locator('.xterm-helper-textarea').evaluate(element => {
    const clipboardData = new DataTransfer();
    element.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData }));
    return clipboardData.getData('text/plain');
  });
  await selectMenuItem(page, root, 'Clear Selection');
  return text.trim();
}

test('console touch input: persists mode and sends each submission once', async ({ page, simulator }, testInfo) => {
  const consoleWidget = widget(page, 'console');
  await consoleWidget.getByRole('button', { name: 'Show command input', exact: true }).click();
  const input = consoleWidget.getByRole('textbox', { name: 'Command', exact: true });
  await expect(input).toBeVisible();
  await expect(consoleWidget.getByRole('button', { name: 'Hide command input' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cnc')).state.widgets.console.commandInput)).toBe(true);
  await input.fill('G4 P0.011');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await expect.poll(() => simulator.commands.filter(line => line.includes('CMD: G4 P0.011 ->')).length).toBe(1);
  await input.fill('G4 P0.012');
  await consoleWidget.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => simulator.commands.filter(line => line.includes('CMD: G4 P0.012 ->')).length).toBe(1);
  await expect.poll(() => readConsole(page, consoleWidget)).toBe('> G4 P0.011\nok\n> G4 P0.012\nok');
  await capture(consoleWidget, testInfo, 'console-touch-output');
  await consoleWidget.getByRole('button', { name: 'Clear console' }).click();
  expect(await readConsole(page, consoleWidget)).toBe('');
  await capture(consoleWidget, testInfo, 'console-touch-cleared');
  await consoleWidget.getByRole('button', { name: 'Hide command input' }).click();
  const terminal = consoleWidget.locator('.xterm-helper-textarea');
  await expect(terminal).not.toHaveAttribute('readonly');
  await terminal.focus();
  await page.keyboard.type('G4 P0.013');
  await page.keyboard.press('Enter');
  await expect.poll(() => simulator.commands.filter(line => line.includes('CMD: G4 P0.013 ->')).length).toBe(1);
  await consoleWidget.getByRole('button', { name: 'Clear console' }).click();
  expect(await readConsole(page, consoleWidget)).toBe('>');
  await capture(consoleWidget, testInfo, 'console-keyboard-cleared');
  await consoleWidget.getByRole('button', { name: 'Show command input' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cnc')).state.widgets.console.commandInput)).toBe(true);
  await consoleWidget.getByRole('button', { name: 'More options' }).click();
  const forkItem = page.getByRole('menuitem', { name: 'Fork Widget', exact: true });
  await expect(forkItem).toBeVisible();
  await forkItem.click();
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
  const fork = page.locator('[data-widget-id^="console:"]');
  await expect(fork).toHaveCount(1);
  await fork.getByRole('button', { name: 'Hide command input' }).click();
  const forkId = await fork.getAttribute('data-widget-id');
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('cnc')).state.widgets[id].commandInput, forkId)).toBe(false);
  await page.reload();
  await expect(widget(page, 'console').getByRole('button', { name: 'Hide command input' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-widget-id^="console:"]').getByRole('button', { name: 'Show command input' })).toHaveAttribute('aria-pressed', 'false');
  expect(simulator.commands.filter(line => /CMD: G4 P0\.01[123] ->/.test(line))).toHaveLength(3);
});
