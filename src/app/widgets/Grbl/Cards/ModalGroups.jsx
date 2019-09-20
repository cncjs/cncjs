import ensureArray from 'ensure-array';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import React, { useContext } from 'react';
import { connect } from 'react-redux';
import mapGCodeToText from 'app/lib/gcode-text';
import i18n from 'app/lib/i18n';
import CollapsibleCard from 'app/components/CollapsibleCard';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import { nonblankValue } from 'app/lib/utils';
import { WidgetConfigContext } from 'app/widgets/context';
import OverflowEllipsis from './OverflowEllipsis';
import Readout from './Readout';

const ModalGroups = ({
    modal,
}) => {
    const config = useContext(WidgetConfigContext);
    const expanded = config.get('panel.modalGroups.expanded');
    const collapsed = !expanded;

    return (
        <CollapsibleCard
            easing="ease-out"
            collapsed={collapsed}
        >
            {({ collapsed, ToggleIcon, Header, Body }) => {
                const expanded = !collapsed;
                config.set('panel.modalGroups.expanded', expanded);

                return (
                    <Container fluid style={{ width: '100%' }}>
                        <Header>
                            {({ hovered }) => (
                                <Row>
                                    <Col>{i18n._('Modal Groups')}</Col>
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
                                                <OverflowEllipsis title={i18n._('Motion')}>
                                                    {i18n._('Motion')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.motion)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Coordinate')}>
                                                    {i18n._('Coordinate')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.wcs)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Plane')}>
                                                    {i18n._('Plane')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.plane)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Distance')}>
                                                    {i18n._('Distance')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.distance)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Feed Rate')}>
                                                    {i18n._('Feed Rate')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.feedrate)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Units')}>
                                                    {i18n._('Units')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.units)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Program')}>
                                                    {i18n._('Program')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.program)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Spindle')}>
                                                    {i18n._('Spindle')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>{nonblankValue(modal.spindle)}</Readout>
                                            </FormCol>
                                        </FormRow>
                                        <FormRow>
                                            <FormCol>
                                                <OverflowEllipsis title={i18n._('Coolant')}>
                                                    {i18n._('Coolant')}
                                                </OverflowEllipsis>
                                            </FormCol>
                                            <FormCol style={{ width: '50%' }}>
                                                <Readout>
                                                    {ensureArray(modal.coolant).map(coolant => (
                                                        <div title={coolant} key={coolant}>{nonblankValue(coolant)}</div>
                                                    ))}
                                                </Readout>
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
    const parserstate = _get(controllerState, 'parserstate');
    const modal = _get(parserstate, 'modal');

    return {
        modal: _mapValues(modal, mapGCodeToText),
    };
})(ModalGroups);
