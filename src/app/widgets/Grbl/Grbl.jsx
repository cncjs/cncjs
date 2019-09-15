import ensureArray from 'ensure-array';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _mapValues from 'lodash/mapValues';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { ProgressBar } from 'react-bootstrap';
import mapGCodeToText from 'app/lib/gcode-text';
import i18n from 'app/lib/i18n';
import CollapsibleCard from 'app/components/CollapsibleCard';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import Readout from './components/Readout';
import FeedOverride from './FeedOverride';
import SpindleOverride from './SpindleOverride';
import RapidOverride from './RapidOverride';
import styles from './index.styl';

class Grbl extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
    };

    // https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl
    // Grbl v0.9: BLOCK_BUFFER_SIZE (18), RX_BUFFER_SIZE (128)
    // Grbl v1.1: BLOCK_BUFFER_SIZE (16), RX_BUFFER_SIZE (128)
    plannerBufferMax = 0;

    plannerBufferMin = 0;

    receiveBufferMax = 128;

    receiveBufferMin = 0;

    render() {
        const { config, state } = this.props;
        const none = '–';
        const controllerState = state.controller.state || {};
        const parserState = _get(controllerState, 'parserstate', {});
        const activeState = _get(controllerState, 'status.activeState') || none;
        const feedrate = _get(controllerState, 'status.feedrate', _get(parserState, 'feedrate', none));
        const spindle = _get(controllerState, 'status.spindle', _get(parserState, 'spindle', none));
        const tool = _get(parserState, 'tool', none);
        const ov = _get(controllerState, 'status.ov', []);
        const [ovF = 0, ovR = 0, ovS = 0] = ov;
        const buf = _get(controllerState, 'status.buf', {});
        const modal = _mapValues(parserState.modal || {}, mapGCodeToText);
        const receiveBufferStyle = ((rx) => {
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
        })(buf.rx);
        const isQueueReportsVisible = !_isEmpty(buf);
        const isStatusReportsVisible = true;
        const isModalGroupsVisible = true;
        const isQueueReportsExpanded = config.get('panel.queueReports.expanded');
        const isStatusReportsExpanded = config.get('panel.statusReports.expanded');
        const isModalGroupsExpanded = config.get('panel.modalGroups.expanded');

        this.plannerBufferMax = Math.max(this.plannerBufferMax, buf.planner) || this.plannerBufferMax;
        this.receiveBufferMax = Math.max(this.receiveBufferMax, buf.rx) || this.receiveBufferMax;

        return (
            <Container fluid>
                <FormGroup>
                    {(ovF > 0) && (
                        <FeedOverride value={ovF} />
                    )}
                    {(ovS > 0) && (
                        <SpindleOverride value={ovS} />
                    )}
                    {(ovR > 0) && (
                        <RapidOverride value={ovR} />
                    )}
                </FormGroup>
                <Accordion>
                    {isQueueReportsVisible && (
                        <CollapsibleCard
                            collapsed={!isQueueReportsExpanded}
                        >
                            {({ collapsed, ToggleIcon, Header, Body }) => {
                                const expanded = !collapsed;
                                config.set('panel.queueReports.expanded', expanded);

                                return (
                                    <>
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
                                                                <div className={styles.textEllipsis} title={i18n._('Planner Buffer')}>
                                                                    {i18n._('Planner Buffer')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <ProgressBar
                                                                    style={{ marginBottom: 0 }}
                                                                    bsStyle="info"
                                                                    min={this.plannerBufferMin}
                                                                    max={this.plannerBufferMax}
                                                                    now={buf.planner}
                                                                    label={(
                                                                        <span className={styles.progressbarLabel}>
                                                                            {buf.planner}
                                                                        </span>
                                                                    )}
                                                                />
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Receive Buffer')}>
                                                                    {i18n._('Receive Buffer')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <ProgressBar
                                                                    style={{ marginBottom: 0 }}
                                                                    bsStyle={receiveBufferStyle}
                                                                    min={this.receiveBufferMin}
                                                                    max={this.receiveBufferMax}
                                                                    now={buf.rx}
                                                                    label={(
                                                                        <span className={styles.progressbarLabel}>
                                                                            {buf.rx}
                                                                        </span>
                                                                    )}
                                                                />
                                                            </FormCol>
                                                        </FormRow>
                                                    </FormContainer>
                                                )}
                                            </HorizontalForm>
                                        </Body>
                                    </>
                                );
                            }}
                        </CollapsibleCard>
                    )}
                    {isStatusReportsVisible && (
                        <CollapsibleCard
                            collapsed={!isStatusReportsExpanded}
                        >
                            {({ collapsed, ToggleIcon, Header, Body }) => {
                                const expanded = !collapsed;
                                config.set('panel.statusReports.expanded', expanded);

                                return (
                                    <>
                                        <Header>
                                            {({ hovered }) => (
                                                <Row>
                                                    <Col>{i18n._('Status Reports')}</Col>
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
                                                                <div className={styles.textEllipsis} title={i18n._('State')}>
                                                                    {i18n._('State')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{activeState}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                                                                    {i18n._('Feed Rate')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{feedrate}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                                                                    {i18n._('Spindle')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{spindle}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Tool Number')}>
                                                                    {i18n._('Tool Number')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{tool}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                    </FormContainer>
                                                )}
                                            </HorizontalForm>
                                        </Body>
                                    </>
                                );
                            }}
                        </CollapsibleCard>
                    )}
                    {isModalGroupsVisible && (
                        <CollapsibleCard
                            collapsed={!isModalGroupsExpanded}
                        >
                            {({ collapsed, ToggleIcon, Header, Body }) => {
                                const expanded = !collapsed;
                                config.set('panel.modalGroups.expanded', expanded);

                                return (
                                    <>
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
                                                                <div className={styles.textEllipsis} title={i18n._('Motion')}>
                                                                    {i18n._('Motion')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.motion || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Coordinate')}>
                                                                    {i18n._('Coordinate')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.wcs || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Plane')}>
                                                                    {i18n._('Plane')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.plane || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Distance')}>
                                                                    {i18n._('Distance')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.distance || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                                                                    {i18n._('Feed Rate')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.feedrate || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Units')}>
                                                                    {i18n._('Units')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.units || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Program')}>
                                                                    {i18n._('Program')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.program || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                                                                    {i18n._('Spindle')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>{modal.spindle || none}</Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                        <FormRow>
                                                            <FormCol>
                                                                <div className={styles.textEllipsis} title={i18n._('Coolant')}>
                                                                    {i18n._('Coolant')}
                                                                </div>
                                                            </FormCol>
                                                            <FormCol style={{ width: '50%' }}>
                                                                <Readout>
                                                                    {ensureArray(modal.coolant).map(coolant => (
                                                                        <div title={coolant} key={coolant}>{coolant || none}</div>
                                                                    ))}
                                                                </Readout>
                                                            </FormCol>
                                                        </FormRow>
                                                    </FormContainer>
                                                )}
                                            </HorizontalForm>
                                        </Body>
                                    </>
                                );
                            }}
                        </CollapsibleCard>
                    )}
                </Accordion>
            </Container>
        );
    }
}

export default Grbl;

const Accordion = styled.div`
    > :not(:first-child) {
        border-top: 0;
    }
`;
