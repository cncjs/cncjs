import Toolpath from 'gcode-toolpath';

/**
 * Turns a G-code program into flat vertex data, with no three.js in sight.
 *
 * The geometry and the rendering used to be the same file, which meant the
 * only way to find out whether a toolpath had been built correctly was to look
 * at it. Everything here is ordinary arithmetic over ordinary arrays, so it
 * can be checked numerically instead — see `__tests__/toolpath-geometry.js`,
 * which is the only test in this repository that sees anything under
 * `src/app`.
 *
 * The output is deliberately dumb: typed arrays a renderer can hand straight
 * to a BufferGeometry, plus a label per vertex saying which motion arrived
 * there. Choosing what those labels look like on screen is the renderer's job,
 * not this module's.
 */

// Motion labels, one per vertex. These are the only four values `motions` can
// hold: `gcode-toolpath` emits geometry from its G0/G1 handlers (addLine) and
// its G2/G3 handlers (addArcCurve) and from nowhere else — G38.x probe moves,
// for instance, set the modal and draw nothing.
export const RAPID = 0; // G0
export const LINEAR = 1; // G1
export const ARC_CW = 2; // G2
export const ARC_CCW = 3; // G3

const LINE_MOTION = {
  'G0': RAPID,
  'G1': LINEAR,
};

const ARC_MOTION = {
  'G2': ARC_CW,
  'G3': ARC_CCW,
};

/**
 * How far an interpolated arc is allowed to depart from the true curve, in
 * millimetres of sagitta. Tessellating by a fixed division count instead —
 * which is what this replaced — spends the same 30 segments on a 2 mm fillet
 * as on a 200 mm circle, so the fillet is wasteful and the circle is visibly
 * a polygon. Dividing by chord error spends segments where they show.
 */
export const ARC_CHORD_TOLERANCE = 0.02;

// Floor and ceiling on that division count. The floor keeps a tiny arc from
// collapsing into one chord; the ceiling stops a pathological radius from
// generating unbounded vertices.
export const MIN_ARC_DIVISIONS = 8;
export const MAX_ARC_DIVISIONS = 512;

/**
 * Back out to machine coordinates from the plane-local frame.
 *
 * `gcode-toolpath` does not report arc endpoints in machine XYZ. It permutes
 * them so the circle always lies in the reported x/y and the axis interpolated
 * linearly across the arc is always the reported z, whichever plane is
 * selected. That is convenient — one interpolator serves all three planes —
 * but it means the arc has to be permuted back, and the permutation is
 * invisible in the reported values. Written out:
 *
 *   G17 (XY)  reported (x, y, z) = machine (x, y, z)
 *   G18 (ZX)  reported (x, y, z) = machine (z, x, y)
 *   G19 (YZ)  reported (x, y, z) = machine (y, z, x)
 */
const TO_MACHINE = {
  'G17': (u, v, w) => [u, v, w],
  'G18': (u, v, w) => [v, w, u],
  'G19': (u, v, w) => [w, u, v],
};

const TAU = Math.PI * 2;

/**
 * The signed angle an arc sweeps, in the reported frame.
 *
 * A closed circle is the case worth naming: G-code writes it with identical
 * start and end points, which leaves a zero difference between the two angles.
 * Read literally that is a zero-length arc, so it has to be read as a full
 * turn instead — and in the commanded direction, which is why this returns a
 * signed value rather than a magnitude.
 */
const sweepAngle = (startAngle, endAngle, clockwise) => {
  const delta = endAngle - startAngle;

  if (clockwise) {
    // Normalise into [-TAU, 0).
    let sweep = delta % TAU;
    if (sweep >= 0) {
      sweep -= TAU;
    }
    return sweep;
  }

  // Normalise into (0, TAU].
  let sweep = delta % TAU;
  if (sweep <= 0) {
    sweep += TAU;
  }
  return sweep;
};

