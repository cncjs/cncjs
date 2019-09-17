import React, { useContext, useEffect, useState } from 'react';
import { ProgressBar } from 'react-bootstrap';
import i18n from 'app/lib/i18n';
import CollapsibleCard from 'app/components/CollapsibleCard';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import { WidgetConfigContext } from 'app/widgets/context';
import OverflowEllipsis from './OverflowEllipsis';

const mapReceiveBufferSizeToBSStyle = (rx) => {
    // danger: 0-7
    // warning: 8-15
    // info: >=16
    rx = Number(rx) || 0;
    if (rx >= 16) {
        return 'info';
    }
    if (rx >= 8) {
        return 'warning';
    }
    return 'danger';
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
                                                <ProgressBar
                                                    style={{ marginBottom: 0 }}
                                                    bsStyle="info"
                                                    min={plannerBufferMin}
                                                    max={plannerBufferMax}
                                                    now={plannerBufferSize}
                                                    label={(
                                                        <div style={{ color: '#222', padding: '0 10px' }}>
                                                            {plannerBufferSize}
                                                        </div>
                                                    )}
                                                />
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Receive Buffer')}>
                                                    {i18n._('Receive Buffer')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <ProgressBar
                                                    style={{ marginBottom: 0 }}
                                                    bsStyle={mapReceiveBufferSizeToBSStyle(receiveBufferSize)}
                                                    min={receiveBufferMin}
                                                    max={receiveBufferMax}
                                                    now={receiveBufferSize}
                                                    label={(
                                                        <div style={{ color: '#222', padding: '0 10px' }}>
                                                            {receiveBufferSize}
                                                        </div>
                                                    )}
                                                />
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

export default QueueReports;
