import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import ToolMarker from './ToolMarker';
import Guides from './Guides';
import { clampToArea, ndcFor, planePoint } from './pointer-plane';
import { useScreenScale } from './screenScale';

/**
 * The point on the table under the mouse, and the one that was picked.
 *
 * **Two marks, because they answer different questions.** The faint one
 * follows the pointer and says "this is what you would be choosing"; the
 * solid one is what was chosen and stays where it was put. The first version
 * had only the following one, and it could not work: the button that travels
 * there is outside the canvas, so walking the mouse over to press it dragged
 * the point along the whole way. A click settles it.
 *
 * A click, specifically, and not a drag that happened to end. The orbit
 * control owns both buttons — left turns the view, right pans it — so a
 * press is told from a gesture by how far the pointer moved between down and
 * up. Under a few pixels is a press at a place; anything more was someone
 * moving the camera, and the camera keeps it.
 *
 * **Left picks, right takes back.** Right is the natural "undo that" on a
 * pointing device and it is already suppressed here anyway, since a context
 * menu over a machine control is nothing anybody wants. What it cancels is
 * both halves of the same intent: the point that was chosen, and the travel
 * that may be on its way to it.
 *
 * The hovering point is held here rather than lifted up to the widget. It
 * changes on every mouse move, and the widget above composes the scene; the
 * picked point is the only one anybody else needs.
 */

// The radius of the ring on screen, whatever the zoom. Small: this sits on
// top of a drawing somebody is trying to read.
const SIZE_PIXELS = 9;

const RING_SEGMENTS = 48;

// How far the pointer may travel between down and up and still be a click.
// Generous enough for a hand on a trackpad, tight enough that a deliberate
// turn of the view never lands a target.
const CLICK_SLOP = 4;

/*
 * How heavily the datum lines are drawn. See `Guides` for why they are there
 * at all; these are the weights for a point somebody is choosing, which is
 * lighter while it is only being hovered over.
 */
const GUIDE_OPACITY = 0.35;
const GUIDE_OPACITY_HOVER = 0.22;

// Ticks outside the ring, on the two axes of the table.
const TICKS = [
  [[1.35, 0], [2.1, 0]],
  [[-1.35, 0], [-2.1, 0]],
  [[0, 1.35], [0, 2.1]],
  [[0, -1.35], [0, -2.1]],
];

