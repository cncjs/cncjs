const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(
  !TEST_PORT,
  'Set CNCJS_TEST_PORT to the controller\'s serial port (e.g. COM3) to run the hardware tier.'
);

/**
 * The Console widget's line editor.
 *
 * This is the only tier that can see it. The widget reaches into xterm's
 * internals — the buffer, the line under the cursor, the cursor column — and
 * those only hold real content once a controller is attached and the terminal
 * has been written to. The smoke tier mounts the widget and stops there, which
 * is how the xterm 3.0 → 3.8 bump could have broken every key it handles
 * without a single tier saying a word.
 *
 * **Nothing is ever submitted.** Enter is never pressed, so no command leaves
 * the browser and the machine is not touched. That costs nothing: every line
 * the bump changed is reachable without it.
 *
 * ## Why this reads the buffer instead of the screen
 *
 * xterm 3.8 renders to a `<canvas>`; 3.0's DOM rows are gone, so there is no
 * text in the DOM. Comparing canvas images was tried first and is not sound
 * here — the controller writes to the console on its own schedule, so the
 * picture changes between two captures for reasons that have nothing to do
 * with the keys pressed. It showed up as the insert and backspace cases
 * failing alternately.
 *
 * So the assertions read the terminal buffer directly, through the React
 * instance. That is deliberately the *correct* xterm API (`line.get(x)`),
 * independent of whatever the widget does internally: if the widget stopped
 * writing to the buffer properly, this reader would still work and would
 * report the wrong text — which is exactly the failure it needs to catch.
 */
