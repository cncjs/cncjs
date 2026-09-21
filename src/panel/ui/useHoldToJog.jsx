import { useCallback, useEffect, useRef } from 'react';

/**
 * A jog key that does two things depending on how long it is held.
 *
 * A tap moves one step — the setting an operator chose, for dialling onto an
 * edge. Holding it keeps moving until the finger comes off, which is how you
 * actually cross a bed. One key, because they are the same intent at two
 * scales, and an operator should not have to decide which button to reach for
 * before knowing how far they want to go.
 *
 * `HOLD_AFTER` is the line between them. Long enough that an ordinary press is
 * unambiguously a step, short enough that holding does not feel stuck.
 *
 * **Every way the press can end cancels the move.** Pointer up is the expected
 * one; pointer cancel is the browser taking the gesture away, usually because
 * it became a scroll; the window losing focus and the page being hidden are
 * the ones that matter most, because on a machine a jog that outlives the
 * page is a jog nobody is watching. The bounded distance in `jogStart` is the
 * backstop underneath all of them.
 */
const HOLD_AFTER = 250;

export const useHoldToJog = ({ step, start, stop, enabled }) => {
  const held = useRef(null);

  const end = useCallback(() => {
    const press = held.current;
    if (!press) {
      return;
    }
    held.current = null;
    clearTimeout(press.timer);

    if (press.moving) {
      stop();
    } else {
      // Released before it became a hold, so it was a tap: one step.
      step(press.axis, press.sign);
    }
  }, [step, stop]);

  useEffect(() => {
    // A press that outlives the window is the dangerous one. Nothing here is
    // a substitute for the distance bound, but it is what stops the machine
    // when somebody alt-tabs mid-jog.
    const abandon = () => end();
    window.addEventListener('blur', abandon);
    window.addEventListener('pointerup', abandon);
    document.addEventListener('visibilitychange', abandon);
    return () => {
      window.removeEventListener('blur', abandon);
      window.removeEventListener('pointerup', abandon);
      document.removeEventListener('visibilitychange', abandon);
    };
  }, [end]);

  const press = (axis, sign) => (event) => {
    if (!enabled) {
      return;
    }
    // Only the primary button, and not a second finger landing mid-jog.
    if (event.button !== 0 || held.current) {
      return;
    }

    const record = { axis, sign, moving: false, timer: null };
    record.timer = setTimeout(() => {
      record.moving = start(axis, sign);
      if (!record.moving) {
        // The controller cannot be cancelled, so holding is not offered: the
        // press falls back to the step it would have been.
        held.current = null;
        step(axis, sign);
      }
    }, HOLD_AFTER);
    held.current = record;
  };

  return (axis, sign) => ({
    onPointerDown: press(axis, sign),
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
  });
};

export default useHoldToJog;
