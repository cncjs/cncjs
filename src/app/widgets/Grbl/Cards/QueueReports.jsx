import _get from 'lodash/get';
import React, { useContext, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import i18n from 'app/lib/i18n';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import CollapsibleCard from 'app/components/CollapsibleCard';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import Progress from 'app/components/Progress';
import Text from 'app/components/Text';
import { WidgetConfigContext } from 'app/widgets/context';
import OverflowEllipsis from './OverflowEllipsis';

const mapReceiveBufferSizeToColor = (rx) => {
    // danger: 0-7
    // warning: 8-15
    // info: >=16
    rx = ensurePositiveNumber(rx);
    if (rx >= 16) {
        return '#17a2b8';
    }
    if (rx >= 8) {
        return '#ffc107';
    }
    return '#dc3545';
};

const QueueReports = ({
    plannerBufferSize = 0,
    receiveBufferSize = 0,
}) => {
    if (!plannerBufferSize && !receiveBufferSize) {
        return null;
    }

    const config = useContext(WidgetConfigContext);
    const expanded = config.get('panel.queueReports.expanded');
    const collapsed = !expanded;

    // https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl
    // Grbl v0.9: BLOCK_BUFFER_SIZE (18), RX_BUFFER_SIZE (128)
    // Grbl v1.1: BLOCK_BUFFER_SIZE (16), RX_BUFFER_SIZE (128)
    const plannerBufferMin = 0;
    const receiveBufferMin = 0;
    const [plannerBufferMax, setPlannerBufferMax] = useState(0);
    const [receiveBufferMax, setReceiveBufferMax] = useState(128);

    useEffect(() => {
        const nextPlannerBufferMax = Math.max(plannerBufferMax, plannerBufferSize) || plannerBufferMax;
        const nextReceiveBufferMax = Math.max(receiveBufferMax, receiveBufferSize) || receiveBufferMax;

        if (nextPlannerBufferMax > plannerBufferMax) {
            setPlannerBufferMax(nextPlannerBufferMax);
        }
        if (nextReceiveBufferMax > receiveBufferMax) {
            setReceiveBufferMax(nextReceiveBufferMax);
        }
    });

    return (
        <CollapsibleCard
            easing="ease-out"
            collapsed={collapsed}
        >
            {({ collapsed, ToggleIcon, Header, Body }) => {
                const expanded = !collapsed;
                config.set('panel.queueReports.expanded', expanded);

                return (
                    <Container fluid style={{ width: '100%' }}>
                        <Header>
                            {({ hovered }) => (
                                <Row>
                                    <Col>{i18n._('Queue Reports')}</Col>
                                    <Col width="auto">
                                        <ToggleIcon style={{ opacity: hovered ? 1 : 0.5 }} />
                                    </Col>
                                </Row>
                            )}
                        </Header>
                        <Body>
                            <HorizontalForm spacing={['.75rem', '.5rem']}>
                                {({ FormContainer, FormRow, FormCol }) => (
                                    <FormContainer style={{ width: '100%' }}>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Planner Buffer')}>
                                                    {i18n._('Planner Buffer')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Progress style={{ height: '1.25rem' }}>
                                                    <Progress.Bar
                                                        min={plannerBufferMin}
                                                        max={plannerBufferMax}
                                                        value={plannerBufferSize}
                                                    >
                                                        <Text style={{ padding: '0 10px' }}>
                                                            {plannerBufferSize}
                                                        </Text>
                                                    </Progress.Bar>
                                                </Progress>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Receive Buffer')}>
                                                    {i18n._('Receive Buffer')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Progress style={{ height: '1.25rem' }}>
                                                    <Progress.Bar
                                                        min={receiveBufferMin}
                                                        max={receiveBufferMax}
                                                        value={receiveBufferSize}
                                                        style={{
                                                            backgroundColor: mapReceiveBufferSizeToColor(receiveBufferSize),
                                                        }}
                                                    >
                                                        <Text style={{ padding: '0 10px' }}>
                                                            {receiveBufferSize}
                                                        </Text>
                                                    </Progress.Bar>
                                                </Progress>
                                            </FormCol>
                                        </FormRow>
                                    </FormContainer>
                                )}
                            </HorizontalForm>
                        </Body>
                    </Container>
                );
            }}
        </CollapsibleCard>
    );
};

export default connect(store => {
    const controllerState = _get(store, 'controller.state');
    const plannerBufferSize = ensurePositiveNumber(_get(controllerState, 'status.buf.planner'));
    const receiveBufferSize = ensurePositiveNumber(_get(controllerState, 'status.buf.rx'));

    return {
        plannerBufferSize,
        receiveBufferSize,
    };
})(QueueReports);
