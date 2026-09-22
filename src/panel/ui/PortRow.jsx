import { PORT_BUSY, PORT_OPEN } from '../machine/ports';
import { t } from '../i18n';

/**
 * A mark a state can be recognised by before its word is read.
 *
 * The same three tones the rest of the panel uses, and for the same reasons:
 * green is this panel's own machine, amber is a port somebody else is holding,
 * and a closed port is not a condition at all.
 */
const TONES = {
  [PORT_OPEN]: { dot: 'bg-grn', text: 'text-grn', note: 'ports.state.open' },
  [PORT_BUSY]: { dot: 'bg-amb', text: 'text-amb', note: 'ports.state.inuse' },
};

/**
 * One serial port, as something to press.
 *
 * The whole row is the target rather than a radio button beside it. A panel
 * beside a machine is pressed with a knuckle or a glove, and the list is short
 * enough that a full-width row costs nothing.
 *
 * **The port name and the manufacturer are not translated.** `COM3` and
 * `Arduino LLC` come from the operating system's driver, and a panel that
 * translated them would be inventing a name for hardware. Everything the
 * panel says *about* them has a key — see rule 8.
 */
const PortRow = ({ port, manufacturer, state, chosen, onChoose }) => {
  const tone = TONES[state];

  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={() => onChoose(port)}
      className={[
        'flex w-full shrink-0 items-center gap-3 rounded-ctl border px-4 py-3 text-left transition-colors',
        chosen
          ? 'border-acc bg-accS'
          : 'border-line bg-surf hover:border-acc',
      ].join(' ')}
    >
      <span
        className={`size-[9px] shrink-0 rounded-full ${tone ? tone.dot : 'bg-mut'}`}
        aria-hidden="true"
      />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-num text-lead font-semibold text-ink">{port}</span>
        {/* The manufacturer is how a row is told from the three others a
          * Windows machine invents for Bluetooth. Absent on plenty of
          * adapters, which is why it is a second line rather than a column
          * that would be empty half the time. */}
        {manufacturer ? (
          <span className="truncate text-note text-mut">{manufacturer}</span>
        ) : null}
      </span>

      {tone ? (
        <span className={`shrink-0 text-cap font-semibold uppercase tracking-[0.08em] ${tone.text}`}>
          {t(tone.note)}
        </span>
      ) : null}
    </button>
  );
};

export default PortRow;
