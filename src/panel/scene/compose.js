import {
  machineEnvelope,
  workOrigins,
} from '../machine/envelope';

/** Everything the scene draws when the panel has been told nothing at all. */
const UNIT = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };

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

/** Where the machine measures from, which is a point the camera has to frame. */
const MACHINE_ZERO = { x: 0, y: 0, z: 0 };

const longestEdge = (bounds) => Math.max(
  bounds.max.x - bounds.min.x,
  bounds.max.y - bounds.min.y,
  bounds.max.z - bounds.min.z,
  // A program cut at one depth in a 2mm square still needs markers somebody
  // can see. A zero here would make the tool and the origin crosses vanish.
  1
);

/**
 * Where the tool is, or nothing.
 *
 * The one reading the scene takes live. Everything else about the picture is
 * settled and memoised; this is a point that moves four times a second, and
 * moving a marker is all it costs.
 */
export const toolPoint = (machinePosition) => {
  const { x, y, z } = machinePosition || {};

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return { x, y, z };
};

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
 *
 * **It takes readings rather than the machine**, and that is not tidiness.
 * The caller memoises this, and it can only do that if nothing here is
 * recomputed from an object that arrives afresh four times a second. The work
 * offset is the example that forced it: it is derived from two positions that
 * both change during a move while their difference does not, so the caller
 * settles it to a value and hands the value in. Given the whole `machine`,
 * every outline's geometry was being rebuilt on every status report, and a
 * dragged view stuttered against it.
 *
 * @param {object} settings The controller's settings, whole.
 * @param {string} wcs The active coordinate system, e.g. `G54`.
 * @param {object} offset Machine minus work, settled to a value by the caller.
 * @param {object|null} toolpath The loaded program, from `readToolpath`.
 * @param {object} layers Which of the four are switched on.
 */
export const composeScene = ({ settings, wcs, offset, toolpath, layers }) => {
  const envelope = machineEnvelope(settings);

  const program = toolpath ? shift(toolpath.bounds, offset) : null;

  const origins = workOrigins(settings).map((system) => ({
    ...system,
    active: system.name === wcs,
  }));

  const frame = union([
    (layers.path || layers.programArea) && program,
    layers.machineArea && envelope,
    layers.machineAxes && { min: MACHINE_ZERO, max: MACHINE_ZERO },
    ...(layers.wcsAxes ? origins.map(pointBox) : []),
  ].filter(Boolean)) || UNIT;

  return {
    envelope,
    program,
    offset,
    toolpath,
    origins,
    frame,
    // One number for "how big is this scene", which the markers size
    // themselves against so they stay legible at any machine size.
    size: longestEdge(frame),
  };
};

export default composeScene;
