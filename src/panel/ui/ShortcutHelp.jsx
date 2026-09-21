import Sheet from './Sheet';

/**
 * What the keyboard does on this screen.
 *
 * Opened with `?`, which is the one key a panel can safely claim for help: it
 * needs a shift to reach, so it is never pressed by accident, and it is what
 * the habit already reaches for.
 *
 * Listed rather than discovered. A shortcut nobody knows about is a shortcut
 * that does not exist, and a machine is the wrong place to find out what a key
 * does by trying it.
 */
const Row = ({ keys, does }) => (
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
  </div>
);

const ShortcutHelp = ({ onClose }) => (
  <Sheet title="Skróty klawiszowe" onClose={onClose}>
    <div className="flex flex-col">
      <Row keys={['←', '→']} does="Jog w osi X" />
      <Row keys={['↑', '↓']} does="Jog w osi Y" />
      <Row keys={['PgUp', 'PgDn']} does="Jog w osi Z" />
      <Row keys={['Shift', '+ kierunek']} does="Większy krok" />
      <Row keys={['przytrzymaj']} does="Jedzie, dopóki klawisz jest wciśnięty" />
      <Row keys={['Esc']} does="Zamyka to okno" />
      <Row keys={['?']} does="Otwiera tę pomoc" />
    </div>
    <p className="m-0 text-note text-mut">
      Klawisze nie działają, gdy piszesz w polu tekstowym, i gdy nie ma
      połączenia ze sterownikiem.
    </p>
  </Sheet>
);

export default ShortcutHelp;
