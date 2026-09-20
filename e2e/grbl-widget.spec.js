const { test, expect } = require('./fixtures');

/**
 * The Grbl widget with no controller connected.
 *
 * This is very nearly nothing, and that is the finding worth pinning. The
 * widget renders its content only when `isReady`, which is
 * `loadedControllers.length === 1 || controller.type === GRBL` — and a server
 * started without `--controller` loads all four, so with no port open the
 * whole panel is a title bar and a fork/remove menu. No state, no readings, no
 * commands.
 *
 * That contradicts what these notes claimed before this spec was written: that
 * State, Feed Rate, Spindle and Tool Number sit at their empty reading while
 * disconnected. They do not exist. Everything this widget says needs a machine,
 * which puts it in `e2e/hardware/grbl-widget.spec.js`.
 *
 * Written before the widget is rebuilt on the new component library. It
 * records today's behaviour rather than endorsing it: if the rebuild decides a
 * disconnected Grbl panel should say so out loud instead of vanishing, this is
 * the file where that decision gets made, deliberately, rather than drifting.
 */
test.describe('grbl widget, disconnected', () => {
  const widget = (page) => page.locator('[data-widget-id="grbl"]');

  test('is mounted and titled', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await expect(widget(cncjs.page)).toBeVisible();
    await expect(widget(cncjs.page).getByText('Grbl', { exact: true })).toBeVisible();
  });

  test('reports nothing at all rather than an idle-looking machine', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Not "Idle", not a dash: absent. A chip reading Idle with no controller
    // behind it is the worst of the three, because it is the one an operator
    // would believe.
    await expect(widget(cncjs.page).locator('[data-reading]')).toHaveCount(0);
    for (const label of ['State', 'Feed Rate', 'Spindle', 'Tool Number']) {
      await expect(widget(cncjs.page).getByText(label, { exact: true })).toHaveCount(0);
    }

    // The override rows go with them. They are the only controls in this
    // widget that write to the machine, so their absence is not cosmetic.
    await expect(widget(cncjs.page).locator('[data-override]')).toHaveCount(0);
  });

  test('offers no machine commands while there is no machine', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Homing, unlock and sleep are all one click from here once connected.
    // While disconnected the button that opens them is not rendered at all,
    // rather than rendered and disabled.
    await expect(widget(cncjs.page).getByRole('button', { name: 'Grbl commands' })).toHaveCount(0);
    await expect(widget(cncjs.page).getByRole('button', { name: 'Grbl controller info' })).toHaveCount(0);

    // Nothing to collapse either, since there is no content.
    await expect(widget(cncjs.page).getByRole('button', { name: /^(Expand|Collapse)$/ })).toHaveCount(0);
  });

  test('still offers the workspace controls that need no machine', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Fork and remove belong to the workspace, not to Grbl, so they survive
    // the widget having nothing to show. Full screen does not: there is
    // nothing to fill the screen with, and it is disabled rather than hidden.
    await widget(cncjs.page).getByRole('button', { name: 'More options' }).click();

    const menu = widget(cncjs.page).getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: /Fork Widget/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Remove Widget/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Enter Full Screen/ }))
      .toHaveAttribute('disabled', '');

    cncjs.expectNoPageErrors();
  });
});
