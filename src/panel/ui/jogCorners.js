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
 * The signs are the two the pad draws on its sides, and the pad turns them
 * into what a screen reader says. They stay here rather than in the component
 * because the corner is the thing that knows which way it points; the words
 * around them are not this file's business, and a `.js` module cannot reach
 * for a translation without dragging i18next into the one tier that runs with
 * no browser. `−` is the minus sign rather than a hyphen, matching the sides
 * of the cross.
 */
const corner = (x, y, rotate, round) => ({
  dir: { x, y },
  rotate,
  round,
  signs: { x: x > 0 ? '+' : '−', y: y > 0 ? '+' : '−' },
});

export const UP_LEFT = corner(-1, 1, '-rotate-90', 'rounded-tl-jcorner');
export const UP_RIGHT = corner(1, 1, '', 'rounded-tr-jcorner');
export const DOWN_LEFT = corner(-1, -1, 'rotate-180', 'rounded-bl-jcorner');
export const DOWN_RIGHT = corner(1, -1, 'rotate-90', 'rounded-br-jcorner');

export const CORNERS = [UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT];
