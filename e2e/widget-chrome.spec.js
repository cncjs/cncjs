const { test, expect, DEFAULT_WIDGETS } = require('./fixtures');

/**
 * The frame every widget sits in.
 *
 * Seventeen widgets share `app/components/Widget`, and it is about to be
 * replaced by the `Tile` grammar from the design mockup — one cross-cutting
 * change touching every one of them at once. That is a great deal of blast
 * radius for a change nothing currently asserts: the only thing any spec says
 * about the chrome today is that each widget is *visible*.
 *
 * So this file pins what the chrome is for rather than what it is made of: a
 * panel can be found by name, it says what it is, it can be put away and stays
 * put away, it can fill the screen and give it back, and the two destructive
 * things it offers ask before they do them.
 *
 * Locators are roles and accessible names throughout, never the CSS-module
 * classes — those are the thing being deleted, so a spec resting on them would
 * fail on markup rather than on behaviour and teach nothing.
 */
test.describe('widget chrome', () => {
  const widget = (page, id) => page.locator(`[data-widget-id="${id}"]`);
  const region = (page, id) => widget(page, id).locator('[role="region"]').first();

  /**
   * The title each panel shows, as a map rather than a loop over whatever is
   * on screen.
   *
   * The smoke tier navigates by `data-widget-id` and these titles are the only
   * other thing that identifies a panel to a person, so a chrome swap that
   * dropped or reworded one would be changing what the workspace says about
   * itself. Written out so that is a decision, not an accident.
   */
  const TITLES = {
    connection: 'Connection',
    console: 'Console',
    grbl: 'Grbl',
    marlin: 'Marlin',
    smoothie: 'Smoothie',
    tinyg: 'TinyG',
    webcam: 'Webcam',
    axes: 'Axes',
    gcode: 'G-code',
    macro: 'Macro',
    autolevel: 'Autolevel',
    probe: 'Probe',
    tool: 'Tool',
    spindle: 'Spindle',
  };

  /**
   * The visualizer is not like the others and that is deliberate.
   *
   * It lives in the workspace's `default` container (`DefaultWidgets.jsx`),
   * which is neither sortable nor removable, so it carries no title, no drag
   * handle and no menu. Treating it as a broken instance of the pattern would
   * be reading the pattern wrong.
   */
  const NOT_A_PANEL = ['visualizer'];

  /**
   * KNOWN GAP, recorded rather than skipped.
   *
   * `autolevel` carries exactly the same chrome as its neighbours and none of
   * its accessible names: no `aria-label` on the region, none on the collapse
   * button or the menu, no `aria-expanded`. Every other widget got those in an
   * earlier pass and this one was missed, so today it is the one panel in the
   * workspace that cannot be reached by name at all.
   *
   * It is listed here so the exception is visible in the assertion instead of
   * hiding in a filter nobody reads. The chrome swap is where it closes: the
   * labelling moves into the shared header and stops being seventeen separate
   * chances to forget.
   */
  const UNREACHABLE_BY_NAME = ['autolevel'];

  const PANELS = DEFAULT_WIDGETS.filter((id) => !NOT_A_PANEL.includes(id));
  const NAMED = PANELS.filter((id) => !UNREACHABLE_BY_NAME.includes(id));

  test('every panel in the workspace is a region', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // A landmark each, so the workspace is navigable as a set of panels rather
    // than as one undifferentiated page.
    for (const id of DEFAULT_WIDGETS) {
      await expect(region(cncjs.page, id), `"${id}" should be a region`).toHaveCount(1);
    }

    cncjs.expectNoPageErrors();
  });

  test('every panel but one can be found by name', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    for (const id of NAMED) {
      await expect(region(cncjs.page, id), `"${id}" should carry an accessible name`)
        .toHaveAttribute('aria-label', /\bwidget$/);
    }

    // And the exception is asserted too, so the day it is fixed this case
    // fails and someone has to come here and say so.
    for (const id of UNREACHABLE_BY_NAME) {
      await expect(
        region(cncjs.page, id),
        `"${id}" is the known unlabelled panel; if it now has a name, move it out of UNREACHABLE_BY_NAME`
      ).not.toHaveAttribute('aria-label', /./);
    }
  });

  test('every panel says what it is', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // The FIRST thing the panel says, not merely something it says somewhere.
    // `getByText(title).first()` looked right and was not: the probe panel has
    // the word "Probe" on a control in its body, so reworking the title to
    // "Probing" left the case green. A panel's name is the thing at the top of
    // it, and that is what is asserted.
    //
    // `innerText` rather than `textContent`, because the closed dropdown menus
    // are in the DOM and would otherwise be read as part of the panel.
    for (const [id, title] of Object.entries(TITLES)) {
      const firstLine = async () => {
        const text = await region(cncjs.page, id).innerText();
        return text.split(/\r?\n/)[0].trim();
      };
      await expect.poll(firstLine, { message: `"${id}" should lead with "${title}"` })
        .toBe(title);
    }
  });

  test('every panel can be picked up and moved', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // The handle is what makes the workspace rearrangeable, and it is separate
    // from the title on purpose: dragging a panel by its name would make the
    // name unclickable for anything else later.
    for (const id of PANELS) {
      await expect(
        widget(cncjs.page, id).locator('.sortable-handle'),
        `"${id}" should offer a drag handle`
      ).toHaveCount(1);
    }
  });

  test('a panel that can be put away says whether it is open', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // `aria-expanded` is the whole of that statement for anything not looking
    // at a chevron. The four controller panels are excluded because they show
    // no controls at all until a controller is connected — which is pinned in
    // `grbl-widget.spec.js` and is not this file's subject.
    const toggle = widget(cncjs.page, 'probe').getByRole('button', { name: /^(Expand|Collapse)$/ });

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(widget(cncjs.page, 'probe').getByRole('button', { name: 'Expand' }))
      .toHaveAttribute('aria-expanded', 'false');
  });

  test('putting a panel away survives a reload, and leaves its neighbours alone', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const probe = () => widget(cncjs.page, 'probe');
    const heightOf = async (id) => (await region(cncjs.page, id).boundingBox()).height;

    // Measured as height rather than read off an attribute. `aria-hidden` is
    // the mechanism today and the first element carrying it inside a panel is
    // a Font Awesome icon in the header, not the body — so an assertion on it
    // passes for the wrong element before it ever reaches the right one. What
    // putting a panel away *means* is that it stops taking room.
    const open = await heightOf('probe');
    const neighbour = await heightOf('tool');
    expect(open).toBeGreaterThan(100);

    await probe().getByRole('button', { name: 'Collapse' }).click();
    await expect.poll(() => heightOf('probe')).toBeLessThan(open / 2);

    // The store debounces its localStorage write by 100ms, so reloading
    // straight away tests that race rather than the persistence.
    await expect.poll(() => storedWidget(cncjs.page, 'probe')).toMatchObject({ minimized: true });

    await cncjs.gotoWorkspace();
    expect(await heightOf('probe')).toBeLessThan(open / 2);
    // Each panel remembers itself. One shared flag would put the whole
    // workspace away together.
    expect(await heightOf('tool')).toBe(neighbour);
  });

  test('a panel can fill the workspace and give it back', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const probe = () => widget(cncjs.page, 'probe');
    const before = await region(cncjs.page, 'probe').boundingBox();
    const viewport = cncjs.page.viewportSize();
    expect(before.width).toBeLessThan(viewport.width / 2);

    await probe().getByRole('button', { name: 'More options' }).click();
    await probe().getByRole('menuitem', { name: /Enter Full Screen/ }).click();

    // Measured against the viewport rather than against a class name: what
    // "full screen" means is that it covers the screen.
    await expect
      .poll(async () => (await region(cncjs.page, 'probe').boundingBox()).width)
      .toBeGreaterThan(viewport.width * 0.9);

    await probe().getByRole('button', { name: 'More options' }).click();
    await probe().getByRole('menuitem', { name: /Exit Full Screen/ }).click();

    await expect
      .poll(async () => (await region(cncjs.page, 'probe').boundingBox()).width)
      .toBeLessThan(viewport.width / 2);

    cncjs.expectNoPageErrors();
  });

  test('removing a panel asks first, and cancelling changes nothing', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await widget(cncjs.page, 'probe').getByRole('button', { name: 'More options' }).click();
    await widget(cncjs.page, 'probe').getByRole('menuitem', { name: /Remove Widget/ }).click();

    const dialog = cncjs.page.locator('[data-reactportal]').filter({ hasText: 'Remove Widget' });
    await expect(dialog).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(widget(cncjs.page, 'probe')).toBeVisible();
  });

  test('a removed panel stays removed', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await widget(cncjs.page, 'probe').getByRole('button', { name: 'More options' }).click();
    await widget(cncjs.page, 'probe').getByRole('menuitem', { name: /Remove Widget/ }).click();
    await cncjs.page.locator('[data-reactportal]')
      .filter({ hasText: 'Remove Widget' })
      .getByRole('button', { name: 'OK' })
      .click();

    await expect(widget(cncjs.page, 'probe')).toHaveCount(0);
    await expect.poll(() => storedWidgetList(cncjs.page)).not.toContain('probe');

    await cncjs.gotoWorkspace();
    await expect(widget(cncjs.page, 'probe')).toHaveCount(0);
    // And it took nothing with it.
    await expect(widget(cncjs.page, 'tool')).toBeVisible();
  });

  test('forking a panel asks first, and produces a second copy of it', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await widget(cncjs.page, 'probe').getByRole('button', { name: 'More options' }).click();
    await widget(cncjs.page, 'probe').getByRole('menuitem', { name: /Fork Widget/ }).click();

    const dialog = cncjs.page.locator('[data-reactportal]').filter({ hasText: 'Fork Widget' });
    await expect(dialog).toHaveCount(1);
    await dialog.getByRole('button', { name: 'OK' }).click();

    // A fork is `name:uuid`, and the original keeps its bare id. Both are real
    // panels with their own settings — that is the point of forking rather
    // than a second view of one.
    const forked = cncjs.page.locator('[data-widget-id^="probe:"]');
    await expect(forked).toHaveCount(1);
    await expect(widget(cncjs.page, 'probe')).toBeVisible();
    await expect(forked.getByText('Probe', { exact: true }).first()).toBeVisible();

    cncjs.expectNoPageErrors();
  });

  /** One widget's persisted settings, straight out of the store. */
  const storedWidget = (page, id) => page.evaluate((widgetId) => {
    const raw = window.localStorage.getItem('cnc');
    return raw ? JSON.parse(raw).state.widgets[widgetId] : null;
  }, id);

  /** Every widget the workspace has been told to lay out. */
  const storedWidgetList = (page) => page.evaluate(() => {
    const raw = window.localStorage.getItem('cnc');
    if (!raw) {
      return [];
    }
    const containers = JSON.parse(raw).state.workspace.container;
    return Object.values(containers).flatMap((container) => container.widgets || []);
  });
});
