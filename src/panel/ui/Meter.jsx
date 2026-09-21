/**
 * A bar whose length is a reading.
 *
 * The one place in the panel allowed to write an inline style, and the reason
 * is that a width driven by data cannot be a class: a percentage is
 * continuous and Tailwind's classes are not. Everything else — the colours,
 * the height, the track — is a token.
 *
 * Kept as its own component so the exception is here, written down, instead of
 * appearing wherever somebody next needs a bar.
 */
const Meter = ({ percent, max = 100, label, tone = 'bg-acc' }) => {
  const clamped = Math.max(0, Math.min(max, Number(percent) || 0));

  return (
    <div
      className="h-1.5 w-full bg-line"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={`h-full ${tone}`} style={{ width: `${(clamped / max) * 100}%` }} />
    </div>
  );
};

export default Meter;
