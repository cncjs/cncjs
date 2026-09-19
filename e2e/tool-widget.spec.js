const { test, expect } = require('./fixtures');

/**
 * The Tool widget's custom-probe editor, which PR #26 changed from `ref` to
 * `innerRef` and no tier could see.
 *
 * The editor holds a `styled('textarea')`. styled-components 3 passes `ref` to
 * its own component instance and the DOM node to `innerRef`, so before that
 * change `this.fields.toolProbeCustomCommands` was a React instance rather
 * than the element. `insertAtCaret` reads `.value` and `.selectionStart` off
 * whatever it is handed, so the wrong object does not fail quietly — it throws
 * a TypeError on `(undefined).substring`. Both halves are asserted below: the
 * text has to arrive, and the page has to stay free of exceptions.
 *
 * The editor only exists under one tool-change policy, and that policy lives in
 * the **server's** configuration (`GET`/`POST /api/tool`), not in localStorage.
 * So this spec changes server state, which means it must put it back — the
 * same symmetry the hardware tier keeps around its jogs. The original document
 * is captured before anything is written and restored afterwards, including
 * the case where there was no document at all, in which case the widget's own
 * documented defaults are written back.
 */

// widgets/Tool/constants.js
const TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS = 0;
const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING = 4;

// A line that is unmistakably ours, so a stale value cannot satisfy the test.
const SEEDED_COMMANDS = '(e2e seeded probe commands)';

test.describe('tool widget custom probe editor', () => {
  let original = null;

  test.beforeAll(async ({ request }) => {
    const res = await request.get('api/tool');
    const text = await res.text();

    // The key is absent on a fresh install, and the handler answers 200 with an
    // empty body rather than an object.
    original = text ? JSON.parse(text) : {};

    const written = await request.post('api/tool', {
      data: {
        toolChangePolicy: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
        toolProbeCustomCommands: SEEDED_COMMANDS,
      },
    });

    expect(written.ok()).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    // Symmetric restore. `POST /api/tool` can only set keys, never remove them,
    // so an originally-absent document is put back as the defaults the widget
    // applies when the server has nothing to say (widgets/Tool/index.jsx).
    await request.post('api/tool', {
      data: {
        toolChangePolicy: original.toolChangePolicy ?? TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
        toolProbeCustomCommands: original.toolProbeCustomCommands ?? '',
      },
    });
  });

  test('inserts a variable into the editor through the element itself', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const widget = cncjs.page.locator('[data-widget-id="tool"]');
    await expect(widget).toBeVisible();

    // The editor is behind an edit toggle; the preview is what shows first.
    const edit = widget.locator('button').filter({ has: cncjs.page.locator('i.fa-edit') });
    await expect(edit).toBeVisible();
    await edit.click();

    const textarea = widget.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(SEEDED_COMMANDS);

    // Put the caret at a known place so the assertion is about insertion at the
    // caret rather than about appending.
    await textarea.click();
    await cncjs.page.evaluate(() => {
      const el = document.querySelector('[data-widget-id="tool"] textarea');
      el.selectionStart = 0;
      el.selectionEnd = 0;
    });

    // The variables menu's own toggle is a <button>; the widget's 'More
    // options' menu is an <a role="button">, so the tag alone separates them.
    await widget.locator('button[class*="dropdown-toggle"]').first().click();

    const inserted = '[tool_change_x]';
    const item = widget.getByRole('menuitem', { name: inserted, exact: true });
    await expect(item).toBeVisible();
    await item.click();

    // Inserted at the caret — so in front of what was already there, not after.
    await expect
      .poll(() => cncjs.page.evaluate(
        () => document.querySelector('[data-widget-id="tool"] textarea').value
      ))
      .toBe(`${inserted}${SEEDED_COMMANDS}`);

    // A React instance instead of the element throws inside insertAtCaret
    // rather than failing quietly, so this is the other half of the assertion.
    cncjs.expectNoPageErrors();
  });
});
