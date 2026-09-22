import { useRef } from 'react';

/**
 * A continuous jog, held by the server.
 *
 * **This used to be the loop itself** — a timer in the browser sending short
 * `$J=` moves — and getting the rhythm right by guesswork was the source of
 * three separate faults: adding a key stopped the machine, releasing one left
 * it running, and a segment length that outran the send interval built a
 * backlog that swallowed every change of direction.
 *
 * Grbl's documentation says the loop is driven by `ok`, and `ok` is only
 * visible to whoever holds the serial port. So the loop moved to the server
 * and this is what is left: a latch remembering whether a jog is ours to
 * stop, so a release that arrives when nothing is running does not send a
 * cancel into an idle machine.
 */
export const useJogStream = ({ start, stop }) => {
  const on = useRef(false);

  return {
    /** Start, or aim a running jog somewhere else. */
    aim: (dir) => {
      on.current = start(dir) !== false;
    },
    /** Stop, and drop whatever the server still has queued. */
    halt: () => {
      if (!on.current) {
        return false;
      }
      on.current = false;
      stop();
      return true;
    },
    running: () => on.current,
  };
};

export default useJogStream;
