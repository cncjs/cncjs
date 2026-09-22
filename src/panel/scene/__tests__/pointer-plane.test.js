import * as THREE from 'three';
import fitCameraToBounds from '../../../lib/toolpath/camera-fit';
import { clampToArea, ndcFor, planePoint } from '../pointer-plane';

const camera = (aspect = 16 / 9, height = 300) => {
  const c = new THREE.OrthographicCamera(
    -(height * aspect) / 2, (height * aspect) / 2, height / 2, -height / 2, -100000, 100000
  );
  c.up.set(0, 0, 1);
  return c;
};

/*
 * Straight down on the table, which is the view this reading is really for —
 * **framed the way the panel frames it**, not with a bare `lookAt`.
 *
 * That distinction is the whole reason this helper exists. Looking along `up`
 * leaves the screen's orientation undefined, and three's own tie-break lands
 * on a view with X running to the *left*; `fitCameraToBounds` nudges the
 * direction by a thousandth first, which is what makes GÓRA come out X-right
 * and Y-up. Build the camera by hand here and the test measures three's
 * tie-break instead of the panel, and passes or fails for reasons nobody in
 * this repository chose.
 *
 * The nudge survives into the reading: a thousandth of a radian times the
 * distance the fit stands the camera back, which here is about 0.15mm. So
 * these assert "within a quarter of a millimetre" rather than an exact
 * figure. It is loose enough to absorb the tie-break and tight enough that
 * anything that actually matters — a swapped axis, a flipped sign, a wrong
 * plane — misses by hundreds of millimetres rather than by a fraction of one.
 */
const NUDGE_SLACK = 0.25;

const AT = new THREE.Vector3(-500, -350, 0);

const fromAbove = (c, at = AT) => {
  fitCameraToBounds(
    c,
    new THREE.Box3(at.clone().subScalar(50), at.clone().addScalar(50)),
    new THREE.Vector3(0, 0, 1)
  );
  // The fit chooses a zoom to frame that box; these tests are about what a
  // pixel is worth, so the zoom is stated rather than inherited.
  c.zoom = 1;
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
  return c;
};

describe('the point under the cursor', () => {
  test('the middle of the canvas is what the camera is looking at', () => {
    const c = fromAbove(camera());
    const p = planePoint(c, { x: 0, y: 0 }, -150);
    expect(Math.abs(p.x - -500)).toBeLessThan(NUDGE_SLACK);
    expect(Math.abs(p.y - -350)).toBeLessThan(NUDGE_SLACK);
  });

  test('reports the plane it was asked for as Z, not a reading', () => {
    // Z is a choice of surface. Anything else would be inventing a height
    // nobody pointed at.
    expect(planePoint(fromAbove(camera()), { x: 0.3, y: -0.2 }, -150).z).toBe(-150);
    expect(planePoint(fromAbove(camera()), { x: 0.3, y: -0.2 }, -7).z).toBe(-7);
  });

  test('right on the screen is +X and up is +Y, seen from above', () => {
    // Get a sign wrong here and the machine is told to go to the mirror image
    // of where somebody pointed.
    const c = fromAbove(camera());
    const right = planePoint(c, { x: 1, y: 0 }, -150);
    const up = planePoint(c, { x: 0, y: 1 }, -150);
    expect(right.x).toBeGreaterThan(-500);
    expect(Math.abs(right.y - -350)).toBeLessThan(NUDGE_SLACK);
    expect(up.y).toBeGreaterThan(-350);
    expect(Math.abs(up.x - -500)).toBeLessThan(NUDGE_SLACK);
  });

  test('the edge of the canvas is half a frustum away', () => {
    // 16:9 at 300 high is 533 wide, so half of it is 266.67 — and the zoom is
    // 1, so those are millimetres.
    const c = fromAbove(camera());
    expect(Math.abs(planePoint(c, { x: 1, y: 0 }, -150).x - (-500 + 266.666)))
      .toBeLessThan(NUDGE_SLACK);
  });

  test('zoom shrinks what a pixel is worth', () => {
    const c = fromAbove(camera());
    c.zoom = 4;
    c.updateProjectionMatrix();
    expect(Math.abs(planePoint(c, { x: 1, y: 0 }, -150).x - (-500 + 266.666 / 4)))
      .toBeLessThan(NUDGE_SLACK);
  });

  test('there is no answer when the view looks along the plane', () => {
    // The PRZÓD and BOK views do exactly this. A nearly-parallel ray does
    // return a point, hundreds of metres out and moving by a metre a pixel,
    // which is not a place anyone chose — so it is refused rather than
    // reported.
    const c = camera();
    c.position.set(-500, -1000, -150);
    c.lookAt(new THREE.Vector3(-500, -350, -150));
    c.updateMatrixWorld(true);
    expect(planePoint(c, { x: 0, y: 0 }, -150)).toBeNull();
  });

  test('an oblique view still answers', () => {
    const c = camera();
    c.position.set(0, -900, 600);
    c.lookAt(new THREE.Vector3(-500, -350, -150));
    c.updateMatrixWorld(true);
    expect(planePoint(c, { x: 0, y: 0 }, -150)).not.toBeNull();
  });
});

describe('pointer to normalised device coordinates', () => {
  const rect = { left: 100, top: 50, width: 800, height: 400 };

  test('the middle is the origin, and the corners are the unit square', () => {
    expect(ndcFor(rect, 500, 250)).toEqual({ x: 0, y: 0 });
    expect(ndcFor(rect, 900, 50)).toEqual({ x: 1, y: 1 });
    expect(ndcFor(rect, 100, 450)).toEqual({ x: -1, y: -1 });
  });

  test('survives the review overlay, which scales the whole frame', () => {
    // Both the offset and the size come back scaled, so the ratio does not
    // change. This is the same trap `offsetSize` was added for.
    const scaled = { left: 50, top: 25, width: 400, height: 200 };
    expect(ndcFor(scaled, 250, 125)).toEqual({ x: 0, y: 0 });
    expect(ndcFor(scaled, 350, 75)).toEqual(ndcFor(rect, 700, 150));
  });
});

describe('holding the reading inside the machine', () => {
  const TRAVEL = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };

  test('a point inside is left alone', () => {
    expect(clampToArea({ x: -500, y: -350, z: -150 }, TRAVEL))
      .toEqual({ x: -500, y: -350, z: -150 });
  });

  test('stops at the edge rather than running past it', () => {
    // The floor is drawn well past the machine, so a ray at it answers with
    // places the machine cannot reach.
    expect(clampToArea({ x: 220, y: 40, z: -150 }, TRAVEL))
      .toEqual({ x: 0, y: 0, z: -150 });
    expect(clampToArea({ x: -1400, y: -900, z: -150 }, TRAVEL))
      .toEqual({ x: -1000, y: -700, z: -150 });
  });

  test('clamps each axis on its own', () => {
    // Past the edge in X and well inside in Y: only X moves.
    expect(clampToArea({ x: 300, y: -350, z: -150 }, TRAVEL))
      .toEqual({ x: 0, y: -350, z: -150 });
  });

  test('leaves Z alone, because it is the plane and not a reading', () => {
    expect(clampToArea({ x: 300, y: 300, z: -42 }, TRAVEL).z).toBe(-42);
  });

  test('does nothing when the machine has not said how far it goes', () => {
    // Inventing a boundary would be worse than letting the reading run.
    const loose = { x: 5000, y: -9000, z: -150 };
    expect(clampToArea(loose, null)).toEqual(loose);
    expect(clampToArea(null, TRAVEL)).toBeNull();
  });
});
