/**
 * The panel's glyphs, drawn for the panel.
 *
 * One component and a table of drawings rather than one file per icon. A
 * glyph is not a component in the sense the rest of this directory means it —
 * no behaviour, no state, nothing to get wrong twice — and nine files of four
 * lines each would be nine files to open to compare shapes that have to look
 * like a set.
 *
 * Nothing is borrowed. An icon set drawn for web applications has a cube and
 * a layers stack and no idea what a work offset is; these are drawn from what
 * the scene actually puts on screen, so the glyph for a layer is a small
 * picture of that layer.
 *
 * One stroke weight throughout and `currentColor` everywhere, so the set
 * reads as one hand and every icon follows whatever its button is doing.
 */

/*
 * The four views are one cube with a different face **filled**, and that is
 * the whole reason they are legible at sixteen pixels. Four squares would
 * have been four squares; a shaded face is a direction.
 *
 * Filled rather than tinted: the first version shaded the face at a third
 * opacity, which at this size was a smudge. A solid face against a dimmed
 * cage is a shape in a place, and the three places are far apart.
 *
 * Isometric, so the outline is a regular hexagon and the three visible edges
 * meet at the middle.
 */
const CAGE = 'M12 2.5 20.5 7.25 20.5 16.75 12 21.5 3.5 16.75 3.5 7.25Z';
const CAGE_EDGES = 'M12 12 12 21.5M12 12 3.5 7.25M12 12 20.5 7.25';

const FACES = {
  top: 'M12 2.5 20.5 7.25 12 12 3.5 7.25Z',
  front: 'M3.5 7.25 12 12 12 21.5 3.5 16.75Z',
  right: 'M20.5 7.25 12 12 12 21.5 20.5 16.75Z',
};

const cube = (face) => (
  <>
    <path d={CAGE} opacity={face ? '0.4' : '1'} />
    <path d={CAGE_EDGES} opacity={face ? '0.4' : '1'} />
    {face ? <path d={FACES[face]} fill="currentColor" /> : null}
  </>
);

/**
 * A zero: three arms leaving a point, the way the scene draws one.
 *
 * Short and stubby on purpose. Arms reaching the edge of the box read as a
 * chart's axes; these have to read as a marker sitting on something.
 */
const ARMS = 'M11 15 11 7.5M11 15 4.5 15M11 15 17 11.5';

const GLYPHS = {
  iso: cube(null),
  top: cube('top'),
  front: cube('front'),
  right: cube('right'),

  /*
   * A cut, seen from the side: down, along, up, along, down again. A plain
   * zigzag would have been a chart; this is the shape a pocket leaves.
   */
  path: <path d="M3 8 6.5 8 6.5 15 12 15 12 9.5 17.5 9.5 17.5 16 21 16" />,

  /*
   * Extents — corner marks rather than a box, because that is how a drawing
   * says "this far" without claiming there is anything there. It also leaves
   * the closed box free to mean the one thing that really is a wall.
   */
  area: (
    <path d="M4 8.5 4 5 7.5 5M16.5 5 20 5 20 8.5M20 15.5 20 19 16.5 19M7.5 19 4 19 4 15.5" />
  ),

  // The machine's own reach, which is a wall, so it is drawn closed.
  machine: <path d="M4 5.5 20 5.5 20 18.5 4 18.5Z" />,

  // A zero somebody set: the arms, and a dot on the point they were set at.
  axes: (
    <>
      <path d={ARMS} />
      <circle cx="11" cy="15" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),

  /*
   * The machine's zero: the same arms, **in the corner**.
   *
   * On nearly every machine that is exactly where it is — the end of the
   * travel — so the corner is the meaning rather than a decoration. It is
   * also what separates these two glyphs at sixteen pixels: the first version
   * kept the arms in the middle and hung a faint bracket behind them, and the
   * two zeros then shared 59% of their ink. Moving the whole mark is a
   * difference you can see without comparing.
   */
  machineAxes: (
    <>
      <path d="M3.5 4 3.5 20.5 20 20.5" opacity="0.45" />
      <path d="M7 17 7 9.5M7 17 14.5 17M7 17 12 13.5" />
    </>
  ),
};

const Icon = ({ name, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {GLYPHS[name]}
  </svg>
);

export default Icon;
