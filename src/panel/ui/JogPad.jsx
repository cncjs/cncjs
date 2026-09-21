/**
 * The keys that move the machine.
 *
 * Two groups side by side rather than one four-column grid, which is how the
 * mockup builds it and is the better shape for the reason it draws it that
 * way: XY is a cross an operator reads as a compass, and Z is a separate
 * decision. A single grid puts Z+ level with Y+ and invites the wrong key.
 *
 * The cross takes three shares of the width to Z's one, so the geometry holds
 * at any card width — the keys grow and shrink with the card instead of the
 * pad spilling out of it.
 *
 * One home key, not two. The server has a single `homing` command with no
 * axis argument — `$H` on Grbl, `G28` on Marlin — so "home XY" and "home Z"
 * were two controls it cannot carry. See `server-backlog.md`.
 *
 * 58px rows. Nothing on a touch panel goes below 40px, and these are pressed
 * by someone watching the cutter rather than the screen.
 */
const Key = ({ children, onClick, hold, disabled, label, quiet }) => (
  <button
    type="button"
    onClick={onClick}
    {...(hold || {})}
    disabled={disabled}
    aria-label={label}
    className={[
      'flex min-h-jbtnh min-w-0 flex-col items-center justify-center rounded-ctl border leading-tight',
      quiet
        ? 'border-line bg-field text-cap font-medium text-mut hover:border-acc hover:text-acc'
        : 'border-line bg-surf text-lead font-semibold text-acc hover:border-acc',
      'disabled:opacity-45 disabled:hover:border-line',
    ].join(' ')}
  >
    {children}
  </button>
);

// The house marks a key that goes to a known place rather than nudging from
// where the machine happens to be — a different kind of move, told apart
// before the label is read.
const HOUSE = <span aria-hidden="true">&#8962;</span>;

const JogPad = ({ onJog, onHome, onPark, disabled, canHome }) => (
  <div className="flex items-start gap-2" role="group" aria-label="Jog">
    <div className="grid min-w-0 flex-[3] grid-cols-3 grid-rows-[repeat(3,var(--jbtnh))] gap-2">
      <span />
      <Key hold={onJog('y', 1)} disabled={disabled} label="Y+">Y+</Key>
      <span />
      <Key hold={onJog('x', -1)} disabled={disabled} label="X−">X&minus;</Key>
      <Key onClick={onHome} disabled={disabled || !canHome} label="Bazuj" quiet>{HOUSE}<span>Bazuj</span></Key>
      <Key hold={onJog('x', 1)} disabled={disabled} label="X+">X+</Key>
      <span />
      <Key hold={onJog('y', -1)} disabled={disabled} label="Y−">Y&minus;</Key>
      <span />
    </div>

    <div className="grid min-w-0 flex-1 grid-cols-1 grid-rows-[repeat(3,var(--jbtnh))] gap-2">
      <Key hold={onJog('z', 1)} disabled={disabled} label="Z+">Z+</Key>
      <Key onClick={onPark} disabled label="Park" quiet>Park</Key>
      <Key hold={onJog('z', -1)} disabled={disabled} label="Z−">Z&minus;</Key>
    </div>
  </div>
);

export default JogPad;
