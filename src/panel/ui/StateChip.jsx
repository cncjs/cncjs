// The tone a machine state is shown in. Four, and no more: the panel spends
// colour on "moving", "ready", "will not move" and "nothing to say", and a
// fifth would dilute the ones that matter.
// The edge carries its variant written out, because Tailwind reads source
// text: a class assembled at runtime from a prefix and a colour is a class it
// never sees and never generates.
const TONES = {
  running: { text: 'text-grn', dot: 'bg-grn', edge: '@3xl/shell:border-grn @3xl/shell:bg-grnS' },
  ready: { text: 'text-amb', dot: 'bg-amb', edge: '@3xl/shell:border-amb @3xl/shell:bg-ambS' },
  stopped: { text: 'text-red', dot: 'bg-red', edge: '@3xl/shell:border-red @3xl/shell:bg-redS' },
  inactive: { text: 'text-mut', dot: 'bg-mut', edge: '@3xl/shell:border-line @3xl/shell:bg-mutS' },
};

/**
 * What state the machine is in.
 *
 * The dot carries the colour so the answer arrives before the word does —
 * across a workshop, from an angle, by someone whose hands are busy.
 *
 * The background is the state's own colour washed into the surface, so the
 * answer arrives as a field of colour before either the dot or the word is
 * looked at. Twelve percent: enough to read across a workshop, not enough to
 * compete with the stop beside it.
 *
 * One width, whatever the word. `Idle` is four letters and `Disconnected` is
 * twelve, and a chip that sizes to its contents moves the filename beside it
 * every time the machine changes state — on the one strip of the screen that
 * has to be readable at a glance from across a workshop. `--chipw` is the
 * drawing's own token for it.
 *
 * On a phone it loses its box and its background and becomes a dot and a
 * word on the bar. The border is there to make a target out of a reading on
 * a panel an arm's length away; at 390px it is a frame around nothing, and
 * the room it costs is the filename's.
 */
const StateChip = ({ tone = 'inactive', children }) => {
  const t = TONES[tone] || TONES.inactive;

  return (
    <div
      className={[
        'flex shrink-0 items-center gap-1.5',
        'min-w-chip border-transparent bg-transparent px-0',
        // The rail's column, inset either side. `--chipw` was a different
        // number from `--rail` and two nearly-equal widths stacked read as a
        // mistake; the full `--rail` glued it to both edges of the column.
        // One column, and the chip sits inside it.
        '@3xl/shell:h-btnh @3xl/shell:w-railInset @3xl/shell:justify-center',
        '@3xl/shell:rounded-ctl @3xl/shell:border @3xl/shell:px-1.5',
        t.edge,
      ].join(' ')}
    >
      <span className={`size-[9px] shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
      <span className={`truncate text-cap font-semibold uppercase tracking-[0.06em] fullhd:text-lead ${t.text}`}>
        {children}
      </span>
    </div>
  );
};

export default StateChip;
