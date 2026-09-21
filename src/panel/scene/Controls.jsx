import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fitCameraToBounds from 'lib/toolpath/camera-fit';
import { UP, VIEWS } from './views';

/**
 * The camera: four named views, and a mouse that can go anywhere.
 *
 * The two are not alternatives. A named view is where you start and where you
 * come back to — press GÓRA and the camera is looking straight down from a
 * known place, whatever was done to it since. Dragging from there is how you
 * answer the question the named views do not, and pressing the button again
 * undoes it. That is why the buttons stay lit rather than toggling off when
 * the camera moves: they are destinations, not modes.
 *
 * `three`'s own `OrbitControls` rather than a wrapper. It is a class that
 * takes a camera and a DOM element, which is all that is wanted, and the
 * alternative is a second dependency to get the same object with JSX round
 * it.
 */
const Controls = ({ view, bounds, revision }) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef(null);

  useEffect(() => {
    const orbit = new OrbitControls(camera, domElement);

    // The scene renders on demand rather than sixty times a second — a panel
    // beside a machine sits untouched for hours. Dragging happens outside
    // React, so it is the one thing that has to ask for frames itself.
    orbit.addEventListener('change', invalidate);
    controls.current = orbit;

    return () => {
      orbit.removeEventListener('change', invalidate);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, domElement, invalidate]);

  /*
   * `revision` is what makes the buttons work twice.
   *
   * Pressing GÓRA, dragging away and pressing GÓRA again passes the same view
   * and the same bounds, so an effect keyed on those alone would not run and
   * the button would look broken. The widget counts presses instead, and the
   * count is what this watches.
   */
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) {
      return;
    }

    camera.up.fromArray(UP);

    const box = new THREE.Box3(
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
    );

    const target = fitCameraToBounds(
      camera,
      box,
      new THREE.Vector3().fromArray(VIEWS[view].direction)
    );

    // Orbit about what the camera was framed on, rather than about wherever
    // the target happened to be left. Without this a view change puts the
    // object on screen and then spins it about a point off the edge of it.
    orbit.target.copy(target);
    orbit.update();
    invalidate();
  }, [camera, view, bounds, revision, invalidate]);

  return null;
};

export default Controls;
