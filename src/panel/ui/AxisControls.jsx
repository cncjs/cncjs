import SegmentedChoice from './SegmentedChoice';
import Stepper from './Stepper';
import { t } from '../i18n';

/**
 * How far one axis group moves, and how fast.
 *
 * XY and Z each get their own, and that separation is the point rather than a
 * detail of the drawing: plunging is not traversing, and the rate that is
 * useful for crossing the bed drives the cutter into the work. One shared
 * control is how that happens.
 *
 * The controls keep the height the mockup draws them at; spare room in a
 * tall tile becomes air between them rather than taller buttons. A 42px
 * chip and a 79px one are not the same control to look at, and the drawing
 * is the one that was agreed.
 */
const Label = ({ children, unit }) => (
  <span className="text-label font-semibold uppercase leading-none text-ink">
    {children} <span className="normal-case text-mut">{unit}</span>
  </span>
);

const AxisControls = ({
  title, steps, step, onStep, speed, onSpeed, fine, coarse, min, max, disabled,
}) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-gap">
    {/* The rule runs on from the title rather than under it, so two of these
      * stacked read as two sections and not as two underlined words. */}
    <div className="flex shrink-0 items-center gap-2.5">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
      <span className="h-px flex-1 bg-line" />
    </div>

    <div className="flex min-w-0 shrink-0 flex-col gap-2.5">
      <Label unit={t('units.mm')}>{t('jog.step')}</Label>
      <SegmentedChoice
        options={steps}
        value={step}
        onChange={onStep}
        label={t('jog.stepFor', { axes: title })}
        unit={t('units.mm')}
        disabled={disabled}
      />
    </div>

    <div className="flex min-w-0 shrink-0 flex-col gap-2.5">
      <Label unit={t('units.mmPerMin')}>{t('jog.speed')}</Label>
      <Stepper
        value={speed}
        onChange={onSpeed}
        fine={fine}
        coarse={coarse}
        min={min}
        max={max}
        label={t('jog.speedFor', { axes: title })}
        disabled={disabled}
      />
    </div>
  </div>
);

export default AxisControls;
