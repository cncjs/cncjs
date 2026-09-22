/**
 * What the keys currently held down add up to.
 *
 * Holding two arrows means one diagonal move, and letting one of them go
 * means the move carries on along the other — so the direction is not a
 * property of a key press, it is a property of the **set** of keys that are
 * down at this instant. That is why this takes a set rather than a key.
 *
 * In a `.js` file because Jest only transforms those, and this is the part
 * worth checking without a browser.
 */

/** Which axis and which way each key drives. */
export const KEYS = {
  ArrowRight: { axis: 'x', sign: 1, group: 'xy' },
  ArrowLeft: { axis: 'x', sign: -1, group: 'xy' },
  ArrowUp: { axis: 'y', sign: 1, group: 'xy' },
  ArrowDown: { axis: 'y', sign: -1, group: 'xy' },
  PageUp: { axis: 'z', sign: 1, group: 'z' },
  PageDown: { axis: 'z', sign: -1, group: 'z' },
};

/**
 * @param {Iterable<string>} keys The keys down, **in the order they went
 *   down** — the last one decides which group is being driven.
 * @returns {object|null} `{ x?, y? }` or `{ z }`, or null if what is held
 *   cancels out or means nothing.
 */
export const composeDirection = (keys) => {
  const held = [...keys].filter((key) => KEYS[key]);
  if (!held.length) {
    return null;
  }

  /*
   * **Z never combines with X and Y.** They are two different decisions with
   * their own step and their own feed rate — a move that mixed them would
   * have to pick one set of numbers and be wrong about the other. So the
   * group of the most recently pressed key wins, and the rest are ignored
   * until it comes up.
   */
  const group = KEYS[held[held.length - 1]].group;
  const dir = {};

  for (const key of held) {
    const { axis, sign, group: keyGroup } = KEYS[key];
    if (keyGroup === group) {
      dir[axis] = (dir[axis] || 0) + sign;
    }
  }

  // Opposite keys held together cancel: that axis is not being driven.
  for (const axis of Object.keys(dir)) {
    if (dir[axis] === 0) {
      delete dir[axis];
    } else {
      dir[axis] = Math.sign(dir[axis]);
    }
  }

  return Object.keys(dir).length ? dir : null;
};

/** Whether two directions are the same move. */
export const sameDirection = (a, b) => {
  if (!a || !b) {
    return a === b;
  }
  const axes = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const axis of axes) {
    if (a[axis] !== b[axis]) {
      return false;
    }
  }
  return true;
};

export default composeDirection;
