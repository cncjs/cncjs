/**
 * The one repeating container: a white panel, a hairline edge, a 6px corner.
 *
 * `label` is the quiet caption at the top left and `aside` the note at the top
 * right — a second reading, a coordinate system, a contact state. A card with
 * neither is still a card; several on this panel are just a frame round a
 * canvas.
 */
const Card = ({ label, aside, row = false, className = '', bodyClassName = '', children }) => (
  <section className={`flex min-w-0 flex-col rounded-card border border-line bg-panel p-pad ${className}`}>
    {(label || aside) && (
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="m-0 truncate text-cap font-semibold uppercase tracking-[0.1em] text-mut">
          {label}
        </h2>
        {aside ? <span className="shrink-0 font-num text-note text-mut">{aside}</span> : null}
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
