/**
 * Where the tool is now.
 *
 * Drawn from the machine position rather than the work position, because
 * everything else in this scene is in machine coordinates and a marker in the
 * other frame would sit somewhere plausible and wrong.
 *
 * A cone standing on its point, which is both what a cutter looks like and
 * the shape that says *which* end of it is the tip. A sphere would have been
 * simpler and would have left the tip ambiguous by half its diameter, which
 * on a 3mm cutter is the whole question.
 *
 * `depthTest` off: the tool is often inside the stock or below the bed
 * outline, and a marker that disappears behind the geometry it is meant to be
 * located against is a marker nobody can use. It is the one thing on screen
 * allowed to draw over everything else.
 */

// Sized against the scene rather than the tool: the panel is not told what is
// in the spindle, and a marker that vanishes at 200mm is worse than one that
// is not to scale.
const SIZE_FRACTION = 0.035;

const ToolMarker = ({ position, size, color }) => {
  const height = size * SIZE_FRACTION;

  return (
    <mesh
      position={[position.x, position.y, position.z + (height / 2)]}
      /* A cone's axis is Y and its apex is at +Y. A quarter turn *backwards*
       * about X sends +Y to -Z, which stands it on its tip in a Z-up world;
       * the forward quarter turn balances it on its point the other way up,
       * which looks almost right and is exactly wrong. */
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <coneGeometry args={[height / 3, height, 12]} />
      <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
    </mesh>
  );
};

export default ToolMarker;
