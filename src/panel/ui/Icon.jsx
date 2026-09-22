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

  /*
   * Fill the frame with the object: four arrows drawn inwards.
   *
   * Deliberately not the corner marks of `area`, which say "this far" and sit
   * still. These point, and pointing is what separates an action from a
   * layer at sixteen pixels — everything else in this bar describes something
   * that is on the drawing, and this one does something to it.
   */
  fit: (
    <path d="M3.5 3.5 8 8M8 4.5 8 8 4.5 8M20.5 3.5 16 8M16 4.5 16 8 19.5 8M20.5 20.5 16 16M16 19.5 16 16 19.5 16M3.5 20.5 8 16M8 19.5 8 16 4.5 16" />
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
   * Clicking drives the machine: a pointer, and nothing else.
   *
   * The button's own lit state is what says whether the mode is on, so the
   * glyph only has to name what the mode is *about* — the mouse button. Any
   * arrow or target drawn into it would compete with the travel button
   * standing right next to it.
   */
  cursor: (
    <path d="M6 3 6 18 10 14.4 12.6 20 15.2 18.9 12.6 13.5 17.6 13.5Z" />
  ),

  /*
   * Travel to the point that was picked: the same sight as the mark on the
   * drawing, with an arrow arriving at it.
   *
   * The sight alone was the obvious choice and says the wrong thing — it is
   * what the *mark* means, so a button wearing it reads as "place a mark"
   * rather than "go to the one that is placed". The arrow is the verb.
   */
  goPoint: (
    <>
      <path d="M3 3 9.5 9.5M9.5 5.5 9.5 9.5 5.5 9.5" />
      <circle cx="15.5" cy="15.5" r="4" />
      <path d="M15.5 9.5 15.5 11.3M15.5 19.7 15.5 21.5M9.5 15.5 11.3 15.5M19.7 15.5 21.5 15.5" />
    </>
  ),

  /*
   * Going to the work zero: a sight, with the point in the middle.
   *
   * The scene's own zero mark was tried here first and failed at this size —
   * three arms leaving a point read as an arrow pointing **down**, and this
   * is the one key that lifts Z before it goes anywhere. A sight says "go to
   * this point" without claiming a direction at all, and it is the only glyph
   * in the pad built from a circle, so it is never confused with an arrow.
   */
  goZero: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M12 2.5 12 6M12 18 12 21.5M2.5 12 6 12M18 12 21.5 12" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),

  /*
   * A corner of the jog cross: one arrow, drawn once and turned.
   *
   * Four separate drawings would be four chances for the corners to disagree
   * about stroke length or head size, and a compass whose arms do not match
   * reads as four different controls. One glyph rotated by the button is the
   * same arrow four times by construction.
   *
   * Drawn pointing up and to the right, which is X+ Y+ on a bed seen from
   * above — the corner it sits in when it is not turned at all.
   */
  diagonal: <path d="M7 17 16 8M11 8 16 8 16 13" />,

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

/**
 * `weight` is the stroke, in `viewBox` units.
 *
 * 1.6 suits the menu on the drawing, where the glyphs are 16px and sit alone
 * on a button. On the jog pad they sit in a row with `X+` and `Y−` set in
 * semibold, and a glyph lighter than the lettering next to it reads as
 * disabled rather than as a different kind of key. Drawn at 24px the viewBox
 * maps one to one, so a weight of 2 is two real pixels — which is what the
 * stem of those letters measures.
 */
const Icon = ({ name, className = '', weight = 1.6 }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={weight}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {GLYPHS[name]}
  </svg>
);

export default Icon;
