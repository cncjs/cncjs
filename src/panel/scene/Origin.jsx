import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * A work coordinate system, drawn where it actually is.
 *
 * `G54` and its five siblings are origins, not areas — Grbl stores a point
 * per system and has no notion of how far the work around it extends. So
 * what there is to draw is where each zero sits inside the machine, which is
 * the question "is my G55 where I left it" and the reason this layer is worth
 * having at all.
 *
 * A cross rather than a dot: a point in an isometric view has no depth, and
 * three arms that line up with the axes say where the thing is in all three.
 */

// Arm length as a fraction of the scene, so the cross stays the same size on
// screen whether it marks a zero in a 200mm machine or a 2m one.
const ARM_FRACTION = 0.06;

const Origin = ({ origin, size, color, opacity = 1 }) => {
  const arm = size * ARM_FRACTION;

  const geometry = useMemo(() => {
    const points = [
      [-arm, 0, 0], [arm, 0, 0],
      [0, -arm, 0], [0, arm, 0],
      [0, 0, -arm], [0, 0, arm],
    ];

    return new THREE.BufferGeometry().setFromPoints(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
  }, [arm]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={[origin.x, origin.y, origin.z]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
};

export default Origin;
