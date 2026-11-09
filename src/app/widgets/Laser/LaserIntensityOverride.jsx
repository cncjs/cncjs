import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import React, { useCallback, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import { none } from '@app/lib/utils';

const REPEAT_DELAY = 500;
const REPEAT_INTERVAL = Math.floor(1000 / 15);

function useRepeatable(onAction, disabled) {
  const delayTimer = useRef(null);
  const intervalTimer = useRef(null);
  const active = useRef(false);
  const action = useRef(onAction);
  const releaseHandler = useRef(null);

  useEffect(() => {
    action.current = onAction;
  }, [onAction]);

  const clear = useCallback(() => {
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    if (intervalTimer.current) {
      clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
    if (releaseHandler.current) {
      document.documentElement.removeEventListener('mouseup', releaseHandler.current);
      releaseHandler.current = null;
    }
    active.current = false;
  }, []);

  const release = useCallback(() => {
    if (!active.current || disabled) {
      return;
    }
    clear();
    action.current();
  }, [clear, disabled]);

  const start = useCallback(() => {
    if (disabled) {
      return;
    }

    clear();
    active.current = true;
    releaseHandler.current = release;
    document.documentElement.addEventListener('mouseup', release);
    delayTimer.current = setTimeout(() => {
      if (!active.current) {
        return;
      }
      action.current();
      intervalTimer.current = setInterval(() => {
        if (active.current) {
          action.current();
        }
      }, REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }, [clear, disabled, release]);

  useEffect(() => {
    if (disabled) {
      clear();
    }
    return clear;
  }, [clear, disabled]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onTouchCancel: release,
    onTouchEnd: release,
    onBlur: clear,
  };
}

function RepeatableButton({
  onClick,
  onKeyDown,
  disabled = false,
  children,
  ...props
}) {
  const repeatableProps = useRepeatable(onClick, disabled);
  const handleKeyDown = (event) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Button
      type="button"
      disabled={disabled}
      {...props}
      {...repeatableProps}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Button>
  );
}

/**
 * @param {{ value: number, disabled?: boolean }} props
 */
function LaserIntensityOverride({
  value,
  disabled = false,
}) {
  return (
    <Box mb="4x">
      <TextLabel mb="2x">
        {i18n._('Laser Intensity Control')}
      </TextLabel>
      <Flex alignItems="center" gap="2x">
        <Box
          as="output"
          aria-label={i18n._('Laser Intensity Control')}
          border={1}
          borderColor="border.secondary"
          display="flex"
          alignItems="center"
          justifyContent="flex-end"
          flex="none"
          width="45px"
          height="24px"
          px="1x"
          fontSize="sm"
        >
          {(value >= 0) ? `${value}%` : none}
        </Box>
        <ButtonGroup
          size="sm"
          variant="secondary"
          flex="1"
          minWidth="0"
          sx={{ '& > button': { flex: 1, minWidth: 0, px: '1x' } }}
        >
          <RepeatableButton
            disabled={disabled}
            onClick={() => controller.command('spindle_override', -10)}
            aria-label="-10%"
            sx={{ fontSize: '.75rem' }}
          >
            <FontAwesomeIcon icon="arrow-down" fixedWidth />
            <Text>{i18n._('-10%')}</Text>
          </RepeatableButton>
          <RepeatableButton
            disabled={disabled}
            onClick={() => controller.command('spindle_override', -1)}
            aria-label="-1%"
            sx={{ fontSize: '.66rem' }}
          >
            <FontAwesomeIcon icon="arrow-down" fixedWidth />
            <Text>{i18n._('-1%')}</Text>
          </RepeatableButton>
          <RepeatableButton
            disabled={disabled}
            onClick={() => controller.command('spindle_override', 1)}
            aria-label="1%"
            sx={{ fontSize: '.66rem' }}
          >
            <FontAwesomeIcon icon="arrow-up" fixedWidth />
            <Text>{i18n._('1%')}</Text>
          </RepeatableButton>
          <RepeatableButton
            disabled={disabled}
            onClick={() => controller.command('spindle_override', 10)}
            aria-label="10%"
            sx={{ fontSize: '.75rem' }}
          >
            <FontAwesomeIcon icon="arrow-up" fixedWidth />
            <Text>{i18n._('10%')}</Text>
          </RepeatableButton>
          <Button
            type="button"
            aria-label="Reset"
            disabled={disabled}
            onClick={() => controller.command('spindle_override', 0)}
          >
            <FontAwesomeIcon icon="undo" fixedWidth />
          </Button>
        </ButtonGroup>
      </Flex>
    </Box>
  );
}

export default connect(store => {
  const controllerType = _get(store, 'controller.type');
  const controllerState = _get(store, 'controller.state');
  const controllerSettings = _get(store, 'controller.settings');

  let value = 0;
  if (controllerType === GRBL) {
    const ovS = _get(controllerState, 'status.ov[2]');
    value = ensurePositiveNumber(ovS);
  }
  if (controllerType === MARLIN) {
    const ovS = _get(controllerState, 'ovS');
    value = ensurePositiveNumber(ovS);
  }
  if (controllerType === SMOOTHIE) {
    const ovS = _get(controllerState, 'status.ovS');
    value = ensurePositiveNumber(ovS);
  }
  if (controllerType === TINYG) {
    const ovS = _get(controllerSettings, 'sso');
    value = Math.round(ensurePositiveNumber(ovS) * 100);
  }

  return {
    value,
  };
})(LaserIntensityOverride);
