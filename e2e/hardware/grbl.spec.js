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

  test('jogging X updates the work position and returns to origin', async ({ grbl, cncjs }) => {
    await grbl.connect();

    const before = await grbl.workPosition('X').textContent();

    await grbl.jog('X+');
    await expect(grbl.workPosition('X')).not.toHaveText(before);

    await grbl.jog('X-');
    await expect(grbl.workPosition('X')).toHaveText(before);

    cncjs.expectNoPageErrors();
  });

  test('jogging moves each axis by the step shown in the keypad', async ({ grbl }) => {
    await grbl.connect();
    const step = await grbl.jogStep();

    for (const axis of ['X', 'Y', 'Z']) {
      const start = parseFloat(await grbl.workPosition(axis).textContent());

      await grbl.jog(`${axis}+`);
      await expect
        .poll(async () => parseFloat(await grbl.workPosition(axis).textContent()))
        .toBeCloseTo(start + step, 2);

      await grbl.jog(`${axis}-`);
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

    await grbl.jog('X+');

    const machine = parseFloat(await grbl.machinePosition('X').textContent());
    const work = parseFloat(await grbl.workPosition('X').textContent());
    expect(machine).toBeCloseTo(work, 2);

    await grbl.jog('X-');
  });
});
