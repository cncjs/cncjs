import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AXIS_X, AXIS_Y, AXIS_Z } from 'lib/toolpath/palette';
import { useScreenScale } from './screenScale';

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
 *
 * **Measured in pixels rather than in millimetres.** It is a mark about the
 * drawing rather than a part of it, and at a fixed size in the world it grew
 * with the zoom — so closing in on the corner of a part, which is when a zero
 * is worth looking at, buried it under an axis cross the width of the card.
 */

// How long an arm is on screen, whatever the zoom. Chosen against what it
// used to come out as at the default fit, so nothing changed size the day
// this became a pixel measurement.
const ARM_PIXELS = 36;

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

const Axes = ({ origin, opacity = 1 }) => {
  const scale = useScreenScale(ARM_PIXELS);

  return (
    <group ref={scale} position={[origin.x, origin.y, origin.z]}>
      <Arm to={[1, 0, 0]} color={AXIS_X} opacity={opacity} />
      <Arm to={[0, 1, 0]} color={AXIS_Y} opacity={opacity} />
      <Arm to={[0, 0, 1]} color={AXIS_Z} opacity={opacity} />
    </group>
  );
};

export default Axes;
