import { Canvas } from '@react-three/fiber';
import Axes from './Axes';
import Controls from './Controls';
import Grid from './Grid';
import Outline from './Outline';
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

const Scene = ({ scene, tool, layers, view, revision }) => {
  const colors = useSceneColors();
  const { envelope, origins, toolpath, program, offset, size, frame } = scene;

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
      // Far enough for a gantry measured in metres and near enough for a
      // marker measured in millimetres. Both ends matter: too near a `far`
      // plane clips the far corner of the envelope, too far a `near` one eats
      // the tool.
      camera={{ near: 0.1, far: 100000 }}
    >
      <color attach="background" args={[colors.ground]} />

      <Controls view={view} bounds={frame} revision={revision} />

      {/* Under everything, and not switchable. The other layers are things
        * the machine reported and can therefore be wrong or absent; this is
        * the floor they are drawn on, and a scene with no reference in it is
        * one nobody can tell they have turned upside down.
        *
        * Sized to the machine's own travel where that is known, so the
        * squares are the machine's squares. Only when nothing has been
        * reported does it fall back to whatever is being drawn. */}
      <Grid area={envelope || frame} z={frame.min.z} color={colors.edge} />

      {/* The machine is context, not content: quiet enough that the program
        * inside it is what the eye lands on. */}
      {layers.machineArea && envelope ? (
        <Outline bounds={envelope} color={colors.edge} opacity={0.45} />
      ) : null}

      {layers.machineAxes ? (
        <Axes origin={MACHINE_ZERO} size={size} opacity={0.85} />
      ) : null}

      {layers.programArea && program ? (
        <Outline bounds={program} color={colors.line} opacity={0.9} />
      ) : null}

      {layers.wcsAxes ? origins.map(({ name, origin, active }) => (
        <Axes
          key={name}
          origin={origin}
          size={size}
          // The system the machine is working in now, and five it is not.
          // Same mark, so they are read as one kind of thing; different
          // weight, so the one that matters is the one seen first.
          opacity={active ? 1 : 0.3}
        />
      )) : null}

      {layers.path && toolpath ? (
        <group position={[offset.x, offset.y, offset.z]}>
          <Toolpath toolpath={toolpath} colors={colors} />
        </group>
      ) : null}

      {tool ? <ToolMarker position={tool} size={size} color={colors.tool} /> : null}
    </Canvas>
  );
};

export default Scene;
