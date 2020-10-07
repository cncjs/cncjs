import {
  Space,
  Text,
} from '@trendmicro/react-styled-ui';
import _get from 'lodash/get';
import React from 'react';
import { connect } from 'react-redux';
import { ButtonGroup } from 'app/components/Buttons';
import Center from 'app/components/Center';
import Clickable from 'app/components/Clickable';
import FixedWidthText from 'app/components/FixedWidthText';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import RepeatableButton from 'app/components/RepeatableButton';
import controller from 'app/lib/controller';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import i18n from 'app/lib/i18n';
import { none } from 'app/lib/utils';
import OverrideReadout from './components/OverrideReadout';

const RapidOverride = ({
  value,
}) => {
  if (!value) {
    return null;
  }

  return (
    <Center vertical>
      <FixedWidthText fontSize="1.5rem">
        R
      </FixedWidthText>
      <Space width={8} />
      <OverrideReadout>
        {(value >= 0) ? `${value}%` : none}
      </OverrideReadout>
      <Space width={8} />
      <ButtonGroup sm>
        <RepeatableButton
          onClick={() => {
            controller.command('override:rapid', 25);
          }}
          style={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('25%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('override:rapid', 50);
          }}
          style={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('50%')}</Text>
        </RepeatableButton>
        <RepeatableButton
          onClick={() => {
            controller.command('override:rapid', 100);
          }}
          style={{ fontSize: '.75rem' }}
        >
          <Text>{i18n._('100%')}</Text>
        </RepeatableButton>
      </ButtonGroup>
      <Space width={8} />
      <Clickable
        onClick={() => {
          controller.command('override:rapid', 0);
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
  );
};

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const value = ensurePositiveNumber(_get(controllerState, 'status.ov[1]')); // [ovF, ovR, ovS]

  return {
    value,
  };
})(RapidOverride);
