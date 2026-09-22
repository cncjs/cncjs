import { useEffect, useRef, useState } from 'react';
import controller from '../machine/controller';
import { KEYS } from './jog-directions';
import { WINDOW_MS, withinWindow } from '../machine/jog-trace';

/**
 * Record keys, segments and movement on one clock.
 *
 * Three things that are each visible on their own and never together: the key
 * going down, the segment leaving for the machine, and the tool moving. The
 * gaps between them are the whole of every argument about jogging feeling
 * late, so they are put on one timeline and left there to be looked at.
 *
 * Listeners are attached once and read their state through refs, the same way
 * `useJogKeys` does — a listener rebuilt on every render drops events, and
 * with position arriving ten times a second this component renders often.
 */

/** How often to redraw. Fast enough to feel live, slow enough to be cheap. */
const REDRAW_MS = 100;

const useJogTrace = (enabled) => {
  const [events, setEvents] = useState([]);
  const buffer = useRef([]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const add = (event) => {
      buffer.current.push({ ...event, t: Date.now() });
    };

    const onDown = (event) => {
      // Repeats while a key is held are the operating system talking, not a
      // person pressing anything.
      if (event.repeat || !KEYS[event.key]) {
        return;
      }
      add({ kind: 'key', key: event.key, down: true });
    };

    const onUp = (event) => {
      if (!KEYS[event.key]) {
        return;
      }
      add({ kind: 'key', key: event.key, down: false });
    };

    /*
     * What the server actually put on the wire. `$J=G91` is a jog segment;
     * `0x85` is a cancel, and seeing where it lands relative to a key coming
     * up is most of what there is to understand about stopping.
     */
    const onWrite = (data) => {
      if (typeof data !== 'string') {
        return;
      }
      if (data.startsWith('$J=G91')) {
        add({ kind: 'segment' });
      } else if (data.includes('\x85')) {
        add({ kind: 'cancel' });
      }
    };

    const onState = (type, state) => {
      const mpos = state?.status?.mpos;
      if (!mpos) {
        return;
      }
      add({
        kind: 'position',
        x: Number.parseFloat(mpos.x) || 0,
        y: Number.parseFloat(mpos.y) || 0,
        z: Number.parseFloat(mpos.z) || 0,
        state: state?.status?.activeState,
      });
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    controller.addListener('serialport:write', onWrite);
    controller.addListener('controller:state', onState);

    const redraw = setInterval(() => {
      buffer.current = withinWindow(buffer.current, Date.now(), WINDOW_MS);
      setEvents([...buffer.current]);
    }, REDRAW_MS);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      controller.removeListener('serialport:write', onWrite);
      controller.removeListener('controller:state', onState);
      clearInterval(redraw);
    };
  }, [enabled]);

  return {
    events,
    clear: () => {
      buffer.current = [];
      setEvents([]);
    },
  };
};

export default useJogTrace;
