import * as THREE from 'three';
// A relative path rather than the `lib/` alias the rest of the scene uses:
// Jest has no module mapping for it, and arithmetic that cannot be imported
// into a test is arithmetic nobody checks. Webpack resolves both.
import fitCameraToBounds from '../../lib/toolpath/camera-fit';

/**
 * Framing one object without turning the camera.
 *
 * The view buttons answer "look at it from there". This answers the other
 * question an operator has in front of a program — "fill the frame with
 * **this**" — and the difference is that it must not move the camera round
 * the object. Somebody has arranged an angle they want; zooming in on the
 * work is not a request to lose it.
 *
 * So the direction is read back off the camera rather than taken from a named
 * view: where it is now, relative to what it is orbiting, **is** the
 * orientation to keep. Everything else — how far back, and the zoom that
 * makes the box fill the frame — is what `fitCameraToBounds` already works
 * out for the view buttons, so this is the same fit from a different
 * direction rather than a second way of framing things.
 */
export const boundsBox = (bounds) => new THREE.Box3(
  new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
  new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
);

/**
 * The way the camera is currently looking, as a vector pointing from the
 * subject back towards the camera — which is the direction `fitCameraToBounds`
 * takes.
 *
 * Degenerate only if the camera sits exactly on its own target, which orbit
 * controls do not allow; the fit normalises it anyway.
 */
export const currentDirection = (camera, target) => new THREE.Vector3()
  .subVectors(camera.position, target);

/**
 * @returns {THREE.Vector3} The new orbit target — the centre of what was
 *   framed, so the view rotates about the object from now on.
 */
export const fitToBounds = (camera, target, bounds) => fitCameraToBounds(
  camera,
  boundsBox(bounds),
  currentDirection(camera, target)
);

export default fitToBounds;
