/**
 * The jog keys when the screen is narrower than it is tall.
 *
 * Three columns, not four: the XY cross alone, with Z laid across underneath
 * instead of standing beside it. On a 360px phone a fourth column costs every
 * key a quarter of its width, and these are pressed by a thumb while the eyes
 * are on the cutter. Wider keys are the whole point of the rearrangement.
 *
 * Z below rather than beside also matches how the axes are thought about:
 * across, then down. Beside the cross it reads as a fourth direction in the
 * same plane.
 */
const Key = ({ children, onClick, disabled, label, quiet }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={[
      // Square. A key that is taller than it is wide reads as a slot rather
      // than a button, and a thumb aims at the middle of a square without
      // having to look at it.
      'flex aspect-square min-h-jbtnh w-full min-w-0 flex-col items-center justify-center rounded-ctl border leading-tight',
      quiet
        ? 'border-line bg-field text-cap font-medium text-mut hover:border-acc hover:text-acc'
        : 'border-line bg-surf text-head font-semibold text-acc hover:border-acc',
      'disabled:opacity-45 disabled:hover:border-line',
    ].join(' ')}
  >
    {children}
  </button>
);

const HOUSE = <span aria-hidden="true">&#8962;</span>;

const JogPadTall = ({ onJog, onHome, onPark, disabled, canHome }) => (
  <div className="flex min-h-0 flex-col gap-2" role="group" aria-label="Jog">
    {/*
      * `minmax(--jbtnh, 1fr)` rather than `1fr`. Plain fractions let a row be
      * shorter than the key it holds, and the keys then overlapped each other
      * and the row below — a jog pad with two keys on top of one another is
      * not a cosmetic fault. The floor is the key's own height and the
      * fraction is what spends whatever is left over on making them bigger.
      */}
    <div className="mx-auto grid min-h-0 w-full grid-cols-3 justify-items-center gap-2">
      <span />
      <Key onClick={() => onJog('y', 1)} disabled={disabled} label="Y+">Y+</Key>
      <span />
      <Key onClick={() => onJog('x', -1)} disabled={disabled} label="X−">X&minus;</Key>
      <Key onClick={() => onHome('xy')} disabled={disabled || !canHome} label="Bazuj XY" quiet>{HOUSE}<span>XY</span></Key>
      <Key onClick={() => onJog('x', 1)} disabled={disabled} label="X+">X+</Key>
      <span />
      <Key onClick={() => onJog('y', -1)} disabled={disabled} label="Y−">Y&minus;</Key>
      <Key onClick={onPark} disabled={disabled || !canHome} label="Park" quiet>Park</Key>
    </div>

    <div className="mx-auto grid min-h-0 w-full grid-cols-3 justify-items-center gap-2">
      <Key onClick={() => onJog('z', 1)} disabled={disabled} label="Z+">Z+</Key>
      <Key onClick={() => onHome('z')} disabled={disabled || !canHome} label="Bazuj Z" quiet>{HOUSE}<span>Z</span></Key>
      <Key onClick={() => onJog('z', -1)} disabled={disabled} label="Z−">Z&minus;</Key>
    </div>
  </div>
);

export default JogPadTall;
