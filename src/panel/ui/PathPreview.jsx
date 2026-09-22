import IconBar from './IconBar';
import Scene from '../scene/Scene';
import { VIEWS, VIEW_IDS } from '../scene/views';

/**
 * The toolpath as a glance rather than as a subject: the shape for a screen
 * that is about something else.
 *
 * On the jog screen the question is "where is the tool, and is it where I
 * think", answered between key presses without looking away from the machine.
 *
 * It gets the same menu as the stage, **as icons on the drawing**. A labelled
 * column beside a preview this size would be most of the preview, and the
 * height a block of chips underneath would take is the height that makes the
 * glance worth taking. Every button keeps its name as a label and a tooltip,
 * so the one thing a glyph cannot say is still said.
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

const PathPreview = ({ scene, tool, view, onView, revision, layers, sections, onLayers }) => (
  <div className="relative min-h-0 flex-1 overflow-hidden rounded-ctl border border-line">
    <Scene
      scene={scene}
      tool={tool}
      layers={layers}
      view={view}
      revision={revision}
      memory="preview"
    />

    <IconBar
      className="absolute right-2 top-2"
      groups={[
        {
          label: 'Rzut',
          items: VIEW_IDS.map((id) => ({
            id,
            icon: id,
            label: VIEWS[id].label,
            pressed: id === view,
            onSelect: () => onView(id),
          })),
        },
        {
          label: 'Warstwy',
          items: sections.flatMap((section) => section.options.map((option) => ({
            id: option.id,
            icon: LAYER_ICONS[option.id],
            /*
             * The heading the stage puts above the chip, said in the name
             * instead: "Maszyna · Obszar" rather than two buttons both
             * called "Obszar" and no way to tell which is which.
             */
            label: `${section.label} · ${option.label}`,
            note: option.disabled ? option.note : '',
            pressed: Boolean(layers[option.id]) && !option.disabled,
            disabled: option.disabled,
            onSelect: () => onLayers({ ...layers, [option.id]: !layers[option.id] }),
          }))),
        },
      ]}
    />
  </div>
);

export default PathPreview;
