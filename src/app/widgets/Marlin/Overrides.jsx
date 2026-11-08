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

/**
 * @param {{ ovF?: number, ovS?: number }} props
 */
function Overrides({ ovF, ovS }) {
  if (!ovF && !ovS) {
    return null;
  }

  return (
    <Box mb="3x">
      {!!ovF && (
        <DigitalReadout label="F" value={`${ovF}%`}>
          <Box alignItems="center" display="flex" gap="1x" minWidth="0">
            <OverrideButtons command="feed_override" />
            <Button
              aria-label="Reset feed rate override"
              variant="ghost"
              size="sm"
              sx={{ minWidth: '24px', width: '24px', p: 0 }}
              onClick={() => controller.command('feed_override', 0)}
            >
              <FontAwesomeIcon icon="undo" fixedWidth />
            </Button>
          </Box>
        </DigitalReadout>
      )}
      {!!ovS && (
        <DigitalReadout label="E" value={`${ovS}%`}>
          <Box alignItems="center" display="flex" gap="1x" minWidth="0">
            <OverrideButtons command="spindle_override" />
            <Button
              aria-label="Reset spindle override"
              variant="ghost"
              size="sm"
              sx={{ minWidth: '24px', width: '24px', p: 0 }}
              onClick={() => controller.command('spindle_override', 0)}
            >
              <FontAwesomeIcon icon="undo" fixedWidth />
            </Button>
          </Box>
        </DigitalReadout>
      )}
    </Box>
  );
}

/**
 * @param {{ command: 'feed_override' | 'spindle_override' }} props
 */
function OverrideButtons({ command }) {
  return (
    <ButtonGroup size="sm" minWidth="0" sx={{ flex: 1, '& > button': { flex: 1, minWidth: 0, px: '1x' } }}>
      {[
        { icon: 'arrow-down', label: '-10%', value: -10 },
        { icon: 'arrow-down', label: '-1%', value: -1 },
        { icon: 'arrow-up', label: '1%', value: 1 },
        { icon: 'arrow-up', label: '10%', value: 10 },
      ].map(({ icon, label, value }) => (
        <RepeatableButton
          key={value}
          onClick={() => controller.command(command, value)}
          sx={{ fontSize: Math.abs(value) === 1 ? '.66rem' : '.75rem' }}
        >
          <FontAwesomeIcon icon={icon} fixedWidth />
          <Text>{i18n._(label)}</Text>
        </RepeatableButton>
      ))}
    </ButtonGroup>
  );
}

export default Overrides;
