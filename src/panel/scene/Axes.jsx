import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AXIS_X, AXIS_Y, AXIS_Z } from 'lib/toolpath/palette';

/**
 * A zero, drawn as the three axes leaving it.
 *
 * Two of these can be on screen: where the machine measures from, and where
 * the work does. A coordinate system has no size — Grbl stores a point per
 * system and nothing about how far the work around it reaches — so a point is
 * what there is to draw, and three arms are how a point says which way round
 * it is.
 *
 * Red, green, blue for X, Y, Z. The one convention on this screen that is not
 * ours to choose: every CAM package, every machine manual and the old
 * visualiser in this repository all agree, and they come from
 * `lib/toolpath/palette` so the two applications keep agreeing. They do not
 * follow the theme for the same reason — a green Y axis that went blue at
 * night would be a different claim, not a different shade.
 *
 * Positive directions only. An arm each way would be symmetrical and would
 * therefore say nothing about which way the machine counts.
 */

// Arm length as a fraction of the scene, so a zero stays the same size on
// screen whether it is in a 200mm machine or a two-metre one.
const ARM_FRACTION = 0.11;

const Arm = ({ to, color, opacity }) => {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(...to),
  ]), [to]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
};

const Axes = ({ origin, size, opacity = 1 }) => {
  const arm = size * ARM_FRACTION;

  return (
    <group position={[origin.x, origin.y, origin.z]}>
      <Arm to={[arm, 0, 0]} color={AXIS_X} opacity={opacity} />
      <Arm to={[0, arm, 0]} color={AXIS_Y} opacity={opacity} />
      <Arm to={[0, 0, arm]} color={AXIS_Z} opacity={opacity} />
    </group>
  );
};

export default Axes;
