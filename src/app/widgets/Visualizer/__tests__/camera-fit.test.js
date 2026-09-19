import * as THREE from 'three';
import fitCameraToBounds, { FIT_MARGIN } from '../camera-fit';

const boxOf = (min, max) => new THREE.Box3(
  new THREE.Vector3(...min),
  new THREE.Vector3(...max)
);

const perspective = (aspect = 16 / 9) => {
  const camera = new THREE.PerspectiveCamera(70, aspect, 0.001, 5000);
  camera.up.set(0, 0, 1);
  return camera;
};

// The frustum is fixed and framing is done with `zoom`, which is how an
// orthographic camera is driven everywhere in this widget.
const orthographic = (aspect = 16 / 9, height = 300) => {
  const camera = new THREE.OrthographicCamera(
    -(height * aspect) / 2,
    (height * aspect) / 2,
    height / 2,
    -height / 2,
    0.001,
    5000
  );
  camera.up.set(0, 0, 1);
  return camera;
};

const corners = (box) => {
  const out = [];
  [box.min.x, box.max.x].forEach((x) => {
    [box.min.y, box.max.y].forEach((y) => {
      [box.min.z, box.max.z].forEach((z) => {
        out.push(new THREE.Vector3(x, y, z));
      });
    });
  });
  return out;
};

/**
 * Where a world point lands in normalised device coordinates. Everything
 * inside the [-1, 1] cube is on screen, so this is the only question a fit
 * actually has to answer.
 */
const projected = (camera, box) => {
  camera.updateMatrixWorld(true);
  return corners(box).map((corner) => corner.clone().project(camera));
};

const widest = (points, axis) => Math.max(...points.map((p) => Math.abs(p[axis])));

const ISO = new THREE.Vector3(1, -1, 1).normalize();
const TOP = new THREE.Vector3(0, 0, 1);
const FRONT = new THREE.Vector3(0, -1, 0);

describe('fitCameraToBounds', () => {
  describe.each([
    ['perspective', perspective],
    ['orthographic', orthographic],
  ])('%s camera', (_name, makeCamera) => {
    it.each([
      ['from above', TOP],
      ['from the front', FRONT],
      ['isometric', ISO],
    ])('puts the whole box on screen, %s', (_label, direction) => {
      const camera = makeCamera();
      const box = boxOf([0, 0, -20], [80, 60, 0]);

      fitCameraToBounds(camera, box, direction);

      projected(camera, box).forEach((point) => {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(1);
      });
    });

    it('fills the frame rather than leaving the object a speck in it', () => {
      const camera = makeCamera();
      const box = boxOf([0, 0, -20], [80, 60, 0]);

      fitCameraToBounds(camera, box, ISO);

      // One axis has to reach the margin, or the fit is not a fit. This is
      // the assertion the old X/Y-extent calculation failed from an angle:
      // everything stayed on screen, tiny.
      const points = projected(camera, box);
      const reach = Math.max(widest(points, 'x'), widest(points, 'y'));
      expect(reach).toBeGreaterThan(0.75 / FIT_MARGIN);
    });

    it('centres the box in the frame', () => {
      const camera = makeCamera();
      const box = boxOf([10, 20, -5], [90, 50, 5]);

      fitCameraToBounds(camera, box, ISO);
      camera.updateMatrixWorld(true);

      // The box's centre, not the midpoint of its silhouette: under
      // perspective the near corners project larger than the far ones, so a
      // correctly centred box still has an off-centre outline.
      const center = box.getCenter(new THREE.Vector3()).project(camera);
      expect(center.x).toBeCloseTo(0, 5);
      expect(center.y).toBeCloseTo(0, 5);
    });

    it('fits a wide box by its width and a tall one by its height', () => {
      const wide = makeCamera();
      fitCameraToBounds(wide, boxOf([-100, -5, -1], [100, 5, 1]), TOP);
      const widePoints = projected(wide, boxOf([-100, -5, -1], [100, 5, 1]));

      const tall = makeCamera();
      fitCameraToBounds(tall, boxOf([-5, -100, -1], [5, 100, 1]), TOP);
      const tallPoints = projected(tall, boxOf([-5, -100, -1], [5, 100, 1]));

      // Each is limited by the axis it is long in, and clears the other.
      expect(widest(widePoints, 'x')).toBeGreaterThan(widest(widePoints, 'y'));
      expect(widest(tallPoints, 'y')).toBeGreaterThan(widest(tallPoints, 'x'));
    });

    it('accounts for the viewport being a different shape', () => {
      const box = boxOf([0, 0, 0], [100, 100, 0]);

      const wideViewport = makeCamera(3);
      fitCameraToBounds(wideViewport, box, TOP);

      const tallViewport = makeCamera(1 / 3);
      fitCameraToBounds(tallViewport, box, TOP);

      // A square object in a wide viewport is limited by height, and in a
      // tall one by width. A fit that ignored aspect would clip one of them.
      [wideViewport, tallViewport].forEach((camera) => {
        projected(camera, box).forEach((point) => {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(1);
        });
      });
    });

    it('stands off the box rather than sitting inside it', () => {
      const camera = makeCamera();
      const box = boxOf([-50, -50, -50], [50, 50, 50]);

      fitCameraToBounds(camera, box, ISO);

      // A camera inside its subject renders the inside of it. For the
      // orthographic case this is what keeps the near plane clear.
      expect(box.containsPoint(camera.position)).toBe(false);
    });

    it('survives a box with no size at all', () => {
      const camera = makeCamera();
      const box = boxOf([5, 5, 5], [5, 5, 5]);

      fitCameraToBounds(camera, box, ISO);

      expect(Number.isFinite(camera.position.x)).toBe(true);
      expect(Number.isFinite(camera.position.y)).toBe(true);
      expect(Number.isFinite(camera.position.z)).toBe(true);
      expect(Number.isFinite(camera.zoom)).toBe(true);
      expect(camera.zoom).toBeGreaterThan(0);
    });

    it('returns the point the camera is looking at', () => {
      const camera = makeCamera();
      const box = boxOf([0, 0, -10], [80, 60, 0]);

      const target = fitCameraToBounds(camera, box, ISO);

      // The caller hands this straight to the orbit controls, so the thing
      // the view is framed on is also the thing it rotates about.
      expect(target.x).toBeCloseTo(40, 6);
      expect(target.y).toBeCloseTo(30, 6);
      expect(target.z).toBeCloseTo(-5, 6);
    });

    it('does not care how long the direction vector is', () => {
      const unit = makeCamera();
      const long = makeCamera();
      const box = boxOf([0, 0, -10], [80, 60, 0]);

      fitCameraToBounds(unit, box, ISO);
      fitCameraToBounds(long, box, ISO.clone().multiplyScalar(937));

      expect(long.position.distanceTo(unit.position)).toBeCloseTo(0, 6);
    });
  });

  it('keeps an orthographic zoom the renderer can use', () => {
    const camera = orthographic();
    fitCameraToBounds(camera, boxOf([0, 0, 0], [80, 60, 20]), ISO);

    // Framing an orthographic camera means changing zoom, not moving closer,
    // so a fit that only moved the camera would do nothing visible at all.
    expect(camera.zoom).not.toBe(1);
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
  });
});
