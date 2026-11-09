import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  Text,
} from '@tonic-ui/react';
import React from 'react';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import RepeatableButton from '@app/components/RepeatableButton';
import DigitalReadout from './DigitalReadout';

const overrideSteps = [
  { fontSize: '.75rem', icon: 'arrow-down', value: -10 },
  { fontSize: '.66rem', icon: 'arrow-down', value: -1 },
  { fontSize: '.66rem', icon: 'arrow-up', value: 1 },
  { fontSize: '.75rem', icon: 'arrow-up', value: 10 },
];

const buttonGroupSx = {
  flex: 1,
  '& > button': { flex: 1, minWidth: 0, px: '1x' },
};

const resetButtonSx = { minWidth: '24px', width: '24px', p: 0 };

/**
 * @param {{ ovF?: number, ovS?: number }} props
 */
function Overrides({ ovF = 0, ovS = 0 }) {
  if (!ovF && !ovS) {
    return null;
  }

  return (
    <Box>
      {!!ovF && (
        <OverrideControl
          commandName="feed_override"
          label="F"
          resetLabel="Reset feed rate override"
          value={ovF}
        />
      )}
      {!!ovS && (
        <OverrideControl
          commandName="spindle_override"
          label="S"
          resetLabel="Reset spindle override"
          value={ovS}
        />
      )}
    </Box>
  );
}

/**
 * @param {{ commandName: string, label: string, resetLabel: string, value: number }} props
 */
function OverrideControl({ commandName, label, resetLabel, value }) {
  return (
    <DigitalReadout label={label} value={`${value}%`}>
      <ButtonGroup size="sm" minWidth="0" sx={buttonGroupSx}>
        {overrideSteps.map(step => (
          <RepeatableButton
            key={step.value}
            onClick={() => controller.command(commandName, step.value)}
            sx={{ fontSize: step.fontSize }}
          >
            <FontAwesomeIcon icon={step.icon} fixedWidth />
            <Text>{i18n._(`${step.value}%`)}</Text>
          </RepeatableButton>
        ))}
      </ButtonGroup>
      <Button
        aria-label={resetLabel}
        variant="ghost"
        size="sm"
        sx={resetButtonSx}
        onClick={() => controller.command(commandName, 0)}
      >
        <FontAwesomeIcon icon="undo" fixedWidth />
      </Button>
    </DigitalReadout>
  );
}

export default Overrides;