/**
 * Segments needed to keep the chord error within ARC_CHORD_TOLERANCE.
 *
 * The sagitta of a chord subtending angle t on radius r is r(1 - cos(t/2)),
 * so the largest angle a single segment may span is 2·acos(1 - tol/r).
 */
const arcDivisions = (radius, sweep) => {
  const ratio = 1 - (ARC_CHORD_TOLERANCE / radius);
  const maxAngle = (ratio <= -1) ? Math.PI : (2 * Math.acos(Math.max(-1, Math.min(1, ratio))));
  const divisions = (maxAngle > 0) ? Math.ceil(Math.abs(sweep) / maxAngle) : MAX_ARC_DIVISIONS;

  return Math.max(MIN_ARC_DIVISIONS, Math.min(MAX_ARC_DIVISIONS, divisions));
};

/**
 * @param {string} gcode The program to walk.
 * @returns {object} Vertex data for a renderer:
 *   - `positions`  Float32Array, 3 entries per vertex, machine coordinates.
 *   - `motions`    Uint8Array, one label per vertex: which motion arrived here.
 *   - `vertexCount` How many vertices the two arrays above describe.
 *   - `frames`     One entry per G-code line the parser reported, each holding
 *                  the parsed line and how many vertices existed before it.
 *   - `bbox`       `{ min, max }` over every vertex, or the origin if there
 *                  are none.
 */
const buildToolpath = (gcode) => {
  const positions = [];
  const motions = [];
  const frames = [];

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  const addVertex = (x, y, z, motion) => {
    positions.push(x, y, z);
    motions.push(motion);

    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  };

  const toolpath = new Toolpath({
    // One vertex per move, at the end point: consecutive vertices are the path
    // the machine takes, so a renderer joining them in order draws the
    // toolpath without needing both ends of every segment.
    addLine: (modal, v1, v2) => {
      addVertex(v2.x, v2.y, v2.z, LINE_MOTION[modal.motion]);
    },

    // v1, v2 and v0 arrive in the plane-local frame described at TO_MACHINE:
    // the circle is in the reported x/y about the reported centre, and the
    // reported z is interpolated linearly from one end to the other.
    addArcCurve: (modal, v1, v2, v0) => {
      const motion = ARC_MOTION[modal.motion];
      const radius = Math.sqrt(((v1.x - v0.x) ** 2) + ((v1.y - v0.y) ** 2));
      const startAngle = Math.atan2(v1.y - v0.y, v1.x - v0.x);
      const endAngle = Math.atan2(v2.y - v0.y, v2.x - v0.x);
      const sweep = sweepAngle(startAngle, endAngle, modal.motion === 'G2');
      const divisions = arcDivisions(radius, sweep);
      const toMachine = TO_MACHINE[modal.plane] || TO_MACHINE.G17;

      // Inclusive of both ends, so the arc starts exactly where the previous
      // move left the tool and finishes exactly on the commanded end point
      // rather than a fraction of a segment short of it.
      for (let i = 0; i <= divisions; ++i) {
        const fraction = i / divisions;
        const angle = startAngle + (sweep * fraction);
        const u = v0.x + (radius * Math.cos(angle));
        const v = v0.y + (radius * Math.sin(angle));
        const w = v1.z + ((v2.z - v1.z) * fraction);
        const [x, y, z] = toMachine(u, v, w);

        addVertex(x, y, z, motion);
      }
    },
  });

  toolpath.loadFromStringSync(gcode, (line) => {
    frames.push({
      data: line,
      vertexIndex: motions.length,
    });
  });

  const empty = (motions.length === 0);

  return {
    positions: new Float32Array(positions),
    motions: new Uint8Array(motions),
    vertexCount: motions.length,
    frames,
    bbox: {
      min: empty ? { x: 0, y: 0, z: 0 } : { ...min },
      max: empty ? { x: 0, y: 0, z: 0 } : { ...max },
    },
  };
};

export default buildToolpath;
