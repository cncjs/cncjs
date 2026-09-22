/**
 * Where a camera was left, so that coming back to a screen is coming back.
 *
 * Leaving the toolpath screen unmounts the scene and everything in it,
 * including the camera — so jogging on one screen and returning to this one
 * put the view back at the isometric default every time, which is exactly
 * when somebody has just finished arranging it to watch something.
 *
 * Deliberately outside React. The camera is neither a reading nor a setting:
 * it is where a person happened to be looking, it has to outlive the
 * component that owns it, and threading it up through the screen, the widget
 * and the shape would put five layers of plumbing in the way of a value none
 * of them care about.
 *
 * Keyed, because the two scenes are two jobs. The toolpath screen is arranged
 * to inspect a program; the preview beside the jog keys is arranged to watch
 * the tool, and neither should move because of what was done to the other.
 *
 * The **signature** is what stops a remembered pose being restored onto
 * something else. It is the view and the bounds the pose was framed against,
 * so loading a different program — or switching a layer, which changes what
 * the camera is framed on — falls through to a fresh fit rather than leaving
 * the new thing off screen.
 */
const poses = new Map();

export const rememberCamera = (key, signature, camera, target) => {
  poses.set(key, {
    signature,
    position: camera.position.toArray(),
    zoom: camera.zoom,
    target: target.toArray(),
  });
};

/** The pose for this key, or nothing if it was framed against something else. */
export const recallCamera = (key, signature) => {
  const pose = poses.get(key);
  return (pose && pose.signature === signature) ? pose : null;
};

export default recallCamera;
