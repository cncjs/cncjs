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

const PathStage = ({ scene, view, onView, revision, layers, layerOptions, onLayers, notes }) => (
  <>
    {/* The canvas is a raw WebGL surface with square corners; the card's own
      * rounding stops at its padding, so the frame and the clipping are here. */}
    <div className="min-h-0 flex-1 overflow-hidden rounded-ctl border border-line">
      <Scene scene={scene} layers={layers} view={view} revision={revision} />
    </div>

    <div className="mt-3 flex shrink-0 flex-wrap items-end gap-gap">
      <div className="flex shrink-0 flex-col gap-2.5">
        <Label>Rzut</Label>
        <SegmentedChoice
          options={VIEW_IDS}
          value={view}
          onChange={onView}
          format={(id) => VIEWS[id].label}
          label="Rzut"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <Label>Warstwy</Label>
        <ToggleChips
          options={layerOptions}
          value={layers}
          onChange={onLayers}
          label="Warstwy"
        />
      </div>
    </div>

    {notes.length > 0 ? (
      <ul className="m-0 mt-3 flex shrink-0 list-none flex-col gap-1 p-0 text-note text-mut">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    ) : null}
  </>
);

export default PathStage;