test.describe('console line editing', () => {
  const PROMPT = '> ';

  /**
   * Walk from the widget's DOM to the TerminalWrapper instance and read the
   * line the cursor is on, plus the cursor column.
   *
   * Going through the React fiber is not elegant, but the alternative is a
   * pixel comparison that this tier has already shown to be unstable, and the
   * widget exposes no other handle on its terminal.
   */
  const readLine = async (page) => page.evaluate(() => {
    const root = document.querySelector('[data-widget-id="console"]');
    if (!root) {
      return null;
    }

    for (const el of [root, ...root.querySelectorAll('div')]) {
      const key = Object.keys(el).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!key) {
        continue;
      }

      let fiber = el[key];
      let hops = 0;
      while (fiber && hops < 40) {
        const instance = fiber.stateNode;
        const buffer = instance && instance.term && instance.term._core
          && instance.term._core.buffer;

        if (buffer) {
          const line = buffer.lines.get(buffer.ybase + buffer.y);
          if (!line) {
            return null;
          }

          let text = '';
          for (let x = 0; x < line.length; ++x) {
            text += (line.get(x)[1] || '');
          }

          return { text: text.replace(/\s+$/, ''), cursor: buffer.x };
        }

        fiber = fiber.return;
        hops += 1;
      }
    }

    return null;
  });

  const lineText = async (page) => {
    const state = await readLine(page);
    return state && state.text;
  };

  test.beforeEach(async ({ grbl }) => {
    await grbl.connect();

    await expect(grbl.page.locator('[data-widget-id="console"] .xterm-screen'))
      .toBeVisible({ timeout: 30000 });

    // Focus the terminal so keystrokes reach xterm's key handler at all.
    await grbl.page.locator('[data-widget-id="console"] .xterm-screen').click();

    await grbl.page.keyboard.press('Escape');
    await expect.poll(() => lineText(grbl.page)).toBe(PROMPT.trimEnd());
  });

  test.afterEach(async ({ grbl }) => {
    // Leave no half-typed line behind for the next spec in this worker.
    await grbl.page.keyboard.press('Escape');
  });

  /**
   * Typing at the end of the line. This does **not** reach the cell-shifting
   * loop — the character is drawn by `term.write()` — so it is the weakest of
   * the cases here and is kept only as the baseline the others build on.
   */
  test('types printable characters onto the prompt line', async ({ cncjs, grbl }) => {
    await grbl.page.keyboard.type('G0 X1');

    await expect.poll(() => lineText(grbl.page)).toBe(`${PROMPT}G0 X1`);

    cncjs.expectNoPageErrors();
  });

  /**
   * Inserting mid-line, which is the only thing that exercises
   * `line.set(x, line.get(x - 1))`.
   *
   * Reverting that to xterm 3.0's `line[x] = line[x - 1]` throws nothing — on
   * a BufferLine the assignment lands on an arbitrary property — and leaves
   * the text wrong. An earlier version of this spec typed only at the end and
   * passed with that regression in place.
   */
  test('inserts a character in the middle of the line', async ({ cncjs, grbl }) => {
    const page = grbl.page;

    await page.keyboard.type('ABC');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}ABC`);

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('-');

    await expect.poll(() => lineText(page)).toBe(`${PROMPT}A-BC`);

    cncjs.expectNoPageErrors();
  });

  /**
   * Backspace shifts the tail left through the same get/set pair and blanks
   * the last cell. That blank is written as a four-element cell
   * `[attr, ' ', 1, 32]`; the widget used to write three elements here,
   * leaving the character code undefined, which xterm 3.0's DOM renderer
   * tolerated and 3.8's canvas renderer does not.
   */
  test('deletes backwards without eating the prompt', async ({ cncjs, grbl }) => {
    const page = grbl.page;

    await page.keyboard.type('ABXC');

    // Settle before moving the caret. `term.write()` queues to an animation
    // frame, so the cursor column trails the typing for a moment — pressing
    // ArrowLeft before the last character has landed decrements a stale
    // column and the wrong character gets deleted.
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}ABXC`);

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');

    await expect.poll(() => lineText(page)).toBe(`${PROMPT}ABC`);

    // The prompt itself is protected: the handler returns early once the
    // cursor reaches it, so over-deleting must not eat the "> ".
    //
    // One key at a time, asserting after each. A burst of presses races the
    // queued writes the same way the caret move above does, and then measures
    // whatever the race happened to leave behind.
    await page.keyboard.press('End');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}ABC`);

    for (const expected of [`${PROMPT}AB`, `${PROMPT}A`, PROMPT.trimEnd()]) {
      await page.keyboard.press('Backspace');
      await expect.poll(() => lineText(page)).toBe(expected);
    }

    for (let i = 0; i < 3; ++i) {
      await page.keyboard.press('Backspace');
      await expect.poll(() => lineText(page)).toBe(PROMPT.trimEnd());
    }

    cncjs.expectNoPageErrors();
  });

  /**
   * Home and End read the line through `line.get(x)[1]` to find where the
   * typed text ends, so a wrong read puts the caret in the wrong column. The
   * cursor column is asserted directly rather than inferred from a later
   * insert.
   */
  test('moves the caret to both ends of the line', async ({ cncjs, grbl }) => {
    const page = grbl.page;

    await page.keyboard.type('ABCDE');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}ABCDE`);

    await page.keyboard.press('Home');
    await expect.poll(async () => (await readLine(page)).cursor).toBe(PROMPT.length);

    await page.keyboard.press('End');
    await expect.poll(async () => (await readLine(page)).cursor).toBe(PROMPT.length + 5);

    cncjs.expectNoPageErrors();
  });

  /**
   * Escape clears the line and redraws the prompt. xterm dropped
   * `Terminal.eraseLine()` after 3.0, so this now goes through the same
   * `\x1b[2K\r` sequence the widget already used when writing incoming data.
   */
  test('clears the line with Escape and leaves it editable', async ({ cncjs, grbl }) => {
    const page = grbl.page;

    await page.keyboard.type('DISCARD ME');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}DISCARD ME`);

    await page.keyboard.press('Escape');
    await expect.poll(() => lineText(page)).toBe(PROMPT.trimEnd());

    // A stray cursor column or a half-erased buffer would break what follows.
    await page.keyboard.type('AFTER');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}AFTER`);

    cncjs.expectNoPageErrors();
  });

  /**
   * The history arrows are the other two sites that lost
   * `Terminal.eraseLine()`. The history itself is empty here because nothing
   * is ever submitted, so what is asserted is that the keys redraw a clean
   * prompt rather than throwing or leaving the old text behind.
   */
  test('redraws the prompt for the history arrows', async ({ cncjs, grbl }) => {
    const page = grbl.page;

    await page.keyboard.type('TYPED');
    await expect.poll(() => lineText(page)).toBe(`${PROMPT}TYPED`);

    await page.keyboard.press('ArrowUp');
    await expect.poll(() => lineText(page)).toBe(PROMPT.trimEnd());

    await page.keyboard.type('AGAIN');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => lineText(page)).toBe(PROMPT.trimEnd());

    cncjs.expectNoPageErrors();
  });
});
