import * as THREE from 'three';

/**
 * Frames a bounding box in the camera, from a given direction.
 *
 * The calculation this replaces fitted an object by its X and Y extent, which
 * is the right answer only when looking straight down: from any angle the
 * object's silhouette is some other shape entirely, so the view came out
 * either tiny or clipped. This measures the box in the camera's own basis
 * instead — how wide, how tall and how deep it looks *from where the camera
 * is* — which is the same question for every direction and both projections.
 */

// A little air around the object. Framing it edge to edge looks like a
// mistake, and on a CNC toolpath the interesting thing is often the
// relationship between the path and the machine envelope just outside it.
export const FIT_MARGIN = 1.1;

// A box with no extent in some direction still needs a positive number to
// divide by. Millimetres, so this is a tenth of a millimetre.
const MIN_EXTENT = 0.1;

const _direction = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _corner = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _reference = new THREE.Vector3();

/**
 * @param {THREE.Camera} camera A perspective or orthographic camera. Its
 *   `up` and, for orthographic, its frustum are taken as given; this sets
 *   position, orientation and (orthographic) zoom.
 * @param {THREE.Box3} bounds What to frame, in world space.
 * @param {THREE.Vector3} direction Which way to look from. Need not be
 *   normalised.
 * @returns {THREE.Vector3} The point the camera now looks at — hand it to the
 *   orbit controls so the view rotates about what it is framed on.
 */
const fitCameraToBounds = (camera, bounds, direction) => {
  const center = bounds.getCenter(new THREE.Vector3());

  _direction.copy(direction).normalize();

  // Looking straight along the up axis leaves the screen orientation
  // undefined — a plan view has no inherent idea of which way is up. three's
  // own lookAt handles that by nudging the direction; nudging it here too
  // means the axes this measures against are the axes the camera will
  // actually end up with, and choosing the nudge rather than inheriting it
  // makes a plan view come out the conventional way round (X to the right,
  // Y up) instead of rotated a quarter turn.
  if (Math.abs(_direction.dot(camera.up)) > 1 - 1e-6) {
    _reference.set(0, -1, 0);
    if (Math.abs(_reference.dot(camera.up)) > 0.9) {
      _reference.set(0, 0, -1);
    }
    _direction.addScaledVector(_reference, 1e-3).normalize();
  }

  // The screen axes for this view, in the order three's lookAt builds them:
  // right is up x back, and up is back x right.
  _right.crossVectors(camera.up, _direction).normalize();
  _up.crossVectors(_direction, _right).normalize();

  // How large the box looks along each screen axis, and how deep it is along
  // the line of sight.
  let halfWidth = 0;
  let halfHeight = 0;
  let halfDepth = 0;

  for (let i = 0; i < 8; ++i) {
    _corner.set(
      (i & 1) ? bounds.max.x : bounds.min.x,
      (i & 2) ? bounds.max.y : bounds.min.y,
      (i & 4) ? bounds.max.z : bounds.min.z
    ).sub(center);

    halfWidth = Math.max(halfWidth, Math.abs(_corner.dot(_right)));
    halfHeight = Math.max(halfHeight, Math.abs(_corner.dot(_up)));
    halfDepth = Math.max(halfDepth, Math.abs(_corner.dot(_direction)));
  }

  halfWidth = Math.max(halfWidth, MIN_EXTENT) * FIT_MARGIN;
  halfHeight = Math.max(halfHeight, MIN_EXTENT) * FIT_MARGIN;
  halfDepth = Math.max(halfDepth, MIN_EXTENT);

  if (camera.isOrthographicCamera) {
    // An orthographic view does not get larger or smaller as the camera moves,
    // so framing it means zoom. The frustum is whatever the caller sized it
    // to for the canvas; zoom is the ratio that makes the box fill it.
    const frustumHalfWidth = (camera.right - camera.left) / 2;
    const frustumHalfHeight = (camera.top - camera.bottom) / 2;

    camera.zoom = Math.min(
      frustumHalfWidth / halfWidth,
      frustumHalfHeight / halfHeight
    );

    // Far enough back that the whole box is in front of the near plane. The
    // distance has no effect on the framing, only on the clipping.
    _offset.copy(_direction).multiplyScalar(halfDepth * 4);
  } else {
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const distanceForHeight = halfHeight / Math.tan(halfFov);
    const distanceForWidth = (halfWidth / camera.aspect) / Math.tan(halfFov);

    // Plus the depth, so the near face of the box is the part that fills the
    // frame rather than its centre.
    const distance = Math.max(distanceForHeight, distanceForWidth) + halfDepth;
    _offset.copy(_direction).multiplyScalar(distance);
  }

  camera.position.copy(center).add(_offset);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return center;
};

export default fitCameraToBounds;
