const { defineConfig, devices } = require('@playwright/test');

// The suite runs against an already-running cncjs instance. Point it elsewhere
// with CNCJS_URL, e.g. when testing a production build on a different port.
const baseURL = process.env.CNCJS_URL || 'http://localhost:8000';

module.exports = defineConfig({
  testDir: './e2e',
  // The workspace mounts 15 widgets including a Three.js visualizer, so the
  // first paint is slow on a cold bundle.
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },
  // Widgets share persisted state in localStorage; running specs in parallel
  // against one server makes them clobber each other.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    viewport: { width: 1600, height: 1000 },
    actionTimeout: 15 * 1000,
    navigationTimeout: 60 * 1000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // 'chromium' selects the full browser rather than the headless shell,
      // which has no WebGL — the Visualizer widget needs it to render.
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
});
