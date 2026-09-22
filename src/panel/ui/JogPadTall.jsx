import Icon from './Icon';
import { UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT } from './jogCorners';

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
 * were two controls it cannot carry. See `server-backlog.md`.
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
 *
 * The corners and the middle carry the same meanings they do on the panel —
 * two axes at once, and "go to zero" under the thumb — so an operator who
 * learns the pad at the machine already knows the one in their hand. Homing
 * moves into the bottom row where the dead Park key was.
 */
const Key = ({ children, onClick, hold, disabled, label, quiet, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    {...(hold || {})}
    disabled={disabled}
    aria-label={label}
    className={[
      'flex size-full flex-col items-center justify-center rounded-ctl border leading-tight',
      quiet
        ? 'border-line bg-field text-cap font-medium text-mut hover:border-acc hover:text-acc'
        : 'border-line bg-surf text-head font-semibold text-acc hover:border-acc',
      'disabled:opacity-45 disabled:hover:border-line',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const HOUSE = <span aria-hidden="true">&#8962;</span>;

const Corner = ({ corner, onJog, disabled }) => (
  <Key
    hold={onJog(corner.dir)}
    disabled={disabled}
    label={corner.label}
    className={corner.round}
  >
    <Icon name="diagonal" className={`size-6 ${corner.rotate}`} weight={2} />
  </Key>
);

const JogPadTall = ({ onJog, onHome, onGoZero, disabled, canHome, canGoZero }) => (
  <div
    className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2"
    role="group"
    aria-label="Jog"
  >
    <Corner corner={UP_LEFT} onJog={onJog} disabled={disabled} />
    <Key hold={onJog({ y: 1 })} disabled={disabled} label="Y+">Y+</Key>
    <Corner corner={UP_RIGHT} onJog={onJog} disabled={disabled} />

    <Key hold={onJog({ x: -1 })} disabled={disabled} label="X−">X&minus;</Key>
    <Key onClick={onGoZero} disabled={disabled || !canGoZero} label="Do zera">
      <Icon name="goZero" className="size-6" weight={2} />
      <span className="text-cap font-medium">Do zera</span>
    </Key>
    <Key hold={onJog({ x: 1 })} disabled={disabled} label="X+">X+</Key>

    <Corner corner={DOWN_LEFT} onJog={onJog} disabled={disabled} />
    <Key hold={onJog({ y: -1 })} disabled={disabled} label="Y−">Y&minus;</Key>
    <Corner corner={DOWN_RIGHT} onJog={onJog} disabled={disabled} />

    <Key hold={onJog({ z: 1 })} disabled={disabled} label="Z+">Z+</Key>
    <Key onClick={onHome} disabled={disabled || !canHome} label="Bazuj" quiet>{HOUSE}<span>Bazuj</span></Key>
    <Key hold={onJog({ z: -1 })} disabled={disabled} label="Z−">Z&minus;</Key>
  </div>
);

export default JogPadTall;
