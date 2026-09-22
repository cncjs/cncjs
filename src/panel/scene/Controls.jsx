import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fitCameraToBounds from 'lib/toolpath/camera-fit';
import { recallCamera, rememberCamera } from './cameraMemory';
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
const Controls = ({ view, bounds, revision, memory }) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef(null);

  // What the remembered pose was framed against, and whether this mount has
  // already had its first go.
  const signature = useRef('');
  const mounted = useRef(false);
  // Which press the camera was last pointed by, so a change that is not a
  // press can be told from one that is.
  const pointed = useRef(revision);

  useEffect(() => {
    /*
     * **Z is up, and it has to be said before the controls are built.**
     *
     * `OrbitControls` works out its rotation frame from `object.up` once, in
     * its constructor (`this._quat`, `OrbitControls.js:406`), and never looks
     * at it again. Setting `camera.up` afterwards — which is where it was,
     * in the effect that frames a view — left the scene Z-up and the controls
     * orbiting Y-up, and every symptom followed from that: a horizontal drag
     * tilted the view instead of turning it, the same drag gave a different
     * answer every time, and dragging up stopped dead at what looked like the
     * horizon because it was the controls' own pole, ninety degrees from
     * where the scene's is.
     *
     * Measured before: three identical 100px horizontal drags changed the
     * pitch by -18.6, +31.4 and +43.2 degrees.
     */
    camera.up.fromArray(UP);

    const orbit = new OrbitControls(camera, domElement);

    /*
     * **No damping.** It was tried and taken out again: the whole point of
     * damping is that the camera eases towards where the pointer is rather
     * than being there, and what that reads as at the machine is a view that
     * does not follow the mouse. Predictable beats smooth here — a drag is a
     * measurement of how far you want to turn, not a gesture.
     */
    orbit.enableDamping = false;

    /*
     * Stopped just short of straight up and straight down.
     *
     * This is a turntable: the machine's Z stays up, so there is a pole at
     * each end and the azimuth is undefined at it. Reaching one exactly makes
     * a sideways drag spin the view about the line of sight by an arbitrary
     * amount — the "it stops following the mouse" that comes just before "and
     * now it is stuck". A hundredth of a radian short of each pole is half a
     * degree, invisible on the drawing, and the singularity is never reached.
     */
    orbit.minPolarAngle = 0.01;
    orbit.maxPolarAngle = Math.PI - 0.01;

    /*
     * The wheel zooms towards the pointer rather than towards the middle.
     *
     * On a toolpath this is most of what "navigation" means: the thing being
     * looked at is a corner of a part in a corner of a machine, and centre
     * zoom makes reaching it a zoom, a pan, a zoom, a pan.
     */
    orbit.zoomToCursor = true;

    // The scene renders on demand rather than sixty times a second — a panel
    // beside a machine sits untouched for hours. Dragging happens outside
    // React, so it is the one thing that has to ask for frames itself.
    orbit.addEventListener('change', invalidate);
    controls.current = orbit;

    /*
     * Every move of the camera is written down, so that leaving the screen
     * and coming back arrives at the same view. On `change` rather than on
     * unmount: React does not promise that an unmount effect sees a live
     * WebGL context, and this is cheap — four numbers and an array.
     */
    const remember = () => rememberCamera(memory, signature.current, camera, orbit.target);
    orbit.addEventListener('change', remember);

    return () => {
      orbit.removeEventListener('change', invalidate);
      orbit.removeEventListener('change', remember);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, domElement, invalidate, memory]);

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

    signature.current = `${view}|${JSON.stringify(bounds)}`;

    /*
     * On the way back in, put the camera where it was rather than where the
     * view button says.
     *
     * Only on the first run of this effect for this mount: after that, the
     * effect only runs because the view changed, the bounds changed or a
     * button was pressed, and each of those is a request to be framed afresh.
     */
    const first = !mounted.current;
    const pose = first ? recallCamera(memory, signature.current) : null;

    if (pose) {
      mounted.current = true;
      pointed.current = revision;
      camera.position.fromArray(pose.position);
      camera.zoom = pose.zoom;
      camera.updateProjectionMatrix();
      orbit.target.fromArray(pose.target);
      orbit.update();
      invalidate();
      return;
    }

    mounted.current = true;

    /*
     * **Only a press moves the camera. Nothing else does.**
     *
     * Everything else that gets here changed *what* is drawn rather than how
     * it should be looked at: a layer switched on, a different program
     * loaded. Re-framing for those threw away whatever the camera had been
     * dragged to — first the direction, then, once that was kept, the zoom —
     * and both land at the same moment, just after somebody arranged the view
     * to look at something.
     *
     * The cost is real and is the right way round: switch the machine on with
     * the camera zoomed into a corner and the machine is off screen until you
     * zoom out or press a view. That is a view doing what it was told. The
     * other way round, the view stops being something you can set.
     *
     * The pose is still written down under the new signature, so leaving the
     * screen and coming back finds it.
     */
    const pressed = first || revision !== pointed.current;
    pointed.current = revision;

    if (!pressed) {
      rememberCamera(memory, signature.current, camera, orbit.target);
      return;
    }

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
    rememberCamera(memory, signature.current, camera, orbit.target);
    invalidate();
  }, [camera, view, bounds, revision, invalidate, memory]);

  return null;
};

export default Controls;
