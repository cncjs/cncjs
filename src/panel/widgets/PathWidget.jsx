import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import PathStage from '../ui/PathStage';
import { machineZeroIsGuess, softLimitsEnabled, workOffset } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';
import { composeScene, toolPoint } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';

/**
 * The loaded program, the machine around it, and where the tool is in both.
 *
 * One shape, used at two sizes. It had two, back when the preview beside the
 * jog keys was the one without a column of labelled chips beside it; once the
 * menu moved onto the drawing as icons the two were the same component, and
 * `preview` stopped choosing a shape and started saying two smaller things —
 * whose camera this is, and whether the screen's warnings belong here.
 *
 * Nothing here has to be fetched. The server replays `gcode:load` with the
 * whole program to any socket that attaches, so a panel opened in front of a
 * loaded job is handed it. That is the only piece of state in this protocol
 * that survives a page being refreshed, and this screen is the reason to be
 * glad of it.
 */

/**
 * What is drawn to begin with: the program, where its zero is, and the
 * machine around it.
 *
 * The two that are off answer questions somebody has to have thought of —
 * "how big is this part" and "where does the machine itself measure from".
 * Neither is worth the drawing being two more boxes deep before anyone has
 * asked anything, and machine zero in particular is a second set of coloured
 * axes competing with the one that matters.
 */
const DEFAULT_LAYERS = {
  path: true,
  programArea: false,
  wcsAxes: true,
  machineArea: true,
  machineAxes: false,
};

/** Drawn about machine zero when the machine has not reported both positions. */
const NO_OFFSET = { x: 0, y: 0, z: 0 };

const PathWidget = ({ machine, label = 'Ścieżka', preview = false, className = '' }) => {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [view, setView] = useState(DEFAULT_VIEW);

  /*
   * How many times a view has been asked for, rather than which one.
   *
   * Pressing GÓRA, dragging the camera away and pressing GÓRA again asks for
   * the same view twice, and a camera that only watched *which* view would
   * not move the second time — the button would work once per session and
   * then look broken. A count changes every press.
   */
  const [revision, setRevision] = useState(0);

  const chooseView = (next) => {
    setView(next);
    setRevision((count) => count + 1);
  };

  // Parsing a program is the one expensive thing on this screen and the
  // program changes about once an hour. The readings underneath it change
  // four times a second.
  const toolpath = useMemo(() => readToolpath(machine.gcode), [machine.gcode]);

  /*
   * **The picture is settled; only the tool moves.**
   *
   * Everything below exists to keep that true, and it is the difference
   * between a view that can be dragged and one that fights back. A status
   * report arrives four times a second and rebuilds `machine` — so a scene
   * composed straight from it was a new envelope object, a new program box
   * and a new camera frame four times a second, which meant `Outline`
   * disposing and rebuilding its geometry on the GPU at the same rate and the
   * camera being asked whether it should refit. Dragging against that
   * stutters, and nothing on screen says why.
   *
   * The work offset is why this cannot be a single `useMemo` over `machine`:
   * it is machine-minus-work, and during a move *both* positions change while
   * their difference does not. So it is settled to a value first, and that
   * value is what the scene is composed from.
   */
  const live = workOffset(machine.machinePosition, machine.position);
  const offsetKey = live ? `${live.x},${live.y},${live.z}` : '';
  const offset = useMemo(() => live || NO_OFFSET, [offsetKey]);

  const scene = useMemo(
    () => composeScene({
      settings: machine.settings,
      wcs: machine.modal?.wcs,
      offset,
      toolpath,
      layers,
    }),
    [machine.settings, machine.modal?.wcs, offset, toolpath, layers]
  );

  // The one reading taken live. Moving a marker is cheap; rebuilding the
  // scene around it is not.
  const tool = toolPoint(machine.machinePosition);

  /*
   * Three subjects, and the same two words under each where they apply.
   *
   * A coordinate system has no area to draw. Grbl stores a point per system
   * and nothing about how far the work around it reaches, so "where is this
   * zero" is the whole of what there is — which is why UKŁAD has one chip and
   * not two.
   */
  const sections = [
    {
      label: 'Program',
      options: [
        { id: 'path', label: 'Tor', disabled: !toolpath, note: 'Nie wczytano programu' },
        {
          id: 'programArea',
          label: 'Obszar',
          disabled: !scene.program,
          note: 'Nie wczytano programu',
        },
      ],
    },
    {
      label: 'Układ',
      options: [
        {
          id: 'wcsAxes',
          label: 'Osie',
          disabled: scene.origins.length === 0,
          note: 'Sterownik nie odesłał układów G54–G59',
        },
      ],
    },
    {
      label: 'Maszyna',
      options: [
        {
          id: 'machineArea',
          label: 'Obszar',
          disabled: !scene.envelope,
          note: 'Sterownik nie podał zakresu ruchu ($130–$132)',
        },
        { id: 'machineAxes', label: 'Osie', disabled: false, note: 'Zero maszynowe' },
      ],
    },
  ];

  const notes = [
    machineZeroIsGuess(machine.settings) &&
      'Bazowanie jest wyłączone ($22=0). Zero maszynowe leży tam, gdzie ' +
      'włączono sterownik, więc obwiednia ma właściwy rozmiar i nieznane ' +
      'położenie.',
    scene.envelope && !softLimitsEnabled(machine.settings) &&
      'Miękkie limity są wyłączone ($20=0). Obwiednia mówi, jak daleko ' +
      'sięgają osie — nic nie zatrzyma ruchu poza nią.',
  ].filter(Boolean);

  return (
    <Card
      label={label}
      aside={toolpath ? toolpath.name : 'Brak programu'}
      className={className}
      bodyClassName="gap-0"
    >
      <PathStage
        scene={scene}
        tool={tool}
        view={view}
        onView={chooseView}
        revision={revision}
        layers={layers}
        sections={sections}
        onLayers={setLayers}
        /*
         * The warnings belong to the screen that is about the toolpath. Beside
         * the jog keys there is no room for two sentences about `$22`, and the
         * question being asked there is "where is the tool", which they do not
         * answer.
         */
        notes={preview ? [] : notes}
        /*
         * Two scenes, two cameras. The toolpath screen is arranged to inspect
         * a program and the preview to watch the tool; neither should move
         * because of what was done to the other.
         */
        memory={preview ? 'preview' : 'path'}
      />
    </Card>
  );
};

export default PathWidget;
