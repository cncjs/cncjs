import React from 'react';
import Button from 'app/components/Button';
import ButtonGroup from 'app/components/ButtonGroup';
import Readout from 'app/components/Readout';
import Stack from 'app/components/Stack';
import i18n from 'app/lib/i18n';
import { overridePercents } from '../selectors';

/**
 * The three percentages an operator can lean on while a job is running.
 *
 * This is the only part of the Grbl panel that writes to the machine. Each
 * button sends a realtime override byte: it scales a motion that is already
 * running, so on a machine standing still it changes a number in the next
 * status report and nothing else.
 *
 * The whole block disappears when the controller reports no overrides at all,
 * which is what a Grbl that has not sent an `Ov:` line looks like. Three rows
 * of controls that would do nothing is worse than no rows.
 *
 * Feed and spindle repeat while held, because the case they exist for is an
 * operator watching a cut go wrong and winding the feed down while watching
 * it. Rapid does not: it has three fixed positions and nothing to wind.
 */
const OverrideControls = ({ status, actions, disabled }) => {
  const { feed, rapid, spindle } = overridePercents(status);

  return (
    <Stack>
      <Adjustment
        name="F"
        label={i18n._('Feed Rate Override')}
        resetLabel={i18n._('Reset feed rate override')}
        percent={feed}
        disabled={disabled}
        onAdjust={actions.feedOverride}
      />
      <Adjustment
        name="S"
        label={i18n._('Spindle Override')}
        resetLabel={i18n._('Reset spindle override')}
        percent={spindle}
        disabled={disabled}
        onAdjust={actions.spindleOverride}
      />
      <Stack>
        <Readout name="override-R" label={i18n._('Rapid Override')} value={`${rapid}%`} />
        <ButtonGroup label={i18n._('Rapid Override')}>
          {[100, 50, 25].map((value) => (
            <Button
              key={value}
              size="small"
              variant="outlined"
              disabled={disabled}
              onClick={() => actions.rapidOverride(value)}
            >
              {`${value}%`}
            </Button>
          ))}
        </ButtonGroup>
      </Stack>
    </Stack>
  );
};

/**
 * One percentage with its four steps and a way back.
 *
 * Reset sends 0, which is Grbl's "return to 100%" rather than "set to zero" —
 * the one place in this panel where the number sent is not the number meant,
 * and the reason the button says neither.
 */
const Adjustment = ({ name, label, resetLabel, percent, disabled, onAdjust }) => (
  <Stack>
    <Readout name={`override-${name}`} label={label} value={`${percent}%`} />
    <ButtonGroup label={label}>
      {[-10, -1, 1, 10].map((step) => (
        <Button
          key={step}
          repeat
          size="small"
          variant="outlined"
          disabled={disabled}
          onClick={() => onAdjust(step)}
        >
          {step > 0 ? `+${step}%` : `${step}%`}
        </Button>
      ))}
      <Button
        size="small"
        variant="outlined"
        disabled={disabled}
        aria-label={resetLabel}
        onClick={() => onAdjust(0)}
      >
        {i18n._('Reset')}
      </Button>
    </ButtonGroup>
  </Stack>
);

export default OverrideControls;
