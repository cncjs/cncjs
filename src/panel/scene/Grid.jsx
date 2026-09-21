import { useEffect, useMemo } from 'react';
import { buildGrid } from './grid-lines';

/**
 * The ground the rest of the scene stands on.
 *
 * Without it this screen was a wireframe box floating in an empty colour, and
 * two things were wrong that did not look like the same problem. The drawing
 * read as too small for its card — an isometric cube is 0.87 as wide as it is
 * tall, so in a landscape viewport a correct fit still leaves half the width
 * empty, and with nothing in that space it reads as a mistake. And rotating
 * was disorienting, because there was no fixed thing to rotate *against*: the
 * only reference on screen was the object being moved.
 *
 * A grid answers both. It fills the frame without adding anything to read, and
 * it is the horizon that says which way the view has been turned.
 *
 * Drawn at the floor of whatever is being shown, so it sits under the toolpath
 * rather than through the middle of it.
 */
const Grid = ({ bounds, color }) => {
  const z = bounds.min.z;

  const { lines, axes } = useMemo(() => buildGrid(bounds, z), [bounds, z]);

  useEffect(() => () => {
    lines.dispose();
    axes.dispose();
  }, [lines, axes]);

  return (
    <>
      <lineSegments geometry={lines}>
        {/* Faint on purpose — a workspace full of grid lines has to recede
          * rather than compete with the toolpath drawn on top of it. Drawn in
          * the muted ink rather than the hairline colour, which against this
          * panel's near-white field was the same colour as the field. */}
        <lineBasicMaterial color={color} transparent opacity={0.16} />
      </lineSegments>

      <lineSegments geometry={axes}>
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
    </>
  );
};

export default Grid;
