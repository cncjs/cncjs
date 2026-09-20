const { test, expect, TEST_PORT } = require('./fixtures');

/**
 * The panel with a controller answering.
 *
 * This is the half a browser cannot reach on its own, and it is the case that
 * proves the whole chain: a second webpack entry, a second React, one socket
 * client shared with the old application, and a machine on a serial port at
 * the end of it.
 *
 * **Nothing here moves the machine.** The panel is opened, read, and closed.
 * The stop is never pressed: it sends a feed hold and a soft reset, and
 * resetting the controller mid-tier would leave every case after it looking at
 * a machine that had just rebooted.
 *
 * The port is opened through the old application, because the panel has no
 * connection screen yet — which is the first item on its own TODO.
 */
test.describe('panel, connected', () => {
  test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

  const bar = (page) => page.getByRole('navigation', { name: 'Machine bar' });
  const workPosition = (page) => page.locator('section').filter({ hasText: /work position/i }).first();

  /** The panel, in its own page, with the machine already connected. */
  const openPanel = async (grbl, context) => {
    await grbl.connect();
    const panel = await context.newPage();
    await panel.goto('/panel/', { waitUntil: 'domcontentloaded' });
    await expect(bar(panel)).toBeVisible({ timeout: 45000 });
    return panel;
  };

  test('sees a machine that was already connected when it loaded', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    // The trap this guards is the protocol, not a race. `serialport:open`
    // fires once, when the port is opened, and a page loaded afterwards never
    // hears it — so a client that only listens shows "Disconnected" beside a
    // running spindle, for as long as it stays up. The panel asks
    // `/api/controllers` once on startup instead.
    //
    // The old application does *not* do this and has the defect: load it
    // against an already-open port and its Connection widget still offers
    // "Open".
    await expect(bar(panel)).not.toContainText(/disconnected/i);
    await expect(bar(panel)).toContainText(TEST_PORT);
  });

  test('shows the state the controller reports', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    const state = await grbl.readControllerState();
    const activeState = state.controller.state.status.activeState;
    expect(activeState, 'the controller reported no active state').toBeTruthy();

    // Compared against the controller's own report rather than the literal
    // "Idle", so the case still means something on a machine in another state.
    await expect(bar(panel)).toContainText(new RegExp(activeState, 'i'));
  });

  test('reads the work position the controller reports', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    const state = await grbl.readControllerState();
    const wpos = state.controller.state.status.wpos;

    // Three decimals, fixed, because a reading whose digits move as the value
    // changes cannot be read while the machine is moving — which is the only
    // time anyone looks at it.
    for (const axis of ['x', 'y', 'z']) {
      await expect(
        workPosition(panel),
        `${axis.toUpperCase()} should read what the controller reported`
      ).toContainText(Number(wpos[axis]).toFixed(3));
    }
  });

  test('the stop can be pressed once there is something to stop', async ({ grbl, context }) => {
    const panel = await openPanel(grbl, context);

    // Enabled, and deliberately not pressed. That it becomes pressable is the
    // behaviour; what it does when pressed is covered by unit cases, because
    // a soft reset in the middle of a tier reboots the controller under every
    // case that follows.
    await expect(bar(panel).getByRole('button', { name: /^Stop$/i })).toBeEnabled();
  });
});
