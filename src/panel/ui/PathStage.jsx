import IconBar from './IconBar';
import Scene from '../scene/Scene';
import { VIEWS, VIEW_IDS } from '../scene/views';

/**
 * The toolpath, with its menu on it.
 *
 * There was a second shape for the preview beside the jog keys, from when the
 * difference was a labelled column of chips against no chips at all. Once the
 * menu became icons on the drawing the two were the same component with the
 * same controls at different sizes, and the only thing left between them was
 * whether the screen's warnings are shown — which is a list that is sometimes
 * empty, not a shape.
 *
 * **The menu sits on the drawing rather than beside it**, and that is what
 * lets the drawing have the whole card. A column of labelled chips cost about
 * a fifth of the width; the same nine choices as glyphs cost thirty pixels
 * down one edge, and the grid underneath now fills what is left with a floor
 * rather than with nothing — which is what made the column worth spending in
 * the first place.
 *
 * Every button keeps its name as a label and a tooltip, and the layer names
 * carry the heading the chips used to print above them — "Maszyna · Obszar"
 * rather than two buttons both called "Obszar" and no way to tell which is
 * which.
 */

// Which glyph stands for which layer. The ids come from the widget; this is
// the one place that knows what they look like.
const LAYER_ICONS = {
  path: 'path',
  programArea: 'area',
  wcsAxes: 'axes',
  machineArea: 'machine',
  machineAxes: 'machineAxes',
};

const viewItems = (view, onView) => VIEW_IDS.map((id) => ({
  id,
  icon: id,
  label: VIEWS[id].label,
  pressed: id === view,
  onSelect: () => onView(id),
}));

const layerItems = (sections, layers, onLayers) => sections.flatMap(
  (section) => section.options.map((option) => ({
    id: option.id,
    icon: LAYER_ICONS[option.id],
    label: `${section.label} · ${option.label}`,
    note: option.disabled ? option.note : '',
    pressed: Boolean(layers[option.id]) && !option.disabled,
    disabled: option.disabled,
    onSelect: () => onLayers({ ...layers, [option.id]: !layers[option.id] }),
  }))
);

const PathStage = ({
  scene, tool, view, onView, revision, layers, sections, onLayers, notes, memory,
}) => (
  <>
    {/* The canvas is a raw WebGL surface with square corners; the card's own
      * rounding stops at its padding, so the frame and the clipping are here.
      * `relative`, because the menu is positioned against it. */}
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-ctl border border-line">
      <Scene
        scene={scene}
        tool={tool}
        layers={layers}
        view={view}
        revision={revision}
        memory={memory}
      />

      <IconBar
        className="absolute right-2 top-2"
        groups={[
          { label: 'Rzut', items: viewItems(view, onView) },
          { label: 'Warstwy', items: layerItems(sections, layers, onLayers) },
        ]}
      />
    </div>

    {/* What the scene cannot be sure of. Under the drawing rather than over
      * it: worth reading once, then ignorable. */}
    {notes.length > 0 ? (
      <ul className="m-0 mt-3 flex shrink-0 list-none flex-col gap-1 p-0 text-note text-mut">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    ) : null}
  </>
);

export default PathStage;
