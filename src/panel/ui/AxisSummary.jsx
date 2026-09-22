import { t } from '../i18n';

/**
 * What one axis group is set to, as a line that can be tapped to change it.
 *
 * Closed, this is the only thing about step and feed rate a phone shows — and
 * it shows the values, because folded away without them it would hide the one
 * thing checked before a key is pressed: how far the next press moves the
 * machine.
 */
const AxisSummary = ({ title, step, speed, onOpen, disabled }) => (
  <button
    type="button"
    onClick={onOpen}
    disabled={disabled}
    className="flex h-ctl shrink-0 items-center gap-2 rounded-ctl border border-line bg-surf px-3 text-left disabled:opacity-45"
  >
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
    <span className="flex-1" />
    <span className="font-num text-note text-mut">
      <span className="text-ink">{step}</span> {t('units.mm')}
    </span>
    <span className="font-num text-note text-mut">
      <span className="text-ink">{speed}</span> {t('units.mmPerMin')}
    </span>
    <span aria-hidden="true" className="text-note text-mut">&#9656;</span>
  </button>
);

export default AxisSummary;
