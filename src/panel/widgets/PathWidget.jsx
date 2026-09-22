import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import PathStage from '../ui/PathStage';
import { cancelTravel, canGoToPoint, goToPoint } from '../machine/goto';
import { machineZeroIsGuess, softLimitsEnabled, workOffset } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';
import { composeScene, toolPoint } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { t } from '../i18n';

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

const PathWidget = ({ machine, label = t('path.title'), preview = false, className = '' }) => {
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

  /*
   * Whether the camera has been taken off the named view by hand.
   *
   * Only the lighting of the view buttons depends on it: the view itself is
   * still where the next press will go. Pressing any view button clears it,
   * because that press is what makes the button true again.
   */
  const [free, setFree] = useState(false);

  /*
   * The point picked off the drawing, in machine coordinates.
   *
   * **Set by a click, not by hovering.** The button that travels there is
   * outside the canvas, so a target that followed the mouse could never be
   * acted on — walking over to press it would drag the target along. The
   * scene keeps the hovering preview to itself; this is the one everything
   * else is about, and it only changes when somebody puts it somewhere.
   */
  const [point, setPoint] = useState(null);

  /*
   * Whether a click travels, or only picks.
   *
   * Off by default, and that is the safety argument rather than a preference:
   * a click is the easiest accident to have beside a machine, and it is the
   * same button the view is turned with — a drag that falls under the slop
   * threshold would become a move. Two steps make the move deliberate. On,
   * it is one step, which is what a run of moves actually wants, and the lit
   * button and the crosshair are what keep it from being a trap.
   */
  const [clickDrives, setClickDrives] = useState(false);

  /*
   * Where the pointer is right now, as opposed to what was picked.
   *
   * It changes on every mouse move, which is why it was kept inside the scene
   * at first — but the readout has to show it, and a readout frozen on the
   * picked point leaves nowhere to read the cursor. The scene renders on
   * demand, so a React render here does not repaint WebGL on its own.
   */
  const [hover, setHover] = useState(null);

  const chooseView = (next) => {
    setView(next);
    setFree(false);
    setRevision((count) => count + 1);
  };

  /*
   * The same counting trick as the views, for the same reason: pressing
   * "fill the frame" twice has to work twice, and there is no state that
   * differs between the two presses. Separate from `revision` because the
   * two mean different things to the camera — one says where to stand, the
   * other says what to fill the frame with — and sharing a counter would
   * make each press do both.
   */
  const [fit, setFit] = useState(0);

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
      label: t('path.layers.program'),
      options: [
        {
          id: 'path',
          label: t('path.layers.path'),
          disabled: !toolpath,
          note: t('path.layers.noProgram'),
        },
        {
          id: 'programArea',
          label: t('path.layers.area'),
          disabled: !scene.program,
          note: t('path.layers.noProgram'),
        },
      ],
    },
    {
      label: t('path.layers.wcs'),
      options: [
        {
          id: 'wcsAxes',
          label: t('path.layers.axes'),
          disabled: !scene.origin,
          note: t('path.layers.noWcs'),
        },
      ],
    },
    {
      label: t('path.layers.machine'),
      options: [
        {
          id: 'machineArea',
          label: t('path.layers.area'),
          disabled: !scene.envelope,
          note: t('path.layers.noEnvelope'),
        },
        {
          id: 'machineAxes',
          label: t('path.layers.axes'),
          disabled: false,
          note: t('path.layers.machineZero'),
        },
      ],
    },
  ];

  /*
   * Why the travel button is off, when it is.
   *
   * Three different reasons, and telling them apart matters: one is solved by
   * pointing somewhere, one by plugging a machine in, and one by pointing
   * somewhere the machine can actually reach. A single greyed-out button with
   * no explanation is the same shape for all three.
   */
  const canGo = Boolean(machine.connected && point && canGoToPoint(machine.settings, point));
  const goNote = (() => {
    if (!machine.connected) {
      return t('path.go.disconnected');
    }
    if (!point) {
      return t('path.go.noPoint');
    }
    if (!canGo) {
      return t('path.go.outside');
    }
    return t('path.go.ready');
  })();

  /*
   * A click, and what it does. The guard is the same one the travel button
   * is disabled by — the mode changes how a move is asked for, never whether
   * it is allowed.
   */
  const pick = (picked) => {
    setPoint(picked);
    if (clickDrives && picked && machine.connected && canGoToPoint(machine.settings, picked)) {
      goToPoint(machine.settings, picked);
    }
  };

  /*
   * The right button takes back what the left one did — the point that was
   * chosen, and the travel that may already be on its way to it. Both, always:
   * the two are one intent, and having to remember which button undoes which
   * half is not something to work out beside a machine.
   */
  const undo = () => {
    setPoint(null);
    if (machine.connected) {
      cancelTravel();
    }
  };

  const notes = [
    machineZeroIsGuess(machine.settings) && t('path.note.noHoming'),
    scene.envelope && !softLimitsEnabled(machine.settings) && t('path.note.noSoftLimits'),
  ].filter(Boolean);

  return (
    <Card
      label={label}
      aside={toolpath ? toolpath.name : t('path.noProgram')}
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
        onFit={() => setFit((count) => count + 1)}
        fit={fit}
        free={free}
        onFree={() => setFree(true)}
        picking={preview}
        target={point}
        onPick={pick}
        onCancel={undo}
        hover={hover}
        onHover={setHover}
        /* The readout speaks the operator's coordinate system, not the
         * scene's. Null while the machine has not said where its work zero
         * is, which the readout shows rather than hides. */
        offset={live}
        clickDrives={clickDrives}
        onClickDrives={() => setClickDrives((on) => !on)}
        onGoToPoint={() => goToPoint(machine.settings, point)}
        canGoToPoint={canGo}
        goNote={goNote}
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
