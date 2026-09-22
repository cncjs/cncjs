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
 * Measured, not estimated: the server times its own clock at startup and the
 * firmware's replies while running, and the rest is `$120`–`$122` and the
 * feed rate showing on the card. Blank when any part of that is missing,
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

const ShortcutHelp = ({
  onClose, xyStep, zStep, xyCoarse, zCoarse, xySpeed, zSpeed, timing, settings,
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
      {timing ? ` Po puszczeniu klawisza maszyna reaguje po ${timing.stopMs} ms — ` +
        `${timing.leadMs} ms kolejki i ${timing.ackMs} ms odpowiedzi sterownika — a droga ` +
        'powyżej to ten czas plus hamowanie. Zmierzone na tym komputerze przy starcie serwera.' : ''}
    </p>
  </Sheet>
);

export default ShortcutHelp;
