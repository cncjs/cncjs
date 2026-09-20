import React, { useCallback, useEffect, useRef } from 'react';
import { Root } from './styles';

// How long a press has to be held before it starts repeating, and how fast it
// repeats after that. The delay has to be long enough that an ordinary click
// never trips it and short enough that holding feels like holding.
const HOLD_DELAY = 500;
const REPEAT_INTERVAL = 50;

/**
 * The application's button. Nothing else defines one.
 *
 * Every remaining prop goes through to MUI, so `type`, `disabled`, `onClick`,
 * `variant`, `size` and `fullWidth` behave as they are documented there.
 *
 * `repeat` makes holding the button keep firing it. That is not a convenience:
 * an operator slowing the feed on a cut that is going wrong holds the button
 * down and watches the tool, and a button that needs twelve separate presses
 * to get from 100% to 10% is a button they will not reach for again.
 */
const Button = ({ children, repeat, onClick, ...props }) => {
  const timers = useRef({ delay: null, interval: null });

  const stop = useCallback(() => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.interval);
    timers.current = { delay: null, interval: null };
  }, []);

  // A button unmounted mid-hold — the panel collapsed, the port closed — must
  // not leave an interval behind still calling into a controller that is gone.
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (!onClick) {
      return;
    }
    timers.current.delay = setTimeout(() => {
      timers.current.interval = setInterval(onClick, REPEAT_INTERVAL);
    }, HOLD_DELAY);
  }, [onClick]);

  const holdProps = repeat
    ? {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
      onTouchCancel: stop,
    }
    : {};

  return (
    <Root variant="contained" disableElevation onClick={onClick} {...holdProps} {...props}>
      {children}
    </Root>
  );
};

export default Button;
