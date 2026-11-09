import { devNull } from 'node:os';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const reports = process.env.E2E_REPORTS === '1';
const authenticated = Boolean(process.env.E2E_USERNAME || process.env.E2E_PASSWORD);
process.env.PLAYWRIGHT_LAST_RUN_OUTPUT_FILE = devNull;

export default defineConfig({
  testDir: './scenarios',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: `${root}output/e2e/results`,
  preserveOutput: reports ? 'failures-only' : 'never',
  reporter: [
    ['list'],
    ['json', { outputFile: `${root}output/e2e/results.json` }],
    ...(reports ? [['html', { open: 'never', outputFolder: `${root}output/e2e/report` }]] : []),
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8000',
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: reports && !authenticated ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: process.env.E2E_BROWSER_PATH
      ? { executablePath: process.env.E2E_BROWSER_PATH }
      : {},
  },
  projects: ['light', 'dark'].map(colorScheme => ({
    name: colorScheme,
    use: { colorScheme },
  })),
});
