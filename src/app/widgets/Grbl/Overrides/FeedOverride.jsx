import _get from 'lodash/get';
import React from 'react';
import { connect } from 'react-redux';
import { ButtonGroup } from 'app/components/Buttons';
import Center from 'app/components/Center';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import RepeatableButton from 'app/components/RepeatableButton';
import Space from 'app/components/Space';
import Text from 'app/components/Text';
import controller from 'app/lib/controller';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import i18n from 'app/lib/i18n';
import { none } from 'app/lib/utils';
import OverrideReadout from './OverrideReadout';

const FeedOverride = ({
    value,
}) => {
    if (!value) {
        return null;
    }

    return (
        <Center vertical>
            <Text fixedWidth size={24}>
                F
            </Text>
            <Space width={8} />
            <OverrideReadout>
                {(value >= 0) ? `${value}%` : none}
            </OverrideReadout>
            <Space width={8} />
            <ButtonGroup sm>
                <RepeatableButton
                    onClick={() => {
                        controller.command('feedOverride', -10);
                    }}
                    style={{ fontSize: '.75rem' }}
                >
                    <FontAwesomeIcon icon="arrow-down" fixedWidth />
                    <Text>{i18n._('-10%')}</Text>
                </RepeatableButton>
                <RepeatableButton
                    onClick={() => {
                        controller.command('feedOverride', -1);
                    }}
                    style={{ fontSize: '.66rem' }}
                >
                    <FontAwesomeIcon icon="arrow-down" fixedWidth />
                    <Text>{i18n._('-1%')}</Text>
                </RepeatableButton>
                <RepeatableButton
                    onClick={() => {
                        controller.command('feedOverride', 1);
                    }}
                    style={{ fontSize: '.66rem' }}
                >
                    <FontAwesomeIcon icon="arrow-up" fixedWidth />
                    <Text>{i18n._('1%')}</Text>
                </RepeatableButton>
                <RepeatableButton
                    onClick={() => {
                        controller.command('feedOverride', 10);
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
                    controller.command('feedOverride', 0);
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
    const value = ensurePositiveNumber(_get(controllerState, 'status.ov[0]')); // [ovF, ovR, ovS]

    return {
        value,
    };
})(FeedOverride);
