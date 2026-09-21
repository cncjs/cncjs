// The tone a machine state is shown in. Four, and no more: the panel spends
// colour on "moving", "ready", "will not move" and "nothing to say", and a
// fifth would dilute the ones that matter.
const TONES = {
  running: { text: 'text-grn', dot: 'bg-grn', edge: 'border-grn' },
  ready: { text: 'text-amb', dot: 'bg-amb', edge: 'border-amb' },
  stopped: { text: 'text-red', dot: 'bg-red', edge: 'border-red' },
  inactive: { text: 'text-mut', dot: 'bg-mut', edge: 'border-line' },
};

/**
 * What state the machine is in.
 *
 * The dot carries the colour so the answer arrives before the word does —
 * across a workshop, from an angle, by someone whose hands are busy.
 */
const StateChip = ({ tone = 'inactive', children }) => {
  const t = TONES[tone] || TONES.inactive;

  return (
    <div className={`flex h-btnh items-center gap-[9px] rounded-ctl border bg-field px-4 ${t.edge}`}>
      <span className={`size-[9px] shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
      <span className={`text-cap font-semibold uppercase tracking-[0.1em] ${t.text}`}>
        {children}
      </span>
    </div>
  );
};

export default StateChip;
