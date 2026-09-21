import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import buildSegments, { colorsFromHex } from 'lib/toolpath/toolpath-segments';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * The program, drawn.
 *
 * Two objects rather than one, and not for tidiness: a line material carries
 * a single width, so cuts and rapids have to be separate draw sets before
 * either can be drawn at its own thickness. `buildSegments` has already split
 * them and coloured every endpoint, so there is nothing to decide here.
 *
 * `Line2` rather than `line`, because `LineBasicMaterial.linewidth` is
 * ignored by WebGL on nearly every platform — the reason a plain three.js
 * toolpath comes out as a one-pixel trace whatever width is asked for. The
 * fat-line material builds its own screen-space geometry and honours it.
 */

/*
 * Thickness in CSS pixels.
 *
 * Thinner than they were. A toolpath doubles back on itself hundreds of
 * times, and at two pixels a pocket clears into a solid block of colour where
 * the individual passes should still be countable. The cut still has to read
 * as the heavier of the two, so both came down together rather than the cut
 * alone.
 */
const CUT_WIDTH = 1;
const RAPID_WIDTH = 0.6;

// Dash lengths in millimetres — the material measures them in world units.
// A rapid is dashed as well as thinner because that is the distinction that
// survives being glanced at from a metre away.
const RAPID_DASH = 2;
const RAPID_GAP = 2;

const buildLine = (set, options) => {
  if (set.vertexIndex.length === 0) {
    return null;
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(set.positions);
  geometry.setColors(set.colors.slice());

  const material = new LineMaterial({ vertexColors: true, ...options });
  const line = new Line2(geometry, material);

  if (options.dashed) {
    // Dash phase is measured along the line, so the distances have to exist
    // before any of it can be drawn.
    line.computeLineDistances();
  }

  return line;
};

const Toolpath = ({ toolpath, colors }) => {
  const size = useThree((state) => state.size);

  /*
   * Coloured here rather than where it was parsed, because the colours follow
   * the theme and the parse does not. Flipping to the dark theme rebuilds two
   * vertex buffers; it used to re-read the whole program to do it.
   */
  const sets = useMemo(
    () => buildSegments(toolpath.source, colorsFromHex(colors)),
    [toolpath, colors.rapid, colors.cutTop, colors.cutDeep]
  );

  const lines = useMemo(() => [
    ['cut', buildLine(sets.cut, { linewidth: CUT_WIDTH })],
    ['rapid', buildLine(sets.rapid, {
      linewidth: RAPID_WIDTH,
      dashed: true,
      dashSize: RAPID_DASH,
      gapSize: RAPID_GAP,
      opacity: 0.85,
      transparent: true,
    })],
  ].filter(([, line]) => line), [sets]);

  /*
   * The material works in screen space, so it has to be told how large the
   * screen is. Getting this wrong is not subtle — the line width is computed
   * against the resolution, so a stale one makes the whole path thicken or
   * vanish when the card is resized.
   */
  useEffect(() => {
    lines.forEach(([, line]) => line.material.resolution.set(size.width, size.height));
  }, [lines, size.width, size.height]);

  // Nothing disposes an object handed to `primitive`; the geometry and
  // material here are built per program and would otherwise be left on the
  // GPU every time a new one is loaded.
  useEffect(() => () => lines.forEach(([, line]) => {
    line.geometry.dispose();
    line.material.dispose();
  }), [lines]);

  return lines.map(([name, line]) => <primitive key={name} object={line} />);
};

export default Toolpath;
