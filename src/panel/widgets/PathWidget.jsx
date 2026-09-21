import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import PathPreview from '../ui/PathPreview';
import PathStage from '../ui/PathStage';
import { machineZeroIsGuess, softLimitsEnabled } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';
import { composeScene } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';

/**
 * The loaded program, the machine around it, and where the tool is in both.
 *
 * One widget, two shapes, and the screen says which — **the stage where the
 * toolpath is the subject, the preview where it is a glance.** Same scene and
 * the same data either way; what the stage adds is the chrome for changing
 * what is drawn.
 *
 * Nothing here has to be fetched. The server replays `gcode:load` with the
 * whole program to any socket that attaches, so a panel opened in front of a
 * loaded job is handed it. That is the only piece of state in this protocol
 * that survives a page being refreshed, and this screen is the reason to be
 * glad of it.
 */

/**
 * What is drawn to begin with: the program and the machine it is in.
 *
 * The other two are off because they answer questions somebody has to have
 * thought of. "Where is my G55" and "how big is this part" are worth a chip
 * each; neither is worth the drawing being four boxes deep before anyone has
 * asked anything.
 */
const DEFAULT_LAYERS = { path: true, machine: true, work: false, program: false };

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

  const scene = composeScene({ machine, toolpath, layers });

  /*
   * The camera is framed on the scene's *shape*, and the shape is not what
   * arrives four times a second.
   *
   * `composeScene` runs on every status report because the tool marker has to
   * follow the machine, so `scene.frame` is a new object each time with the
   * same numbers in it. Handing that to the camera compares it by identity,
   * finds it changed, and refits — which reads as a view that snaps back the
   * instant it is dragged, and is impossible to attribute to anything by
   * looking at it.
   *
   * Switching a layer *does* change the numbers, and refitting then is the
   * point: turning the machine on is asking to see it.
   */
  const shape = JSON.stringify(scene.frame);
  const frame = useMemo(() => scene.frame, [shape]);

  const options = [
    { id: 'path', label: 'Tor', disabled: !toolpath, note: 'Nie wczytano programu' },
    {
      id: 'machine',
      label: 'Maszyna',
      disabled: !scene.envelope,
      note: 'Sterownik nie podał zakresu ruchu ($130–$132)',
    },
    {
      id: 'work',
      label: 'Układy',
      disabled: scene.origins.length === 0,
      note: 'Sterownik nie odesłał układów G54–G59',
    },
    { id: 'program', label: 'Program', disabled: !scene.program, note: 'Nie wczytano programu' },
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

  const Shape = preview ? PathPreview : PathStage;

  return (
    <Card
      label={label}
      aside={toolpath ? toolpath.name : 'Brak programu'}
      className={className}
      bodyClassName="gap-0"
    >
      <Shape
        scene={{ ...scene, frame }}
        view={view}
        onView={chooseView}
        revision={revision}
        layers={layers}
        layerOptions={options}
        onLayers={setLayers}
        notes={notes}
      />
    </Card>
  );
};

export default PathWidget;
