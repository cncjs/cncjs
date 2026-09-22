import { useEffect, useRef } from 'react';

/**
 * A jog key that does two things depending on how long it is held.
 *
 * A tap moves one step — the setting an operator chose, for dialling onto an
 * edge. Holding it keeps moving until the finger comes off, which is how you
 * actually cross a bed. One key, because they are the same intent at two
 * scales, and an operator should not have to decide which button to reach for
 * before knowing how far they want to go.
 *
 * `HOLD_AFTER` is the line between them. Long enough that an ordinary press
 * is unambiguously a step, short enough that holding does not feel stuck.
 *
 * **Every way the press can end stops the machine.** Pointer up is the
 * expected one; pointer cancel is the browser taking the gesture away,
 * usually because it became a scroll; the window losing focus and the page
 * being hidden are the ones that matter most, because a jog that outlives the
 * page is a jog nobody is watching. The stream's own segment length is the
 * backstop underneath all of them: it is a fraction of a second of travel, so
 * even a release that is never seen stops the machine almost at once.
 */
const HOLD_AFTER = 250;

export const useHoldToJog = ({ step, stream, enabled }) => {
  const held = useRef(null);

  /*
   * Read through refs, so the window listeners below are bound once. They
   * used to depend on these callbacks, which are new on every render — and
   * the widget renders on every status report, ten times a second. A release
   * landing between the remove and the add was lost, which leaves a jog
   * running with nothing watching for the finger coming up.
   */
  const nudge = useRef(step);
  const jog = useRef(stream);
  const live = useRef(enabled);
  nudge.current = step;
  jog.current = stream;
  live.current = enabled;

  const end = useRef(() => {
    const press = held.current;
    if (!press) {
      return;
    }
    held.current = null;
    clearTimeout(press.timer);

    if (jog.current.running()) {
      jog.current.halt();
    }
    // Nothing to send for a tap: the step went out when the finger landed.
  });

  useEffect(() => {
    // A press that outlives the window is the dangerous one.
    const abandon = () => end.current();
    window.addEventListener('blur', abandon);
    window.addEventListener('pointerup', abandon);
    document.addEventListener('visibilitychange', abandon);
    return () => {
      window.removeEventListener('blur', abandon);
      window.removeEventListener('pointerup', abandon);
      document.removeEventListener('visibilitychange', abandon);
    };
  }, []);

  const press = (dir) => (event) => {
    if (!live.current) {
      return;
    }
    // Only the primary button, and not a second finger landing mid-jog.
    if (event.button !== 0 || held.current) {
      return;
    }

    /*
     * **Moves on the way down, not on the way up.** Waiting out the hold
     * window before sending anything made every press feel late, because it
     * was: a quarter of a second passed before the first command left. A step
     * is over long before the hold begins — 1mm at 1500 mm/min takes 40ms —
     * so sending it at once costs nothing and the machine is standing still
     * again by the time the continuous jog starts.
     */
    nudge.current(dir);

    const record = { dir, timer: null };
    record.timer = setTimeout(() => {
      record.timer = null;
      jog.current.aim(dir);
    }, HOLD_AFTER);
    held.current = record;
  };

  const finish = () => end.current();

  return (dir) => ({
    onPointerDown: press(dir),
    onPointerUp: finish,
    onPointerLeave: finish,
    onPointerCancel: finish,
  });
};

export default useHoldToJog;
