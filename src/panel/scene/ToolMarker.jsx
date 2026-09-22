import { useScreenScale } from './screenScale';

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
 *
 * **Measured in pixels**, like the coordinate-system markers and for the same
 * reason: the panel is never told what is in the spindle, so this was never
 * to scale, and a mark that is not to scale should at least be the size it
 * was drawn at however far the camera is zoomed in.
 */
const SIZE_PIXELS = 14;

const ToolMarker = ({ position, color }) => {
  const scale = useScreenScale(SIZE_PIXELS);

  return (
    <group ref={scale} position={[position.x, position.y, position.z]}>
      {/* Half a unit up inside the group, so the tip lands on the position
        * the group is at rather than half a marker above it. */}
      <mesh
        position={[0, 0, 0.5]}
        /* A cone's axis is Y and its apex is at +Y. A quarter turn *backwards*
         * about X sends +Y to -Z, which stands it on its tip in a Z-up world;
         * the forward quarter turn balances it on its point the other way up,
         * which looks almost right and is exactly wrong. */
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[1 / 3, 1, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

export default ToolMarker;
