import HelpButton from './HelpButton';

/**
 * The one repeating container: a white panel, a hairline edge, a 6px corner.
 *
 * `label` is the quiet caption at the top left and `aside` the note at the top
 * right — a second reading, a coordinate system, a contact state. A card with
 * neither is still a card; several on this panel are just a frame round a
 * canvas.
 *
 * `onHelp` puts a `?` at the end of that header, the same one a sheet offers.
 * A screen that has to explain itself should do it behind a question mark
 * rather than in a paragraph nobody can put away — which is the whole of what
 * the zeroing screen learned.
 */
const Card = ({ label, aside, onHelp, helpLabel, row = false, className = '', bodyClassName = '', children }) => (
  <section
    /*
      * `--thumbGutter` so a scroller inside this card puts its indicator in
      * *this* card's padding. It is inherited, so without it a card sitting
      * in the content area would hand its scroller the shell's margin
      * instead — ten pixels where the card leaves eighteen, and the thumb
      * lands in the middle of the text. See `FadeScroller`.
      */
    className={`flex min-w-0 flex-col rounded-card border border-line bg-panel p-pad [--thumbGutter:var(--pad)] ${className}`}
  >
    {(label || aside || onHelp) && (
      // `items-center` only when there is a button to centre against. A
      // baseline is right for two pieces of text and wrong for a square.
      <header className={`mb-3 flex justify-between gap-3 ${onHelp ? 'items-center' : 'items-baseline'}`}>
        <h2 className="m-0 truncate text-cap font-semibold uppercase tracking-[0.1em] text-mut">
          {label}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {aside ? <span className="font-num text-note text-mut">{aside}</span> : null}
          {onHelp ? <HelpButton label={helpLabel} onPress={onHelp} className="size-chiph text-base" /> : null}
        </div>
      </header>
    )}
    {/*
      * `row` is a prop rather than a class passed in, because two direction
      * utilities in one string do not resolve in the order they are written —
      * the generated stylesheet decides, and `flex-col` quietly won. A card
      * laid out sideways then rendered as a column, which is not a thing any
      * amount of reading the JSX would explain.
      */}
    <div className={`flex min-h-0 flex-1 ${row ? 'flex-row' : 'flex-col'} ${bodyClassName}`}>
      {children}
    </div>
  </section>
);

export default Card;
