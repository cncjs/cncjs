import Sheet from './Sheet';
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

  return `${distance.toFixed(1).replace('.', ',')} mm`;
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
    `${timing.leadMs} ms kolejki`,
    `${timing.ackMs} ms odpowiedzi sterownika`,
  ];

  // Two milliseconds, not one: a server on this computer measures as a
  // fraction of a millisecond, and rounding that up to `1 ms drogi do
  // serwera` is noise dressed up as a finding.
  if (link >= 2) {
    parts.push(`${link} ms drogi do serwera`);
  }

  return ` Po puszczeniu klawisza maszyna reaguje po ${timing.stopMs + link} ms — `
    + `${parts.join(', ')} — a droga powyżej to ten czas plus hamowanie.`
    + ' Serwer mierzy swój własny zegar w trakcie jogu, więc liczba opisuje ten'
    + ' komputer przy tej pracy.';
};

const ShortcutHelp = ({
  onClose, xyStep, zStep, xyCoarse, zCoarse, xySpeed, zSpeed, timing, settings, linkMs,
}) => (
  <Sheet title="Skróty klawiszowe" onClose={onClose}>
    <div className="flex flex-col">
      <Row keys={['←', '→']} does="Jog w osi X" value={`${xyStep} mm`} />
      <Row keys={['↑', '↓']} does="Jog w osi Y" value={`${xyStep} mm`} />
      <Row keys={['PgUp', 'PgDn']} does="Jog w osi Z" value={`${zStep} mm`} />
      <Row
        keys={['Shift', '+ kierunek']}
        does="Większy krok — największy, jaki oś oferuje"
        value={`XY ${xyCoarse} mm · Z ${zCoarse} mm`}
      />
      <Row keys={['przytrzymaj']} does="Jedzie, dopóki klawisz jest wciśnięty" />
      <Row
        keys={['po puszczeniu']}
        does="Zatrzymanie przy obecnej prędkości — XY, potem Z"
        value={[
          stopText({ timing, settings, feedrate: xySpeed, axes: ['x', 'y'] }),
          stopText({ timing, settings, feedrate: zSpeed, axes: ['z'] }),
        ].filter(Boolean).join(' · ') || null}
      />
      <Row keys={['Esc']} does="Zamyka to okno" />
      <Row keys={['?']} does="Otwiera tę pomoc" />
    </div>
    <p className="m-0 text-note text-mut">
      Krok i prędkość zmienisz na karcie jogu. Klawisze nie działają, gdy
      piszesz w polu tekstowym, i gdy nie ma połączenia ze sterownikiem.
      {timingNote({ timing, linkMs })}
    </p>
  </Sheet>
);

export default ShortcutHelp;
