import * as THREE from 'three';
import { boundsBox, currentDirection, fitToBounds } from '../fit';

// The frustum is fixed and framing is done with `zoom`, which is how the
// orthographic camera in this scene is driven.
const camera = (aspect = 16 / 9, height = 300) => {
  const c = new THREE.OrthographicCamera(
    -(height * aspect) / 2, (height * aspect) / 2, height / 2, -height / 2, 0.001, 5000
  );
  c.up.set(0, 0, 1);
  return c;
};

// An awkward angle on purpose: nothing axis-aligned, so a fit that quietly
// snapped to a named view would show up as a changed direction.
const OBLIQUE = new THREE.Vector3(37, -61, 23).normalize();

const put = (c, target, distance = 900) => {
  c.position.copy(target).addScaledVector(OBLIQUE, distance);
  c.lookAt(target);
  c.updateMatrixWorld(true);
};

const OBJECT = { min: { x: 100, y: 40, z: -12 }, max: { x: 160, y: 90, z: -2 } };

describe('filling the frame with the object', () => {
  test('keeps the camera pointing the way it already pointed', () => {
    // The whole requirement. Somebody arranged an angle; zooming onto the
    // work is not a request to give it up.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);
    const before = currentDirection(c, target).normalize();

    const center = fitToBounds(c, target, OBJECT);
    const after = currentDirection(c, center).normalize();

    expect(after.angleTo(before)).toBeLessThan(1e-6);
  });

  test('ends up looking at the middle of the object', () => {
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const center = fitToBounds(c, target, OBJECT);
    expect(center.x).toBeCloseTo(130, 6);
    expect(center.y).toBeCloseTo(65, 6);
    expect(center.z).toBeCloseTo(-7, 6);
  });

  test('zooms in, rather than merely moving', () => {
    // An orthographic camera does not get closer by moving, so a fit that
    // only repositioned would look identical to no fit at all.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);
    const before = c.zoom;

    fitToBounds(c, target, OBJECT);
    expect(c.zoom).toBeGreaterThan(before);
  });

  test('a smaller object fills the frame harder', () => {
    const big = camera();
    const small = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(big, target);
    put(small, target);

    fitToBounds(big, target, OBJECT);
    fitToBounds(small, target, {
      min: { x: 120, y: 60, z: -9 }, max: { x: 130, y: 70, z: -7 },
    });

    expect(small.zoom).toBeGreaterThan(big.zoom);
  });

  test('the object really is inside the frame afterwards', () => {
    // Direction and zoom are means; this is the end. Every corner has to
    // project inside the normalised view volume.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const center = fitToBounds(c, target, OBJECT);
    c.lookAt(center);
    c.updateMatrixWorld(true);

    const box = boundsBox(OBJECT);
    for (let i = 0; i < 8; i += 1) {
      const corner = new THREE.Vector3(
        (i & 1) ? box.max.x : box.min.x,
        (i & 2) ? box.max.y : box.min.y,
        (i & 4) ? box.max.z : box.min.z
      ).project(c);
      expect(Math.abs(corner.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(corner.y)).toBeLessThanOrEqual(1);
    }
  });

  test('two fits in a row do not creep', () => {
    // The second press has nothing left to do, so it must be a no-op rather
    // than a slow drift towards or away from the work.
    const c = camera();
    const target = new THREE.Vector3(0, 0, 0);
    put(c, target);

    const first = fitToBounds(c, target, OBJECT);
    const zoom = c.zoom;
    const second = fitToBounds(c, first, OBJECT);

    expect(c.zoom).toBeCloseTo(zoom, 6);
    expect(second.distanceTo(first)).toBeLessThan(1e-6);
  });
});
