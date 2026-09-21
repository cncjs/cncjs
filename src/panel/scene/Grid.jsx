import { useEffect, useMemo } from 'react';
import GridLabels from './GridLabels';
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
 * **Sized to the machine and then some, and faded rather than cut.** It is the
 * floor, not the table: stopping it dead at the edge of the travel drew a
 * rectangle nobody asked for, and made the machine look like it was standing
 * on a slab exactly its own size. The alpha rides on the vertices, because a
 * material has one opacity for the whole draw and that is the hard edge being
 * replaced.
 *
 * Laid at the floor of whatever is being shown, so it sits under the toolpath
 * rather than through the middle of it.
 */
const Grid = ({ area, z, color }) => {
  const { lines, axes, step } = useMemo(() => buildGrid(area, z, color), [area, z, color]);

  useEffect(() => () => {
    lines.dispose();
    axes.dispose();
  }, [lines, axes]);

  return (
    <>
      <lineSegments geometry={lines}>
        {/* Faint on purpose — a workspace full of grid lines has to recede
          * rather than compete with the toolpath drawn on top of it. The
          * opacity here is the weight of the whole set; the fade towards the
          * edges is multiplied into it from the vertices. */}
        <lineBasicMaterial vertexColors transparent opacity={0.16} />
      </lineSegments>

      <lineSegments geometry={axes}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>

      <GridLabels area={area} step={step} z={z} color={color} />
    </>
  );
};

export default Grid;