const useSightGeometry = () => {
  const geometry = useMemo(() => {
    const points = [];
    for (let i = 0; i < RING_SEGMENTS; i += 1) {
      const a = (i / RING_SEGMENTS) * Math.PI * 2;
      const b = ((i + 1) / RING_SEGMENTS) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
      points.push(new THREE.Vector3(Math.cos(b), Math.sin(b), 0));
    }
    for (const [from, to] of TICKS) {
      points.push(new THREE.Vector3(from[0], from[1], 0));
      points.push(new THREE.Vector3(to[0], to[1], 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
};

const Sight = ({ at, z, color, opacity, geometry, depthTest = true }) => {
  const scale = useScreenScale(SIZE_PIXELS);

  return (
    <group ref={scale} position={[at.x, at.y, z]}>
      {/* Depth-tested by default: these marks say where a point is *in* the
        * model, so they have to go behind whatever is in front of them. */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} depthTest={depthTest} transparent opacity={opacity} />
      </lineSegments>
    </group>
  );
};

const Pointer = ({
  z, target, onPick, onCancel, onHover, color, overColor, toolZ, bounds, limits,
  program,
}) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useSightGeometry();

  const [hover, setHover] = useState(null);

  // Held in a ref so a fresh callback each render does not re-bind listeners
  // that fire on every mouse move.
  const pick = useRef(onPick);
  pick.current = onPick;
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const report = useRef(onHover);
  report.current = onHover;

  useEffect(() => {
    const at = (event) => clampToArea(
      planePoint(
        camera,
        ndcFor(domElement.getBoundingClientRect(), event.clientX, event.clientY),
        z
      ),
      limits
    );

    let down = null;

    const move = (event) => {
      /*
       * **Nothing is being pointed at while the view is being turned.**
       *
       * Both halves of the reading move at once during a drag: the pointer
       * travels, and the camera it is cast from rotates under it. The mark
       * then lands somewhere different on the floor every frame — it reads as
       * the preview flying about the screen, which is what it looked like.
       * Leaving it alone keeps it stuck to the spot it was on, and that spot
       * turns with the scene, which is what a mark on the floor should do.
       */
      if (down) {
        return;
      }
      const point = at(event);
      setHover(point);
      report.current(point);
      invalidate();
    };
    const begin = (event) => {
      down = { x: event.clientX, y: event.clientY, button: event.button };
    };
    const end = (event) => {
      const from = down;
      down = null;
      if (!from) {
        return;
      }
      const travelled = Math.hypot(event.clientX - from.x, event.clientY - from.y);
      if (travelled > CLICK_SLOP) {
        return;
      }

      if (from.button === 2) {
        cancel.current();
      } else if (from.button === 0) {
        pick.current(at(event));
      }
      invalidate();
    };
    const leave = () => {
      setHover(null);
      report.current(null);
      invalidate();
    };

    // On the canvas itself rather than its container, so moving onto the menu
    // floating above it stops the preview instead of dragging it across the
    // drawing on the way.
    // A context menu over a machine control is nothing anybody wants, and it
    // would swallow the right-click before it could mean anything.
    const noMenu = (event) => event.preventDefault();

    domElement.addEventListener('pointermove', move);
    domElement.addEventListener('pointerdown', begin);
    domElement.addEventListener('pointerup', end);
    domElement.addEventListener('pointerleave', leave);
    domElement.addEventListener('contextmenu', noMenu);
    return () => {
      domElement.removeEventListener('pointermove', move);
      domElement.removeEventListener('pointerdown', begin);
      domElement.removeEventListener('pointerup', end);
      domElement.removeEventListener('pointerleave', leave);
      domElement.removeEventListener('contextmenu', noMenu);
    };
  }, [camera, domElement, invalidate, z, limits]);

  const preview = hover ? (target ? 0.25 : 0.4) : 0;

  /*
   * Whether a point sits over the program's own footprint.
   *
   * X and Y only. The pointer reads against the floor, so it is always below
   * the program in Z; "am I over the part" is a question about the plan, and
   * answering it in three dimensions would answer no every time.
   */
  const over = (point) => Boolean(program) && point &&
    point.x >= program.min.x && point.x <= program.max.x &&
    point.y >= program.min.y && point.y <= program.max.y;

  const hoverColor = over(hover) ? overColor : color;
  const targetColor = over(target) ? overColor : color;

  return (
    <>
      {hover ? (
        <>
          <Guides
            at={hover}
            z={z}
            color={hoverColor}
            opacity={GUIDE_OPACITY_HOVER}
            area={bounds}
          />
          <Sight at={hover} z={z} color={hoverColor} opacity={preview} geometry={geometry} />
        </>
      ) : null}

      {/* The same cone and thread the tool wears, at the height the tool is
        * at now — so the preview reads as "the tool, over there" rather than
        * as a flat mark that might be anywhere in Z. Faint, because it is a
        * proposal. */}
      {hover && Number.isFinite(toolZ) ? (
        <ToolMarker
          position={{ x: hover.x, y: hover.y, z: toolZ }}
          color={hoverColor}
          floor={z}
          opacity={preview}
          depthTest
        />
      ) : null}

      {target ? (
        <>
          <Guides
            at={target}
            z={z}
            color={targetColor}
            opacity={GUIDE_OPACITY}
            area={bounds}
          />
          <Sight at={target} z={z} color={targetColor} opacity={0.95} geometry={geometry} />
        </>
      ) : null}
    </>
  );
};

export default Pointer;
