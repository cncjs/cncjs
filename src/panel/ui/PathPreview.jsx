import Scene from '../scene/Scene';

/**
 * The toolpath with nothing you can do to it: the shape for a screen that is
 * about something else.
 *
 * On the jog screen the question is "where is the tool, and is it where I
 * think", answered between key presses without looking away from the machine.
 * A view picker and four layer toggles beside the jog keys would be five more
 * things to hit by mistake while reaching for them.
 *
 * Dragging still works — that comes from the orbit control inside the scene
 * and costs no screen. What is missing here is only the chrome.
 */
const PathPreview = ({ scene, tool, layers, view, revision }) => (
  <div className="min-h-0 flex-1 overflow-hidden rounded-ctl border border-line">
    <Scene scene={scene} tool={tool} layers={layers} view={view} revision={revision} />
  </div>
);

export default PathPreview;
