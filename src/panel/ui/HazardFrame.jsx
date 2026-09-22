/**
 * Yellow-and-black tape round the drawing, for the one state where clicking
 * it moves the machine.
 *
 * **A striped sheet underneath the preview, wider than it.** Only the margin
 * shows, because the drawing is opaque and covers the middle — so one
 * background does what a border would have, and the stripe runs round the
 * corners without a seam. Four positioned strips were tried first and gave
 * themselves away exactly there: each ran its own diagonal and they collided
 * where they met. A `border-image` band was tried after that and brought its
 * own trouble — the `border` shorthand silently resets it, and the negative
 * inset it needed was a class Tailwind would not generate.
 *
 * It costs the layout nothing: the sheet is positioned, so the canvas keeps
 * every pixel it had and R3F never re-measures.
 *
 * `pointer-events-none`, because the thing being warned about *is* clicking
 * the drawing, and a warning that swallowed the click would be its own kind
 * of wrong.
 *
 * Not a theme colour. `--amb` follows the theme and means "worth reading";
 * this stripe means "the machine will move", which is the same in daylight
 * and at night, and is the colour it is on a workshop floor.
 */
const HazardFrame = () => (
  <div className="pointer-events-none absolute inset-tape rounded-ctl bg-hazard" />
);

export default HazardFrame;
