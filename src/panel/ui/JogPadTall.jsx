/**
 * The jog keys when the screen is narrower than it is tall.
 *
 * Three columns, not four: the XY cross with Z laid across underneath instead
 * of standing beside it. On a 360px phone a fourth column costs every key a
 * quarter of its width, and these are pressed by a thumb while the eyes are on
 * the cutter. Wider keys are the whole point of the rearrangement.
 *
 * One home key, not two. The server has a single `homing` command with no
 * axis argument — `$H` on Grbl, `G28` on Marlin — so "home XY" and "home Z"
 * were two controls it cannot carry. See `design/server-backlog.md`.
 *
 * Z below rather than beside also matches how the axes are thought about:
 * across, then down. Beside the cross it reads as a fourth direction in the
 * same plane.
 *
 * One grid of four rows, not a cross and a separate Z strip. Two grids cannot
 * agree on a row height without being told the same number twice, and the
 * squares have to match or the bottom row reads as a different kind of
 * control.
 *
 * The keys fill their cells rather than holding a square inside them. A square
 * is the better shape and this gets there whenever the space allows, but
 * forcing it left a margin down both sides of the pad — and a key made smaller
 * so that a gap can sit beside it is the wrong trade on the control a thumb
 * has to find without looking. Equal rectangles, square when the room happens
 * to be square.
 */
const Key = ({ children, onClick, disabled, label, quiet }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={[
      'flex size-full flex-col items-center justify-center rounded-ctl border leading-tight',
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
  <div
    className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2"
    role="group"
    aria-label="Jog"
  >
    <span />
    <Key onClick={() => onJog('y', 1)} disabled={disabled} label="Y+">Y+</Key>
    <span />

    <Key onClick={() => onJog('x', -1)} disabled={disabled} label="X−">X&minus;</Key>
    <Key onClick={onHome} disabled={disabled || !canHome} label="Bazuj" quiet>{HOUSE}<span>Bazuj</span></Key>
    <Key onClick={() => onJog('x', 1)} disabled={disabled} label="X+">X+</Key>

    <span />
    <Key onClick={() => onJog('y', -1)} disabled={disabled} label="Y−">Y&minus;</Key>
    <span />

    <Key onClick={() => onJog('z', 1)} disabled={disabled} label="Z+">Z+</Key>
    <Key onClick={onPark} disabled label="Park" quiet>Park</Key>
    <Key onClick={() => onJog('z', -1)} disabled={disabled} label="Z−">Z&minus;</Key>
  </div>
);

export default JogPadTall;
