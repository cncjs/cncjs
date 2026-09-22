import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Keeps a marker the same size on screen however far the camera is zoomed.
 *
 * A zero and a tool tip are **marks about the drawing, not parts of it**.
 * Sized in millimetres they grow with everything else, so zooming in on a
 * corner of a part — which is exactly when a zero matters — buries it under
 * an axis cross the width of the card. Sized in pixels they stay the size
 * they were drawn at, and zooming in reveals what is under them instead of
 * more of them.
 *
 * The geometry underneath is built at one unit and this scales the group, so
 * nothing has to be rebuilt when the zoom changes.
 *
 * Orthographic only, and that is what makes the arithmetic a division: the
 * camera's frustum is measured in pixels, so one world unit is exactly `zoom`
 * pixels across. A perspective camera would have to take the distance to the
 * marker into account as well.
 *
 * Runs in `useFrame`, which under an on-demand renderer only runs on frames
 * that were asked for — and a zoom asks for one, because the orbit control
 * emits `change`. So this costs nothing while the view is still.
 */
export const useScreenScale = (pixels) => {
  const ref = useRef(null);

  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.scale.setScalar(pixels / camera.zoom);
    }
  });

  return ref;
};

export default useScreenScale;
