import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
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
 * `depthTest` off **for the tool**, and that is a deliberate exception: the
 * tool is often inside the stock or below the bed outline, and a marker that
 * vanishes behind the geometry it is meant to be located against is a marker
 * nobody can use. It is the one thing on screen allowed to draw over
 * everything else.
 *
 * **The pointer preview takes the opposite choice.** It is answering "where
 * in this model am I aiming", and an answer that floats in front of the model
 * whatever its depth is no answer at all — it has to go behind what it is
 * behind. So depth is a prop rather than a constant here.
 *
 * **Measured in pixels**, like the coordinate-system markers and for the same
 * reason: the panel is never told what is in the spindle, so this was never
 * to scale, and a mark that is not to scale should at least be the size it
 * was drawn at however far the camera is zoomed in.
 */
const SIZE_PIXELS = 14;

/**
 * A thread from the tool down to the floor.
 *
 * Without it the cone floats: in an isometric view a mark higher up and a
 * mark further back land in the same place on screen, so "where is the tool
 * over the table" has no answer. The line is the answer — it meets the grid
 * at the tool's X and Y, which is the shadow it would cast straight down.
 *
 * Very faint on purpose. It is a reading aid for a mark that is itself an
 * annotation, so it must never compete with the program underneath it — the
 * first version at 0.35 read as a line somebody had drawn.
 *
 * **Scaled rather than rebuilt.** The geometry is one unit long and the group
 * is stretched to the drop; a status report arrives four times a second, and
 * rebuilding a buffer at that rate is the thing that made this scene stutter
 * once already.
 */
const DROP_OPACITY = 0.18;

const Drop = ({ position, floor, color, opacity }) => {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const drop = position.z - floor;
  if (!(drop > 0)) {
    return null;
  }

  return (
    <group position={[position.x, position.y, position.z]} scale={[1, 1, drop]}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={DROP_OPACITY * opacity} />
      </lineSegments>
    </group>
  );
};

/**
 * `opacity` is what lets this mark stand in for a *proposed* position as well
 * as the real one. The pointer preview is the same cone and the same thread
 * at a third of the weight — one component, so the two can never drift into
 * being two different pictures of the same idea.
 */
const ToolMarker = ({ position, color, floor, opacity = 0.9, depthTest = false }) => {
  const scale = useScreenScale(SIZE_PIXELS);

  return (
    <>
      {Number.isFinite(floor) ? (
        <Drop position={position} floor={floor} color={color} opacity={opacity} />
      ) : null}

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
        <meshBasicMaterial color={color} depthTest={depthTest} transparent opacity={opacity} />
      </mesh>
      </group>
    </>
  );
};

export default ToolMarker;
