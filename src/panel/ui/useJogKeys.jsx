import { useEffect, useRef } from 'react';

/**
 * Jogging from the keyboard.
 *
 * The arrows are XY because that is what they look like on a bed seen from
 * above, and Page Up and Page Down are Z because they are the only keys on a
 * keyboard that already mean "up" and "down" without also meaning a direction
 * on the table.
 *
 * Held keys move continuously, exactly as a held button does — the browser
 * repeats `keydown` while a key is held, so the first one starts the move and
 * every repeat after it is ignored until the key comes up. Without that check
 * a held arrow would send a jog command every few milliseconds and fill the
 * controller's buffer with moves nobody asked for.
 *
 * Nothing fires while something is being typed into. A panel with a text field
 * on it is coming — a file name, an MDI line — and an arrow key inside one
 * belongs to the caret, not to the machine.
 *
 * Shift makes it the coarse step. That is the one modifier worth having: it is
 * the difference between nudging onto a line and getting across the work, and
 * it is what every CAD program has trained the hand to expect.
 */
const AXES = {
  ArrowRight: ['x', 1],
  ArrowLeft: ['x', -1],
  ArrowUp: ['y', 1],
  ArrowDown: ['y', -1],
  PageUp: ['z', 1],
  PageDown: ['z', -1],
};

const isTyping = (target) => {
  if (!target) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

export const useJogKeys = ({ step, start, stop, enabled, onHelp }) => {
  const down = useRef(null);

  useEffect(() => {
    const release = () => {
      const held = down.current;
      if (!held) {
        return;
      }
      down.current = null;
      clearTimeout(held.timer);
      if (held.moving) {
        stop();
      } else {
        step(held.axis, held.sign, held.coarse);
      }
    };

    const onDown = (event) => {
      if (event.key === '?' && !isTyping(event.target)) {
        event.preventDefault();
        onHelp();
        return;
      }

      const move = AXES[event.key];
      if (!move || !enabled || isTyping(event.target) || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      event.preventDefault();

      // The browser repeats `keydown` while a key is held. The first one is
      // the press; the rest are the same press still happening.
      if (down.current) {
        return;
      }

      const [axis, sign] = move;
      const held = { axis, sign, coarse: event.shiftKey, moving: false, timer: null };
      held.timer = setTimeout(() => {
        held.moving = start(axis, sign);
        if (!held.moving) {
          down.current = null;
          step(axis, sign, held.coarse);
        }
      }, 250);
      down.current = held;
    };

    const onUp = (event) => {
      if (AXES[event.key]) {
        release();
      }
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    // A key held while the window goes away never sends its `keyup`.
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
    };
  }, [step, start, stop, enabled, onHelp]);
};

export default useJogKeys;
