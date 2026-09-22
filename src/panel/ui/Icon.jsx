/**
 * The panel's glyphs, in one place.
 *
 * One component and a table of drawings rather than one file per icon. A
 * glyph is not a component in the sense the rest of this directory means it —
 * it has no behaviour, no state and nothing to get wrong twice — and nine
 * files of four lines each would be nine files to open to compare two shapes
 * that have to look like a set.
 *
 * Everything is stroked rather than filled, at a single weight, so the set
 * reads as one hand. Colour comes from `currentColor`, which is how an icon
 * inside a button follows whatever that button is doing.
 */

/*
 * The four views are the same cube with a different face shaded, and that is
 * the whole reason they are legible at this size. Four squares would have
 * been four squares; a cube says which way you are looking at it.
 *
 * Isometric, so the hexagon is regular: the six points sit on a circle about
 * the middle, and the three visible edges meet at the centre.
 */
const CUBE = 'M12 3 19.8 7.5 19.8 16.5 12 21 4.2 16.5 4.2 7.5Z';
const CUBE_EDGES = 'M12 12 12 21M12 12 4.2 7.5M12 12 19.8 7.5';

const FACES = {
  top: 'M12 3 19.8 7.5 12 12 4.2 7.5Z',
  front: 'M4.2 7.5 12 12 12 21 4.2 16.5Z',
  right: 'M19.8 7.5 12 12 12 21 19.8 16.5Z',
};

const cube = (face) => (
  <>
    {face ? <path d={FACES[face]} fill="currentColor" opacity="0.35" stroke="none" /> : null}
    <path d={CUBE} />
    <path d={CUBE_EDGES} />
  </>
);

/** Three arms leaving a point: a zero, the way the scene draws one. */
const AXES = 'M12 17 12 6M12 17 4 17M12 17 19.5 13';

const GLYPHS = {
  iso: cube(null),
  top: cube('top'),
  front: cube('front'),
  right: cube('right'),

  // A cut, doubling back the way a toolpath does.
  path: <path d="M3 17 8 9 13 15 21 6" />,
  // Extents: a box round something, drawn as a measurement rather than as a
  // wall.
  area: <path d="M4 6 20 6 20 18 4 18Z" strokeDasharray="3 2.5" />,
  // The machine's own, which is a wall.
  machine: <path d="M4 6 20 6 20 18 4 18Z" />,
  axes: <path d={AXES} />,
  // The same zero, in the corner of the machine — which is where a machine
  // zero usually is, and the only thing that separates these two at this
  // size.
  machineAxes: (
    <>
      <path d="M4 6 4 20 18 20" opacity="0.45" />
      <path d={AXES} />
    </>
  ),
};

const Icon = ({ name, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {GLYPHS[name]}
  </svg>
);

export default Icon;
