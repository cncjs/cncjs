import { useEffect, useRef } from 'react';
import { composeDirection, KEYS, sameDirection } from './jog-directions';

/**
 * Jogging from the keyboard.
 *
 * The arrows are XY because that is what they look like on a bed seen from
 * above, and Page Up and Page Down are Z because they are the only keys on a
 * keyboard that already mean "up" and "down" without also meaning a direction
 * on the table.
 *
 * **The direction is whatever is held, not what was pressed.** Hold two
 * arrows and the machine goes diagonally; let one go and it carries on along
 * the other without stopping; press a third and it turns again. So the set of
 * keys down is tracked and re-composed on every change — see
 * `jog-directions.js` for what a set adds up to.
 *
 * Turning is just aiming the stream somewhere else. It used to be a cancel
 * and a fresh jog, and that was a race the machine kept losing: adding a key
 * stopped it, releasing one left it running with nothing held, and reversing
 * did nothing at all. See `useJogStream`.
 *
 * Held keys move continuously. The browser repeats `keydown` while a key is
 * held, so a repeat is recognised and ignored rather than taken as a second
 * press.
 *
 * Nothing fires while something is being typed into. A panel with a text
 * field on it is coming — a file name, an MDI line — and an arrow key inside
 * one belongs to the caret, not to the machine.
 *
 * Shift makes it the coarse step. That is the one modifier worth having: it
 * is the difference between nudging onto a line and getting across the work.
 */

// How long a key is down before it stops being a tap and becomes a hold.
const HOLD_AFTER = 250;

const isTyping = (target) => {
  if (!target) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

export const useJogKeys = ({ step, stream, enabled, onHelp }) => {
  // The keys down, in the order they went down: the last one decides whether
  // XY or Z is being driven.
  const down = useRef([]);
  // What is pending: a press that has not yet become a hold, or the hold.
  const press = useRef(null);

  /*
   * Everything that touches the machine is read through a ref, so the
   * listeners below can be bound once. They used to sit in the effect's
   * dependencies, which rebuilt them on every status report — ten times a
   * second — and a key pressed between the remove and the add was lost.
   */
  const nudge = useRef(step);
  const jog = useRef(stream);
  const helping = useRef(onHelp);
  const live = useRef(enabled);
  nudge.current = step;
  jog.current = stream;
  helping.current = onHelp;
  live.current = enabled;

  useEffect(() => {
    const settle = (coarse) => {
      const want = composeDirection(down.current);
      const now = press.current;

      if (!want) {
        if (jog.current.running()) {
          jog.current.halt();
        } else if (now) {
          // Came up before it became a hold: that was a tap.
          nudge.current(now.dir, now.coarse);
        }
        if (now?.timer) {
          clearTimeout(now.timer);
        }
        press.current = null;
        return;
      }

      if (jog.current.running()) {
        // Already moving: turning is simply aiming somewhere else.
        if (!sameDirection(now?.dir, want)) {
          jog.current.aim(want);
          press.current = { dir: want, coarse: now?.coarse ?? coarse, timer: null };
        }
        return;
      }

      if (now) {
        // Still inside the tap window: change what it is aiming at.
        now.dir = want;
        return;
      }

      const record = { dir: want, coarse, timer: null };
      record.timer = setTimeout(() => {
        record.timer = null;
        jog.current.aim(record.dir);
      }, HOLD_AFTER);
      press.current = record;
    };

    const onDown = (event) => {
      if (event.key === '?' && !isTyping(event.target)) {
        event.preventDefault();
        helping.current();
        return;
      }

      if (!KEYS[event.key] || !live.current || isTyping(event.target)
        || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      event.preventDefault();

      // The browser repeats `keydown` while a key is held down.
      if (down.current.includes(event.key)) {
        return;
      }

      down.current = [...down.current, event.key];
      settle(event.shiftKey);
    };

    const onUp = (event) => {
      if (!KEYS[event.key]) {
        return;
      }
      down.current = down.current.filter((key) => key !== event.key);
      settle(event.shiftKey);
    };

    // Keys held while the window goes away never send their `keyup`.
    const release = () => {
      down.current = [];
      settle(false);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
    };
    // Bound once; everything variable is read through a ref above.
  }, []);
};

export default useJogKeys;
