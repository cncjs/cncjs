import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  Text,
} from '@tonic-ui/react';
import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import React from 'react';
import { connect } from 'react-redux';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import { none } from '@app/lib/utils';
import RepeatableButton from '@app/components/RepeatableButton';
import OverrideReadout from './components/OverrideReadout';

/**
 * @param {{ value?: number }} props
 */
function SpindleOverride({
  value,
}) {
  if (!value) {
    return null;
  }

  return (
    <Box alignItems="center" display="grid" gap="1x" gridTemplateColumns="16px 45px minmax(0, 1fr) 24px">
      <Text fontFamily="mono" fontSize="1.5rem">
        S
      </Text>
      <OverrideReadout>
        {(value >= 0) ? `${value}%` : none}
      </OverrideReadout>
      <ButtonGroup size="sm" minWidth="0" sx={{ '& > button': { flex: 1, minWidth: 0, px: '1x' } }}>
        <RepeatableButton
          onClick={() => {
            controller.command('spindle_override', -10);
          }}
          sx={{ fontSize: '.75rem' }}
        >
          <FontAwesomeIcon icon="arrow-down" fixedWidth />
          <Text>{i18n._('-10%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('spindle_override', -1);
          }}
          sx={{ fontSize: '.66rem' }}
        >
          <FontAwesomeIcon icon="arrow-down" fixedWidth />
          <Text>{i18n._('-1%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('spindle_override', 1);
          }}
          sx={{ fontSize: '.66rem' }}
        >
          <FontAwesomeIcon icon="arrow-up" fixedWidth />
          <Text>{i18n._('1%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('spindle_override', 10);
          }}
          sx={{ fontSize: '.75rem' }}
        >
          <FontAwesomeIcon icon="arrow-up" fixedWidth />
          <Text>{i18n._('10%')}</Text>
        </RepeatableButton>
      </ButtonGroup>
      <Button
        aria-label="Reset spindle override"
        variant="ghost"
        size="sm"
        sx={{ minWidth: '24px', width: '24px', p: 0 }}
        onClick={() => {
          controller.command('spindle_override', 0);
        }}
      >
        <FontAwesomeIcon icon="undo" fixedWidth />
      </Button>
    </Box>
  );
}

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const value = ensurePositiveNumber(_get(controllerState, 'status.ov[2]')); // [ovF, ovR, ovS]

  return {
    value,
  };
})(SpindleOverride);
