# BR0 browser retry checkpoint

- Active step: connect setup, after clicking the existing `Choose a port` control.
- Attempted operation: locate and click the `/tmp/ttyGRBL` option using Playwright `getByRole('option').filter({ hasText: '/tmp/ttyGRBL' })`.
- Timeout: 8,000 ms action-level timeout.
- Exact failure: `locator.click: Timeout 8000ms exceeded` while waiting for `getByRole('option').filter({ hasText: '/tmp/ttyGRBL' })`.
- Consequence: the controller was not connected in this attempt; jog, disconnect, large-fixture Stop, Watch Directory, and Macro gates were not reached.
- Browser surface: in-app browser backend reported `No browser is available`; direct fallback used ChatGPT-bundled Playwright with bundled Chromium 151, never system Chrome.
- Existing evidence written before failure: `baseline.json`, `baseline-1440x900.png`, `01-before-connect.png`.
- No source, status, handoff, execution-log, package, or commit files were modified.
