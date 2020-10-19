import {
  Space,
  Text,
  TextLabel,
} from '@trendmicro/react-styled-ui';
import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import React from 'react';
import { connect } from 'react-redux';
import { ButtonGroup } from 'app/components/Buttons';
import Center from 'app/components/Center';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import RepeatableButton from 'app/components/RepeatableButton';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from 'app/constants/controller';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import { none } from 'app/lib/utils';
import OverrideReadout from './components/OverrideReadout';

const LaserIntensityOverride = ({
  value,
}) => (
  <FormGroup>
    <TextLabel mb="2x">
      {i18n._('Laser Intensity Control')}
    </TextLabel>
    <Center vertical>
      <FontAwesomeIcon icon="bolt" fixedWidth />
      <Space width={8} />
      <OverrideReadout>
        {(value >= 0) ? `${value}%` : none}
      </OverrideReadout>
      <Space width={8} />
      <ButtonGroup sm>
        <RepeatableButton
          onClick={() => {
            controller.command('override:spindle', -10);
          }}
          style={{ fontSize: '.75rem' }}
        >
          <FontAwesomeIcon icon="arrow-down" fixedWidth />
          <Text>{i18n._('-10%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('override:spindle', -1);
          }}
          style={{ fontSize: '.66rem' }}
        >
          <FontAwesomeIcon icon="arrow-down" fixedWidth />
          <Text>{i18n._('-1%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('override:spindle', 1);
          }}
          style={{ fontSize: '.66rem' }}
        >
          <FontAwesomeIcon icon="arrow-up" fixedWidth />
          <Text>{i18n._('1%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('override:spindle', 10);
          }}
          style={{ fontSize: '.75rem' }}
        >
          <FontAwesomeIcon icon="arrow-up" fixedWidth />
          <Text>{i18n._('10%')}</Text>
        </RepeatableButton>
      </ButtonGroup>
      <Space width={8} />
      <Clickable
        onClick={() => {
          controller.command('override:spindle', 0);
        }}
      >
        {({ hovered }) => (
          <FontAwesomeIcon
            icon="undo"
            fixedWidth
            style={{
              color: '#222',
              opacity: hovered ? 1 : 0.5,
            }}
          />
        )}
      </Clickable>
    </Center>
  </FormGroup>
);

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
