import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const suites = {
  all: [],
  widgets: ['widgets.spec.mjs', 'controllers.spec.mjs', 'axes-settings.spec.mjs', 'widget-modals.spec.mjs', 'axes-menus.spec.mjs', 'widget-menus.spec.mjs'],
  visualizer: ['visualizer.spec.mjs', 'simulator.spec.mjs'],
  navigation: ['bootstrap.spec.mjs', 'navigation.spec.mjs', 'commands-menu.spec.mjs', 'table-refresh.spec.mjs', 'app-drawers.spec.mjs', 'app-menus.spec.mjs'],
  administration: ['navigation.spec.mjs', 'table-refresh.spec.mjs', 'app-drawers.spec.mjs', 'app-menus.spec.mjs', '--grep', 'administration (routes|table loading|modal|dropdown:)'],
  workspace: ['workspace.spec.mjs', 'layout.spec.mjs', 'workspace-modals.spec.mjs'],
  safety: ['socket-safety.spec.mjs'],
};
const suite = args[0] && !args[0].startsWith('-') ? args.shift() : 'all';
if (!Object.hasOwn(suites, suite)) {
  throw new Error(`Unknown e2e suite "${suite}". Use ${Object.keys(suites).join(', ')}.`);
}
const child = spawn(process.execPath, [
  require.resolve('@playwright/test/cli'),
  'test', '--config', 'test/e2e/playwright.config.mjs', ...suites[suite], ...args,
], {
  cwd: fileURLToPath(new URL('../../', import.meta.url)),
  stdio: 'inherit',
  env: process.env,
});
child.once('error', error => {
  throw error;
});
child.once('exit', code => {
  process.exitCode = code ?? 1;
});
