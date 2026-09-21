import buildToolpath from 'lib/toolpath/toolpath-geometry';

/**
 * The loaded program, parsed.
 *
 * Parsing only. The split into draw sets is the renderer's business because
 * it needs colours and the colours follow the theme — and the parse is the
 * expensive half, so it should not be redone when somebody turns the lights
 * off.
 *
 * It comes from `src/lib/toolpath`, which the old visualiser parses with as
 * well. There is one answer to "what shape is this program" and two
 * applications asking it.
 *
 * **The vertices are in work coordinates.** A program says `G1 X10` and means
 * ten millimetres from whatever zero is current — it has no opinion about
 * where the machine is. Everything else the toolpath screen draws is in
 * machine coordinates, because that is the frame the envelope and the
 * coordinate systems live in and the only one they share. So the path is
 * placed by the work offset rather than drawn where its numbers say, and
 * moving the work zero moves it. That is not a detail: at `G54` zero it is
 * the difference between a path inside the machine and a path beside it.
 */
export const readToolpath = (gcode) => {
  if (!gcode?.gcode) {
    return null;
  }

  const toolpath = buildToolpath(gcode.gcode);

  // A program with one vertex is a position, not a path. `buildSegments`
  // already returns empty sets for it; this keeps the screen from framing a
  // camera on a box with no extent and reporting it as a drawing.
  if (toolpath.vertexCount < 2) {
    return null;
  }

  return {
    name: gcode.name || '',
    bounds: toolpath.bbox,
    vertexCount: toolpath.vertexCount,
    // The vertices themselves, for whatever is going to colour them.
    source: toolpath,
  };
};

export default readToolpath;
