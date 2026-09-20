const { test, expect, TEST_PORT } = require('./fixtures');

/**
 * What the Grbl widget says once a controller is on the other end.
 *
 * This is almost all of the widget. With no port open it renders a title bar
 * and nothing else — see `e2e/grbl-widget.spec.js` — so the state, the
 * readings, the modal groups and the override controls are all only reachable
 * here.
 *
 * **Nothing here moves the machine.** One case adjusts the feed and rapid
 * override percentages, which is the only thing in this widget that writes to
 * the controller. An override scales a motion that is already running; with
 * the machine idle it changes a number in a status report and nothing else,
 * and the case restores both to 100% before it ends. Homing, unlock and sleep
 * live in the commands menu and are never clicked.
 *
 * Written before the widget is rebuilt on the new component library, so it
 * asserts on what the widget says and on the relationships between its
 * readings and the controller's own state, rather than on the markup that
 * happens to carry them today. `data-reading` is the one structural hook,
 * added alongside this spec because without it a rebuild could swap Spindle
 * and Tool Number and every assertion would stay green.
 */
test.describe('grbl widget, connected', () => {
  test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

  const widget = (page) => page.locator('[data-widget-id="grbl"]');
  const reading = (page, key) => widget(page).locator(`[data-reading="${key}"]`);
  // The override figure is a reading like any other, so it carries the same
  // hook the status readings do. It was `data-override` while the widget still
  // had its own markup; the component library has one way of naming a value
  // and two would have drifted.
  const override = (page, axis) => widget(page).locator(`[data-reading="override-${axis}"]`);
  // Not `exact`: the toggler's accessible name is "Status Reports " — the
  // trailing space comes from the chevron sitting inside the same anchor, and
  // it is the kind of markup accident a rebuild would quietly change.
  const subpanel = (page, title) => widget(page).getByRole('button', { name: title });

  /**
   * What the widget has written down about itself.
   *
   * `src/app/store` debounces its localStorage write by 100ms, so a spec that
   * clicks and reloads straight away is testing that race rather than the
   * persistence. Waiting for the value to land separates the two halves —
   * written, then read back — and says which one broke.
   */
  const storedConfig = (page) => page.evaluate(() => {
    const raw = window.localStorage.getItem('cnc');
    return raw ? JSON.parse(raw).state.widgets.grbl : null;
  });

  test('reports the machine state the controller is in', async ({ grbl, cncjs }) => {
    await grbl.connect();

    // The one reading this whole screen exists for. It is compared against the
    // controller's own report rather than against the literal "Idle", so the
    // case still means something on a machine that is in some other state.
    const state = await grbl.readControllerState();
    const activeState = state.controller.state.status.activeState;
    expect(activeState, 'the controller reported no active state').toBeTruthy();

    await expect(reading(grbl.page, 'state')).toHaveText(activeState);
    cncjs.expectNoPageErrors();
  });

  test('wires each status reading to the figure it is labelled with', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const { status, parserstate } = state.controller.state;

    // Each reading is checked against the controller field it belongs to, not
    // against the other two.
    //
    // KNOWN LIMIT, and it is not small: an idle machine reports 0 for feed
    // rate, 0 for spindle and tool 0, so these three assertions cannot tell
    // the readings apart while nothing is running. Swapping two of them keeps
    // this case green. Making them differ means starting a spindle or
    // streaming a job, neither of which this tier is allowed to do on a
    // machine that might have mechanics attached tomorrow. The case below
    // covers what is left of the gap by pinning the labels and their order.
    await expect(reading(grbl.page, 'feedrate')).toHaveText(String(status.feedrate));
    await expect(reading(grbl.page, 'spindle')).toHaveText(String(status.spindle));
    await expect(reading(grbl.page, 'tool')).toHaveText(String(parserstate.tool));
  });

  test('labels the readings, in the order it labels them', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const { status, parserstate } = state.controller.state;

    // Asserted against the panel's own reading order rather than through a
    // structural hook, because the thing at risk is the pairing: four labels
    // and four figures that are mostly 0, where moving one figure one row up
    // changes nothing a value assertion can see.
    const expected = new RegExp([
      'State', status.activeState,
      'Feed Rate', status.feedrate,
      'Spindle', status.spindle,
      'Tool Number', parserstate.tool,
    ].join(String.raw`\s*`));

    await expect(widget(grbl.page)).toHaveText(expected);
  });

  test('translates the modal codes into words instead of printing them raw', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const modal = state.controller.state.parserstate.modal;
    expect(Object.keys(modal).length, 'the controller reported no modal state').toBeGreaterThan(0);

    // "G21" on its own is unreadable to anyone who is not already fluent, and
    // translating it is the only work this panel does beyond displaying.
    // Checked against the codes the controller actually reported, so the case
    // does not encode one firmware's defaults.
    for (const code of Object.values(modal)) {
      if (typeof code !== 'string') {
        continue;
      }
      const cell = widget(grbl.page).getByText(new RegExp(`.+\\(${code}\\)$`));
      await expect(cell.first(), `${code} should be shown translated`).toBeVisible();
    }
  });

  test('says nothing rather than zero for a modal group the controller omits', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    expect(
      state.controller.state.parserstate.modal.program,
      'this firmware now reports a program modal, so the case below no longer describes it'
    ).toBeUndefined();

    // Grbl 1.1 reports no program modal group, and the widget writes a dash
    // there. An empty cell would read as a rendering fault and "M0" would be
    // a claim the controller never made.
    await expect(widget(grbl.page).getByText('–', { exact: true })).toHaveCount(1);
  });

  test('shows no queue reports unless the controller reports its buffers', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const buf = state.controller.state.status.buf;

    // Buffer data rides in the status report only when bit 1 of `$10` is set,
    // and it is not in a default Grbl build. The panel appearing anyway would
    // mean it is rendering a planner depth nobody reported — a progress bar
    // pinned at zero that an operator would read as a stalled queue.
    if (buf === undefined) {
      await expect(widget(grbl.page).getByText('Queue Reports', { exact: true })).toHaveCount(0);
      await expect(widget(grbl.page).getByRole('progressbar')).toHaveCount(0);
      return;
    }

    await expect(widget(grbl.page).getByText('Queue Reports', { exact: true })).toBeVisible();
    await expect(widget(grbl.page).getByRole('progressbar')).toHaveCount(2);
  });

  test('reads back the override percentages the controller applied', async ({ grbl, cncjs }) => {
    await grbl.connect();

    // The overrides live in the controller, not in the browser: they survive a
    // reload, a reconnect and a server restart, and only a firmware reset
    // clears them. So the starting point is established rather than assumed —
    // an earlier run that was interrupted between adjusting and restoring
    // leaves the machine at 90%, and a case that opens with
    // `expect(F).toHaveText('100%')` then fails for a reason that has nothing
    // to do with the widget.
    const resetOverrides = async () => {
      await widget(grbl.page).getByRole('button', { name: 'Reset feed rate override' }).click();
      await widget(grbl.page).getByRole('button', { name: 'Reset spindle override' }).click();
      await widget(grbl.page).getByRole('button', { name: '100%' }).click();
      for (const axis of ['F', 'S', 'R']) {
        await expect(override(grbl.page, axis)).toHaveText('100%');
      }
    };

    await resetOverrides();

    // All three rows now read the same, so a view that mixed them up would
    // look right. Moving two of them apart is what makes this case able to
    // fail: Grbl reports `Ov:feed,rapid,spindle` and the widget draws them
    // F, S, R, so the middle field belongs to the row that is drawn last.

    await widget(grbl.page).getByRole('button', { name: '-10%' }).first().click();
    await widget(grbl.page).getByRole('button', { name: '50%' }).click();

    await expect(override(grbl.page, 'F')).toHaveText('90%');
    await expect(override(grbl.page, 'R')).toHaveText('50%');
    await expect(override(grbl.page, 'S')).toHaveText('100%');

    // And the controller agrees, which is what makes the click a round trip
    // rather than a local state change the machine knows nothing about.
    await expect
      .poll(async () => (await grbl.readControllerState()).controller.state.status.ov)
      .toEqual([90, 50, 100]);

    await resetOverrides();

    cncjs.expectNoPageErrors();
  });

  test('keeps a collapsed subpanel collapsed across a reload', async ({ grbl }) => {
    await grbl.connect();

    // Each subpanel remembers its own state through WidgetConfig, which is
    // chrome the rebuild replaces. A panel that quietly springs back open on
    // every reload is a panel nobody can put away.
    // The state before the click is asserted too, and that is not ceremony:
    // `expect.poll` stops at the first reading that matches, so a widget that
    // had already written `false` for some other reason would satisfy the
    // poll below without the click having done anything.
    await expect(reading(grbl.page, 'state')).toBeVisible();
    await expect
      .poll(() => storedConfig(grbl.page))
      .toMatchObject({ panel: { statusReports: { expanded: true } } });

    await subpanel(grbl.page, 'Status Reports').click();
    await expect(reading(grbl.page, 'state')).toHaveCount(0);

    await expect
      .poll(() => storedConfig(grbl.page))
      .toMatchObject({ panel: { statusReports: { expanded: false } } });

    await grbl.connect();
    await expect(reading(grbl.page, 'state')).toHaveCount(0);
    // Its neighbour was not dragged along with it. Checked on a label rather
    // than on a translated code, so a fault in the translation fails the case
    // that is about translation and not this one.
    await expect(widget(grbl.page).getByText('Motion', { exact: true })).toBeVisible();

    await subpanel(grbl.page, 'Status Reports').click();
    await expect(reading(grbl.page, 'state')).toBeVisible();
  });

  test('keeps the whole widget minimised across a reload', async ({ grbl }) => {
    await grbl.connect();

    // Watched on the override row rather than on a reading inside a subpanel,
    // and the count is asserted next to the visibility. `toBeHidden` also
    // passes for an element that is not there at all, so on a reading that a
    // collapsed subpanel removes from the DOM this case would go green while
    // the widget sat wide open.
    await expect(override(grbl.page, 'F')).toBeVisible();
    await expect.poll(() => storedConfig(grbl.page)).toMatchObject({ minimized: false });

    await widget(grbl.page).getByRole('button', { name: 'Collapse' }).click();
    await expect(override(grbl.page, 'F')).toHaveCount(1);
    await expect(override(grbl.page, 'F')).toBeHidden();

    await expect.poll(() => storedConfig(grbl.page)).toMatchObject({ minimized: true });

    await grbl.connect();
    await expect(override(grbl.page, 'F')).toHaveCount(1);
    await expect(override(grbl.page, 'F')).toBeHidden();

    await widget(grbl.page).getByRole('button', { name: 'Expand' }).click();
    await expect(override(grbl.page, 'F')).toBeVisible();
  });

  test('shows the controller its own state on request', async ({ grbl, cncjs }) => {
    await grbl.connect();

    // The info dialog is the raw truth behind every reading on the panel, and
    // it is the first thing anyone opens when a reading looks wrong.
    await widget(grbl.page).getByRole('button', { name: 'Grbl controller info' }).click();

    const dialog = grbl.page.locator('[data-reactportal]').filter({ hasText: 'Controller State' });
    const state = await grbl.readControllerState();
    await expect(dialog.getByText(`"activeState": "${state.controller.state.status.activeState}"`))
      .toBeVisible();

    await dialog.getByRole('button', { name: 'Controller Settings' }).click();
    await expect(dialog.getByText(`"version": "${state.controller.settings.version}"`)).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);

    cncjs.expectNoPageErrors();
  });
});
