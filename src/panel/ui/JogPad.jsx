import Icon from './Icon';
import { t } from '../i18n';
import { UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT } from './jogCorners';

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
 *
 * **The corners move two axes at once, and the middle is "go to zero".** The
 * cross had four empty cells and a dead Park key in the Z strip; what went
 * where is not arbitrary. The middle of a cross is the easiest target a thumb
 * has, so it belongs to a move made often — back to the work zero. Homing is
 * the largest move this machine makes and takes the place Park had, off to
 * the side, where it is harder to hit by accident.
 */
const Key = ({ children, onClick, hold, disabled, label, quiet, className = '' }) => (
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
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

// The house marks a key that goes to a known place rather than nudging from
// where the machine happens to be — a different kind of move, told apart
// before the label is read.
const HOUSE = <span aria-hidden="true">&#8962;</span>;

const Corner = ({ corner, onJog, disabled }) => (
  <Key
    hold={onJog(corner.dir)}
    disabled={disabled}
    label={t('jog.corner', { x: corner.signs.x, y: corner.signs.y })}
    className={corner.round}
  >
    <Icon name="diagonal" className={`size-6 ${corner.rotate}`} weight={2} />
  </Key>
);

const JogPad = ({ onJog, onHome, onGoZero, disabled, canHome, canGoZero }) => (
  <div className="flex items-start gap-2" role="group" aria-label={t('jog.pad')}>
    <div className="grid min-w-0 flex-[3] grid-cols-3 grid-rows-[repeat(3,var(--jbtnh))] gap-2">
      <Corner corner={UP_LEFT} onJog={onJog} disabled={disabled} />
      <Key hold={onJog({ y: 1 })} disabled={disabled} label={t('jog.yPlus')}>{t('jog.yPlus')}</Key>
      <Corner corner={UP_RIGHT} onJog={onJog} disabled={disabled} />
      <Key hold={onJog({ x: -1 })} disabled={disabled} label={t('jog.xMinus')}>{t('jog.xMinus')}</Key>
      <Key onClick={onGoZero} disabled={disabled || !canGoZero} label={t('jog.goZero')}>
        <Icon name="goZero" className="size-6" weight={2} />
        <span className="text-cap font-medium">{t('jog.goZero')}</span>
      </Key>
      <Key hold={onJog({ x: 1 })} disabled={disabled} label={t('jog.xPlus')}>{t('jog.xPlus')}</Key>
      <Corner corner={DOWN_LEFT} onJog={onJog} disabled={disabled} />
      <Key hold={onJog({ y: -1 })} disabled={disabled} label={t('jog.yMinus')}>{t('jog.yMinus')}</Key>
      <Corner corner={DOWN_RIGHT} onJog={onJog} disabled={disabled} />
    </div>

    <div className="grid min-w-0 flex-1 grid-cols-1 grid-rows-[repeat(3,var(--jbtnh))] gap-2">
      <Key hold={onJog({ z: 1 })} disabled={disabled} label={t('jog.zPlus')}>{t('jog.zPlus')}</Key>
      <Key onClick={onHome} disabled={disabled || !canHome} label={t('jog.home')} quiet>{HOUSE}<span>{t('jog.home')}</span></Key>
      <Key hold={onJog({ z: -1 })} disabled={disabled} label={t('jog.zMinus')}>{t('jog.zMinus')}</Key>
    </div>
  </div>
);

export default JogPad;
