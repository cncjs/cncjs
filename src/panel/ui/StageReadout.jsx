import Icon from './Icon';
import { t } from '../i18n';

/**
 * Where the pointer is, where the picked point is, and the buttons that act
 * on the second one.
 *
 * Bottom left, which is the corner the drawing least often needs: on a Grbl
 * that homes to the maximum the machine origin sits top right, and the menu
 * already has the opposite edge.
 *
 * **Two rows, because a pointer that has stopped reporting is not a pointer.**
 * The first version showed only the picked point, so the figures froze the
 * moment anything was chosen and there was no way to read where the cursor
 * had got to since. The live row answers "where am I", the picked row answers
 * "where will it go", and they are different questions that happen to be
 * asked in the same units.
 *
 * Told apart by weight rather than by labels: the picked row is the one in
 * full ink, and it is the one with the buttons beside it. A heading over each
 * would be two words sitting permanently on the drawing to say what one
 * glance already says.
 *
 * **In work coordinates.** The scene is built in machine coordinates — that
 * is where the envelope and the limits live, and where a travel is sent —
 * but nobody sets a job up in them. The program is written against the work
 * zero, the DRO leads with the work position, and a corner of the stock has
 * a number in that system and not in the other one. Showing the machine's own
 * figures here would be asking the operator to do the subtraction.
 *
 * The system is not named here. It is named on the position card, and a tag
 * sitting permanently on the drawing to repeat it is the sort of label this
 * readout otherwise avoids. Until the machine reports a work offset the
 * figures are the machine's own — which is the first few moments of a
 * connection, and settles as soon as it answers.
 *
 * **Two buttons, and the left one is a mode.** Normally a click picks the
 * point and the right button travels to it, which is two steps because a
 * click is the easiest accident to have next to a machine — and it is the
 * same button the view is turned with. Switched on, a click travels straight
 * away: quicker for a run of moves, and a mode you turn on and can see is on
 * rather than the only behaviour.
 *
 * **Each reading is held at a fixed width, and never wraps.** Sized to its
 * content the row grew and shrank with every digit — and since the live row
 * changes on every mouse move, the buttons beside it walked away from the
 * pointer reaching for them. A fixed width alone is not enough, though: a
 * reading wider than its box breaks onto a second line instead, which tears
 * the whole bar open. Both halves are needed.
 *
 * The background is a wash rather than a panel — enough to keep the figures
 * legible over a grid line, not enough to be a box sitting on the work. It is
 * mixed with `color-mix`, because an opacity modifier on a whole-`var()`
 * colour silently produces nothing at all.
 */
const figure = (value) => value.toFixed(3);

/** Machine coordinates as the operator's own, when the offset is known. */
const inWork = (point, offset) => {
  if (!point) {
    return null;
  }
  if (!offset) {
    return point;
  }

  return { x: point.x - offset.x, y: point.y - offset.y };
};

const Row = ({ point, className }) => (
  <span className={`flex items-baseline gap-2 font-num text-note leading-none ${className}`}>
    <span className="w-coord shrink-0 whitespace-nowrap">{t('axis.x')} {point ? figure(point.x) : '–'}</span>
    <span className="w-coord shrink-0 whitespace-nowrap">{t('axis.y')} {point ? figure(point.y) : '–'}</span>
  </span>
);

const StageReadout = ({
  hover, point, onGo, canGo, note, clickDrives, onClickDrives, offset,
}) => (
  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-ctl bg-wash py-1 pl-2 pr-1">
    <span className="flex flex-col gap-1">
      <Row point={inWork(hover, offset)} className="text-mut" />
      {/* The weight is constant and only the colour changes: switching to
        * semibold when a point appeared altered the line's metrics and nudged
        * the buttons down by six pixels. */}
      <Row point={inWork(point, offset)} className={`font-semibold ${point ? 'text-ink' : 'text-mut'}`} />
    </span>
    <button
      type="button"
      onClick={onClickDrives}
      aria-pressed={clickDrives}
      aria-label={t('stage.clickDrives')}
      title={t(clickDrives ? 'stage.clickDrivesOn' : 'stage.clickDrivesOff')}
      className={[
        'flex size-7 shrink-0 items-center justify-center rounded-ctl border transition-colors',
        clickDrives
          ? 'border-acc bg-acc text-white'
          : 'border-line bg-wash text-ink hover:border-acc hover:text-acc',
      ].join(' ')}
    >
      <Icon name="cursor" className="size-4" />
    </button>
    <button
      type="button"
      onClick={onGo}
      disabled={!canGo}
      aria-label={t('stage.goToPoint')}
      title={note || t('stage.goToPointNote')}
      className="flex size-7 shrink-0 items-center justify-center rounded-ctl border border-line bg-wash text-ink transition-colors hover:border-acc hover:text-acc disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
    >
      <Icon name="goPoint" className="size-4" />
    </button>
  </div>
);

export default StageReadout;
