import Sheet from './Sheet';
import { t } from '../i18n';
import { accelerationFor, stoppingDistance } from '../machine/stopping';

/**
 * What the keyboard does on this screen, with the numbers it will actually use.
 *
 * Opened with `?`, which is the one key a panel can safely claim for help: it
 * needs a shift to reach, so it is never pressed by accident, and it is what
 * the habit already reaches for.
 *
 * The distances are read from the controls rather than described. "Bigger
 * step" is not a fact anybody can act on — how much bigger, and bigger than
 * what — and the whole point of this sheet is to answer what a key will do
 * before it is pressed on a machine. They are live: change the step on the
 * card and this says the new one.
 */
const Row = ({ keys, does, value }) => (
  <div className="flex items-baseline gap-3 border-b border-line py-2 last:border-b-0">
    <span className="flex shrink-0 gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="rounded-ctl border border-line bg-field px-2 py-1 font-num text-note text-ink"
        >
          {key}
        </kbd>
      ))}
    </span>
    <span className="min-w-0 flex-1 text-base text-mut">{does}</span>
    {value ? <span className="shrink-0 font-num text-base text-ink">{value}</span> : null}
  </div>
);

/**
 * How far the machine will go after the key comes up, in millimetres.
 *
 * Measured, not estimated: the server times its own clock while it jogs and
 * the firmware's replies while running, and the rest is `$120`–`$122` and
 * the feed rate showing on the card. Blank when any part of that is missing,
 * because a figure assembled from guesses would be read as a safety margin.
 *
 * The decimal separator comes from the language rather than from a
 * `replace('.', ',')` here. It used to be written in, which was correct in
 * Polish and would have been a typo in English.
 */
const stopText = ({ timing, settings, feedrate, axes }) => {
  const distance = stoppingDistance({
    timing,
    feedrate,
    acceleration: accelerationFor(axes, settings),
  });

  if (distance === null) {
    return null;
  }

  return t('shortcuts.stopDistance', { distance });
};

/**
 * Where the stopping time goes, in a sentence.
 *
 * Named parts rather than one total, because the parts are actionable and
 * the total is not: a long queue means this computer is busy, a slow reply
 * means the cable or the adapter, and a slow link means the server is
 * across a workshop. The link is left out entirely when the server is this
 * computer, which is the common case and reads as noise at 0 ms.
 */
const timingNote = ({ timing, linkMs }) => {
  if (!timing) {
    return null;
  }

  const link = Math.round(linkMs || 0);
  const parts = [
    t('shortcuts.timing.queue', { ms: timing.leadMs }),
    t('shortcuts.timing.ack', { ms: timing.ackMs }),
  ];

  // Two milliseconds, not one: a server on this computer measures as a
  // fraction of a millisecond, and rounding that up to `1 ms to the server`
  // is noise dressed up as a finding.
  if (link >= 2) {
    parts.push(t('shortcuts.timing.link', { ms: link }));
  }

  return t('shortcuts.timing.note', {
    total: timing.stopMs + link,
    parts: parts.join(', '),
  });
};

const ShortcutHelp = ({
  onClose, xyStep, zStep, xyCoarse, zCoarse, xySpeed, zSpeed, timing, settings, linkMs,
}) => {
  const note = timingNote({ timing, linkMs });

  return (
    <Sheet title={t('shortcuts.title')} onClose={onClose}>
      <div className="flex flex-col">
        <Row
          keys={[t('shortcuts.key.left'), t('shortcuts.key.right')]}
          does={t('shortcuts.jogX')}
          value={t('shortcuts.step', { value: xyStep })}
        />
        <Row
          keys={[t('shortcuts.key.up'), t('shortcuts.key.down')]}
          does={t('shortcuts.jogY')}
          value={t('shortcuts.step', { value: xyStep })}
        />
        <Row
          keys={[t('shortcuts.key.pageUp'), t('shortcuts.key.pageDown')]}
          does={t('shortcuts.jogZ')}
          value={t('shortcuts.step', { value: zStep })}
        />
        <Row
          keys={[t('shortcuts.key.shift'), t('shortcuts.key.andDirection')]}
          does={t('shortcuts.coarse')}
          value={t('shortcuts.coarseSteps', { xy: xyCoarse, z: zCoarse })}
        />
        <Row keys={[t('shortcuts.key.hold')]} does={t('shortcuts.held')} />
        <Row
          keys={[t('shortcuts.key.onRelease')]}
          does={t('shortcuts.stop')}
          value={[
            stopText({ timing, settings, feedrate: xySpeed, axes: ['x', 'y'] }),
            stopText({ timing, settings, feedrate: zSpeed, axes: ['z'] }),
          ].filter(Boolean).join(' · ') || null}
        />
        <Row keys={[t('shortcuts.key.escape')]} does={t('shortcuts.close')} />
        <Row keys={[t('shortcuts.key.help')]} does={t('shortcuts.help')} />
      </div>
      <p className="m-0 text-note text-mut">
        {t('shortcuts.note')}
        {note ? ` ${note}` : null}
      </p>
    </Sheet>
  );
};

export default ShortcutHelp;
