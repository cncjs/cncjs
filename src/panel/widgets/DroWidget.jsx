import Card from '../ui/Card';
import DroStack from '../ui/DroStack';
import DroStrip from '../ui/DroStrip';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

/**
 * Where the tool is.
 *
 * One widget, two shapes, and the screen says which — **stacked where the
 * position is the subject, a strip where it is a check.** On the dashboard it
 * is what the screen is for and gets the height and the large figures. On the
 * jog screen it answers "did that move do what I expected" between key
 * presses, and as one line it hands ninety pixels back to the toolpath, which
 * is the thing actually being watched.
 *
 * The two shapes are two components rather than one with a `strip` flag
 * through it. That flag had reached seven branches in one file — the label,
 * the direction, the alignment, the type scale, the divider, the unit, the
 * second figure — which is not one component with a variation in it. It is two
 * components sharing a prop signature, and reading either shape meant reading
 * both interleaved. They share what they actually have in common, which is
 * this widget: the card, the data, and the coordinate system.
 *
 * Neither of them takes the decision from its own width. An earlier version
 * did, from the shell's, and got the jog screen wrong at every size but the
 * phone — a check given the room of a subject because the window happened to
 * be wide.
 *
 * The coordinate system is named in the header rather than assumed. A position
 * without it means nothing, and "which zero is this" sits behind most of the
 * ways a job goes wrong.
 */
const DroWidget = ({ machine, label = t('dro.work'), strip = false, className = '' }) => {
  const Readout = strip ? DroStrip : DroStack;

  return (
    <Card
      label={label}
      aside={(
        /* A marker rather than a footnote: as plain muted text it read as a
         * label on the card rather than a reading from the machine. */
        <span className="rounded-ctl border border-line bg-field px-3 py-1 text-base font-semibold uppercase tracking-[0.08em] text-ink">
          {machine.modal.wcs || NO_READING}
        </span>
      )}
      className={className}
      bodyClassName="gap-0"
    >
      <Readout
        position={machine.position}
        machinePosition={machine.machinePosition}
      />
    </Card>
  );
};

export default DroWidget;
