import {
  machineEnvelope,
  workOffset,
  workOrigins,
} from '../machine/envelope';

/** Everything the scene draws when the panel has been told nothing at all. */
const UNIT = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };

const NO_OFFSET = { x: 0, y: 0, z: 0 };

const shift = (bounds, offset) => ({
  min: {
    x: bounds.min.x + offset.x,
    y: bounds.min.y + offset.y,
    z: bounds.min.z + offset.z,
  },
  max: {
    x: bounds.max.x + offset.x,
    y: bounds.max.y + offset.y,
    z: bounds.max.z + offset.z,
  },
});

const merge = (into, box) => ({
  min: {
    x: Math.min(into.min.x, box.min.x),
    y: Math.min(into.min.y, box.min.y),
    z: Math.min(into.min.z, box.min.z),
  },
  max: {
    x: Math.max(into.max.x, box.max.x),
    y: Math.max(into.max.y, box.max.y),
    z: Math.max(into.max.z, box.max.z),
  },
});

const union = (boxes) => boxes.reduce(
  (into, box) => (into === null ? box : merge(into, box)),
  null
);

const pointBox = ({ origin }) => ({ min: origin, max: origin });

const longestEdge = (bounds) => Math.max(
  bounds.max.x - bounds.min.x,
  bounds.max.y - bounds.min.y,
  bounds.max.z - bounds.min.z,
  // A program cut at one depth in a 2mm square still needs markers somebody
  // can see. A zero here would make the tool and the origin crosses vanish.
  1
);

const finitePoint = (point) => (
  Number.isFinite(point?.x) && Number.isFinite(point?.y) && Number.isFinite(point?.z)
    ? { x: point.x, y: point.y, z: point.z }
    : null
);

/**
 * The readings and the loaded program, arranged as one scene.
 *
 * Kept out of the view because every hard thing about this screen is
 * arithmetic: which frame each outline is in, where the program sits once the
 * work zero moves, and what the camera should be framed on when there is no
 * program, or no machine, or neither. None of that needs a renderer to check.
 *
 * **What the camera frames is whatever is switched on.** Not the program
 * alone: with the machine layer on and a 12mm part at the corner of a 200mm
 * envelope, framing the part puts five sixths of the envelope off screen and
 * what is left crosses the view as two unexplained lines. Turning a layer on
 * and not being able to see it is the worst of both answers, so the frame is
 * the union of what is drawn — and turning the machine off is how you get
 * back to filling the view with the part.
 */
export const composeScene = ({ machine, toolpath, layers }) => {
  const envelope = machineEnvelope(machine.settings);

  // Machine minus work: what has to be added to a program's coordinates to
  // put it where the machine will actually cut it. Zero when the machine has
  // not reported both positions, which draws the program about machine zero —
  // wrong, but wrong in the one place the screen also says it does not know.
  const offset = workOffset(machine.machinePosition, machine.position) || NO_OFFSET;

  const program = toolpath ? shift(toolpath.bounds, offset) : null;

  const origins = workOrigins(machine.settings).map((system) => ({
    ...system,
    active: system.name === machine.modal?.wcs,
  }));

  const frame = union([
    (layers.path || layers.program) && program,
    layers.machine && envelope,
    ...(layers.work ? origins.map(pointBox) : []),
  ].filter(Boolean)) || UNIT;

  return {
    envelope,
    program,
    offset,
    toolpath,
    origins,
    tool: finitePoint(machine.machinePosition),
    frame,
    // One number for "how big is this scene", which the markers size
    // themselves against so they stay legible at any machine size.
    size: longestEdge(frame),
  };
};

export default composeScene;
