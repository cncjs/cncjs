/**
 * The four corners of the jog cross.
 *
 * Here rather than in either pad because both pads draw the same four, and a
 * corner that disagreed between the phone and the panel about which way it
 * points would be a control that means one thing at the machine and another
 * in the hand. In a `.js` file because that is the only kind Jest transforms.
 *
 * `rotate` turns the one arrow glyph into this corner's arrow. CSS rotation
 * is clockwise and the glyph is drawn pointing up and to the right, so the
 * turns run X+Y+ → X+Y− → X−Y− → X−Y+.
 *
 * `round` rounds off the corner that faces **out** of the cross, and only
 * that one. Nine square tiles read as a grid, and a grid is a table of
 * options; a cross with its outside corners taken off reads as a compass,
 * which is the thing an operator is actually looking at. The three inner
 * corners stay sharp so the keys still meet each other squarely.
 *
 * The label is what a screen reader says and what the arrow means: the two
 * axes, signed, in the order the machine names them. `−` is the minus sign
 * rather than a hyphen, matching the sides of the cross.
 */
const corner = (x, y, rotate, round) => ({
  dir: { x, y },
  rotate,
  round,
  label: `X${x > 0 ? '+' : '−'} Y${y > 0 ? '+' : '−'}`,
});

export const UP_LEFT = corner(-1, 1, '-rotate-90', 'rounded-tl-jcorner');
export const UP_RIGHT = corner(1, 1, '', 'rounded-tr-jcorner');
export const DOWN_LEFT = corner(-1, -1, 'rotate-180', 'rounded-bl-jcorner');
export const DOWN_RIGHT = corner(1, -1, 'rotate-90', 'rounded-br-jcorner');

export const CORNERS = [UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT];
