import PropTypes from 'prop-types';
import React from 'react';
import { ButtonGroup } from 'app/components/Buttons';
import Center from 'app/components/Center';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import RepeatableButton from 'app/components/RepeatableButton';
import Space from 'app/components/Space';
import Text from 'app/components/Text';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import OverrideReadout from './OverrideReadout';

const none = '–';

const SpindleOverride = ({ value, ...props }) => (
    <Center vertical>
        <Text fixedWidth size={24}>
            S
        </Text>
        <Space width={8} />
        <OverrideReadout>
            {(value >= 0) ? `${value}%` : none}
        </OverrideReadout>
        <Space width={8} />
        <ButtonGroup sm>
            <RepeatableButton
                onClick={() => {
                    controller.command('spindleOverride', -10);
                }}
                style={{ fontSize: '.75rem' }}
            >
                <FontAwesomeIcon icon="arrow-down" fixedWidth />
                <Text>{i18n._('-10%')}</Text>
            </RepeatableButton>
            <RepeatableButton
                onClick={() => {
                    controller.command('spindleOverride', -1);
                }}
                style={{ fontSize: '.66rem' }}
            >
                <FontAwesomeIcon icon="arrow-down" fixedWidth />
                <Text>{i18n._('-1%')}</Text>
            </RepeatableButton>
            <RepeatableButton
                onClick={() => {
                    controller.command('spindleOverride', 1);
                }}
                style={{ fontSize: '.66rem' }}
            >
                <FontAwesomeIcon icon="arrow-up" fixedWidth />
                <Text>{i18n._('1%')}</Text>
            </RepeatableButton>
            <RepeatableButton
                onClick={() => {
                    controller.command('spindleOverride', 10);
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
                controller.command('spindleOverride', 0);
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

SpindleOverride.propTypes = {
    value: PropTypes.number,
};

export default SpindleOverride;
