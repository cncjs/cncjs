import Scene from '../scene/Scene';
import SegmentedChoice from './SegmentedChoice';
import ToggleChips from './ToggleChips';
import { VIEWS, VIEW_IDS } from '../scene/views';

/**
 * The toolpath with everything you can do to it: the shape for the screen
 * that is about it.
 *
 * The canvas takes all the height there is and the controls sit under it at
 * their own. That order matters on a panel beside a machine — the controls
 * are within reach at the bottom edge, and nothing above them moves when one
 * is pressed.
 *
 * The notes are under the controls rather than over the drawing. They say
 * what the scene cannot be sure of, which is worth reading once and then
 * ignoring; as an overlay they would have been in the way of the thing they
 * are about.
 */
const Label = ({ children }) => (
  <span className="text-label font-semibold uppercase leading-none text-ink">{children}</span>
);

const PathStage = ({ scene, tool, view, onView, revision, layers, sections, onLayers, notes }) => (
  /*
   * The controls stand beside the drawing rather than under it, and that is
   * about the drawing rather than about them.
   *
   * An isometric view of a machine is **taller than it is wide** — 0.87 to 1
   * for a cube, because world Z projects fully onto screen-up while X and Y
   * each contribute half. Fitted into a 2:1 viewport that is a correct fit
   * filling 91% of the height and 40% of the width, and it reads as a
   * drawing too small for its card. Taking a column back for the controls
   * brings the viewport closer to square, and the picture with it.
   */
  <div className="flex min-h-0 flex-1 gap-gap">
    {/* The canvas is a raw WebGL surface with square corners; the card's own
      * rounding stops at its padding, so the frame and the clipping are here. */}
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-ctl border border-line">
      <Scene scene={scene} tool={tool} layers={layers} view={view} revision={revision} memory="path" />
    </div>

    <div className="flex w-side2 shrink-0 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-2.5">
        <Label>Rzut</Label>
        <SegmentedChoice
          options={VIEW_IDS}
          value={view}
          onChange={onView}
          format={(id) => VIEWS[id].label}
          label="Rzut"
        />
      </div>

      {/*
        * Grouped by what the layer is *about* rather than listed flat.
        *
        * Four chips in a row were four unrelated questions — a path, a box, a
        * set of crosses, another box — and the only way to know which box was
        * which was to press one and watch. Under a heading each, "Obszar"
        * means the same thing in both places and the heading says whose.
        */}
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2.5">
          <Label>{section.label}</Label>
          <ToggleChips
            options={section.options}
            value={layers}
            onChange={onLayers}
            label={section.label}
          />
        </div>
      ))}

      {/* What the scene cannot be sure of. Beside the drawing rather than
        * over it: worth reading once, then ignorable. */}
      {notes.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-note leading-snug text-mut">
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
    </div>
  </div>
);

export default PathStage;
