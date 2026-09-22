import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { buildGuide } from './guide-lines';

/**
 * Two datum lines laid on the floor through a point.
 *
 * **This is what makes an isometric view readable.** A mark on the ground and
 * a marker above it still leave "is that over the part or beside it"
 * unanswered — in a parallel projection a thing further back and a thing
 * further up land in the same place on screen, and hairlines give the eye
 * nothing to judge against. Two rulers running the width of the table do:
 * they either cross the program or they pass it.
 *
 * Shared by the pointer preview and the tool, because it is the same question
 * asked about two points — where is this, relative to the work. One component
 * so the two can never drift into being two different pictures of one idea.
 *
 * Bounded by the machine and faded with the grid's own function; see
 * `guide-lines.js`, where the arithmetic lives so that it can be tested.
 *
 * **Not depth-tested, and that is the fix for a real defect.** The grid lies
 * at exactly the same height, so two coplanar sets of lines were fighting for
 * the depth buffer and which one won came down to draw order — the pair
 * vanished on a remount or a layer toggle and came back the moment anything
 * forced a redraw. That is the "sometimes they disappear", and it had nothing
 * to do with zoom.
 *
 * Nudging them above the floor was tried first and is not enough to rely on:
 * the scene puts its clip planes 100 metres either side, so a depth step is
 * coarser than any lift small enough to be invisible. Taking these two lines
 * out of the depth test settles it by construction. They can afford it —
 * they are hairlines at a fifth opacity lying on the ground, so drawing over
 * the path costs nothing to read, and being *absent* costs the whole point
 * of them.
 *
 * **And it is not culled, which is the other half.** The buffers are refilled
 * in place as the point moves, so the bounding sphere three worked out on the
 * first frame goes stale and the object can be judged off screen and skipped
 * — "zoom and they go, pan and they go". The sphere is recomputed below, and
 * culling is switched off as well: this pair spans the whole floor, so it is
 * in shot whenever anything is, and there is nothing for the test to save.
 * Two lines and ninety-six vertices are cheaper to draw than to be wrong
 * about.
 */
const Guides = ({ at, z, color, opacity, area }) => {
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const rgb = useMemo(() => new THREE.Color(color), [color]);

  /*
   * A frame is asked for once the buffers are filled.
   *
   * The geometry starts empty and this effect fills it, while the scene
   * renders on demand — so the frame React asked for on mount is drawn before
   * this runs, and without the request nothing would ask again.
   *
   * This was **not** what made the lines disappear; that was the depth fight
   * described above, and adding this changed nothing on its own (measured:
   * still 166 amber pixels after coming back from the toolpath screen, where
   * a drawn pair is about 980). It is here because it is correct under an
   * on-demand renderer, not because it fixed anything.
   */
  useEffect(() => {
    const { positions, colors } = buildGuide(at, area, z, rgb);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Four components: the fade rides on the vertices, because a material has
    // one opacity for the whole draw call.
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.computeBoundingSphere();
    invalidate();
  }, [geometry, at, area, z, rgb, invalidate]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={opacity} depthTest={false} />
    </lineSegments>
  );
};

export default Guides;
