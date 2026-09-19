import {
  TOOLPATH_CUT_DEEP,
  TOOLPATH_CUT_SHALLOW,
  TOOLPATH_RAPID,
} from './palette';
import { RAPID } from './toolpath-geometry';

/**
 * Turns a toolpath's vertex strip into the two draw sets the renderer needs,
 * with a colour on every endpoint.
 *
 * Splitting rapids from cuts is not a stylistic choice, it is forced: a fat
 * line carries one width per material, and drawing an air move as thick as a
 * cut is exactly what makes a toolpath unreadable. Two sets, two widths.
 *
 * Like `toolpath-geometry` this is deliberately free of three.js, so what the
 * colours and the split actually come out as can be checked numerically
 * rather than by looking at a picture of them.
 */

/**
 * Colours live in linear-light RGB because that is the space a renderer's
 * vertex-colour attribute is read in once colour management is on. Writing
 * sRGB values straight into the buffer is the classic way to get a gradient
 * that looks washed out at one end, so the conversion happens here, once, at
 * module load — and interpolating in linear space is the more correct place
 * to do it anyway.
 */
const srgbToLinear = (c) => ((c < 0.04045) ? (c / 12.92) : (((c + 0.055) / 1.055) ** 2.4));

const fromHex = (hex) => ({
  r: srgbToLinear(((hex >> 16) & 0xff) / 255),
  g: srgbToLinear(((hex >> 8) & 0xff) / 255),
  b: srgbToLinear((hex & 0xff) / 255),
});

/**
 * Rapids take a warm hue that appears nowhere in the depth ramp, so an air
 * move can never be mistaken for a cut at some particular depth — which a
 * second shade of blue absolutely would be.
 */
export const RAPID_COLOR = fromHex(TOOLPATH_RAPID);

/**
 * The depth ramp runs light to dark as well as blue to darker blue. The
 * lightness is the part that survives being looked at quickly, and it is also
 * what carries the ordering for anyone who does not separate the two hues.
 */
export const CUT_SHALLOW = fromHex(TOOLPATH_CUT_SHALLOW);
export const CUT_DEEP = fromHex(TOOLPATH_CUT_DEEP);

/**
 * Where `z` sits on the ramp, given the range of the cutting moves.
 *
 * `zmax` is the shallowest cut and `zmin` the deepest. A job with no depth
 * variation at all has nothing to grade, so it comes out at the shallow end
 * rather than dividing by zero.
 */
export const depthColor = (z, zmin, zmax) => {
  const range = zmax - zmin;
  const t = (range > 0) ? Math.min(1, Math.max(0, (zmax - z) / range)) : 0;

  // The ends are returned rather than interpolated to. `a + (b - a) * t` is
  // exact at t = 0 but not reliably at t = 1, so the deepest cut in a job
  // would otherwise come out a hair off the colour it is documented to be.
  if (t <= 0) {
    return { ...CUT_SHALLOW };
  }
  if (t >= 1) {
    return { ...CUT_DEEP };
  }

  return {
    r: CUT_SHALLOW.r + ((CUT_DEEP.r - CUT_SHALLOW.r) * t),
    g: CUT_SHALLOW.g + ((CUT_DEEP.g - CUT_SHALLOW.g) * t),
    b: CUT_SHALLOW.b + ((CUT_DEEP.b - CUT_SHALLOW.b) * t),
  };
};

const emptySet = () => ({
  positions: new Float32Array(0),
  colors: new Float32Array(0),
  vertexIndex: new Uint32Array(0),
});

/**
 * The Z range of the cutting moves alone.
 *
 * Rapids are excluded on purpose. A program that retracts to +50 mm between
 * passes would otherwise stretch the ramp over 50 mm of empty air, collapsing
 * the 3 mm that is actually being cut into a single indistinguishable colour.
 */
const cutDepthRange = (positions, motions, vertexCount) => {
  let zmin = Infinity;
  let zmax = -Infinity;

  for (let i = 0; i < vertexCount; ++i) {
    if (motions[i] === RAPID) {
      continue;
    }
    const z = positions[(i * 3) + 2];
    zmin = Math.min(zmin, z);
    zmax = Math.max(zmax, z);
  }

  return (zmin === Infinity) ? { zmin: 0, zmax: 0 } : { zmin, zmax };
};

/**
 * How many of a set's segments have been cut once the machine has reached
 * `vertexIndex`.
 *
 * Splitting one strip into two draw sets means neither set's segment
 * numbering matches the vertex index that drives progress any more, so this
 * maps one to the other. A binary search rather than a scan because it runs
 * for every line the sender reports, over arrays holding one entry per
 * segment in the program — and `vertexIndex` is ascending by construction,
 * which is what makes the search valid.
 */
export const completedCount = (vertexIndex, threshold) => {
  let low = 0;
  let high = vertexIndex.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (vertexIndex[mid] <= threshold) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
};

/**
 * @param {object} toolpath The output of `buildToolpath`.
 * @returns {object} `{ cut, rapid }`, each holding flat arrays a fat-line
 *   geometry can take directly: `positions` and `colors` with six entries per
 *   segment (both endpoints), and `vertexIndex` with one entry per segment
 *   naming the vertex that segment arrives at.
 */
const buildSegments = (toolpath) => {
  const { positions, motions, vertexCount } = toolpath;

  // A single vertex is a position, not a move. Joining it to the origin would
  // draw a line the machine never travels.
  if (vertexCount < 2) {
    return { cut: emptySet(), rapid: emptySet() };
  }

  const { zmin, zmax } = cutDepthRange(positions, motions, vertexCount);

  const cut = { positions: [], colors: [], vertexIndex: [] };
  const rapid = { positions: [], colors: [], vertexIndex: [] };

  for (let i = 1; i < vertexCount; ++i) {
    // The motion that *arrives* at a vertex is the one that drew the segment
    // leading to it, so it names the segment as well as the vertex.
    const isRapid = (motions[i] === RAPID);
    const set = isRapid ? rapid : cut;

    const ax = positions[(i - 1) * 3];
    const ay = positions[((i - 1) * 3) + 1];
    const az = positions[((i - 1) * 3) + 2];
    const bx = positions[i * 3];
    const by = positions[(i * 3) + 1];
    const bz = positions[(i * 3) + 2];

    set.positions.push(ax, ay, az, bx, by, bz);
    set.vertexIndex.push(i);

    if (isRapid) {
      const { r, g, b } = RAPID_COLOR;
      set.colors.push(r, g, b, r, g, b);
    } else {
      // Each end takes its own depth, so a plunge is drawn as a gradient down
      // the move rather than flooded with one colour.
      const a = depthColor(az, zmin, zmax);
      const b2 = depthColor(bz, zmin, zmax);
      set.colors.push(a.r, a.g, a.b, b2.r, b2.g, b2.b);
    }
  }

  const freeze = (set) => ({
    positions: new Float32Array(set.positions),
    colors: new Float32Array(set.colors),
    vertexIndex: new Uint32Array(set.vertexIndex),
  });

  return { cut: freeze(cut), rapid: freeze(rapid) };
};

export default buildSegments;
