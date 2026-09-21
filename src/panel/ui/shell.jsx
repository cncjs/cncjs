import { createContext, useContext, useEffect, useState } from 'react';

/**
 * How wide the panel is, measured rather than inferred.
 *
 * Screens ask this and then render one layout. They used to render both and
 * hide one with a container query, which cost two things: every change made
 * for the panel had to be checked against a phone layout sitting in the same
 * file, and anything holding state had to be rendered twice or lifted out.
 *
 * Measured from the shell element, not the window. That is the number that is
 * true in both places it has to be: on a real phone the shell is the viewport,
 * and inside the review frame the shell is given the target's width outright —
 * the frame scales what is painted, not what is laid out. `matchMedia` would
 * have answered for the desktop window in the second case, which is how a
 * preview quietly stops being a preview.
 */
const PHONE_BELOW = 768;

const ShellWidth = createContext(Infinity);

export const useIsPhone = () => useContext(ShellWidth) < PHONE_BELOW;

export const useMeasuredShell = () => {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(Infinity);

  useEffect(() => {
    if (!node) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, width };
};

export const ShellWidthProvider = ShellWidth.Provider;
