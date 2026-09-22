import { Canvas } from '@react-three/fiber';
import Axes from './Axes';
import Controls from './Controls';
import Grid from './Grid';
import Guides from './Guides';
import Outline from './Outline';
import Pointer from './Pointer';
import ToolMarker from './ToolMarker';
import Toolpath from './Toolpath';
import { useSceneColors } from './colors';

/**
 * Everything the toolpath screen draws, in one frame: **machine
 * coordinates**.
 *
 * The program's own numbers are not in that frame — G-code is written against
 * whatever zero is current — so the path is placed by the work offset rather
 * than drawn where its coordinates say. Everything else is already there.
 *
 * `frameloop="demand"` and not by habit. This scene is static for hours at a
 * time on a panel that is also a machine controller, and a render loop
 * running at sixty frames a second to redraw an unchanged picture is heat and
 * nothing else. React's own re-renders ask for a frame; so does the orbit
 * control, which is the one thing that moves outside React.
 */
/** Where the machine measures from. Zero, by definition. */
const MACHINE_ZERO = { x: 0, y: 0, z: 0 };

// Fainter than the pointer's datum lines: this pair is always on screen, so
// it has to sit under the drawing rather than across it.
const TOOL_GUIDE_OPACITY = 0.2;

const Scene = ({
  scene, tool, layers, view, revision, memory, fit, onFree, target, onPick, onCancel, onHover, picking,
}) => {
  const colors = useSceneColors();
  const { envelope, origin, toolpath, program, offset, frame } = scene;

  /*
   * **The floor is the machine's, not the frame's.**
   *
   * `frame` is the union of whatever layers are switched on, so taking the
   * ground from it moved everything standing on it — the grid, the shadow,
   * the datum lines — whenever a layer was toggled. The machine's own travel
   * does not change when somebody stops drawing its outline, so that is the
   * surface to stand things on; the frame is only the fallback for a
   * controller that has not said how far it goes.
   */
  const floor = (envelope || frame).min.z;
  // What the datum lines span, and what the grid is the ground for.
  const area = envelope || frame;

  return (
    <Canvas
      frameloop="demand"
      /*
       * Orthographic, and that is what makes the view buttons mean what they
       * say. Under perspective a "top view" is a view *into* a box — the near
       * face draws larger than the far one, the envelope's side walls are
       * visible, and a feature's apparent position depends on how deep it is.
       * That is a picture of a machine, not a projection of one, and it
       * cannot be read off.
       *
       * It also makes the isometric view isometric. An isometric projection
       * is parallel by definition; the same camera angle under perspective is
       * just an oblique view.
       */
      /*
       * Measured in layout pixels, not in painted ones.
       *
       * By default the canvas is sized from `getBoundingClientRect`, which
       * reports the size **after** any CSS transform. The review overlay
       * frames the panel at its target size and scales it down to fit the
       * window, so at Full HD in a smaller window the canvas was handed the
       * scaled figure — 692px for a 1330px container — and filled half of it,
       * anchored top left, with the card's border still drawn at full size.
       * `offsetSize` reads `offsetWidth`/`offsetHeight` instead, which a
       * transform does not touch.
       */
      resize={{ offsetSize: true }}
      orthographic
      /*
       * **`near` is negative, and for an orthographic camera that is not a
       * mistake.**
       *
       * In a parallel projection the distance from the camera changes nothing
       * about the picture — only `zoom` does — so how far back the camera
       * stands is free, and the fit puts it only as far as the object it is
       * framing needs. Fill the frame with a 120mm program and the camera
       * ends up 34mm from it; the machine is a metre across, so most of the
       * envelope and most of the floor are then *behind* the camera and a
       * positive `near` cuts them off. Measured: after one press of the fit
       * button the camera sat 34.5mm from its target with `near` at 0.1.
       *
       * A perspective camera cannot do this — things behind it genuinely have
       * no projection. This one can: the slab simply runs from -100m to
       * +100m along the line of sight and nothing in a workshop leaves it.
       * Depth still sorts correctly inside that slab.
       */
      camera={{ near: -100000, far: 100000 }}
    >
      <color attach="background" args={[colors.ground]} />

      <Controls
        view={view}
        bounds={frame}
        revision={revision}
        memory={memory}
        object={program}
        fit={fit}
        onFree={onFree}
      />

      {/* Under everything, and not switchable. The other layers are things
        * the machine reported and can therefore be wrong or absent; this is
        * the floor they are drawn on, and a scene with no reference in it is
        * one nobody can tell they have turned upside down.
        *
        * Sized to the machine's own travel where that is known, so the
        * squares are the machine's squares. Only when nothing has been
        * reported does it fall back to whatever is being drawn. */}
      <Grid area={area} z={floor} color={colors.edge} />

      {/* The machine is context, not content: quiet enough that the program
        * inside it is what the eye lands on. */}
      {layers.machineArea && envelope ? (
        <Outline bounds={envelope} color={colors.edge} opacity={0.45} />
      ) : null}

      {layers.machineAxes ? (
        <Axes origin={MACHINE_ZERO} opacity={0.85} />
      ) : null}

      {layers.programArea && program ? (
        <Outline bounds={program} color={colors.line} opacity={0.9} />
      ) : null}

      {/* The zero the machine is working from. One, because that is the
        * question — see `composeScene` for what drawing all six did on a
        * controller where nobody has set them. */}
      {layers.wcsAxes && origin ? <Axes origin={origin.origin} /> : null}

      {layers.path && toolpath ? (
        <group position={[offset.x, offset.y, offset.z]}>
          {/* The floor in this group's own coordinates: the group is already
            * shifted by the work offset, and the shadow has to land on the
            * grid in the world. */}
          <Toolpath
            toolpath={toolpath}
            colors={colors}
            shadowZ={floor - offset.z}
          />
        </group>
      ) : null}

      {/* On the grid, because that is the surface the reading is taken
        * against — see `pointer.js` for why a plane has to be named at all. */}
      {/* Only where the screen is for moving the machine. On the toolpath
        * screen the job is to read a program, and a sight following the mouse
        * across it is something to look past. */}
      {picking ? (
        <Pointer
          z={floor}
          target={target}
          onPick={onPick}
          onCancel={onCancel}
          onHover={onHover}
          color={colors.work}
          overColor={colors.over}
          toolZ={tool?.z}
          bounds={area}
          limits={envelope}
          program={program}
        />
      ) : null}

      {/* The same rulers the pointer gets, for where the machine actually is.
        * Fainter than the pointer's: that one is answering a question being
        * asked right now, this one is a standing reference. */}
      {tool ? (
        <Guides
          at={tool}
          z={floor}
          color={colors.tool}
          opacity={TOOL_GUIDE_OPACITY}
          area={area}
        />
      ) : null}

      {tool ? (
        <ToolMarker position={tool} color={colors.tool} floor={floor} />
      ) : null}
    </Canvas>
  );
};

export default Scene;
