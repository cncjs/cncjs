const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(
  !TEST_PORT,
  'Set CNCJS_TEST_PORT to the controller\'s serial port (e.g. COM3) to run the hardware tier.'
);

test.describe('grbl controller', () => {
  test('connects and reports an idle controller', async ({ grbl, cncjs }) => {
    await grbl.connect();

    await expect(grbl.connection.getByText(TEST_PORT, { exact: true })).toBeVisible();
    await expect(grbl.controllerState).toHaveText(/idle/i);

    const state = await grbl.readControllerState();
    expect(state, `no controller reported on ${TEST_PORT}`).not.toBeNull();
    expect(state.ready).toBe(true);
    expect(state.controller.type).toBe('Grbl');
    // Grbl reports its version in the welcome banner; an empty version means
    // the handshake never completed.
    expect(state.controller.settings.version).toMatch(/^\d+\.\d+/);

    cncjs.expectNoPageErrors();
  });

  test('reports the firmware settings it read at startup', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const settings = state.controller.settings.settings;

    // $100-$102 are steps/mm — every Grbl build reports them, so their absence
    // means the settings query never round-tripped.
    for (const key of ['$100', '$101', '$102']) {
      expect(settings[key], `${key} should have been read from the firmware`).toBeDefined();
    }
  });

  test('opening the port leaves the jog controls usable', async ({ grbl, cncjs }) => {
    await grbl.connect();

    // Regression guard. `lib/controller/Controller.js` dispatches socket events
    // to its listeners with a plain forEach, so one throwing listener silences
    // every widget registered after it. A broken console widget used to leave
    // the whole workspace connected but unjoggable, with nothing in the UI to
    // suggest why.
    await expect(grbl.axes.locator('[title="Move X+"]')).toBeEnabled();
    cncjs.expectNoPageErrors();
  });

  /*
   * Away from machine zero first, and back second. Every jog below.
   *
   * The travel lies in `[-range, 0]`, so machine zero is a *corner* of the
   * envelope rather than the middle of it, and opening the port resets the
   * controller to `mpos 0,0,0` — right on that corner. A `+` move from there
   * asks to leave the envelope, and with `$20=1` Grbl does not clip it: it
   * raises `ALARM:2 (Soft limit)` and answers `[MSG:Reset to continue]`.
   *
   * Which is worse than one failing case. That alarm does not come off with
   * `$X`, so every later case in the tier — in this file and in the three
   * after it — fails in `connect`, reporting that the controller stayed in
   * alarm and blaming a stale controller in the server. Thirteen failures,
   * one cause, and the message pointing away from it. Measured 2026-09-23 on
   * the wire: `G0 X1` answered `ok` and then `ALARM:2` a millisecond later.
   *
   * These cases passed until now only because the machine happened to be
   * parked in the middle of its envelope by whoever ran the tier last. The
   * same trap was found and fixed in `panel.spec.js` on 2026-09-23; this file
   * has jogged `+` first since the tier was written and was never revisited.
   */
  test('jogging X updates the work position and returns to origin', async ({ grbl, cncjs }) => {
    await grbl.connect();

    const before = await grbl.workPosition('X').textContent();

    await grbl.jog('X-');
    await expect(grbl.workPosition('X')).not.toHaveText(before);

    await grbl.jog('X+');
    await expect(grbl.workPosition('X')).toHaveText(before);

    cncjs.expectNoPageErrors();
  });

  test('jogging moves each axis by the step shown in the keypad', async ({ grbl }) => {
    await grbl.connect();
    const step = await grbl.jogStep();

    for (const axis of ['X', 'Y', 'Z']) {
      const start = parseFloat(await grbl.workPosition(axis).textContent());

      // Negative first — see the comment above the previous case. Z is no
      // exception: its travel is `[-150, 0]` like the others.
      await grbl.jog(`${axis}-`);
      await expect
        .poll(async () => parseFloat(await grbl.workPosition(axis).textContent()))
        .toBeCloseTo(start - step, 2);

      await grbl.jog(`${axis}+`);
      await expect
        .poll(async () => parseFloat(await grbl.workPosition(axis).textContent()))
        .toBeCloseTo(start, 2);
    }
  });

  test('machine and work position move together without a work offset', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const wco = state.controller.state.status.wco;
    test.skip(
      parseFloat(wco.x) !== 0,
      'a work coordinate offset is set, so machine and work position legitimately differ'
    );

    // Negative first — see the comment above the first jogging case.
    await grbl.jog('X-');

    const machine = parseFloat(await grbl.machinePosition('X').textContent());
    const work = parseFloat(await grbl.workPosition('X').textContent());
    expect(machine).toBeCloseTo(work, 2);

    await grbl.jog('X+');
  });
});
