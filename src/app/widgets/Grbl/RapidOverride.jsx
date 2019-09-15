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
import OverrideReadout from './components/OverrideReadout';

const none = '–';

const RapidOverride = ({ value, ...props }) => (
    <Center vertical>
        <Text fixedWidth size={24}>
            R
        </Text>
        <Space width={8} />
        <OverrideReadout>
            {(value >= 0) ? `${value}%` : none}
        </OverrideReadout>
        <Space width={8} />
        <ButtonGroup sm>
            <RepeatableButton
                onClick={() => {
                    controller.command('rapidOverride', 25);
                }}
                style={{ fontSize: '.75rem' }}
            >
                <Text>{i18n._('25%')}</Text>
            </RepeatableButton>
            <RepeatableButton
                onClick={() => {
                    controller.command('rapidOverride', 50);
                }}
                style={{ fontSize: '.75rem' }}
            >
                <Text>{i18n._('50%')}</Text>
            </RepeatableButton>
            <RepeatableButton
                onClick={() => {
                    controller.command('rapidOverride', 100);
                }}
                style={{ fontSize: '.75rem' }}
            >
                <Text>{i18n._('100%')}</Text>
            </RepeatableButton>
        </ButtonGroup>
        <Space width={8} />
        <Clickable
            onClick={() => {
                controller.command('rapidOverride', 0);
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

RapidOverride.propTypes = {
    value: PropTypes.number,
};

export default RapidOverride;
