import * as THREE from 'three';

/**
 * Where the mouse is, in machine coordinates.
 *
 * **Named `pointer-plane` and not `pointer`, because this is built on
 * Windows.** `pointer.js` beside `Pointer.jsx` is one name to a
 * case-insensitive filesystem, and webpack resolves `./Pointer` by trying
 * `.js` before `.jsx` — so the scene imported this module where it wanted the
 * component, called the arithmetic as though it were one, and React was handed
 * `{x, y, z}` to render. `grid-lines.js` beside `Grid.jsx` is named this way
 * for the same reason.
 *
 * A pointer is a place on the screen and the scene is a place in a workshop,
 * so the question "where is the cursor on the table" only has an answer once
 * a **surface** is named. The one named here is the grid: the floor the whole
 * drawing stands on, at the bottom of what is being framed. It is the surface
 * an operator is actually pointing at when they point at the bed, and it is
 * the only one on screen they can see.
 *
 * Z is therefore not a reading — it is the plane that was chosen. Only X and
 * Y mean anything, which is also all that "jog over there" needs: the height
 * to travel at is a safety decision, not a thing to be picked with a mouse.
 *
 * **Null is a real answer.** Look along the plane — the PRZÓD and BOK views
 * do exactly that — and the ray is parallel to it, so there is no crossing
 * and no position under the cursor. Reporting the last good one, or a huge
 * number from a nearly-parallel ray, would put a target somewhere nobody
 * pointed at.
 */

// How close to parallel counts as no answer. `intersectPlane` returns a point
// for very shallow angles too, but it is a point hundreds of metres away that
// moves by a metre per pixel, which is not a position anyone chose.
const MIN_SINE = 1e-3;

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _normal = new THREE.Vector3(0, 0, 1);
const _hit = new THREE.Vector3();

/**
 * Normalised device coordinates for a pointer event over an element.
 *
 * Taken as ratios of the element's own box, which is what makes this survive
 * the review overlay: that frame is scaled with a CSS transform, so both the
 * offset and the width come back scaled and the ratio between them does not
 * change.
 */
export const ndcFor = (rect, clientX, clientY) => ({
  x: ((clientX - rect.left) / rect.width) * 2 - 1,
  y: -((clientY - rect.top) / rect.height) * 2 + 1,
});

/**
 * @param {THREE.Camera} camera
 * @param {{x: number, y: number}} ndc Pointer in normalised device coords.
 * @param {number} z The height of the plane to read against.
 * @returns {{x: number, y: number, z: number}|null}
 */
export const planePoint = (camera, ndc, z) => {
  _raycaster.setFromCamera(ndc, camera);

  if (Math.abs(_raycaster.ray.direction.dot(_normal)) < MIN_SINE) {
    return null;
  }

  _plane.setFromNormalAndCoplanarPoint(_normal, new THREE.Vector3(0, 0, z));

  if (!_raycaster.ray.intersectPlane(_plane, _hit)) {
    return null;
  }

  return { x: _hit.x, y: _hit.y, z };
};

/**
 * Hold a point inside the machine's own travel.
 *
 * The floor runs past the machine on every side — it is the floor, not the
 * table — so a ray cast at it answers with places the machine cannot reach.
 * Reporting those was honest and useless: the figures ran on past the limit,
 * the travel button switched itself off, and nothing said which edge had been
 * crossed. Clamped, the reading stops at the boundary and stays there, which
 * is the machine telling you where its edge is.
 *
 * Only when there is a boundary to clamp to. With no `$130`–`$132` the panel
 * has no idea how far the axes go, and inventing one would be worse than
 * letting the reading run.
 */
export const clampToArea = (point, area) => {
  if (!point || !area) {
    return point;
  }

  return {
    x: Math.min(Math.max(point.x, area.min.x), area.max.x),
    y: Math.min(Math.max(point.y, area.min.y), area.max.y),
    z: point.z,
  };
};

/**
 * The patch of floor the camera can currently see.
 *
 * Cast at the four corners of the viewport and take the box around where they
 * land. Under a parallel projection that is exact; the corners are the
 * extremes because the mapping is affine.
 *
 * Null when the view looks along the plane — the PRZÓD and BOK views do
 * exactly that, and there is then no patch of floor in shot at all.
 *
 * This is what lets the numbers stay on screen when the view is closed in on
 * the middle of a large machine: the edge they normally sit against is
 * somewhere off in the distance, so they have to sit against the edge of what
 * is actually visible instead.
 */
const CORNERS = [
  { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
];

export const visibleFloor = (camera, z) => {
  const xs = [];
  const ys = [];

  for (const ndc of CORNERS) {
    const hit = planePoint(camera, ndc, z);
    if (!hit) {
      return null;
    }
    xs.push(hit.x);
    ys.push(hit.y);
  }

  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  };
};

export default planePoint;
