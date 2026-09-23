/**
 * What something is set to, as a line that can be tapped to change it.
 *
 * The phone's answer to a row of controls that does not fit. Closed, it still
 * shows the *values* — folded away without them it would hide the one thing
 * checked before anything is pressed, which on the jog card is how far the
 * next press moves the machine and on the connection card is what the panel
 * is about to open a port as.
 *
 * It began as `AxisSummary`, with millimetres and mm/min written into it.
 * Generalised when the connection screen needed the same line for a
 * controller type and a baud rate — *"zastosuj rozwiazanie z jog, dla
 * sterownika i portu rowniez"* (2026-09-23). One component, because the two
 * are the same thing: a summary that opens a sheet.
 *
 * Its values are `{ value, unit }` rather than formatted strings, so the
 * figure stays `text-ink` and its unit stays muted — a reading and the name
 * of a reading are not the same weight, and a caller handed one string could
 * not make them differ.
 */
const SettingSummary = ({ title, values, onOpen, disabled }) => (
  <button
    type="button"
    onClick={onOpen}
    disabled={disabled}
    className="flex h-ctl shrink-0 items-center gap-2 rounded-ctl border border-line bg-surf px-3 text-left disabled:opacity-45"
  >
    <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-ink">
      {title}
    </span>
    <span className="flex-1" />
    {values.map(({ value, unit }) => (
      <span key={`${value}${unit || ''}`} className="truncate font-num text-note text-mut">
        <span className="text-ink">{value}</span>
        {unit ? ` ${unit}` : null}
      </span>
    ))}
    {/* A mark rather than a word: it says "there is more behind this" and is
      * the same character whatever language the panel is in. */}
    <span aria-hidden="true" className="shrink-0 text-note text-mut">&#9656;</span>
  </button>
);

export default SettingSummary;
