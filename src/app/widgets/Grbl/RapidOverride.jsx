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
function RapidOverride({
  value,
}) {
  if (!value) {
    return null;
  }

  return (
    <Box alignItems="center" display="grid" gap="1x" gridTemplateColumns="16px 45px minmax(0, 1fr) 24px">
      <Text fontFamily="mono" fontSize="1.5rem">
        R
      </Text>
      <OverrideReadout>
        {(value >= 0) ? `${value}%` : none}
      </OverrideReadout>
      <ButtonGroup size="sm" minWidth="0" sx={{ '& > button': { flex: 1, minWidth: 0, px: '1x' } }}>
        <RepeatableButton
          onClick={() => {
            controller.command('rapid_override', 25);
          }}
          sx={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('25%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('rapid_override', 50);
          }}
          sx={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('50%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('rapid_override', 100);
          }}
          sx={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('100%')}</Text>
        </RepeatableButton>
      </ButtonGroup>
      <Button
        aria-label="Reset rapid override"
        variant="ghost"
        size="sm"
        sx={{ minWidth: '24px', width: '24px', p: 0 }}
        onClick={() => {
          controller.command('rapid_override', 0);
        }}
      >
        <FontAwesomeIcon icon="undo" fixedWidth />
      </Button>
    </Box>
  );
}

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const value = ensurePositiveNumber(_get(controllerState, 'status.ov[1]')); // [ovF, ovR, ovS]

  return {
    value,
  };
})(RapidOverride);
